import assert from "node:assert/strict";
import { test } from "node:test";
import {
  exam408ImportPrompt,
  parseImportJsonText,
  parseImportWithDiagnostics,
  sanitizeImportJsonText,
} from "./import-schema.ts";

function validRow(overrides: Record<string, unknown> = {}) {
  return {
    subject: "数学",
    chapter: "高等数学",
    knowledge_point: "多元函数积分学",
    difficulty: "中等",
    question_text: "计算 $\\int_0^1 x^2 dx$。",
    choices: [],
    mastery_status: "思路对但卡住",
    user_note: "积分区域没有画清楚。",
    mistake_types: ["积分区域"],
    solution_summary: "先画区域再定限。",
    standard_answer: "答案：$\\frac{1}{3}$",
    answer_explanation: "过程：直接积分。",
    key_steps: ["写出积分限", "计算原函数"],
    one_sentence_tip: "先画图再计算。",
    review_priority: "high",
    confidence: "medium",
    needs_manual_check: true,
    answer_status: "ai_unverified",
    answer_source: "chatgpt_import",
    ...overrides,
  };
}

test("parses standard valid JSON without repair", () => {
  const input = JSON.stringify([validRow()]);

  const result = parseImportJsonText(input);

  assert.equal(result.errors.length, 0);
  assert.equal(result.cards.length, 1);
  assert.equal(result.sanitizedText, undefined);
  assert.equal(result.cards[0].card.question_text, "计算 $\\int_0^1 x^2 dx$。");
});

test("repairs curly quotes before parsing JSON", () => {
  const input = `[
    {
      “subject”: “数学”,
      “chapter”: “高等数学”,
      “knowledge_point”: “极限”,
      “difficulty”: “中等”,
      “question_text”: “求极限 $x \\to 0$。”,
      “mastery_status”: “有一点思路”,
      “user_note”: “容易忘记等价无穷小。”,
      “mistake_types”: [“等价无穷小”],
      “needs_manual_check”: true
    }
  ]`;

  const result = parseImportJsonText(input);

  assert.equal(result.errors.length, 0);
  assert.equal(result.cards.length, 1);
  assert.ok(result.repairNotices?.includes("检测到中文弯引号：已尝试转换。"));
});

test("repairs single-backslash LaTeX commands inside JSON strings", () => {
  const input = String.raw`[
    {
      "subject": "数学",
      "chapter": "高等数学",
      "knowledge_point": "多元函数积分学",
      "difficulty": "中等",
      "question_text": "$\Omega$ 与 $\frac{x^2}{a^2}$，且 $\leq 1$，计算 $\iiint_\Omega f(x,y,z)dV$。",
      "mastery_status": "思路对但卡住",
      "user_note": "不会处理 $\nabla$ 和 $\times$。",
      "mistake_types": ["LaTeX"],
      "standard_answer": "答案：$\bar{x}+\vec{y}$",
      "answer_explanation": "过程：用 $\left\{x\mid x\in\Omega\right\}$。",
      "key_steps": ["写出 $\alpha+\theta$", "计算 $\sum_{n=1}^{\infty} a_n$"],
      "needs_manual_check": true
    }
  ]`;

  const result = parseImportJsonText(input);

  assert.equal(result.errors.length, 0);
  assert.equal(result.cards.length, 1);
  assert.ok(result.repairNotices?.includes("检测到 LaTeX 单反斜杠：已尝试转义。"));
  assert.equal(
    result.cards[0].card.question_text,
    "$\\Omega$ 与 $\\frac{x^2}{a^2}$，且 $\\leq 1$，计算 $\\iiint_\\Omega f(x,y,z)dV$。",
  );
  assert.equal(result.cards[0].card.user_note, "不会处理 $\\nabla$ 和 $\\times$。");
  assert.deepEqual(result.cards[0].card.key_steps, [
    "写出 $\\alpha+\\theta$",
    "计算 $\\sum_{n=1}^{\\infty} a_n$",
  ]);
});

test("keeps curly quotes inside ordinary Chinese text parseable during LaTeX repair", () => {
  const input = String.raw`[
    {
      "subject": "数学",
      "chapter": "高等数学",
      "knowledge_point": "极限",
      "difficulty": "中等",
      "question_text": "他说“先看 $\Omega$”，再求极限。",
      "mastery_status": "有一点思路",
      "user_note": "不要破坏普通中文。",
      "mistake_types": [],
      "needs_manual_check": true
    }
  ]`;

  const result = parseImportJsonText(input);

  assert.equal(result.errors.length, 0);
  assert.equal(result.cards[0].card.question_text, '他说"先看 $\\Omega$"，再求极限。');
});

