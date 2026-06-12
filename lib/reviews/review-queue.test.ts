import assert from "node:assert/strict";
import { test } from "node:test";
import { moveStartQuestionToFront } from "./review-queue.ts";

const reviews = [
  { id: "r1", question_id: "q1" },
  { id: "r2", question_id: "q2" },
  { id: "r3", question_id: "q3" },
];

test("moveStartQuestionToFront moves the requested due review to the first position", () => {
  const ordered = moveStartQuestionToFront(reviews, "q2");

  assert.deepEqual(ordered.map((review) => review.question_id), ["q2", "q1", "q3"]);
});

test("moveStartQuestionToFront preserves the default queue when the requested question is absent", () => {
  const ordered = moveStartQuestionToFront(reviews, "missing");

  assert.deepEqual(ordered.map((review) => review.question_id), ["q1", "q2", "q3"]);
});
