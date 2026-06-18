import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("007 migration adds nullable source_info jsonb without touching existing source enum", () => {
  const migrationPath = "supabase/migrations/007_add_question_source_info.sql";

  assert.equal(existsSync(join(root, migrationPath)), true);

  const sql = read(migrationPath);
  assert.match(sql, /alter table public\.questions/i);
  assert.match(sql, /add column if not exists source_info jsonb null/i);
  assert.match(sql, /未标来源/);
  assert.doesNotMatch(sql, /drop column/i);
  assert.doesNotMatch(sql, /alter column source/i);
});

test("question queries persist and select source_info separately from ingestion source", () => {
  const questions = read("lib/questions.ts");
  const importRoute = read("app/api/import/route.ts");

  assert.match(questions, /source_info/);
  assert.match(importRoute, /source_info: card\.source_info/);
  assert.match(importRoute, /source: "chatgpt_import"/);
});

test("/questions can switch between chapter and source directories", () => {
  const source = read("app/questions/page.tsx");

  assert.match(source, /directoryMode/);
  assert.match(source, /按章节看/);
  assert.match(source, /按题源看/);
  assert.match(source, /buildQuestionSourceStats/);
  assert.match(source, /SourceDirectory/);
  assert.match(source, /题源信息/);
  assert.doesNotMatch(source, /错题率/);
});

test("import page shows source confirmation and a protocol v2 template", () => {
  const page = read("app/import/page.tsx");
  const schema = read("lib/import/import-schema.ts");

  assert.match(page, /题源信息/);
  assert.match(page, /题源类型/);
  assert.match(page, /题源名称/);
  assert.match(page, /卷\/套/);
  assert.match(page, /确认导入/);
  assert.match(schema, /import_protocol_version/);
  assert.match(schema, /source\.raw 写“未标来源”/);
  assert.match(schema, /只输出 JSON 数组/);
});
