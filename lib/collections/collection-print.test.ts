import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCollectionPrintHtml } from "./collection-print.ts";

test("buildCollectionPrintHtml puts questions before a separate answer section", () => {
  const html = buildCollectionPrintHtml({
    title: "不熟题本",
    generatedAt: "2026/7/28 18:00:00",
    questions: [
      {
        id: "q1",
        subject: "数据结构",
        chapter: "树",
        question_text: "下面哪项正确？",
        choices: [
          { label: "A", text: "选项一" },
          { label: "B", text: "选项二" },
        ],
        standard_answer: "B",
        answer_explanation: "B 符合定义。",
      },
    ],
  });

  assert.ok(html.indexOf("下面哪项正确？") < html.indexOf("参考答案与解析"));
  assert.ok(html.indexOf("参考答案与解析") < html.indexOf("B 符合定义。"));
  assert.match(html, /题目在前，答案在后/);
});

test("buildCollectionPrintHtml escapes imported question content", () => {
  const html = buildCollectionPrintHtml({
    title: "<script>题本</script>",
    questions: [
      {
        id: "q1",
        subject: "操作系统",
        question_text: "<img src=x onerror=alert(1)>",
      },
    ],
  });

  assert.doesNotMatch(html, /<script>题本<\/script>/);
  assert.doesNotMatch(html, /<img src=x onerror/);
  assert.match(html, /&lt;script&gt;题本&lt;\/script&gt;/);
});
