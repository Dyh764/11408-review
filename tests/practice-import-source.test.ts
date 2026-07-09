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
  assert.match(
    deck,
    /const navigationLocked = activeReview \? Boolean\(isNavigationLocked\?\.\(activeReview\)\) : false/,
  );
  assert.match(deck, /function handleKeyDown\(event: KeyboardEvent\) \{\s*if \(navigationLocked\) \{/);
  assert.match(deck, /if \(navigationLocked\) \{\s*return;\s*\}/);
  assert.match(deck, /disabled=\{navigationLocked \|\| safeActiveIndex === 0\}/);
  assert.match(deck, /disabled=\{navigationLocked \|\| safeActiveIndex >= reviews\.length - 1\}/);
  assert.doesNotMatch(deck, /先看完解析/);
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
