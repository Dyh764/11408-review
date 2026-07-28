import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canUseQuestionInPractice,
  getPracticeImageAvailability,
  questionDependsOnImage,
} from "./question-image.ts";

test("keeps complete text-only questions available", () => {
  const question = {
    question_text: "一个进程映像是（ ）。",
    choices: [
      { label: "A", text: "程序" },
      { label: "B", text: "程序和数据的组合" },
    ],
    image_path: null,
    signedImageUrl: null,
  };

  assert.equal(questionDependsOnImage(question), false);
  assert.equal(getPracticeImageAvailability(question), "not_required");
  assert.equal(canUseQuestionInPractice(question), true);
});

test("marks explicit figure and table questions as image-dependent", () => {
  for (const questionText of [
    "根据下图回答，下列说法正确的是？",
    "图中结点的度为多少？",
    "由表中数据可知吞吐量为多少？",
    "观察该网络拓扑图，选择正确路径。",
  ]) {
    assert.equal(questionDependsOnImage({ question_text: questionText }), true);
  }
});

test("recognizes import image_code stored directly or in user_note", () => {
  assert.equal(questionDependsOnImage({ image_code: "required" }), true);
  assert.equal(questionDependsOnImage({ user_note: "概念混淆\nimage_code: figure-12" }), true);
  assert.equal(questionDependsOnImage({ image_code: "none" }), false);
});

test("uses authoritative PDF figure metadata before noisy text signals", () => {
  assert.equal(
    questionDependsOnImage({
      question_text: "选项中提到了图中结点，但原题是完整文字题。",
      source_info: { image_required: false },
    }),
    false,
  );
  assert.equal(
    questionDependsOnImage({
      question_text: "题干文字未写如图",
      source_info: { image_required: true },
    }),
    true,
  );
});

test("requires a usable signed URL when a stored image path exists", () => {
  assert.equal(
    getPracticeImageAvailability({
      image_path: "users/u/questions/q.png",
      signedImageUrl: null,
      question_text: "完整文字题干",
    }),
    "missing",
  );
  assert.equal(
    getPracticeImageAvailability({
      image_path: "users/u/questions/q.png",
      signedImageUrl: "https://example.test/signed.png",
    }),
    "available",
  );
});
