import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseBucket } from "@/lib/env";
import { createMockAnalysis } from "@/lib/mock-ai";
import type { QuestionRecord } from "@/lib/questions";
import {
  buildNeedsFixAnalysis,
  questionAnalysisJsonSchema,
  validateQuestionAnalysis,
} from "@/lib/ai/schema";
import { analyzeQuestionPrompt } from "@/lib/ai/prompts/analyze-question";

export type AnalysisSource = "openai" | "mock" | "needs_fix";

export type AnalyzeQuestionResult = {
  source: AnalysisSource;
  message: string;
  analysis: ReturnType<typeof validateQuestionAnalysis> extends infer T
    ? NonNullable<T>
    : never;
};

const questionColumns = `
  id,
  user_id,
  subject,
  chapter,
  knowledge_point,
  image_path,
  question_text,
  question_text_status,
  mastery_status,
  user_note,
  mistake_types,
  solution_summary,
  one_sentence_tip,
  review_priority,
  confidence,
  needs_manual_check,
  created_at,
  analyzed_at
`;

function mimeFromPath(path: string) {
  const lower = path.toLowerCase();

  if (lower.endsWith(".png")) {
    return "image/png";
  }

  if (lower.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}

function extractOutputText(responseJson: unknown) {
  if (
    typeof responseJson === "object" &&
    responseJson !== null &&
    "output_text" in responseJson &&
    typeof responseJson.output_text === "string"
  ) {
    return responseJson.output_text;
  }

  if (
    typeof responseJson === "object" &&
    responseJson !== null &&
    "output" in responseJson &&
    Array.isArray(responseJson.output)
  ) {
    for (const item of responseJson.output) {
      if (
        typeof item === "object" &&
        item !== null &&
        "content" in item &&
        Array.isArray(item.content)
      ) {
        for (const content of item.content) {
          if (
            typeof content === "object" &&
            content !== null &&
            "text" in content &&
            typeof content.text === "string"
          ) {
            return content.text;
          }
        }
      }
    }
  }

  return "";
}

async function fetchQuestion(supabase: SupabaseClient, questionId: string) {
  const { data, error } = await supabase
    .from("questions")
    .select(questionColumns)
    .eq("id", questionId)
    .single();

  if (error) {
    throw new Error(`读取错题失败：${error.message}`);
  }

  return data as QuestionRecord;
}

async function updateQuestionAnalysis(
  supabase: SupabaseClient,
  questionId: string,
  analysis: NonNullable<ReturnType<typeof validateQuestionAnalysis>>,
) {
  const { error } = await supabase
    .from("questions")
    .update({
      question_text: analysis.question_text,
      question_text_status: analysis.question_text_status,
      subject: analysis.subject,
      chapter: analysis.chapter,
      knowledge_point: analysis.knowledge_point,
      mistake_types: analysis.mistake_types,
      solution_summary: analysis.solution_summary,
      one_sentence_tip: analysis.one_sentence_tip,
      review_priority: analysis.review_priority,
      confidence: analysis.confidence,
      needs_manual_check: analysis.needs_manual_check,
      analyzed_at: new Date().toISOString(),
    })
    .eq("id", questionId);

  if (error) {
    throw new Error(`写回分析结果失败：${error.message}`);
  }
}

async function analyzeWithOpenAI(supabase: SupabaseClient, question: QuestionRecord) {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    return null;
  }

  const { data: imageBlob, error: downloadError } = await supabase.storage
    .from(supabaseBucket)
    .download(question.image_path);

  if (downloadError || !imageBlob) {
    throw new Error(`读取原图失败：${downloadError?.message ?? "image not found"}`);
  }

  const imageBase64 = arrayBufferToBase64(await imageBlob.arrayBuffer());
  const mimeType = imageBlob.type || mimeFromPath(question.image_path);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1",
      input: [
        {
          role: "system",
          content: analyzeQuestionPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                subject: question.subject,
                mastery_status: question.mastery_status,
                user_note: question.user_note ?? "",
              }),
            },
            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${imageBase64}`,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "question_analysis",
          schema: questionAnalysisJsonSchema,
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI 分析失败：${response.status} ${errorText}`);
  }

  const responseJson: unknown = await response.json();
  const outputText = extractOutputText(responseJson);

  if (!outputText) {
    return buildNeedsFixAnalysis(question.subject, "OpenAI 未返回可解析的 JSON 文本。");
  }

  try {
    const parsed: unknown = JSON.parse(outputText);
    return validateQuestionAnalysis(parsed);
  } catch {
    return null;
  }
}

export async function analyzeQuestionById(
  supabase: SupabaseClient,
  questionId: string,
): Promise<AnalyzeQuestionResult> {
  const question = await fetchQuestion(supabase, questionId);
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    const mock = createMockAnalysis({
      subject: question.subject,
      mastery_status: question.mastery_status,
      user_note: question.user_note ?? "",
      imagePreview: question.image_path,
    });

    await updateQuestionAnalysis(supabase, question.id, mock);
    return {
      source: "mock",
      message: "未配置 OPENAI_API_KEY，已使用 mock fallback 分析。",
      analysis: mock,
    };
  }

  const openaiAnalysis = await analyzeWithOpenAI(supabase, question);

  if (!openaiAnalysis) {
    const fallback = buildNeedsFixAnalysis(question.subject, "AI 输出不符合 schema，已回退为 needs_fix。");
    await updateQuestionAnalysis(supabase, question.id, fallback);
    return {
      source: "needs_fix",
      message: "AI 输出不符合 schema，未写入原始 AI 内容，已回退为 needs_fix。",
      analysis: fallback,
    };
  }

  await updateQuestionAnalysis(supabase, question.id, openaiAnalysis);
  return {
    source: "openai",
    message: "OpenAI 分析完成。",
    analysis: openaiAnalysis,
  };
}
