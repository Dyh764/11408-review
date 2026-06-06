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

test("choices render through shared ChoiceList on import, detail, and review pages", () => {
  assert.equal(existsSync(join(root, "components/mobile/ChoiceList.tsx")), true);

  for (const path of ["app/import/page.tsx", "app/questions/[id]/page.tsx", "app/review/page.tsx"]) {
    const source = read(path);
    assert.match(source, /ChoiceList/);
    assert.match(source, /choices/);
  }
});

test("/questions exposes batch delete but keeps it as soft delete", () => {
  const source = read("app/questions/page.tsx");

  assert.match(source, /批量管理/);
  assert.match(source, /删除所选/);
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
