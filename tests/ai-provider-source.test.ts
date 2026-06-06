import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("AI provider files expose Gemini, DeepSeek, and none routing", () => {
  assert.equal(existsSync(join(root, "lib/ai/gemini.ts")), true);
  assert.equal(existsSync(join(root, "lib/ai/provider.ts")), true);

  const provider = read("lib/ai/provider.ts");
  assert.match(provider, /AI_PROVIDER/);
  assert.match(provider, /gemini/);
  assert.match(provider, /deepseek/);
  assert.match(provider, /none/);
  assert.match(provider, /enhanceQuestionWithAI/);
  assert.match(provider, /generateLearningInsights/);
});

test("Gemini wrapper uses server-side key and JSON mode", () => {
  const gemini = read("lib/ai/gemini.ts");

  assert.match(gemini, /GEMINI_API_KEY/);
  assert.match(gemini, /generativelanguage\.googleapis\.com/);
  assert.match(gemini, /x-goog-api-key/);
  assert.match(gemini, /responseMimeType/);
  assert.doesNotMatch(gemini, /NEXT_PUBLIC_GEMINI/);
});

test("question and report AI routes go through provider", () => {
  assert.match(read("app/api/questions/[id]/deepseek-enhance/route.ts"), /enhanceQuestionWithAI/);
  assert.match(read("app/api/reports/generate/route.ts"), /generateLearningInsights/);
});

test("settings status and env example include Gemini without leaking keys", () => {
  const status = read("app/api/settings/status/route.ts");
  const check = read("lib/production-config-check.ts");
  const env = read(".env.example");

  assert.match(status, /gemini/);
  assert.match(status, /AI_PROVIDER/);
  assert.match(check, /GEMINI_API_KEY/);
  assert.match(check, /GEMINI_MODEL/);
  assert.match(env, /AI_PROVIDER=gemini/);
  assert.match(env, /GEMINI_API_KEY=/);
});
