import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("005 migration adds nullable soft-delete fields to questions", () => {
  const migrationPath = "supabase/migrations/005_add_question_delete_fields.sql";

  assert.equal(existsSync(join(root, migrationPath)), true);

  const sql = read(migrationPath);
  assert.match(sql, /alter table public\.questions/i);
  assert.match(sql, /add column if not exists deleted_at timestamptz null/i);
  assert.match(sql, /add column if not exists deleted_reason text null/i);
});

test("question delete route performs soft delete only", () => {
  const source = read("app/api/questions/[id]/route.ts");

  assert.match(source, /export async function DELETE/);
  assert.match(source, /deleted_at:\s*new Date\(\)\.toISOString\(\)/);
  assert.match(source, /deleted_reason/);
  assert.doesNotMatch(source, /\.storage[\s\S]*\.remove\(/);
  assert.doesNotMatch(source, /\.from\("reviews"\)[\s\S]*\.delete\(/);
});

test("normal question surfaces filter deleted questions", () => {
  const files = [
    "lib/questions.ts",
    "lib/reviews.ts",
    "lib/export/export-data.ts",
    "lib/knowledge-stats.ts",
    "lib/ai/analyze-question.ts",
    "app/api/questions/[id]/deepseek-enhance/route.ts",
    "app/api/reports/generate/route.ts",
    "app/questions/[id]/page.tsx",
    "app/review/page.tsx",
    "app/sprint/page.tsx",
  ];

  for (const file of files) {
    assert.match(read(file), /deleted_at/, `${file} should reference deleted_at filtering`);
  }
});
