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

  assert.match(source, /<QuestionListCard/);
  assert.doesNotMatch(source, /<MobileCard key=\{question\.id\}[\s\S]*<TextQuestionPreview/);
  assert.doesNotMatch(source, /getQuestionSourceLabel\(question\.source\)/);
  assert.doesNotMatch(source, />ai_unverified</);
  assert.doesNotMatch(source, />chatgpt_import</);
});

test("TextQuestionPreview exposes compact, hideMeta, and hideTitle controls", () => {
  const source = read("components/mobile/TextQuestionPreview.tsx");

  assert.match(source, /compact\?: boolean/);
  assert.match(source, /hideMeta\?: boolean/);
  assert.match(source, /hideTitle\?: boolean/);
  assert.match(source, /<MathText/);
});

test("/questions/[id] keeps detail information in the requested groups", () => {
  const source = read("app/questions/[id]/page.tsx");

  for (const title of [
    "题目区",
    "基础信息",
    "学习状态",
    "先做题",
    "查看答案",
    "我的卡点",
    "正确思路",
    "智能增强",
    "更多操作",
  ]) {
    assert.match(source, new RegExp(title));
  }

  assert.ok(
    source.indexOf("先做题") < source.indexOf("查看答案"),
    "detail page should prompt self-solving before answer reveal",
  );
  assert.ok(
    source.indexOf("查看答案") < source.indexOf("我的卡点"),
    "answer reveal should appear before notes and solution summaries",
  );
});

test("mobile UI exposes the mature learning-app components", () => {
  const source = read("components/mobile/primitives.tsx");

  for (const component of [
    "MobilePageShell",
    "PrimaryActionCard",
    "SectionCard",
    "EmptyState",
    "LoadingState",
    "ErrorState",
  ]) {
    assert.match(source, new RegExp(`function ${component}|const ${component}`));
  }
});

test("home page is a today learning cockpit, not a technical menu", () => {
  const source = read("app/page.tsx");

  assert.match(source, /今日学习驾驶舱/);
  assert.match(source, /开始今日复习/);
  assert.match(source, /拍题上传/);
  assert.match(source, /导入 ChatGPT 错题卡/);
  assert.match(source, /更多入口/);
  assert.match(source, /loadDashboardStats/);
  assert.doesNotMatch(source, /dashboardStats/);
  assert.doesNotMatch(source, /刷新智能分析/);
  assert.doesNotMatch(source, /StatusPill label="mock"|>mock</);
});

test("import page explains JSON import with aggregate preview stats", () => {
  const source = read("app/import/page.tsx");

  for (const text of [
    "复制 ChatGPT 生成的 JSON",
    "粘贴到这里",
    "预览确认后导入",
    "共解析",
    "包含答案",
    "未绑定原图",
    "需要核对",
  ]) {
    assert.match(source, new RegExp(text));
  }
});

test("reports and settings use learning and account language instead of ops language", () => {
  const reports = read("app/reports/page.tsx");
  const settings = read("app/settings/page.tsx");

  assert.match(reports, /还没有报告。完成几次导入或复习后，可以生成学习总结。/);
  assert.match(reports, /今日总结/);
  assert.match(reports, /薄弱点 Top 3/);
  assert.match(reports, /有答案 \/ 无答案 \/ 待核对/);
  assert.doesNotMatch(reports, /Cron|Edge Function/);

  assert.match(settings, /账号与数据/);
  assert.match(settings, /主要功能状态/);
  assert.match(settings, /可选增强/);
  assert.match(settings, /当前主流程不依赖 OpenAI、Gemini 或 DeepSeek/);
  assert.doesNotMatch(settings, /Bucket:|保存 timezone|image_path/);
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
