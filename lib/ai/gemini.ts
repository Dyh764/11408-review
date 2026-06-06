import { defaultGeminiModel, getGeminiConfig } from "@/lib/env";
import {
  validateLearningInsight,
  validateQuestionEnhancement,
  type DeepSeekLearningInsight,
  type DeepSeekQuestionEnhancement,
} from "@/lib/ai/deepseek";

const geminiApiKeyEnvName = "GEMINI_API_KEY";

function extractGeminiText(value: unknown) {
  const candidate = (value as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    .candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;

  if (typeof text !== "string") {
    throw new Error("Gemini 响应缺少文本内容。");
  }

  return text;
}

async function callGeminiJson(systemPrompt: string, userPayload: unknown) {
  const config = getGeminiConfig();

  if (!config.apiKey) {
    throw new Error(`${geminiApiKeyEnvName} 未配置，Gemini 未启用（可选）。`);
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: JSON.stringify(userPayload) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini 请求失败：${response.status} ${errorText.slice(0, 160)}`);
  }

  return JSON.parse(extractGeminiText(await response.json())) as unknown;
}

export function getGeminiStatus() {
  const config = getGeminiConfig();

  return {
    configured: Boolean(config.apiKey),
    model: config.model || defaultGeminiModel,
  };
}

export async function enhanceQuestionWithGemini(
  payload: unknown,
): Promise<DeepSeekQuestionEnhancement> {
  const raw = await callGeminiJson(
    [
      "你是学习数据分析员，只能根据给定错题字段优化错题卡。",
      "不要发送或生成图片，不要伪造原题，不要覆盖人工核对题干或用户备注。",
      "只返回 JSON，字段为 chapter, knowledge_point, mistake_types, solution_summary, one_sentence_tip, review_priority, confidence, needs_manual_check。",
    ].join("\n"),
    payload,
  );

  return validateQuestionEnhancement(raw);
}

export async function generateLearningInsightWithGemini(
  payload: unknown,
): Promise<DeepSeekLearningInsight> {
  const raw = await callGeminiJson(
    [
      "你是学习数据分析员，只解释错题、复习和薄弱点摘要。",
      "不要生成图片，不要伪造题目，不要决定真实掌握状态。",
      "只返回 JSON，字段为 summary, today_focus, weak_points, mistake_patterns, recommended_tasks, review_strategy, warning。",
    ].join("\n"),
    payload,
  );

  return validateLearningInsight(raw);
}
