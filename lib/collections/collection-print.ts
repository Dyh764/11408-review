import type { ChoiceOption } from "../types";

export type PrintableCollectionQuestion = {
  id: string;
  subject: string;
  chapter?: string | null;
  knowledge_point?: string | null;
  difficulty?: string | null;
  question_text?: string | null;
  choices?: ChoiceOption[] | null;
  standard_answer?: string | null;
  answer_explanation?: string | null;
  solution_summary?: string | null;
  signedImageUrl?: string | null;
};

function escapeHtml(value?: string | null) {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function questionTitle(question: PrintableCollectionQuestion, index: number) {
  const topic =
    question.knowledge_point?.trim() ||
    question.chapter?.trim() ||
    "未分类题目";
  return `${index + 1}. ${topic}`;
}

function renderChoices(choices?: ChoiceOption[] | null) {
  if (!choices?.length) {
    return "";
  }

  return `<ol class="choices">${choices
    .map(
      (choice) =>
        `<li><strong>${escapeHtml(choice.label)}.</strong> ${escapeHtml(
          choice.text,
        )}</li>`,
    )
    .join("")}</ol>`;
}

function renderQuestion(
  question: PrintableCollectionQuestion,
  index: number,
) {
  const image = question.signedImageUrl
    ? `<img src="${escapeHtml(
        question.signedImageUrl,
      )}" alt="第 ${index + 1} 题原图" />`
    : "";

  return `<article class="question">
    <h2>${escapeHtml(questionTitle(question, index))}</h2>
    <p class="meta">${escapeHtml(question.subject)} · ${escapeHtml(
      question.chapter || "未分类",
    )} · ${escapeHtml(question.difficulty || "未标难度")}</p>
    ${image}
    <p class="stem">${escapeHtml(question.question_text || "题干见原图")}</p>
    ${renderChoices(question.choices)}
    <div class="answer-space"></div>
  </article>`;
}

function renderAnswer(
  question: PrintableCollectionQuestion,
  index: number,
) {
  const explanation =
    question.answer_explanation?.trim() ||
    question.solution_summary?.trim() ||
    "暂无解析";

  return `<article class="answer">
    <h2>${escapeHtml(questionTitle(question, index))}</h2>
    <p><strong>答案：</strong>${escapeHtml(
      question.standard_answer || "待补充",
    )}</p>
    <p><strong>解析：</strong>${escapeHtml(explanation)}</p>
  </article>`;
}

export function buildCollectionPrintHtml({
  title,
  questions,
  generatedAt = new Date().toLocaleString("zh-CN"),
}: {
  title: string;
  questions: PrintableCollectionQuestion[];
  generatedAt?: string;
}) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} - 打印题单</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #0f172a; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; font-size: 12px; line-height: 1.65; }
    header { margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #2563eb; }
    h1 { margin: 0; font-size: 22px; }
    header p { margin: 6px 0 0; color: #64748b; }
    .question, .answer { break-inside: avoid; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #cbd5e1; }
    h2 { margin: 0 0 6px; font-size: 15px; }
    .meta { margin: 0 0 8px; color: #64748b; }
    .stem { white-space: pre-wrap; }
    img { display: block; max-width: 100%; max-height: 320px; margin: 10px auto; object-fit: contain; }
    .choices { margin: 8px 0 0; padding-left: 24px; }
    .choices li { margin: 5px 0; }
    .answer-space { height: 36px; border-bottom: 1px dashed #cbd5e1; }
    .answers { break-before: page; }
    .answers > h1 { margin-bottom: 16px; }
    .answer p { margin: 6px 0; white-space: pre-wrap; }
    @media screen {
      body { max-width: 900px; margin: 0 auto; padding: 28px; background: #f8fafc; }
      header, main { background: white; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <p>共 ${questions.length} 题 · 生成时间 ${escapeHtml(generatedAt)} · 题目在前，答案在后</p>
  </header>
  <main>
    ${questions.map(renderQuestion).join("")}
    <section class="answers">
      <h1>参考答案与解析</h1>
      ${questions.map(renderAnswer).join("")}
    </section>
  </main>
</body>
</html>`;
}
