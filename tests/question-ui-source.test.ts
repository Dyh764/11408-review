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

test("import page previews only issue cards and persists last import undo ids", () => {
  const source = read("app/import/page.tsx");

  assert.match(source, /LAST_IMPORT_STORAGE_KEY/);
  assert.match(source, /localStorage\.setItem\(LAST_IMPORT_STORAGE_KEY/);
  assert.match(source, /localStorage\.getItem\(LAST_IMPORT_STORAGE_KEY/);
  assert.match(source, /clearImportDraft/);
  assert.match(source, /previewIssueCards/);
  assert.match(source, /previewIssueCards\.map/);
  assert.doesNotMatch(source, /previewCards\.map\(\(item\) => \(\s*<ImportPreviewCard/);
});

test("/questions uses taxonomy directory browsing before the final question list", () => {
  const source = read("app/questions/page.tsx");

  assert.match(source, /buildQuestionDirectory/);
  assert.match(source, /SubjectDirectory/);
  assert.match(source, /SourceDirectory/);
  assert.match(source, /SourcePartDirectory/);
  assert.match(source, /ChapterDirectory/);
  assert.match(source, /QuestionDirectory/);
  assert.match(source, /activeSubject/);
  assert.match(source, /activeSourceKey/);
  assert.match(source, /activeSourcePart/);
  assert.match(source, /activeChapter/);
  assert.match(source, /科目目录/);
  assert.match(source, /题源信息/);
  assert.match(source, /返回章节/);
  assert.match(source, /搜索 \/ 筛选/);
  assert.doesNotMatch(source, /按章节看/);
  assert.doesNotMatch(source, /按题源看/);
  assert.doesNotMatch(source, /<select[\s\S]*<SubjectDirectory/);
});

test("/questions keeps full filtering collapsed and away from the subject directory level", () => {
  const source = read("app/questions/page.tsx");
  const subjectDirectory = source.slice(source.indexOf("function SubjectDirectory"), source.indexOf("function ChapterDirectory"));

  assert.match(source, /function FilterPanel/);
  assert.match(source, /<details className="group rounded-lg border border-blue-100 bg-white\/80/);
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

test("question titles and topic labels use MathText so imported formulas do not show raw", () => {
  const listCard = read("components/mobile/QuestionListCard.tsx");
  const textPreview = read("components/mobile/TextQuestionPreview.tsx");
  const detail = read("app/questions/[id]/page.tsx");
  const importPage = read("app/import/page.tsx");

  assert.match(listCard, /<MathText[\s\S]*text=\{title\}/);
  assert.match(textPreview, /<MathText[\s\S]*text=\{topicLabel\}/);
  assert.match(textPreview, /<MathText[\s\S]*text=\{\[chapter, knowledge_point\]/);
  assert.match(importPage, /<MathText[\s\S]*text=\{card\.knowledge_point\}/);
  assert.match(detail, /text=\{item\.why_related\}/);
  assert.match(detail, /text=\{item\.rigor_check\}/);
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
    "答题卡点",
    "查看答案",
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
    source.indexOf('<MobileSection title="先做题"') <
      source.indexOf('<MobileSection title="答题卡点"'),
    "stuck-point controls should sit near the answering area",
  );
  assert.doesNotMatch(source, /<MobileSection title="我的卡点"/);
  assert.match(source, /stuckPointOptions/);
  assert.match(source, /toggleStuckPoint/);
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

test("home page is a wrong-question asset cockpit, not a technical menu", () => {
  const source = read("app/page.tsx");

  assert.match(source, /数学错题资产管理/);
  assert.match(source, /核心模块/);
  assert.match(source, /错题本/);
  assert.match(source, /今日提分焦点/);
  assert.match(source, /导入诊断/);
  assert.match(source, /错题分享/);
  assert.match(source, /loadHomeStats/);
  assert.match(source, /selectTodayLiftFocus/);
  assert.doesNotMatch(source, /dashboardStats/);
  assert.doesNotMatch(source, /开始今日复习|今日学习驾驶舱|打卡/);
  assert.doesNotMatch(source, /StatusPill label="mock"|>mock</);
});

test("design preview exposes isolated responsive 408 exam platform mocks", () => {
  const layout = read("app/layout.tsx");
  const source = read("app/design-preview/_components/design-preview.tsx");

  assert.match(layout, /AppShell/);
  assert.match(source, /function DesktopLayout/);
  assert.match(source, /function MobileLayout/);
  assert.match(source, /方案 A：接近 408os 的浅色 dashboard/);
  assert.match(source, /方案 B：首页深色科技风 \+ 内页浅色 dashboard/);
  assert.match(source, /方案 C：全浅色考试平台风/);
  assert.match(source, /DesktopLayout/);
  assert.match(source, /MobileLayout/);
  assert.match(source, /data-testid=\{`desktop-preview-\$\{variant\.key\}`\}/);
  assert.match(source, /data-testid=\{`mobile-preview-\$\{variant\.key\}`\}/);
  assert.match(source, /错题本/);
  assert.match(source, /导入错题/);
  assert.match(source, /408 四科入口/);
  assert.match(source, /本章欠缺分析/);
  assert.match(source, /最近错题/);
  assert.doesNotMatch(source, /createClient|from\("questions"\)|insert\(|update\(|delete\(/);
});

test("scheme C moves closer to the 408os light exam dashboard reference", () => {
  const source = read("app/design-preview/_components/design-preview.tsx");

  assert.match(source, /function ExamLogo/);
  assert.match(source, /function ContributionHeatmap/);
  assert.match(source, /function SchemeCDashboard/);
  assert.match(source, /function SchemeCMobile/);
  assert.match(source, /408真题系统/);
  assert.match(source, /首页面板/);
  assert.match(source, /真题总览/);
  assert.match(source, /真题分析/);
  assert.match(source, /知识图谱/);
  assert.match(source, /数据统计/);
  assert.match(source, /做题贡献（最近90天）/);
  assert.match(source, /四科掌握进度/);
  assert.match(source, /功能区/);
  assert.match(source, /我的收藏夹/);
  assert.match(source, /不熟题本/);
  assert.match(source, /不会题本/);
  assert.match(source, /最近错题/);
  assert.match(source, /本地学习档案/);
  assert.match(source, /408 错题库/);
  assert.match(source, /rounded-\[18px\]/);
  assert.match(source, /#10b981/);
  assert.doesNotMatch(source, /等一号|澄潇宇|帕拉迪宇|Bilibili|微信公众号|院校 PK|排行榜|支持项目/);
});

test("home page prioritizes core modules before lightweight focus", () => {
  const source = read("app/page.tsx");
  const modulesIndex = source.indexOf("核心模块");
  const focusIndex = source.indexOf("今日提分焦点");
  const questionsIndex = source.indexOf("/questions");
  const importIndex = source.indexOf("/import");

  assert.notEqual(modulesIndex, -1);
  assert.notEqual(focusIndex, -1);
  assert.notEqual(questionsIndex, -1);
  assert.notEqual(importIndex, -1);
  assert.ok(modulesIndex >= 0);
  assert.ok(focusIndex >= 0);
  assert.match(source, /打开错题本/);
  assert.match(source, /进入导入诊断/);
  assert.match(source, /暂无明显薄弱点，先完成错题复习/);
  assert.doesNotMatch(source, /selectHomeFocusTrend/);
  assert.doesNotMatch(source, /weaknessTrends\.map/);
});

test("home page applies the selected 408 exam platform layout without external identities", () => {
  const home = read("app/page.tsx");
  const shell = read("app/app-shell.tsx");

  assert.match(shell, /isHome/);
  assert.match(shell, /md:hidden/);
  assert.match(home, /function HomeDesktopLayout/);
  assert.match(home, /function HomeMobileLayout/);
  assert.match(home, /function HomeExamLogo/);
  assert.match(home, /function HomeContributionHeatmap/);
  assert.match(home, /data-testid="home-desktop-dashboard"/);
  assert.match(home, /data-testid="home-mobile-dashboard"/);
  assert.match(home, /desktopNavLinks/);
  assert.match(home, /href: "\/knowledge-map"/);
  assert.match(home, /href: "\/statistics"/);
  assert.match(home, /首页面板/);
  assert.match(home, /错题总览/);
  assert.match(home, /错题分析/);
  assert.match(home, /知识图谱/);
  assert.match(home, /数据统计/);
  assert.match(home, /408 错题训练系统/);
  assert.match(home, /做题贡献（最近90天）/);
  assert.match(home, /数学 \+ 408 掌握进度/);
  assert.match(home, /本章欠缺分析/);
  assert.match(home, /功能区/);
  assert.match(home, /学习档案/);
  assert.match(home, /#10b981/);
  assert.doesNotMatch(home, /等一号|澄潇宇|帕拉迪宇|Bilibili|微信公众号|院校 PK|排行榜|支持项目/);
});

test("home dashboard includes math in the subject progress system", () => {
  const home = read("app/page.tsx");

  assert.match(home, /const examSubjects = \["数学", "数据结构", "计算机组成原理", "操作系统", "计算机网络"\]/);
  assert.match(home, /数学 \+ 408 掌握进度/);
  assert.match(home, /数学 \+ 408 平均掌握率/);
  assert.match(home, /11408通关进度/);
  assert.match(home, /数学 \+ 408 入口/);
  assert.doesNotMatch(home, /四科掌握进度/);
  assert.doesNotMatch(home, /四科平均掌握率/);
});

test("home contribution panel has real review and practice entry points", () => {
  const home = read("app/page.tsx");

  assert.match(home, /function HomeContributionHeatmap/);
  assert.match(home, /reviewActivityTotal/);
  assert.match(home, /activeReviewDays/);
  assert.match(home, /href="\/review\/today"/);
  assert.match(home, /href="\/practice"/);
  assert.match(home, /今日复习/);
  assert.match(home, /专项练习/);
  assert.match(home, /90天内完成/);
});

test("non-home routes keep a desktop navigation shell instead of forcing phone width", () => {
  const shell = read("app/app-shell.tsx");

  assert.match(shell, /function DesktopAppNav/);
  assert.match(shell, /aria-label="桌面主导航"/);
  assert.match(shell, /max-w-\[1500px\]/);
  assert.match(shell, /lg:block/);
  assert.match(shell, /lg:hidden/);
  assert.doesNotMatch(shell, /return \(\s*<div className="phone-shell">/);
});

test("408 dashboard nav has lightweight knowledge map and statistics pages", () => {
  const knowledgeMap = read("app/knowledge-map/page.tsx");
  const statistics = read("app/statistics/page.tsx");

  assert.match(knowledgeMap, /知识图谱/);
  assert.match(knowledgeMap, /数据结构/);
  assert.match(knowledgeMap, /计算机组成原理/);
  assert.match(knowledgeMap, /操作系统/);
  assert.match(knowledgeMap, /计算机网络/);
  assert.match(knowledgeMap, /href="\/questions"/);
  assert.match(knowledgeMap, /href="\/practice"/);

  assert.match(statistics, /数据统计/);
  assert.match(statistics, /学习报告/);
  assert.match(statistics, /href: "\/reports"/);
  assert.match(statistics, /href: "\/questions\?scope=weak"/);
  assert.match(statistics, /href: "\/questions\?scope=inbox"/);
  assert.match(statistics, /不新建一套统计逻辑/);
  assert.match(statistics, /不新增 schema/);
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

test("import page keeps guidance compact so paste controls lead the mobile flow", () => {
  const source = read("app/import/page.tsx");
  const headerToPaste = source.slice(source.indexOf("<PageHeader"), source.indexOf("title=\"粘贴错题卡\""));

  assert.match(source, /<details[\s\S]*导入步骤/);
  assert.match(source, /模板与示例/);
  assert.match(source, /aria-label="导入到待整理"/);
  assert.doesNotMatch(headerToPaste, /<Notice[\s\S]*3 步完成导入/);
});

test("shared choice and math renderers keep mobile formulas aligned without page overflow", () => {
  const choices = read("components/mobile/ChoiceList.tsx");
  const mathText = read("components/mobile/MathText.tsx");
  const globals = read("app/globals.css");

  assert.match(choices, /min-h-12/);
  assert.match(choices, /rounded-xl/);
  assert.match(choices, /aria-pressed/);
  assert.match(choices, /items-start/);
  assert.match(mathText, /math-inline/);
  assert.match(mathText, /align-middle/);
  assert.doesNotMatch(mathText, /align-baseline/);
  assert.match(globals, /\.math-inline/);
  assert.match(globals, /max-width: 100%/);
  assert.match(globals, /overflow-x: auto/);
});

test("/questions exposes focused practice and inbox entries without expanding bottom nav", () => {
  const questions = read("app/questions/page.tsx");
  const bottomNav = read("components/bottom-nav.tsx");

  assert.match(questions, /待整理/);
  assert.match(questions, /需要修正/);
  assert.match(questions, /未分类/);
  assert.match(questions, /href="\/practice"/);
  assert.match(bottomNav, /grid-cols-5/);
  assert.match(bottomNav, /href: "\/practice"/);
  assert.doesNotMatch(bottomNav, /href: "\/upload"/);
  assert.doesNotMatch(bottomNav, /拍题/);
});

test("/questions removes the organize inbox card but keeps inbox filtering safeguards", () => {
  const questions = read("app/questions/page.tsx");

  assert.doesNotMatch(questions, /整理收件箱/);
  assert.match(questions, /quickScope === "inbox"/);
  assert.match(questions, /buildQuestionQualityIssues/);
  assert.match(questions, /待整理/);
  assert.match(questions, /清空错题库/);
});

test("learning analytics surfaces stay mobile-first across home, review, questions, practice, and reports", () => {
  const home = read("app/page.tsx");
  const review = read("app/review/page.tsx");
  const questions = read("app/questions/page.tsx");
  const practice = read("app/practice/page.tsx");
  const reports = read("app/reports/page.tsx");

  assert.match(home, /selectTodayLiftFocus/);
  assert.match(home, /今日提分焦点/);
  assert.match(home, /3道最该做错题/);
  assert.match(review, /buildRoundExposureSummary/);
  assert.match(review, /本轮暴露问题/);
  assert.match(questions, /buildQuestionQualityIssues/);
  assert.match(questions, /quickScope === "inbox"/);
  assert.match(questions, /需要修正/);
  assert.match(questions, /未分类/);
  assert.match(practice, /URLSearchParams/);
  assert.match(practice, /topic/);
  assert.match(reports, /7 天薄弱点变化/);
  assert.match(reports, /题卡质量概览/);
});

test("/practice reuses the review flashcard component for chapter and mistake review", () => {
  const source = read("app/practice/page.tsx");
  const sharedCard = read("components/study/ReviewFlashcard.tsx");
  const sharedDeck = read("components/study/ReviewFlashcardDeck.tsx");
  const todayReview = read("app/review/page.tsx");

  assert.match(source, /专项复盘/);
  assert.match(source, /章节复盘/);
  assert.match(source, /错因复盘/);
  assert.match(source, /buildPracticeCatalog/);
  assert.match(source, /filterPracticeQuestions/);
  assert.match(source, /ReviewFlashcard/);
  assert.match(source, /ReviewFlashcardDeck/);
  assert.match(todayReview, /ReviewFlashcardDeck/);
  assert.match(sharedDeck, /activeIndex/);
  assert.match(sharedDeck, /onTouchStart/);
  assert.match(sharedDeck, /onTouchEnd/);
  assert.match(sharedDeck, /ArrowLeft/);
  assert.match(sharedDeck, /ArrowRight/);
  assert.match(sharedDeck, /\/ \{reviews\.length\}/);
  assert.match(sharedCard, /ChoiceList/);
  assert.match(sharedCard, /AnswerPanel/);
  assert.match(sharedCard, /canRecordReview/);
});

test("daily motivation remains secondary and keeps cached server routing", () => {
  const banner = read("components/study/MotivationBanner.tsx");
  const route = read("app/api/motivation/today/route.ts");
  const home = read("app/page.tsx");
  const review = read("app/review/page.tsx");

  assert.match(banner, /localStorage/);
  assert.match(banner, /\/api\/motivation\/today/);
  assert.match(route, /generateMotivationLineWithAI/);
  assert.match(route, /fallback/);
  assert.doesNotMatch(home, /<MotivationBanner/);
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

test("import page keeps math template and adds a dedicated 408 GPT template", () => {
  const source = read("app/import/page.tsx");
  const schema = read("lib/import/import-schema.ts");

  assert.match(source, /copyChatGptPrompt/);
  assert.match(source, /copyExam408Prompt/);
  assert.match(source, /复制数学 GPT 整理模板/);
  assert.match(source, /复制 408 GPT 整理模板/);
  assert.match(schema, /exam408ImportPrompt/);
  assert.match(schema, /Import Protocol v2 JSON 数组/);
  assert.match(schema, /related_practice_questions/);
});

test("408 question detail shows related practice only for 408 and keeps answers hidden until click", () => {
  const source = read("app/questions/[id]/page.tsx");

  assert.match(source, /isExam408Subject/);
  assert.match(source, /RelatedPracticeSection/);
  assert.match(source, /同知识点类题检测/);
  assert.match(source, /查看答案与解析/);
  assert.match(source, /visibleAnswerIndexes/);
  assert.match(source, /related_practice_questions/);
  assert.match(source, /question\.subject !== "数学"/);
});

test("/questions chapter level surfaces rule-based chapter weakness analysis", () => {
  const source = read("app/questions/page.tsx");
  const questionDirectory = source.slice(source.indexOf("function QuestionDirectory"));

  assert.match(source, /analyzeChapterWeakness/);
  assert.match(source, /ChapterWeaknessPanel/);
  assert.match(source, /本章欠缺分析/);
  assert.match(source, /frequent_knowledge_points/);
  assert.match(source, /next_review_suggestions/);
  assert.ok(
    questionDirectory.indexOf("chapter.questions.map") < questionDirectory.indexOf("ChapterWeaknessPanel"),
    "chapter weakness analysis should appear after the question list",
  );
});

test("/review uses the shared swipe deck instead of a next-button interstitial", () => {
  const source = read("app/review/page.tsx");

  assert.match(source, /handleSkipReview/);
  assert.match(source, /ReviewFlashcardDeck/);
  assert.match(source, /跳过本题/);
  assert.match(source, /返回错题库/);
  assert.match(source, /不记录本次结果/);
  assert.doesNotMatch(source, /lastCompletedReview/);
  assert.doesNotMatch(source, /下一题/);
});

test("question detail saves images through system share when available and uses the current light card UI", () => {
  const source = read("app/questions/[id]/page.tsx");

  assert.match(source, /保存图片/);
  assert.match(source, /navigator\.share/);
  assert.match(source, /new File/);
  assert.match(source, /分享面板/);
  assert.match(source, /bg-white p-\[48px\]/);
  assert.doesNotMatch(source, /紫色错题卡片/);
  assert.doesNotMatch(source, /#d8ccff/);
  assert.doesNotMatch(source, /rounded-\[32px\]/);
});

test("review remains reachable as a secondary route with selectable entry points", () => {
  const home = read("app/page.tsx");
  const bottomNav = read("components/bottom-nav.tsx");
  const today = read("app/review/today/page.tsx");
  const review = read("app/review/page.tsx");

  assert.match(home, /href="\/questions"/);
  assert.doesNotMatch(bottomNav, /href: "\/review"/);
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

test("v3 home page is an asset and decision system, not a daily review loop", () => {
  const source = read("app/page.tsx");

  assert.match(source, /selectTodayLiftFocus/);
  assert.match(source, /数学错题资产管理/);
  assert.match(source, /3道最该做错题/);
  assert.match(source, /今日提分焦点/);
  assert.match(source, /导入诊断/);
  assert.match(source, /错题分享/);
  assert.doesNotMatch(source, /dueToday|completedToday|completionRate/);
  assert.doesNotMatch(source, /开始今日复习|今日待复习|今日学习进度|打卡/);
});

test("v3 bottom navigation removes review as a primary module", () => {
  const source = read("components/bottom-nav.tsx");

  assert.doesNotMatch(source, /href: "\/review"/);
  assert.doesNotMatch(source, /href: "\/upload"/);
  assert.match(source, /href: "\/questions"/);
  assert.match(source, /href: "\/import"/);
  assert.match(source, /href: "\/practice"/);
});

test("primary learning copy routes users to import or practice instead of upload", () => {
  const home = read("app/page.tsx");
  const questions = read("app/questions/page.tsx");
  const practice = read("app/practice/page.tsx");
  const reports = read("lib/reports/rule-report.ts");

  assert.doesNotMatch(home, /拍题|\/upload/);
  assert.doesNotMatch(questions, /去拍题|先拍一题|href: "\/upload"|href=\{?["']\/upload/);
  assert.doesNotMatch(practice, /拍题上传|先拍题/);
  assert.doesNotMatch(reports, /先去拍题|拍题或导入/);
  assert.match(questions, /导入 ChatGPT 错题卡|导入错题卡/);
});

test("v3 questions page exposes asset filters and share entry without changing review routes", () => {
  const source = read("app/questions/page.tsx");
  const detail = read("app/questions/[id]/page.tsx");

  assert.match(source, /mistakeType/);
  assert.match(source, /knowledgeKeyword/);
  assert.match(source, /quickScope === "recent"/);
  assert.match(source, /quickScope === "weak"/);
  assert.match(source, /quickScope === "inbox"/);
  assert.match(detail, /share-card/);
  assert.match(detail, /generateShareCardImage/);
});

test("/questions keeps question rows visible when due-review loading fails", () => {
  const source = read("app/questions/page.tsx");

  assert.match(source, /formatSupabaseError/);
  assert.match(source, /loadQuestions\(\)/);
  assert.match(source, /loadDueTodayIds\(\)/);
  assert.match(source, /今日复习状态读取失败/);
  assert.match(source, /\.eq\("user_id", user\.id\)/);
  assert.doesNotMatch(source, /Promise\.all\(\[\s*fetchCurrentUserQuestions\(supabase\)/);
});

test("/questions exposes a guarded clear-library action", () => {
  const source = read("app/questions/page.tsx");

  assert.match(source, /handleClearQuestionLibrary/);
  assert.match(source, /清空错题库/);
  assert.match(source, /body: JSON\.stringify\(\{ all: true \}\)/);
  assert.match(source, /setQuestions\(\[\]\)/);
  assert.match(source, /此操作会软删除当前错题库中的全部错题/);
});

test("import page confirms import from the top action panel and supports undoing the last import", () => {
  const source = read("app/import/page.tsx");
  const bottomPreview = source.slice(source.indexOf("{previewCards.map"));

  assert.match(source, /function ImportActionPanel/);
  assert.match(source, /顶部确认/);
  assert.match(source, /handleUndoLastImport/);
  assert.match(source, /lastImportSuccesses/);
  assert.match(source, /body: JSON\.stringify\(\{ ids: lastImportSuccesses\.map/);
  assert.match(source, /查看最近导入/);
  assert.match(source, /撤销本次导入/);
  assert.doesNotMatch(bottomPreview, /确认导入/);
  assert.doesNotMatch(bottomPreview, /导入到待整理/);
});