test("normalizes ChatGPT Chinese taxonomy values into import enums", () => {
  const input = String.raw`[
    {
      “subject”: “高等数学”,
      “chapter”: “多元函数积分学”,
      “knowledge_point”: “椭球区域三重积分、对称性、变量代换、雅可比”,
      “difficulty”: “困难”,
      “question_text”: “设 $\Omega$ 为区域 $\frac{x^2}{a^2}\leq 1$，求 $\iiint_{\Omega}(x+y+z)^2\,dV$。”,
      “choices”: [],
      “mastery_status”: “已理解但需复习”,
      “user_note”: “换元后漏了雅可比 $abc$。”,
      “mistake_types”: [“换元漏雅可比”],
      “solution_summary”: “先展开并用对称性。”,
      “standard_answer”: “答案：$\frac{4\pi abc}{15}(a^2+b^2+c^2)$”,
      “answer_explanation”: “过程：令 $x=au,y=bv,z=cw$。”,
      “key_steps”: [“注意雅可比 $dV=abc\,dudvdw$”],
      “one_sentence_tip”: “椭球先伸缩成单位球。”,
      “review_priority”: “高”,
      “confidence”: “高”,
      “needs_manual_check”: false,
      “answer_status”: “ai_unverified”,
      “answer_source”: “chatgpt_import”
    },
    {
      “subject”: “高等数学”,
      “chapter”: “多元函数积分学”,
      “knowledge_point”: “形心坐标”,
      “difficulty”: “中等”,
      “question_text”: “求 $\bar z$。”,
      “mastery_status”: “公式遗忘，需复习”,
      “user_note”: “分子分母容易乱。”,
      “mistake_types”: [],
      “review_priority”: “中”,
      “confidence”: “中”,
      “needs_manual_check”: true
    }
  ]`;

  const result = parseImportJsonText(input);

  assert.equal(result.errors.length, 0);
  assert.equal(result.cards.length, 2);
  assert.equal(result.cards[0].card.subject, "数学");
  assert.equal(result.cards[0].card.chapter, "高等数学-多元函数积分学");
  assert.equal(result.cards[0].card.difficulty, "较难");
  assert.equal(result.cards[0].card.mastery_status, "做对但不稳");
  assert.equal(result.cards[0].card.review_priority, "high");
  assert.equal(result.cards[0].card.confidence, "high");
  assert.equal(result.cards[0].card.question_text?.includes("\\iiint_{\\Omega}"), true);
  assert.equal(result.cards[1].card.mastery_status, "有一点思路");
  assert.equal(result.cards[1].card.review_priority, "medium");
  assert.equal(result.cards[1].card.confidence, "medium");
});


test("does not double-escape already valid LaTeX backslashes", () => {
  const input = JSON.stringify([
    validRow({
      question_text: "$\\Omega$ 与 $\\frac{x^2}{a^2}$",
      standard_answer: "答案：$\\leq 1$",
    }),
  ]);

  const sanitized = sanitizeImportJsonText(input);
  const result = parseImportJsonText(input);

  assert.equal(sanitized, input);
  assert.equal(result.errors.length, 0);
  assert.equal(result.cards[0].card.question_text, "$\\Omega$ 与 $\\frac{x^2}{a^2}$");
  assert.equal(result.cards[0].card.standard_answer, "答案：$\\leq 1$");
});

test("returns a specific parse failure message when repair still cannot parse JSON", () => {
  const result = parseImportJsonText(`[{"subject": "数学", "question_text": "$\\Omega$"`);

  assert.equal(result.cards.length, 0);
  assert.match(
    result.errors[0].message,
    /JSON 解析失败，可能原因：引号不是英文双引号、LaTeX 反斜杠未转义、数组逗号缺失、括号未闭合。/,
  );
});

test("old import JSON without source gets an unmarked source_info fallback", () => {
  const result = parseImportJsonText(JSON.stringify([validRow({ source: undefined })]));

  assert.equal(result.errors.length, 0);
  assert.equal(result.cards.length, 1);
  assert.deepEqual(result.cards[0].card.source_info, {
    type: "未标来源",
    name: "未标来源",
    section: "",
    part: "",
    volume: "",
    paper: "",
    page: "",
    problem_number: "",
    raw: "未标来源",
  });
});

