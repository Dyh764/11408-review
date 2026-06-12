import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildMotivationCacheKey,
  getDailyMotivation,
  isValidGeneratedMotivation,
  normalizeMotivationResponse,
} from "./motivation.ts";

test("daily motivation fallback is deterministic by date", () => {
  assert.equal(getDailyMotivation("2026-06-12"), getDailyMotivation("2026-06-12"));
  assert.notEqual(getDailyMotivation("2026-06-12"), getDailyMotivation("2026-06-13"));
});

test("motivation cache key is scoped by user and date", () => {
  assert.equal(
    buildMotivationCacheKey("user-1", "2026-06-12"),
    "11408-review:motivation:user-1:2026-06-12",
  );
  assert.equal(
    buildMotivationCacheKey(null, "2026-06-12"),
    "11408-review:motivation:anonymous:2026-06-12",
  );
});

test("generated motivation accepts short original Chinese study lines only", () => {
  assert.equal(isValidGeneratedMotivation("把薄弱处慢慢照亮，今天的题就有了方向。"), true);
  assert.equal(isValidGeneratedMotivation(""), false);
  assert.equal(isValidGeneratedMotivation("This is an English sentence."), false);
  assert.equal(
    isValidGeneratedMotivation(
      "这是一段非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的句子。",
    ),
    false,
  );
});

test("normalizeMotivationResponse falls back when AI output is invalid", () => {
  const fallback = getDailyMotivation("2026-06-12");

  assert.equal(normalizeMotivationResponse("把今天的难题拆成一束光。", "2026-06-12"), "把今天的难题拆成一束光。");
  assert.equal(normalizeMotivationResponse("fake lyric by singer", "2026-06-12"), fallback);
});
