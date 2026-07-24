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
  assert.match(deck, /disabled=\{navigationLocked \|\| safeActiveIndex === 0\}/);
  assert.match(deck, /disabled=\{navigationLocked \|\| safeActiveIndex >= reviews\.length - 1\}/);
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

  assert.match(source, /flex h-full min-h-0 flex-col/);
  assert.match(source, /activeReviewId=\{activeReviewId\}/);
  assert.match(source, /onActiveReviewChange=\{handleActiveReviewChange\}/);
  assert.match(deck, /directionLockThreshold = 10/);
  assert.match(deck, /horizontalDominanceRatio = 1\.25/);
  assert.match(deck, /gesture\.axis === "horizontal"/);
  assert.match(deck, /touch-pan-y/);
  assert.match(card, /overflow-y-auto overscroll-contain/);
  assert.match(card, /max-h-\[34dvh\]/);
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
  assert.match(source, /!\s*activeFilter && !isLoading \? renderDefaultPracticeEntry/);

  const defaultPanel = source.slice(
    source.indexOf("function renderDefaultPracticeEntry"),
    source.indexOf("function renderSummary"),
  );
  assert.doesNotMatch(defaultPanel, /chapterOptions/);
  assert.doesNotMatch(defaultPanel, /mistakeOptions/);
});

test("import preview keeps noisy per-card checks collapsed below the main import action", () => {
  const source = read("app/import/page.tsx");

  assert.match(source, /<details/);
  assert.match(source, /ImportImageBindingCard/);
  assert.match(source, /ImportPreviewCard/);
});
