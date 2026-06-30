import { NextResponse } from "next/server";
import {
  applyInboxDefaults,
  getImportQualityReport,
  type ImportQualityRow,
} from "@/lib/import/import-quality";
import {
  imagePathBelongsToUser,
  parseImportJsonText,
  parseImportWithDiagnostics,
  type ImportQuestionCard,
} from "@/lib/import/import-schema";
import { updateKnowledgeStatsForQuestionIds } from "@/lib/knowledge-stats";
import { buildInitialReviewPlan } from "@/lib/review-scheduler";
import { createClient } from "@/lib/supabase/server";

type ImportFailure = {
  index: number;
  message: string;
};

type ImportSuccess = {
  index: number;
  questionId: string;
  reviewCount: number;
  warning?: string;
  inbox?: boolean;
};

type PendingImport = {
  index: number;
  card: ImportQuestionCard;
  inbox: boolean;
};

function buildQuestionInsert(card: ImportQuestionCard, userId: string) {
  return {
    user_id: userId,
    subject: card.subject,
    chapter: card.chapter ?? null,
    knowledge_point: card.knowledge_point ?? null,
    difficulty: card.difficulty ?? null,
    image_path: card.image_path ?? null,
    question_text: card.question_text ?? null,
    choices: card.choices,
    question_text_status: card.question_text_status,
    mastery_status: card.mastery_status,
    user_note: card.image_code
      ? `${card.user_note ?? ""}\nimage_code: ${card.image_code}`.trim()
      : card.user_note ?? null,
    mistake_types: card.mistake_types,
    solution_summary: card.solution_summary ?? null,
    standard_answer: card.standard_answer ?? null,
    answer_explanation: card.answer_explanation ?? null,
    key_steps: card.key_steps,
    one_sentence_tip: card.one_sentence_tip ?? null,
    related_practice_questions: card.related_practice_questions,
    review_priority: card.review_priority,
    confidence: card.confidence ?? null,
    needs_manual_check: card.needs_manual_check,
    source: "chatgpt_import",
    source_info: card.source_info,
    answer_status: card.answer_status,
    answer_source: card.answer_source,
    analyzed_at: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "请先配置 Supabase 环境变量。" }, { status: 503 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    jsonText?: unknown;
    importMode?: unknown;
  };

  if (typeof body.jsonText !== "string") {
    return NextResponse.json({ error: "请求体缺少 jsonText。" }, { status: 400 });
  }

  const parsed = parseImportJsonText(body.jsonText);
  const diagnosticResult = parseImportWithDiagnostics(body.jsonText);
  const qualityReport = getImportQualityReport(parsed);
  const qualityByIndex = new Map<number, ImportQualityRow>(
    qualityReport.rows.map((row) => [row.index, row]),
  );
  const forceInbox = body.importMode === "inbox";
  const failures: ImportFailure[] = parsed.errors.map((error) => ({
    index: error.index,
    message: error.message,
  }));
  const successes: ImportSuccess[] = [];
  const pendingInserts: PendingImport[] = [];

  for (const parsedCard of parsed.cards) {
    const rowQuality = qualityByIndex.get(parsedCard.index);
    const qualityLabels = rowQuality?.issues.map((issue) => issue.label) ?? [];
    const shouldUseInbox = forceInbox || Boolean(rowQuality?.recommendedInbox);
    const card = shouldUseInbox
      ? applyInboxDefaults(parsedCard.card, qualityLabels)
      : parsedCard.card;
    const originalIndex = parsedCard.index;

    if (rowQuality && !rowQuality.importable) {
      failures.push({
        index: originalIndex,
        message: rowQuality.issues.map((issue) => issue.detail ?? issue.label).join("；"),
      });
      continue;
    }

    if (card.image_path && !imagePathBelongsToUser(card.image_path, user.id)) {
      failures.push({
        index: originalIndex,
        message: "图片路径不属于当前用户。",
      });
      continue;
    }

    pendingInserts.push({
      index: originalIndex,
      card,
      inbox: shouldUseInbox,
    });
  }

  if (pendingInserts.length > 0) {
    const { data: insertedRows, error: insertError } = await supabase
      .from("questions")
      .insert(pendingInserts.map((pending) => buildQuestionInsert(pending.card, user.id)))
      .select("id");

    if (insertError || !insertedRows) {
      for (const pending of pendingInserts) {
        failures.push({
          index: pending.index,
          message: insertError?.message ?? "错题写入失败。",
        });
      }
    } else {
      const insertedQuestions = insertedRows as Array<{ id: string }>;
      const importedQuestions = pendingInserts
        .map((pending, position) => {
          const row = insertedQuestions[position];

          if (!row?.id) {
            failures.push({
              index: pending.index,
              message: "错题已提交，但服务端没有返回题目 ID，请刷新错题库确认。",
            });
            return null;
          }

          return {
            pending,
            questionId: String(row.id),
          };
        })
        .filter((item): item is { pending: PendingImport; questionId: string } => Boolean(item));

      const reviewPlans = importedQuestions.map(({ pending, questionId }) => ({
        index: pending.index,
        inbox: pending.inbox,
        questionId,
        rows: buildInitialReviewPlan({
          userId: user.id,
          questionId,
          masteryStatus: pending.card.mastery_status,
        }),
      }));
      const reviewRows = reviewPlans.flatMap((plan) => plan.rows);
      let reviewWarning = "";
      let statsWarning = "";

      if (reviewRows.length > 0) {
        const { error: reviewError } = await supabase
          .from("reviews")
          .upsert(reviewRows, { onConflict: "question_id,scheduled_date" });

        if (reviewError) {
          reviewWarning = `错题已保存，但复习计划生成失败：${reviewError.message}`;
        }
      }

      try {
        await updateKnowledgeStatsForQuestionIds(
          supabase,
          importedQuestions.map((item) => item.questionId),
        );
      } catch (error) {
        statsWarning =
          error instanceof Error
            ? `错题已保存，但薄弱点统计更新失败：${error.message}`
            : "错题已保存，但薄弱点统计更新失败。";
      }

      for (const plan of reviewPlans) {
        const warning = reviewWarning || statsWarning || undefined;

        successes.push({
          index: plan.index,
          questionId: plan.questionId,
          reviewCount: reviewWarning ? 0 : plan.rows.length,
          warning,
          inbox: plan.inbox,
        });
      }
    }
  }

  return NextResponse.json({
    successCount: successes.length,
    failureCount: failures.length,
    quality: qualityReport,
    diagnostics: failures.length > 0 ? diagnosticResult.diagnostics : [],
    successes,
    failures,
  });
}
