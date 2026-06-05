import { NextResponse } from "next/server";
import {
  imagePathBelongsToUser,
  parseImportJsonText,
  type ImportQuestionCard,
} from "@/lib/import/import-schema";
import { updateKnowledgeStatsForQuestionId } from "@/lib/knowledge-stats";
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
    review_priority: card.review_priority,
    confidence: card.confidence ?? null,
    needs_manual_check: card.needs_manual_check,
    source: "chatgpt_import",
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

  const body = (await request.json().catch(() => ({}))) as { jsonText?: unknown };

  if (typeof body.jsonText !== "string") {
    return NextResponse.json({ error: "请求体缺少 jsonText。" }, { status: 400 });
  }

  const parsed = parseImportJsonText(body.jsonText);
  const failures: ImportFailure[] = parsed.errors.map((error) => ({
    index: error.index,
    message: error.message,
  }));
  const successes: ImportSuccess[] = [];

  for (const parsedCard of parsed.cards) {
    const { card } = parsedCard;
    const originalIndex = parsedCard.index;

    if (card.image_path && !imagePathBelongsToUser(card.image_path, user.id)) {
      failures.push({
        index: originalIndex,
        message: "图片路径不属于当前用户。",
      });
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("questions")
      .insert(buildQuestionInsert(card, user.id))
      .select("id")
      .single();

    if (insertError || !inserted) {
      failures.push({
        index: originalIndex,
        message: insertError?.message ?? "错题写入失败。",
      });
      continue;
    }

    const questionId = String(inserted.id);
    const reviewPlan = buildInitialReviewPlan({
      userId: user.id,
      questionId,
      masteryStatus: card.mastery_status,
    });
    let warning = "";

    if (reviewPlan.length > 0) {
      const { error: reviewError } = await supabase
        .from("reviews")
        .upsert(reviewPlan, { onConflict: "question_id,scheduled_date" });

      if (reviewError) {
        warning = `错题已保存，但复习计划生成失败：${reviewError.message}`;
      }
    }

    if (!warning) {
      try {
        await updateKnowledgeStatsForQuestionId(supabase, questionId);
      } catch (error) {
        warning =
          error instanceof Error
            ? `错题已保存，但薄弱点统计更新失败：${error.message}`
            : "错题已保存，但薄弱点统计更新失败。";
      }
    }

    successes.push({
      index: originalIndex,
      questionId,
      reviewCount: warning ? 0 : reviewPlan.length,
      warning: warning || undefined,
    });
  }

  return NextResponse.json({
    successCount: successes.length,
    failureCount: failures.length,
    successes,
    failures,
  });
}
