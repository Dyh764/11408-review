import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("/practice keeps submitted choice feedback visible before moving to the next card", () => {
  const source = read("app/practice/page.tsx");
  const card = read("components/study/ReviewFlashcard.tsx");

  const submitBlock = source.slice(
    source.indexOf("function handleChoiceSubmitAndNext"),
    source.indexOf("function renderSummary"),
  );

  assert.match(submitBlock, /setSubmittedChoices/);
  assert.match(submitBlock, /setRevealedAnswers/);
  assert.doesNotMatch(submitBlock, /completeReviewLocally/);
  assert.match(source, /function handleChoiceFeedbackNext/);
  assert.doesNotMatch(
    source,
    /isNavigationLocked=\{\(review\) => Boolean\(submittedChoices\[review\.id\]\)\}/,
  );
  assert.match(card, /onNextAfterFeedback/);
  assert.match(card, /canMoveToNextChoice/);
  assert.match(card, /disabled=\{processingLocked \|\| submittedChoice\}/);
});

test("/practice keeps deck navigation available after submitting a choice", () => {
  const deck = read("components/study/ReviewFlashcardDeck.tsx");

  assert.match(deck, /isNavigationLocked\?: \(review: T\) => boolean/);
  assert.match(deck, /const navigationLocked = activeReview[\s\S]*Boolean\(isNavigationLocked\?\.\(activeReview\)\)/);
  assert.match(deck, /function handleKeyDown\(event: KeyboardEvent\)/);
  assert.match(deck, /event\.key === "ArrowLeft"/);
  assert.match(deck, /event\.key === "ArrowRight"/);
  assert.match(deck, /if \(navigationLocked\) \{\s*return;\s*\}/);
  assert.match(deck, /loopNavigation\?: boolean/);
  assert.match(deck, /!loopNavigation && safeActiveIndex === 0/);
  assert.match(deck, /!loopNavigation && safeActiveIndex >= reviews\.length - 1/);
  assert.doesNotMatch(deck, /先看完解析/);
});

