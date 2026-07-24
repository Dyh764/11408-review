import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPracticeScopeKey,
  completePracticeQuestion,
  createPracticeSession,
  markPracticeQuestionShown,
  parsePracticeSession,
  reconcilePracticeSession,
  removeUnavailablePracticeQuestion,
  selectPracticeResumeQuestionId,
  skipPracticeQuestion,
} from "./practice-session.ts";

const filter = { type: "exam408-choice", subject: "操作系统" } as const;

test("builds independent scope keys for subject and chapter rounds", () => {
  assert.equal(buildPracticeScopeKey(filter), "exam408-choice:操作系统:all");
  assert.equal(
    buildPracticeScopeKey({
      type: "exam408-choice",
      subject: "操作系统",
      chapter: "进程与线程",
    }),
    "exam408-choice:操作系统:进程与线程",
  );
});

test("reopening resumes after the last shown unfinished question", () => {
  let session = createPracticeSession({
    userId: "u1",
    filter,
    questionIds: ["q1", "q2", "q3"],
    random: () => 0.999,
    now: "2026-07-24T00:00:00.000Z",
  });

  assert.equal(selectPracticeResumeQuestionId(session), "q1");
  session = markPracticeQuestionShown(session, "q1");
  assert.equal(selectPracticeResumeQuestionId(session), "q2");
  session = markPracticeQuestionShown(session, "q2");
  assert.equal(selectPracticeResumeQuestionId(session), "q3");
});

test("completed and skipped questions leave the remaining round and keep counters", () => {
  let session = createPracticeSession({
    userId: "u1",
    filter,
    questionIds: ["q1", "q2", "q3"],
    random: () => 0.999,
  });

  session = completePracticeQuestion(session, "q1", "mastered");
  session = skipPracticeQuestion(session, "q2");

  assert.deepEqual(session.remainingQuestionIds, ["q3"]);
  assert.equal(session.completedCounts.mastered, 1);
  assert.equal(session.skippedCount, 1);
});

test("reconciliation drops deleted questions and appends newly imported questions", () => {
  const session = createPracticeSession({
    userId: "u1",
    filter,
    questionIds: ["old", "keep"],
    random: () => 0.999,
  });
  const reconciled = reconcilePracticeSession(session, ["keep", "new"]);

  assert.deepEqual(reconciled.orderedQuestionIds, ["keep", "new"]);
  assert.deepEqual(reconciled.remainingQuestionIds, ["keep", "new"]);
});

test("new rounds avoid reusing the previous first question when alternatives exist", () => {
  const session = createPracticeSession({
    userId: "u1",
    filter,
    questionIds: ["q1", "q2", "q3"],
    previousFirstQuestionId: "q1",
    random: () => 0.999,
  });

  assert.notEqual(session.orderedQuestionIds[0], "q1");
});

test("unavailable image questions are removed without changing result or skip counts", () => {
  const session = removeUnavailablePracticeQuestion(
    createPracticeSession({
      userId: "u1",
      filter,
      questionIds: ["missing", "usable"],
      random: () => 0.999,
    }),
    "missing",
  );

  assert.deepEqual(session.remainingQuestionIds, ["usable"]);
  assert.equal(session.skippedCount, 0);
  assert.deepEqual(session.completedCounts, {
    still_wrong: 0,
    improved: 0,
    mastered: 0,
    wrong_again: 0,
  });
});

test("invalid or obsolete local data falls back safely", () => {
  assert.equal(parsePracticeSession(null), null);
  assert.equal(parsePracticeSession("{broken"), null);
  assert.equal(parsePracticeSession(JSON.stringify({ version: 0 })), null);

  const session = createPracticeSession({
    userId: "u1",
    filter,
    questionIds: ["q1"],
    random: () => 0.999,
  });
  assert.deepEqual(parsePracticeSession(JSON.stringify(session)), session);
});
