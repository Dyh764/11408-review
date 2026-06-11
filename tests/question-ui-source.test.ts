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

test("/questions groups cards by subject and delegates difficulty ordering", () => {
  const source = read("app/questions/page.tsx");

  assert.match(source, /groupQuestionsBySubjectAndDifficulty/);
  assert.match(source, /groupedQuestions/);
  assert.match(source, /group\.subject/);
  assert.match(source, /group\.count/);
});

test("QuestionListCard only exposes chapter, difficulty, and question-kind badges", () => {
  const source = read("components/mobile/QuestionListCard.tsx");

  assert.match(source, /chapter/);
  assert.match(source, /questionKind/);
  assert.doesNotMatch(source, /subject:/);
  assert.doesNotMatch(source, /masteryStatus/);
  assert.doesNotMatch(source, /hasAnswer/);
  assert.doesNotMatch(source, /imageUrl/);
  assert.doesNotMatch(source, /hasImagePath/);
  assert.doesNotMatch(source, /文字卡/);
});

test("TextQuestionPreview exposes compact, hideMeta, and hideTitle controls", () => {
  const source = read("components/mobile/TextQuestionPreview.tsx");

  assert.match(source, /compact\?: boolean/);
  assert.match(source, /hideMeta\?: boolean/);
  assert.match(source, /hideTitle\?: boolean/);
  assert.match(source, /<MathText/);
});

test("/questions/[id] renders the question directly and keeps metadata collapsed", () => {
  const source = read("app/questions/[id]/page.tsx");

  assert.doesNotMatch(source, /TextQuestionPreview/);
  assert.doesNotMatch(source, /文字错题卡/);
  assert.doesNotMatch(source, /<MobileSection title="[^"]*基础信息/);
  assert.doesNotMatch(source, /<MobileSection title="[^"]*学习状态/);
  assert.match(source, /<details/);
  assert.match(source, /<summary/);
  assert.doesNotMatch(source, /<details[^>]*open/);
});

test("/review records non-choice results only after answer reveal", () => {
  const source = read("app/review/page.tsx");

  assert.match(source, /canRecordReview/);
  assert.match(source, /!isChoiceQuestion/);
  assert.match(source, /draftAnswers/);
  assert.match(source, /setRevealedAnswers/);
  assert.match(source, /canRecordReview \?/);
});

test("/questions/[id] keeps detail information in the requested learning-flow order", () => {
  const source = read("app/questions/[id]/page.tsx");

  for (const title of [
    "题目",
    "先做题",
    "查看答案",
    "我的卡点",
    "正确思路",
    "智能增强",
    "更多信息",
    "更多操作",
  ]) {
    assert.match(source, new RegExp(title));
  }

  assert.ok(
    source.indexOf("题目") < source.indexOf("先做题"),
    "question should lead the detail page",
  );
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

test("import page exposes copyable ChatGPT prompt and JSON example templates", () => {
  const source = read("app/import/page.tsx");
  const schema = read("lib/import/import-schema.ts");

  assert.match(source, /copyChatGptPrompt/);
  assert.match(source, /copyImportExampleJson/);
  assert.match(source, /复制 ChatGPT 整理指令/);
  assert.match(source, /复制 JSON 示例/);
  assert.match(source, /已复制，可粘贴给 ChatGPT 使用。/);
  assert.match(schema, /chatGptImportPrompt/);
  assert.match(schema, /standard_answer 必须以“答案：”开头/);
  assert.match(schema, /answer_explanation 必须以“过程：”开头/);
});

test("/review supports skipping and explicit next-step actions after recording", () => {
  const source = read("app/review/page.tsx");

  assert.match(source, /handleSkipReview/);
  assert.match(source, /setLastCompletedReview/);
  assert.match(source, /跳过本题/);
  assert.match(source, /下一题/);
  assert.match(source, /返回错题库/);
  assert.match(source, /不记录本次结果/);
});

test("/questions/[id] shows AI enhancement change summaries and manual verification actions", () => {
  const source = read("app/questions/[id]/page.tsx");
  const route = read("app/api/questions/[id]/route.ts");
  const summary = read("lib/questions/ai-enhancement-summary.ts");

  assert.match(source, /buildAiEnhancementSummary/);
  assert.match(source, /aiEnhancementSummary/);
  assert.match(summary, /AI 已检查题卡，未发现需要明显修改的字段。/);
  assert.match(source, /标记题目已核对/);
  assert.match(source, /标记答案已核对/);
  assert.match(source, /标记需要修正/);
  assert.match(source, /handleMarkQuestionVerified/);
  assert.match(source, /handleMarkAnswerVerified/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /question_text_status/);
  assert.match(route, /answer_status/);
  assert.doesNotMatch(route, /question_text:/);
  assert.doesNotMatch(route, /standard_answer:/);
  assert.doesNotMatch(route, /choices:/);
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