test("Import Protocol v2 parses structured source and keeps the old database subject compatible", () => {
  const result = parseImportJsonText(
    JSON.stringify([
      validRow({
        import_protocol_version: "2.0",
        subject: "高等数学",
        source: {
          type: "练习册",
          name: "武忠祥严选题",
          section: "高等数学",
          volume: "",
          paper: "",
          page: "42",
          problem_number: "8",
          raw: "武忠祥严选题-高数-42页-8题",
        },
        chapter: "三重积分",
        difficulty: "较难",
      }),
    ]),
  );

  assert.equal(result.errors.length, 0);
  assert.equal(result.cards[0].card.subject, "数学");
  assert.equal(result.cards[0].card.chapter, "高等数学-三重积分");
  assert.equal(result.cards[0].card.difficulty, "较难");
  assert.deepEqual(result.cards[0].card.source_info, {
    type: "练习册",
    name: "武忠祥严选题",
    section: "高等数学",
    part: "",
    volume: "",
    paper: "",
    page: "42",
    problem_number: "8",
    raw: "武忠祥严选题-高数-42页-8题",
  });
});

test("408 Import Protocol v2 keeps subject, choices, defaults source, and related practice questions", () => {
  const result = parseImportJsonText(
    JSON.stringify([
      validRow({
        import_protocol_version: "2.0",
        subject: "操作系统",
        source: undefined,
        chapter: "计算机系统概述",
        knowledge_point: "并发与并行",
        difficulty: "中等",
        question_text: "下列关于并发和并行的说法，正确的是？",
        choices: [
          { label: "A", text: "并发一定要求多个处理器" },
          { label: "B", text: "并行是宏观上同时推进" },
          { label: "C", text: "并发强调宏观上同时推进" },
          { label: "D", text: "并发和并行完全相同" },
        ],
        mastery_status: "需要复习",
        user_note: "我选了B，正确答案是C。",
        mistake_types: ["概念混淆", "选项陷阱"],
        standard_answer: "答案：C",
        answer_explanation: "过程：A 错在处理器条件；B 错在概念对象；C 正确；D 错在二者不等同。",
        related_practice_questions: [
          {
            question_text: "下列关于共享和虚拟的说法，正确的是？",
            choices: [
              { label: "A", text: "共享只能互斥共享" },
              { label: "B", text: "虚拟把物理实体映射为多个逻辑实体" },
              { label: "C", text: "共享和虚拟含义相同" },
              { label: "D", text: "虚拟不属于操作系统特征" },
            ],
            correct_answer: "B",
            answer_explanation: "过程：A 错在过窄；B 正确；C 错在混淆；D 错在否定基本特征。",
            knowledge_point: "操作系统基本特征",
            why_related: "同样考查操作系统基本特征的概念边界。",
            difficulty: "中等",
            rigor_check: "408 范围内单选题，答案唯一。",
          },
        ],
      }),
    ]),
  );

  assert.equal(result.errors.length, 0);
  assert.equal(result.cards[0].card.subject, "操作系统");
  assert.equal(result.cards[0].card.chapter, "操作系统概述");
  assert.equal(result.cards[0].card.source_info.name, "未标来源");
  assert.equal(result.cards[0].card.choices.length, 4);
  assert.equal(result.cards[0].card.related_practice_questions?.[0].correct_answer, "B");
});

test("408 import prompt uses only the approved big chapters", () => {
  assert.match(exam408ImportPrompt, /操作系统：操作系统概述、进程与线程、处理机调度、同步与互斥、死锁、内存管理、文件管理、输入输出管理/);
  assert.match(exam408ImportPrompt, /计算机网络：计算机网络体系结构、物理层、数据链路层、网络层、传输层、应用层/);
  assert.match(exam408ImportPrompt, /计算机组成原理：计算机系统概述、数据的表示和运算、存储系统、指令系统、中央处理器、总线、输入\/输出系统/);
  assert.match(exam408ImportPrompt, /数据结构：绪论、线性表、栈、队列和数组、串、树与二叉树、图、查找、排序/);
  assert.match(exam408ImportPrompt, /处理机调度/);
});

