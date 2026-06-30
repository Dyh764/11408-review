import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("006 migration adds choices jsonb without touching delete or answer fields", () => {
  const migrationPath = "supabase/migrations/006_add_question_choices.sql";

  assert.equal(existsSync(join(root, migrationPath)), true);

  const sql = read(migrationPath);
  assert.match(sql, /alter table public\.questions/i);
  assert.match(sql, /add column if not exists choices jsonb not null default '\[\]'::jsonb/i);
  assert.doesNotMatch(sql, /deleted_at/i);
  assert.doesNotMatch(sql, /storage\.objects/i);
});

test("questions queries include choices for list, detail, and review", () => {
  assert.match(read("lib/questions.ts"), /choices/);
  assert.match(read("lib/reviews.ts"), /choices/);
});

test("import schema accepts choices and persists them during import", () => {
  const schema = read("lib/import/import-schema.ts");
  const route = read("app/api/import/route.ts");

  assert.match(schema, /choices: ChoiceOption\[\]/);
  assert.match(schema, /extractChoicesFromQuestionText/);
  assert.match(schema, /choices,/);
  assert.match(route, /choices: card\.choices/);
});

test("import route batches question inserts, review plans, and knowledge stat refreshes", () => {
  const route = read("app/api/import/route.ts");
  const knowledgeStats = read("lib/knowledge-stats.ts");

  assert.match(route, /pendingInserts/);
  assert.match(route, /\.from\("questions"\)\s*\n\s*\.insert\(pendingInserts\.map/);
  assert.match(route, /reviewPlans\.flatMap/);
  assert.match(route, /\.from\("reviews"\)\s*\n\s*\.upsert\(reviewRows/);
  assert.match(route, /updateKnowledgeStatsForQuestionIds/);
  assert.match(knowledgeStats, /export async function updateKnowledgeStatsForQuestionIds/);
});

test("related practice questions use a minimal jsonb migration and flow through import and question queries", () => {
  const migrationPath = "supabase/migrations/008_add_related_practice_questions.sql";

  assert.equal(existsSync(join(root, migrationPath)), true);

  const sql = read(migrationPath);
  assert.match(sql, /add column if not exists related_practice_questions jsonb not null default '\[\]'::jsonb/i);
  assert.match(read("lib/import/import-schema.ts"), /related_practice_questions/);
  assert.match(read("app/api/import/route.ts"), /related_practice_questions: card\.related_practice_questions/);
  assert.match(read("lib/questions.ts"), /related_practice_questions/);
});

test("choices render through shared ChoiceList on import, detail, and review pages", () => {
  assert.equal(existsSync(join(root, "components/mobile/ChoiceList.tsx")), true);

  for (const path of [
    "app/import/page.tsx",
    "app/questions/[id]/page.tsx",
    "components/study/ReviewFlashcard.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /ChoiceList/);
    assert.match(source, /choices/);
  }
});

test("/questions exposes batch delete but keeps it as soft delete", () => {
  const source = read("app/questions/page.tsx");

  assert.match(source, /选择题目/);
  assert.match(source, /selectedIds\.length > 0 \? \(/);
  assert.match(source, /软删除/);
  assert.match(source, /\/api\/questions\/bulk-delete/);
  assert.match(source, /确定删除选中的/);
});

test("bulk delete route only soft deletes current user questions", () => {
  const routePath = "app/api/questions/bulk-delete/route.ts";

  assert.equal(existsSync(join(root, routePath)), true);

  const source = read(routePath);
  assert.match(source, /export async function POST/);
  assert.match(source, /deleted_at:\s*new Date\(\)\.toISOString\(\)/);
  assert.match(source, /\.eq\("user_id", user\.id\)/);
  assert.match(source, /\.in\("id", ids\)/);
  assert.doesNotMatch(source, /\.storage[\s\S]*\.remove\(/);
  assert.doesNotMatch(source, /\.from\("reviews"\)[\s\S]*\.delete\(/);
});

test("bulk delete route can soft delete all current user questions without ids", () => {
  const source = read("app/api/questions/bulk-delete/route.ts");

  assert.match(source, /all\?: unknown/);
  assert.match(source, /body\.all === true/);
  assert.match(source, /bulk_clear_user_library/);
  assert.match(source, /\.eq\("user_id", user\.id\)/);
  assert.match(source, /\.is\("deleted_at", null\)/);
  assert.match(source, /if \(!deleteAll\)[\s\S]*\.in\("id", ids\)/);
});

test("choice practice result route records review result without storing selected option text", () => {
  const routePath = "app/api/questions/[id]/practice-result/route.ts";

  assert.equal(existsSync(join(root, routePath)), true);

  const source = read(routePath);
  assert.match(source, /export async function POST/);
  assert.match(source, /parseAnswerChoiceLabels/);
  assert.match(source, /areChoiceAnswersEqual/);
  assert.match(source, /review_result:\s*reviewResult/);
  assert.match(source, /review_priority:\s*"high"/);
  assert.match(source, /review_priority:\s*"low"/);
  assert.doesNotMatch(source, /selectedLabels:/);
  assert.doesNotMatch(source, /selected_option|selected_answer|answer_text/);
});