test("/practice retires a submitted card when the deck advances", () => {
  const source = read("app/practice/page.tsx");
  const deck = read("components/study/ReviewFlashcardDeck.tsx");

  assert.match(deck, /onAdvance\?: \(review: T\) => boolean/);
  assert.match(deck, /activeReview && onAdvance\?\.\(activeReview\)/);
  assert.match(source, /onAdvance=\{\(review\) => \{/);
  assert.match(source, /resultRecorded/);
  assert.match(source, /!submittedChoices\[review\.id\] \|\| !resultRecorded/);
  assert.match(source, /handleChoiceFeedbackNext\(review\)/);
});

test("/practice persists a scoped resumable round and filters unavailable image questions", () => {
  const source = read("app/practice/page.tsx");
  const session = read("lib/practice/practice-session.ts");
  const image = read("lib/questions/question-image.ts");

  assert.match(source, /preparePracticeRound/);
  assert.match(source, /parsePracticeSession/);
  assert.match(source, /selectPracticeResumeQuestionId/);
  assert.match(source, /completePracticeQuestion/);
  assert.match(source, /skipPracticeQuestion/);
  assert.match(source, /filter\(canUseQuestionInPractice\)/);
  assert.match(source, /自动跳过/);
  assert.match(session, /PracticeSessionV1/);
  assert.match(session, /remainingQuestionIds/);
  assert.match(session, /lastActiveQuestionId/);
  assert.match(image, /questionDependsOnImage/);
});

test("/practice uses a fixed focus shell with directional swipe locking", () => {
  const source = read("app/practice/page.tsx");
  const deck = read("components/study/ReviewFlashcardDeck.tsx");
  const card = read("components/study/ReviewFlashcard.tsx");
  const sourceImage = read("components/study/QuestionSourceImage.tsx");
  const shell = read("app/app-shell.tsx");

  assert.match(source, /flex h-full min-h-0 flex-col/);
  assert.match(source, /activeReviewId=\{activeReviewId\}/);
  assert.match(source, /onActiveReviewChange=\{handleActiveReviewChange\}/);
  assert.match(deck, /directionLockThreshold = 10/);
  assert.match(deck, /horizontalDominanceRatio = 1\.25/);
  assert.match(deck, /gesture\.axis === "horizontal"/);
  assert.match(deck, /touch-pan-y/);
  assert.match(card, /overflow-y-auto overscroll-contain/);
  assert.match(card, /QuestionSourceImage/);
  assert.match(sourceImage, /sourceInfo\?\.image_crop/);
  assert.match(sourceImage, /crop\.page_width \/ crop\.width/);
  assert.match(sourceImage, /max-h-\[30dvh\]/);
  assert.match(card, /compact=\{focusMode\}/);
  assert.match(read("components/mobile/ChoiceList.tsx"), /answer-choice flex w-full max-w-full/);
  assert.match(shell, /isPractice\s*\?\s*"h-full min-h-0 overflow-hidden"/);
  assert.match(shell, /!isPractice \?/);
});

test("submitted choices render per-option explanations with a legacy fallback", () => {
  const card = read("components/study/ReviewFlashcard.tsx");
  const choices = read("components/mobile/ChoiceList.tsx");
  const answer = read("components/mobile/AnswerPanel.tsx");

  assert.match(card, /parseChoiceExplanations/);
  assert.match(card, /explanationsByLabel=\{choiceExplanations\.explanationsByLabel\}/);
  assert.match(card, /showExplanation=\{!choiceExplanations\.complete\}/);
  assert.match(choices, /explanationsByLabel\?: Record<string, string>/);
  assert.match(choices, /项解析/);
  assert.match(answer, /showExplanation\?: boolean/);
});

test("/practice default entry is a 408 choice drill surface, not the old mixed chapter catalog", () => {
  const source = read("app/practice/page.tsx");

  assert.match(source, /exam408SubjectOptions/);
  assert.match(source, /exam408ChoiceTotal/);
  assert.match(source, /resetRound\(\{ type: "exam408-choice" \}\)/);
  assert.match(source, /renderDefaultPracticeEntry\(\)/);
  assert.match(source, /每日一题/);
  assert.match(source, /个人高频错题/);
  assert.match(source, /href="\/knowledge-map"/);

  const defaultPanel = source.slice(
    source.indexOf("function renderDefaultPracticeEntry"),
    source.indexOf("function renderSummary"),
  );
  assert.doesNotMatch(defaultPanel, /chapterOptions/);
  assert.doesNotMatch(defaultPanel, /mistakeOptions/);
});

test("home owns the professional launcher while /practice executes every real answer mode", () => {
  const home = read("app/page.tsx");
  const launcher = read("components/study/ProfessionalPracticeLauncher.tsx");
  const source = read("app/practice/page.tsx");
  const card = read("components/study/ReviewFlashcard.tsx");
  const deck = read("components/study/ReviewFlashcardDeck.tsx");
  const catalog = read("lib/practice/practice-catalog.ts");
  const mode = read("lib/practice/practice-mode.ts");

  assert.match(home, /ProfessionalPracticeLauncher/);
  assert.match(launcher, /408 专业刷题/);
  assert.match(launcher, /4 可用/);
  assert.match(launcher, /当前条件不可用/);
  assert.match(launcher, /配套模块检测/);
  assert.match(launcher, /mode: "exam408-choice"/);
  assert.match(launcher, /params\.set\("sourceRange"/);
  assert.match(launcher, /params\.set\("difficulty"/);
  assert.doesNotMatch(source, /VIP 专业刷题|vipSourceRange|vipDifficulty/);
  assert.match(source, /sourceRangeParam/);
  assert.match(source, /difficultyParam/);
  assert.match(source, /activeAnswerMode === "repeat"/);
  assert.match(source, /handleEditChoice/);
  assert.match(source, /handleOpenBookNext/);
  assert.match(card, /practiceMode === "quick-fill"/);
  assert.match(card, /标记做错/);
  assert.match(card, /标记做对/);
  assert.match(card, /practiceMode === "open-book"/);
  assert.match(card, /修改答案/);
  assert.match(deck, /loopNavigation/);
  assert.match(catalog, /getPracticeSourceRange/);
  assert.match(catalog, /canUseQuestionInAnswerMode/);
  assert.match(mode, /editable/);
  assert.match(mode, /repeat/);
  assert.match(mode, /open-book/);
  assert.match(mode, /quick-fill/);
});

test("import preview keeps noisy per-card checks collapsed below the main import action", () => {
  const source = read("app/import/page.tsx");

  assert.match(source, /<details/);
  assert.match(source, /ImportImageBindingCard/);
  assert.match(source, /ImportPreviewCard/);
});

test("question-bank importer uploads only real figures and clears wrong images from text-only cards", () => {
  const source = read("app/import/question-bank/page.tsx");
  const importPage = read("app/import/page.tsx");
  const api = read("app/api/import/route.ts");
  const builder = read("scripts/build_wangdao_question_bank.py");
  const verifier = read("scripts/verify_wangdao_question_bank.py");

  assert.match(importPage, /href="\/import\/question-bank"/);
  assert.match(source, /webkitdirectory/);
  assert.match(source, /uniqueAssetNames/);
  assert.match(source, /uploadConcurrency = 6/);
  assert.match(source, /importChunkSize = 60/);
  assert.match(source, /upsert: true/);
  assert.match(source, /fetch\("\/api\/import"/);
  assert.match(source, /replaceExisting: true/);
  assert.match(source, /updatedCount/);
  assert.match(api, /source_info->>import_key/);
  assert.match(api, /skipped: true/);
  assert.match(api, /buildQuestionRefresh/);
  assert.match(api, /updated: true/);
  const refreshFields =
    api.match(/function buildQuestionRefresh[\s\S]*?\n}\n\nasync function runPool/)?.[0] ?? "";
  assert.match(refreshFields, /image_path: card\.image_path/);
  assert.match(refreshFields, /source_info: card\.source_info/);
  assert.doesNotMatch(
    refreshFields,
    /mastery_status|user_note|mistake_types|review_priority/,
  );
  assert.match(source, /image_path: null/);
  assert.match(source, /wangdao-27-v3/);
  assert.match(builder, /figure-v3-/);
  assert.match(builder, /"kind": "question_figure"/);
  assert.match(builder, /普通文字题不绑定图片/);
  assert.match(builder, /不包含题干、选项或同页其他题/);
  assert.match(verifier, /普通文字题错误绑定了图片/);
  assert.match(verifier, /被多题共用的图片/);
});

test("large question banks and due reviews paginate queries and batch-sign image paths", () => {
  const questions = read("lib/questions.ts");
  const reviews = read("lib/reviews.ts");

  assert.match(questions, /\.range\(offset, offset \+ 999\)/);
  assert.match(questions, /\.createSignedUrls\(batch/);
  assert.match(reviews, /\.range\(offset, offset \+ 999\)/);
  assert.match(reviews, /\.createSignedUrls\(batch/);
});
