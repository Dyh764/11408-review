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

  assert.match(source, /<MathText/);
  assert.match(source, /buildQuestionBadges/);
  assert.match(source, /默认按困难优先排序/);
  assert.match(source, /进入详情/);
  assert.doesNotMatch(source, /<MobileCard key=\{question\.id\}[\s\S]*<TextQuestionPreview/);
  assert.doesNotMatch(source, /getQuestionSourceLabel\(question\.source\)/);
  assert.doesNotMatch(source, />ai_unverified</);
  assert.doesNotMatch(source, />chatgpt_import</);
});

test("/questions uses taxonomy directory browsing before the final question list", () => {
  const source = read("app/questions/page.tsx");

  assert.match(source, /buildQuestionDirectory/);
  assert.match(source, /SubjectDirectory/);
  assert.match(source, /ChapterDirectory/);
  assert.match(source, /QuestionDirectory/);
  assert.match(source, /activeSubject/);
  assert.match(source, /activeChapter/);
  assert.match(source, /科目目录/);
  assert.match(source, /返回章节/);
  assert.match(source, /搜索 \/ 筛选/);
  assert.doesNotMatch(source, /<select[\s\S]*<SubjectDirectory/);
});

test("/questions keeps full filtering collapsed and away from the subject directory level", () => {
  const source = read("app/questions/page.tsx");
  const subjectDirectory = source.slice(source.indexOf("function SubjectDirectory"), source.indexOf("function ChapterDirectory"));

  assert.match(source, /function FilterPanel/);
  assert.match(source, /<details className="group rounded-lg border border-\[#d9cffd\] bg-white\/80/);
  assert.doesNotMatch(source, /<details[^>]*open/);
  assert.doesNotMatch(subjectDirectory, /FilterPanel|筛选 \/ 批量管理|搜索题目文字/);
});

test("/questions chapter level has only a small filter entry and no bulk action area", () => {
  const source = read("app/questions/page.tsx");
  const chapterDirectory = source.slice(source.indexOf("function ChapterDirectory"), source.indexOf("function QuestionDirectory"));

  assert.match(chapterDirectory, /<FilterPanel/);
  assert.match(chapterDirectory, /showSearch=\{false\}/);
  assert.doesNotMatch(chapterDirectory, /批量管理|已选择|标记已掌握|软删除|选择题目/);
});

test("/questions question level searches the current chapter and shows bulk actions only after selection", () => {
  const source = read("app/questions/page.tsx");
  const questionDirectory = source.slice(source.indexOf("function QuestionDirectory"));

  assert.match(questionDirectory, /placeholder="搜索本章题目"/);
  assert.match(questionDirectory, /selectedIds\.length > 0 \? \(/);
  assert.match(questionDirectory, /已选择 \{selectedIds\.length\} 题/);
  assert.match(questionDirectory, /标记已掌握/);
  assert.match(questionDirectory, /标记需修正/);
  assert.match(questionDirectory, /加入冲刺/);
  assert.match(questionDirectory, /软删除/);
  assert.doesNotMatch(questionDirectory, /showBatchTools && selectedIds\.length > 0/);
});

test("/questions chapter cards stay clean and hide empty uncategorized chapters", () => {
  const source = read("app/questions/page.tsx");
  const chapterDirectory = source.slice(source.indexOf("function ChapterDirectory"), source.indexOf("function QuestionDirectory"));

  assert.match(chapterDirectory, /visibleChapters/);
  assert.match(chapterDirectory, /chapter\.totalCount > 0/);
  assert.match(chapterDirectory, /待整理 \/ 未分类/);
  assert.doesNotMatch(chapterDirectory, /需核对\/修正 \{chapter\.needsAttentionCount\}/);
  assert.doesNotMatch(chapterDirectory, /StudyBadge tone=\{chapter\.needsAttentionCount > 0/);
});

test("QuestionListCard only exposes chapter, difficulty, and question-kind badges", () => {
  const source = read("components/mobile/QuestionListCard.tsx");

  assert.match(source, /chapter/);
  assert.match(source, /questionKind/);
  assert.match(source, /line-clamp-[35]/);
  assert.match(source, /text=\{summary\}/);
  assert.doesNotMatch(source, /subject:/);
  assert.doesNotMatch(source, /masteryStatus/);
  assert.doesNotMatch(source, /hasAnswer/);
  assert.doesNotMatch(source, /imageUrl/);
  assert.doesNotMatch(source, /hasImagePath/);
  assert.doesNotMatch(source, /文字卡/);
  assert.doesNotMatch(source, /one_sentence_tip/);
  assert.doesNotMatch(source, /solution_summary/);
});

test("TextQuestionPreview makes question text the primary visual for text-only cards", () => {
  const source = read("components/mobile/TextQuestionPreview.tsx");

  assert.match(source, /compact\?: boolean/);
  assert.match(source, /hideMeta\?: boolean/);
  assert.match(source, /hideTitle\?: boolean/);
  assert.match(source, /<MathText/);
  assert.match(source, /text=\{question_text\}/);
  assert.match(source, /line-clamp-[35]/);
  assert.doesNotMatch(source, /文字错题卡/);
  assert.doesNotMatch(source, /StatusPill label="文字题"/);
  assert.doesNotMatch(source, /StatusPill label="未绑定原图"/);
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
  const source = read("components/study/ReviewFlashcard.tsx");
  const reviewPage = read("app/review/page.tsx");

  assert.match(source, /canRecordReview/);
  assert.match(source, /!isChoiceQuestion/);
  assert.match(reviewPage, /draftAnswers/);
  assert.match(reviewPage, /setRevealedAnswers/);
  assert.match(source, /canRecordReview \?/);
});

test("/review presents priority as level and reasons, not raw score", () => {
  const source = read("components/study/ReviewFlashcard.tsx");
  const priority = read("lib/reviews/priority-score.ts");

  assert.match(source, /explainReviewPriorityScore/);
  assert.match(source, /priority\.level/);
  assert.match(source, /buildQuestionBadges/);
  assert.doesNotMatch(source, /优先级 \{Math\.round\(priority\.total\)\}/);
  assert.match(priority, /今日重点/);
  assert.match(priority, /高优先级/);
  assert.match(priority, /建议复习/);
  assert.match(priority, /普通复习/);
});

test("/review and /questions render math-capable text fields through MathText", () => {
  const review = read("components/study/ReviewFlashcard.tsx");
  const questions = read("app/questions/page.tsx");
  const answerPanel = read("components/mobile/AnswerPanel.tsx");

  assert.match(review, /text=\{questionDisplay\.questionText\}/);
  assert.match(review, /<TextQuestionPreview/);
  assert.match(review, /<ChoiceList/);
  assert.match(review, /<AnswerPanel/);
  assert.match(questions, /<MathText[\s\S]*text=\{question\.knowledge_point \?\?/);
  assert.match(questions, /<MathText[\s\S]*text=\{questionDisplay\.questionText \|\| question\.user_note\}/);
  assert.doesNotMatch(review, /text=\{review\.questions\.one_sentence_tip\}/);
  assert.match(answerPanel, /one_sentence_tip/);
  assert.match(answerPanel, /一句话提醒/);
});

test("/review keeps answer hints hidden until answer reveal", () => {
  const review = read("components/study/ReviewFlashcard.tsx");
  const answerPanel = read("components/mobile/AnswerPanel.tsx");

  const beforeAnswer = review.slice(review.indexOf("return ("), review.indexOf("{answerRevealed ?"));
  assert.match(beforeAnswer, /questionDisplay\.questionText/);
  assert.doesNotMatch(beforeAnswer, /one_sentence_tip/);
  assert.doesNotMatch(beforeAnswer, /answer_explanation/);
  assert.doesNotMatch(beforeAnswer, /key_steps/);
  assert.match(review, /one_sentence_tip=\{review\.questions\.one_sentence_tip\}/);
  assert.match(answerPanel, /answer_explanation/);
  assert.match(answerPanel, /key_steps/);
  assert.match(answerPanel, /one_sentence_tip/);
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

test("home page prioritizes daily actions and new questions before analysis", () => {
  const source = read("app/page.tsx");
  const reviewIndex = source.indexOf("今日待复习");
  const uploadIndex = source.indexOf("新增错题");
  const focusIndex = source.indexOf("今日提分焦点");

  assert.notEqual(reviewIndex, -1);
  assert.notEqual(uploadIndex, -1);
  assert.notEqual(focusIndex, -1);
  assert.ok(reviewIndex < uploadIndex);
  assert.ok(uploadIndex < focusIndex);
  assert.match(source, /开始今日复习/);
  assert.match(source, /查看今日题单/);
  assert.match(source, /拍题上传/);
  assert.match(source, /导入 ChatGPT 错题卡/);
  assert.match(source, /selectHomeFocusTrend/);
  assert.match(source, /暂无明显拖后腿知识点，先完成今日复习。/);
  assert.doesNotMatch(source, /weaknessTrends\.map/);
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
    "导入前质检",
    "可直接导入",
    "建议待整理",
    "严重错误",
  ]) {
    assert.match(source, new RegExp(text));
  }
});

test("/questions exposes focused practice and inbox entries without expanding bottom nav", () => {
  const questions = read("app/questions/page.tsx");
  const bottomNav = read("components/bottom-nav.tsx");

  assert.match(questions, /待整理/);
  assert.match(questions, /需要修正/);
  assert.match(questions, /未分类/);
  assert.match(questions, /href="\/practice"/);
  assert.match(bottomNav, /grid-cols-5/);
  assert.doesNotMatch(bottomNav, /\/practice/);
});

test("learning analytics surfaces stay mobile-first across home, review, questions, practice, and reports", () => {
  const home = read("app/page.tsx");
  const review = read("app/review/page.tsx");
  const questions = read("app/questions/page.tsx");
  const practice = read("app/practice/page.tsx");
  const reports = read("app/reports/page.tsx");

  assert.match(home, /buildWeaknessTrends/);
  assert.match(home, /今日提分焦点/);
  assert.match(home, /专项复盘/);
  assert.match(review, /buildRoundExposureSummary/);
  assert.match(review, /本轮暴露问题/);
  assert.match(questions, /buildQuestionQualitySummary/);
  assert.match(questions, /整理收件箱/);
  assert.match(questions, /showAiUnverified/);
  assert.match(questions, /includeAiUnverified: showAiUnverified/);
  assert.match(questions, /显示 AI 未核对/);
  assert.match(questions, /暂无需要立即整理的题卡/);
  assert.match(questions, /issue\.labels/);
  assert.match(questions, /key=\{issue\.questionId\}/);
  assert.match(practice, /URLSearchParams/);
  assert.match(practice, /topic/);
  assert.match(reports, /7 天薄弱点变化/);
  assert.match(reports, /题卡质量概览/);
});

test("/practice reuses the review flashcard component for chapter and mistake review", () => {
  const source = read("app/practice/page.tsx");
  const sharedCard = read("components/study/ReviewFlashcard.tsx");
  const todayReview = read("app/review/page.tsx");

  assert.match(source, /专项复盘/);
  assert.match(source, /章节复盘/);
  assert.match(source, /错因复盘/);
  assert.match(source, /buildPracticeCatalog/);
  assert.match(source, /filterPracticeQuestions/);
  assert.match(source, /ReviewFlashcard/);
  assert.match(todayReview, /ReviewFlashcard/);
  assert.match(sharedCard, /ChoiceList/);
  assert.match(sharedCard, /AnswerPanel/);
  assert.match(sharedCard, /canRecordReview/);
});

test("daily motivation uses a server route and browser cache instead of refreshing AI every render", () => {
  const banner = read("components/study/MotivationBanner.tsx");
  const route = read("app/api/motivation/today/route.ts");
  const home = read("app/page.tsx");
  const review = read("app/review/page.tsx");

  assert.match(banner, /localStorage/);
  assert.match(banner, /\/api\/motivation\/today/);
  assert.match(route, /generateMotivationLineWithAI/);
  assert.match(route, /fallback/);
  assert.match(home, /<MotivationBanner/);
  assert.match(review, /<MotivationBanner/);
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

test("home and today review list expose selectable due-review entry points", () => {
  const home = read("app/page.tsx");
  const today = read("app/review/today/page.tsx");
  const review = read("app/review/page.tsx");

  assert.match(home, /查看今日题单/);
  assert.match(today, /今日复习题单/);
  assert.match(today, /difficultyGroup/);
  assert.match(today, /buildQuestionBadges/);
  assert.match(today, /startQuestionId=\$\{review\.question_id\}/);
  assert.match(review, /moveStartQuestionToFront/);
  assert.match(review, /startQuestionId/);
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
