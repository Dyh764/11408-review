import type { AdminClient } from "./supabase-admin.ts";
import { storageBucket } from "./supabase-admin.ts";

export type QuestionRow = {
  id: string;
  user_id: string;
  subject: string;
  chapter: string | null;
  knowledge_point: string | null;
  image_path: string;
  question_text: string | null;
  question_text_status: string;
  mastery_status: string;
  user_note: string | null;
  mistake_types: string[] | null;
  solution_summary: string | null;
  one_sentence_tip: string | null;
  review_priority: string | null;
  confidence: string | null;
  needs_manual_check: boolean;
  created_at: string;
  analyzed_at: string | null;
};

export type QuestionAnalysis = {
  question_text: string;
  question_text_status: "ai_unverified" | "needs_fix";
  subject: string;
  chapter: string;
  knowledge_point: string;
  mistake_types: string[];
  solution_summary: string;
  one_sentence_tip: string;
  review_priority: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  needs_manual_check: boolean;
};

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "question_text",
    "question_text_status",
    "subject",
    "chapter",
    "knowledge_point",
    "mistake_types",
    "solution_summary",
    "one_sentence_tip",
    "review_priority",
    "confidence",
    "needs_manual_check",
  ],
  properties: {
    question_text: { type: "string" },
    question_text_status: { type: "string", enum: ["ai_unverified", "needs_fix"] },
    subject: { type: "string" },
    chapter: { type: "string" },
    knowledge_point: { type: "string" },
    mistake_types: { type: "array", items: { type: "string" } },
    solution_summary: { type: "string" },
    one_sentence_tip: { type: "string" },
    review_priority: { type: "string", enum: ["low", "medium", "high"] },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    needs_manual_check: { type: "boolean" },
  },
};

const analyzeQuestionPrompt = [
  "You analyze one 11408 exam wrong-question image.",
  "Return only JSON that matches the provided schema.",
  "Keep question_text as OCR-like extracted text and mark it ai_unverified unless unreadable.",
  "Never include secrets, user identifiers, or image paths.",
].join("\n");

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function validateQuestionAnalysis(value: unknown): QuestionAnalysis | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.question_text !== "string" ||
    (record.question_text_status !== "ai_unverified" &&
      record.question_text_status !== "needs_fix") ||
    typeof record.subject !== "string" ||
    typeof record.chapter !== "string" ||
    typeof record.knowledge_point !== "string" ||
    !isStringArray(record.mistake_types) ||
    typeof record.solution_summary !== "string" ||
    typeof record.one_sentence_tip !== "string" ||
    (record.review_priority !== "low" &&
      record.review_priority !== "medium" &&
      record.review_priority !== "high") ||
    (record.confidence !== "low" && record.confidence !== "medium" && record.confidence !== "high") ||
    typeof record.needs_manual_check !== "boolean"
  ) {
    return null;
  }

  return record as QuestionAnalysis;
}

function mockAnalysis(question: QuestionRow): QuestionAnalysis {
  return {
    question_text: "Mock analysis: OCR text requires manual verification from the original image.",
    question_text_status: "ai_unverified",
    subject: question.subject,
    chapter: question.chapter ?? "auto-review",
    knowledge_point: question.knowledge_point ?? "\u672a\u5206\u7c7b",
    mistake_types: [question.mastery_status, "mock_fallback"],
    solution_summary: question.user_note
      ? `Review the original image and focus on: ${question.user_note.slice(0, 80)}`
      : "Review the original image and rebuild the solution path step by step.",
    one_sentence_tip: "Use the original image as source of truth before trusting OCR text.",
    review_priority: question.mastery_status === "瀹屽叏鎺屾彙" ? "low" : "medium",
    confidence: "low",
    needs_manual_check: true,
  };
}

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
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  const chunks: string[] = [];

  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }

  return btoa(chunks.join(""));
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

  const output = (responseJson as { output?: unknown }).output;

  if (!Array.isArray(output)) {
    return "";
  }

  for (const item of output) {
    const content = (item as { content?: unknown }).content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      const text = (part as { text?: unknown }).text;

      if (typeof text === "string") {
        return text;
      }
    }
  }

  return "";
}

async function analyzeWithOpenAI(supabase: AdminClient, question: QuestionRow) {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    return null;
  }

  const { data: imageBlob, error } = await supabase.storage
    .from(storageBucket)
    .download(question.image_path);

  if (error || !imageBlob) {
    throw new Error("Question image could not be downloaded.");
  }

  const imageBase64 = arrayBufferToBase64(await imageBlob.arrayBuffer());
  const mimeType = imageBlob.type || mimeFromPath(question.image_path);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${openaiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1",
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
          schema: analysisSchema,
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const outputText = extractOutputText(await response.json());

  if (!outputText) {
    return null;
  }

  try {
    return validateQuestionAnalysis(JSON.parse(outputText));
  } catch {
    return null;
  }
}

export async function analyzeQuestion(supabase: AdminClient, question: QuestionRow) {
  const openaiAnalysis = await analyzeWithOpenAI(supabase, question);

  return {
    source: openaiAnalysis ? "openai" : "mock",
    analysis: openaiAnalysis ?? mockAnalysis(question),
  };
}

export async function writeQuestionAnalysis(
  supabase: AdminClient,
  question: QuestionRow,
  analysis: QuestionAnalysis,
) {
  const shouldPreserveVerifiedText = question.question_text_status === "verified";
  const patch: Record<string, unknown> = {
    subject: question.subject,
    chapter: analysis.chapter,
    knowledge_point: analysis.knowledge_point || "\u672a\u5206\u7c7b",
    mistake_types: analysis.mistake_types,
    solution_summary: analysis.solution_summary,
    one_sentence_tip: analysis.one_sentence_tip,
    review_priority: analysis.review_priority,
    confidence: analysis.confidence,
    needs_manual_check: analysis.needs_manual_check,
    analyzed_at: new Date().toISOString(),
  };

  if (!shouldPreserveVerifiedText) {
    patch.question_text = analysis.question_text;
    patch.question_text_status = analysis.question_text_status;
  }

  const { error } = await supabase.from("questions").update(patch).eq("id", question.id);

  if (error) {
    throw new Error(`Question analysis update failed: ${error.message}`);
  }
}
