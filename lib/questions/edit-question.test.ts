import assert from "node:assert/strict";
import { test } from "node:test";
import { buildQuestionUpdatePayload, parseMistakeTypes } from "./edit-question.ts";

test("parses mistake type text into trimmed unique tags", () => {
  assert.deepEqual(parseMistakeTypes("递归, 边界；递归\n审题"), ["递归", "边界", "审题"]);
});

test("builds editable question update payload without protected fields", () => {
  const payload = buildQuestionUpdatePayload({
    question_text: "  题干  ",
    question_text_status: "verified",
    subject: "数据结构",
    chapter: " 树 ",
    knowledge_point: "",
    mastery_status: "思路对但卡住",
    user_note: "  注意递归出口 ",
    mistake_types: "递归,边界",
    solution_summary: "  先写递归定义 ",
    one_sentence_tip: "",
  });

  assert.deepEqual(payload, {
    question_text: "题干",
    question_text_status: "verified",
    subject: "数据结构",
    chapter: "树",
    knowledge_point: null,
    mastery_status: "思路对但卡住",
    user_note: "注意递归出口",
    mistake_types: ["递归", "边界"],
    solution_summary: "先写递归定义",
    one_sentence_tip: null,
  });
  assert.equal("image_path" in payload, false);
  assert.equal("user_id" in payload, false);
});