test("related practice questions are ignored for math and diagnosed when malformed", () => {
  const mathResult = parseImportJsonText(
    JSON.stringify([
      validRow({
        subject: "数学",
        related_practice_questions: [
          {
            question_text: "数学不启用类题",
            choices: [
              { label: "A", text: "1" },
              { label: "B", text: "2" },
              { label: "C", text: "3" },
              { label: "D", text: "4" },
            ],
            correct_answer: "A",
            answer_explanation: "过程：不应保存。",
            knowledge_point: "极限",
            why_related: "测试",
            difficulty: "中等",
            rigor_check: "测试",
          },
        ],
      }),
    ]),
  );
  const malformed = parseImportWithDiagnostics(
    JSON.stringify([
      validRow({
        subject: "数据结构",
        choices: [
          { label: "A", text: "顺序表" },
          { label: "B", text: "链表" },
          { label: "C", text: "栈" },
          { label: "D", text: "队列" },
        ],
        standard_answer: "答案：C",
        answer_explanation: "过程：A 错；B 错；C 正确；D 错。",
        related_practice_questions: [
          {
            question_text: "缺少 D 选项",
            choices: [
              { label: "A", text: "1" },
              { label: "B", text: "2" },
              { label: "C", text: "3" },
            ],
            correct_answer: "E",
            answer_explanation: "解析：错误前缀",
            knowledge_point: "栈",
            why_related: "同考点",
            difficulty: "普通",
            rigor_check: "测试",
          },
        ],
      }),
    ]),
  );

  assert.equal(mathResult.errors.length, 0);
  assert.deepEqual(mathResult.cards[0].card.related_practice_questions, []);
  assert.equal(malformed.cards.length, 0);
  assert.equal(malformed.diagnostics[0].type, "related_practice_questions格式错误");
  assert.equal(malformed.diagnostics[0].field, "related_practice_questions");
  assert.match(malformed.diagnostics[0].suggestion, /choices \/ correct_answer \/ answer_explanation/);
});

test("source string imports are converted to source_info objects", () => {
  const result = parseImportJsonText(
    JSON.stringify([
      validRow({
        import_protocol_version: "2.0",
        subject: "数学",
        chapter: "三重积分",
        source: "武忠祥严选题-高数",
      }),
    ]),
  );

  assert.equal(result.errors.length, 0);
  assert.equal(result.cards[0].card.source_info.name, "武忠祥严选题");
  assert.equal(result.cards[0].card.source_info.type, "练习册");
  assert.equal(result.cards[0].card.source_info.section, "高等数学");
  assert.equal(result.cards[0].card.source_info.raw, "武忠祥严选题-高数");
});

test("parseImportWithDiagnostics classifies source and choices field problems", () => {
  const result = parseImportWithDiagnostics(
    JSON.stringify([
      validRow({ source: { type: "练习册", name: 123 }, choices: "" }),
    ]),
  );

  assert.equal(result.cards.length, 0);
  assert.equal(result.diagnostics.length, 2);
  assert.deepEqual(
    result.diagnostics.map((diagnostic) => diagnostic.type),
    ["source格式错误", "choices格式错误"],
  );
  assert.deepEqual(
    result.diagnostics.map((diagnostic) => diagnostic.field),
    ["source", "choices"],
  );
});

test("parseImportWithDiagnostics reports JSON format location snippet and repair example", () => {
  const result = parseImportWithDiagnostics(`[
    {"subject": "鏁板", "question_text": "$\\Omega$"
  ]`);

  assert.equal(result.cards.length, 0);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].type, "JSON格式错误");
  assert.equal(result.diagnostics[0].line, 3);
  assert.ok(result.diagnostics[0].character > 0);
  assert.match(result.diagnostics[0].snippet, /question_text/);
  assert.match(result.diagnostics[0].suggestion, /检查 JSON/);
  assert.match(result.diagnostics[0].fixedExample, /"subject"/);
});

test("parseImportWithDiagnostics reports field validation diagnostics with field names", () => {
  const result = parseImportWithDiagnostics(
    JSON.stringify([
      validRow({ needs_manual_check: "true" }),
      validRow({ question_text: "", user_note: "" }),
    ]),
  );

  assert.equal(result.cards.length, 0);
  assert.equal(result.diagnostics.length, 2);
  assert.equal(result.diagnostics[0].type, "字段类型错误");
  assert.equal(result.diagnostics[0].field, "needs_manual_check");
  assert.match(result.diagnostics[0].snippet, /needs_manual_check/);
  assert.equal(result.diagnostics[1].type, "字段缺失");
  assert.equal(result.diagnostics[1].field, "question_text");
  assert.match(result.diagnostics[1].fixedExample, /"question_text"/);
});

test("parseImportWithDiagnostics classifies LaTeX and escape problems", () => {
  const latexResult = parseImportWithDiagnostics(
    JSON.stringify([validRow({ question_text: "未闭合公式 $x+1" })]),
  );
  const escapeResult = parseImportWithDiagnostics(String.raw`[
    {
      "subject": "鏁板",
      "question_text": "路径 \q 错误",
      "mastery_status": "鏈変竴鐐规€濊矾",
      "user_note": "bad escape",
      "needs_manual_check": true
    }
  ]`);

  assert.equal(latexResult.diagnostics[0].type, "LaTeX错误");
  assert.equal(latexResult.diagnostics[0].field, "question_text");
  assert.equal(escapeResult.diagnostics[0].type, "转义错误");
  assert.match(escapeResult.diagnostics[0].suggestion, /反斜杠/);
});
