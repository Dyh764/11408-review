import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("/questions uses compact text previews without duplicate title or meta", () => {
  const source = read("app/questions/page.tsx");

  assert.match(source, /<TextQuestionPreview[\s\S]*compact[\s\S]*hideMeta[\s\S]*hideTitle/);
  assert.doesNotMatch(source, /<MobileCard key=\{question\.id\}[\s\S]*<TextQuestionPreview[\s\S]*showSource/);
});

test("TextQuestionPreview exposes compact, hideMeta, and hideTitle controls", () => {
  const source = read("components/mobile/TextQuestionPreview.tsx");

  assert.match(source, /compact\?: boolean/);
  assert.match(source, /hideMeta\?: boolean/);
  assert.match(source, /hideTitle\?: boolean/);
});

test("/questions/[id] keeps detail information in the requested groups", () => {
  const source = read("app/questions/[id]/page.tsx");

  for (const title of [
    "题目区",
    "基础信息",
    "学习状态",
    "我的卡点",
    "正确思路",
    "查看答案",
    "智能增强",
    "更多操作",
  ]) {
    assert.match(source, new RegExp(title));
  }
});

test("DeepSeek enhancement only updates the allowed question fields", () => {
  const source = read("app/api/questions/[id]/deepseek-enhance/route.ts");
  const updateCall = source.match(/\.update\(\{([\s\S]*?)\}\)\s*\n\s*\.eq\("id"/);

  assert.ok(updateCall, "expected a direct questions update payload");

  const fields = [...updateCall[1].matchAll(/^\s*([a-z_]+):/gm)].map((match) => match[1]);

  assert.deepEqual(fields, [
    "chapter",
    "knowledge_point",
    "mistake_types",
    "solution_summary",
    "one_sentence_tip",
    "review_priority",
    "confidence",
    "needs_manual_check",
  ]);
});
