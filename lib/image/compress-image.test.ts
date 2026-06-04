import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatFileSize,
  getImageExtension,
  isSupportedImageType,
  shouldAttemptCompression,
} from "./compress-image.ts";

test("recognizes supported upload image mime types", () => {
  assert.equal(isSupportedImageType("image/jpeg"), true);
  assert.equal(isSupportedImageType("image/png"), true);
  assert.equal(isSupportedImageType("image/webp"), true);
  assert.equal(isSupportedImageType("image/gif"), false);
});

test("maps jpeg and webp file extensions from mime type and file name", () => {
  assert.equal(getImageExtension({ name: "question.jpeg", type: "image/jpeg" }), "jpg");
  assert.equal(getImageExtension({ name: "question.webp", type: "image/webp" }), "webp");
  assert.equal(getImageExtension({ name: "question", type: "image/png" }), "png");
});

test("formats byte counts for user-facing upload status", () => {
  assert.equal(formatFileSize(950), "950 B");
  assert.equal(formatFileSize(1536), "1.5 KB");
  assert.equal(formatFileSize(2 * 1024 * 1024), "2.0 MB");
});

test("attempts compression only for supported large images", () => {
  assert.equal(shouldAttemptCompression({ size: 4 * 1024 * 1024, type: "image/jpeg" }), true);
  assert.equal(shouldAttemptCompression({ size: 500 * 1024, type: "image/jpeg" }), false);
  assert.equal(shouldAttemptCompression({ size: 4 * 1024 * 1024, type: "image/gif" }), false);
});
