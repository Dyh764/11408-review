import assert from "node:assert/strict";
import { test } from "node:test";
import { dateKeyInTimeZone, normalizeTimeZone } from "./dates.ts";

test("formats date keys in the configured timezone", () => {
  const date = new Date("2026-06-03T16:30:00.000Z");

  assert.equal(dateKeyInTimeZone(date, "Asia/Shanghai"), "2026-06-04");
  assert.equal(dateKeyInTimeZone(date, "UTC"), "2026-06-03");
});

test("falls back to Asia Shanghai for missing or invalid timezone", () => {
  assert.equal(normalizeTimeZone(""), "Asia/Shanghai");
  assert.equal(normalizeTimeZone("Invalid/Zone"), "Asia/Shanghai");
  assert.equal(normalizeTimeZone("UTC"), "UTC");
});
