import { expect, test, type Page } from "@playwright/test";

const protectedRoutes = ["/upload", "/import", "/questions", "/reports"];
const utilityRoutes = ["/settings", "/sprint", "/practice"];

async function expectPageHasNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectBottomNav(page: Page) {
  await expect(page.locator("nav").getByRole("link", { name: /首页|棣栭〉/ })).toBeVisible();
  await expect(page.locator("nav").getByRole("link", { name: /拍题|鎷嶉/ })).toBeVisible();
  await expect(page.locator("nav").getByRole("link", { name: /复习|澶嶄範/ })).toBeVisible();
  await expect(page.locator("nav").getByRole("link", { name: /我的|鎴戠殑/ })).toBeVisible();
}

async function expectRouteLoadsOrRequiresLogin(page: Page, route: string) {
  const response = await page.goto(route);

  expect(response?.status()).toBeLessThan(400);
  await expect(page).toHaveURL(new RegExp(`(${route.replace("/", "\\/")}|\\/login)`));

  if (!page.url().includes("/login")) {
    await expectBottomNav(page);
  }
}

test("home page is accessible and includes bottom navigation", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBeLessThan(400);
  await expectBottomNav(page);
  await expect(page.getByRole("link", { name: /导入 ChatGPT 错题卡/ })).toBeVisible();
});

test("home mobile first screen exposes primary study actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("link", { name: /拍题上传/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /导入 ChatGPT 错题卡/ })).toBeVisible();
  const startReviewLink = page.getByRole("link", { name: /开始今日复习/ });
  if ((await startReviewLink.count()) > 0) {
    await expect(startReviewLink.first()).toBeVisible();
  } else {
    await expect(page.getByText("今日暂无到期复习")).toBeVisible();
  }
});

test("login page is accessible", async ({ page }) => {
  const response = await page.goto("/login");

  expect(response?.status()).toBeLessThan(400);
  await expect(page).toHaveURL(/\/login/);
});

test("import page can parse example JSON into preview cards when reachable", async ({ page }) => {
  const response = await page.goto("/import");

  expect(response?.status()).toBeLessThan(400);

  if (page.url().includes("/login")) {
    return;
  }

  await expect(page.getByRole("button", { name: "复制 ChatGPT 整理指令" })).toBeVisible();
  await expect(page.getByRole("button", { name: "复制 JSON 示例" })).toBeVisible();
  await page.getByRole("button", { name: "插入示例 JSON" }).click();
  await page.getByRole("button", { name: "解析" }).click();

  await expect(page.getByText("预览 1 张错题卡")).toBeVisible();
  await expect(page.getByRole("heading", { name: "文字错题卡" })).toBeVisible();
  await expect(page.getByText("文字题卡预览")).toHaveCount(0);
  const textPreview = page.locator("article").filter({ hasText: "文字错题卡" });
  await expect(textPreview.getByText("幂级数 / 幂级数收敛半径、比值法")).toBeVisible();
  await expect(page.getByText("选择题 / 4 个选项")).toBeVisible();
});

test("import page previews ChatGPT answer fields when JSON includes an answer", async ({
  page,
}) => {
  const response = await page.goto("/import");

  expect(response?.status()).toBeLessThan(400);

  if (page.url().includes("/login")) {
    return;
  }

  await page.getByRole("textbox", { name: "ChatGPT 输出内容" }).fill(
    JSON.stringify(
      [
        {
          subject: "数学",
          chapter: "二重积分",
          knowledge_point: "积分区域与换序",
          difficulty: "中等",
          question_text: "题目文字",
          question_text_status: "ai_unverified",
          mastery_status: "思路对但卡住",
          user_note: "我知道要分区域，但是积分限写不出来。",
          mistake_types: ["积分限判断不稳"],
          solution_summary: "先画区域，再确定积分限。",
          standard_answer: "最终答案",
          answer_explanation: "完整解析",
          key_steps: ["画区域", "确定积分顺序", "计算积分"],
          one_sentence_tip: "二重积分先画区域，再决定积分顺序。",
          review_priority: "high",
          confidence: "medium",
          needs_manual_check: true,
          source: "chatgpt",
          answer_status: "ai_unverified",
          answer_source: "chatgpt_import",
        },
      ],
      null,
      2,
    ),
  );
  await page.getByRole("button", { name: "解析" }).click();

  await expect(page.getByText("包含答案")).toHaveCount(2);
  await expect(page.getByText("难度：中等")).toBeVisible();
  await expect(page.getByText("标准答案预览")).toBeVisible();
  await expect(
    page.locator("div").filter({ hasText: "标准答案预览" }).getByText("最终答案", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("关键步骤 3 步")).toBeVisible();
  await expect(page.getByText("待核对", { exact: true })).toBeVisible();
});

test("import preview renders LaTeX formulas with KaTeX when reachable", async ({ page }) => {
  const response = await page.goto("/import");

  expect(response?.status()).toBeLessThan(400);

  if (page.url().includes("/login")) {
    return;
  }

  await page.getByRole("textbox", { name: "ChatGPT 输出内容" }).fill(
    JSON.stringify(
      [
        {
          subject: "数学",
          chapter: "级数",
          knowledge_point: "正项级数",
          difficulty: "中等",
          question_text: "若 $\\sum_{n=1}^{\\infty} u_n$ 收敛，讨论 $u_{2n}$。",
          question_text_status: "ai_unverified",
          mastery_status: "思路对但卡住",
          user_note: "公式显示要可读。",
          mistake_types: ["公式识别"],
          solution_summary: "$$\\sum_{n=1}^{\\infty} u_n$$ 是正项级数。",
          standard_answer: "$\\frac{1}{n}$ 不一定收敛。",
          answer_explanation: "比较 $u_{2n}$ 与原级数子列。",
          key_steps: ["写出 $u_{2n}$", "使用子级数比较"],
          one_sentence_tip: "先看 $\\sqrt{x}$ 的定义域。",
          review_priority: "high",
          confidence: "medium",
          needs_manual_check: true,
          source: "chatgpt",
          answer_status: "ai_unverified",
          answer_source: "chatgpt_import",
        },
      ],
      null,
      2,
    ),
  );
  await page.getByRole("button", { name: "解析" }).click();

  await expect(page.locator(".katex").first()).toBeVisible();
  await expectPageHasNoHorizontalOverflow(page);
});

test("import page repairs single-backslash LaTeX and keeps KaTeX preview working", async ({
  page,
}) => {
  const response = await page.goto("/import");

  expect(response?.status()).toBeLessThan(400);

  if (page.url().includes("/login")) {
    return;
  }

  await page.getByRole("textbox", { name: "ChatGPT 输出内容" }).fill(String.raw`[
    {
      "subject": "数学",
      "chapter": "高等数学-多元函数积分学",
      "knowledge_point": "三重积分",
      "difficulty": "较难",
      "question_text": "计算区域 $\Omega$ 上的 $\iiint_\Omega \frac{x^2}{a^2} dV$，并判断 $\leq 1$。",
      "question_text_status": "ai_unverified",
      "mastery_status": "思路对但卡住",
      "user_note": "ChatGPT 复制出来是单反斜杠。",
      "mistake_types": ["LaTeX"],
      "solution_summary": "先识别 $\Omega$。",
      "standard_answer": "答案：$\frac{x^2}{a^2}\leq 1$",
      "answer_explanation": "过程：使用 $\left\{x\mid x\in\Omega\right\}$。",
      "key_steps": ["写出 $\Omega$", "计算 $\iiint_\Omega$"],
      "one_sentence_tip": "注意 $\frac{}{}$ 的反斜杠。",
      "review_priority": "high",
      "confidence": "medium",
      "needs_manual_check": true,
      "answer_status": "ai_unverified",
      "answer_source": "chatgpt_import"
    }
  ]`);
  await page.getByRole("button", { name: "解析" }).click();

  await expect(page.getByText("已自动修复中文引号或 LaTeX 反斜杠格式，请继续检查预览。")).toBeVisible();
  await expect(page.getByText("检测到 LaTeX 单反斜杠：已尝试转义。")).toBeVisible();
  await expect(page.getByText("检测到 difficulty = 较难：建议自动映射为 困难。")).toBeVisible();
  await expect(page.locator(".katex").first()).toBeVisible();
  await expectPageHasNoHorizontalOverflow(page);
});

test("import page shows specific parse guidance when JSON repair still fails", async ({
  page,
}) => {
  const response = await page.goto("/import");

  expect(response?.status()).toBeLessThan(400);

  if (page.url().includes("/login")) {
    return;
  }

  await page.getByRole("textbox", { name: "ChatGPT 输出内容" }).fill(String.raw`[{"subject": "数学", "question_text": "$\Omega$"`);
  await page.getByRole("button", { name: "解析" }).click();

  await expect(
    page.getByText(
      "JSON 解析失败，可能原因：引号不是英文双引号、LaTeX 反斜杠未转义、数组逗号缺失、括号未闭合。",
    ),
  ).toBeVisible();
});

test("import preview shows structured choices when JSON includes choices", async ({ page }) => {
  const response = await page.goto("/import");

  expect(response?.status()).toBeLessThan(400);

  if (page.url().includes("/login")) {
    return;
  }

  await page.getByRole("textbox", { name: "ChatGPT 输出内容" }).fill(
    JSON.stringify(
      [
        {
          subject: "数学",
          chapter: "级数",
          knowledge_point: "正项级数",
          difficulty: "中等",
          question_text: "下列选项正确的是（ ）。",
          choices: [
            { label: "A", text: "若 $\\sum u_n$ 收敛" },
            { label: "B", text: "若 $u_{2n}$ 收敛" },
            { label: "C", text: "若部分和有界" },
            { label: "D", text: "若极限存在" },
          ],
          question_text_status: "ai_unverified",
          mastery_status: "思路对但卡住",
          user_note: "选项需要结构化。",
          mistake_types: ["选项混排"],
          solution_summary: "先看每个选项条件。",
          standard_answer: "答案：A",
          answer_explanation: "A 正确。",
          key_steps: ["判断 A", "排除 B"],
          one_sentence_tip: "选项逐个代入。",
          review_priority: "high",
          confidence: "medium",
          needs_manual_check: true,
          answer_status: "ai_unverified",
          answer_source: "chatgpt_import",
        },
      ],
      null,
      2,
    ),
  );
  await page.getByRole("button", { name: "解析" }).click();

  const previewCard = page.locator("section").filter({ hasText: "预览 1 张错题卡" });

  await expect(previewCard.getByText("选择题 / 4 个选项")).toBeVisible();
  await expect(previewCard.getByText("若部分和有界", { exact: true })).toBeVisible();
  await expect(previewCard.locator(".katex").first()).toBeVisible();
  await expectPageHasNoHorizontalOverflow(page);
});

test("upload page defaults to save now and organize with ChatGPT later", async ({ page }) => {
  const response = await page.goto("/upload");

  expect(response?.status()).toBeLessThan(400);

  if (page.url().includes("/login")) {
    return;
  }

  await expect(
    page.getByRole("radio", { name: /只保存图片，稍后用 ChatGPT 整理/ }),
  ).toBeChecked();
});

test("reports page presents report tabs instead of raw JSON", async ({ page }) => {
  const response = await page.goto("/reports");

  expect(response?.status()).toBeLessThan(400);

  if (page.url().includes("/login")) {
    return;
  }

  await expect(page.getByRole("button", { name: "日报", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "周报", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "月报", exact: true })).toBeVisible();
});

test("reports page uses user-facing empty copy and exposes manual rule report generation", async ({
  page,
}) => {
  const response = await page.goto("/reports");

  expect(response?.status()).toBeLessThan(400);

  if (page.url().includes("/login")) {
    return;
  }

  await expect(page.getByRole("heading", { name: "还没有报告" })).toBeVisible();
  await expect(page.getByText("还没有报告。完成几次导入或复习后，可以生成学习总结。")).toBeVisible();
  await expect(page.getByRole("button", { name: "生成今日报告" })).toBeVisible();
  await expect(page.getByText(/Cron|Edge Function/)).toHaveCount(0);
});

test("question detail keeps answers hidden until reveal when reachable", async ({ page }) => {
  const response = await page.goto("/questions/example-answer");

  expect(response?.status()).toBeLessThan(400);

  if (page.url().includes("/login")) {
    return;
  }

  const revealButton = page.getByRole("button", { name: "查看答案" });

  if ((await revealButton.count()) === 0) {
    return;
  }

  await expect(revealButton).toBeVisible();
  await expect(page.getByText("标准答案")).toHaveCount(0);
});

test("review flow asks users to reveal answers before result buttons when reachable", async ({
  page,
}) => {
  const response = await page.goto("/review");

  expect(response?.status()).toBeLessThan(400);

  if (page.url().includes("/login")) {
    return;
  }

  const revealButton = page.getByRole("button", { name: "我做完了，查看答案" }).first();

  if ((await revealButton.count()) === 0) {
    return;
  }

  await expect(page.getByRole("button", { name: "仍不会" })).toHaveCount(0);
  await revealButton.click();
  await expect(page.getByRole("button", { name: "仍不会" }).first()).toBeVisible();
});

test("home page keeps optional DeepSeek out of the primary cockpit", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByText("今日学习驾驶舱")).toBeVisible();
  await expect(page.getByText("快速开始")).toBeVisible();
  await expect(page.getByText("现在应该点这里")).toHaveCount(0);
  await expect(page.getByText("主流程入口保留，低频功能不抢首屏。")).toHaveCount(0);
  await expect(page.getByText("智能建议")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "刷新智能分析" })).toHaveCount(0);
});

for (const route of protectedRoutes) {
  test(`${route} redirects to login or shows a login-required state when signed out`, async ({
    page,
  }) => {
    await expectRouteLoadsOrRequiresLogin(page, route);
  });
}

for (const route of utilityRoutes) {
  test(`${route} is reachable or correctly requires login`, async ({ page }) => {
    await expectRouteLoadsOrRequiresLogin(page, route);
  });
}

test("PWA manifest is accessible", async ({ request }) => {
  const response = await request.get("/manifest.json");

  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toMatch(/application\/(manifest\+)?json/);
});

test("production system check API returns sanitized readiness fields", async ({ request }) => {
  const response = await request.get("/api/settings/system-check");

  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.environment).toEqual(expect.any(String));
  expect(body.variables.NEXT_PUBLIC_SUPABASE_URL).toMatchObject({ configured: expect.any(Boolean) });
  expect(body.variables.NEXT_PUBLIC_SUPABASE_ANON_KEY).toMatchObject({
    configured: expect.any(Boolean),
  });
  expect(body.variables.OPENAI_API_KEY.value).not.toMatch(/^sk-/);
  expect(body.variables.OPENAI_API_KEY.status).toBe("optional");
  expect(body.variables.OPENAI_API_KEY.label).toBe("AI 自动分析：未启用（可选）");
  expect(body.variables.AI_PROVIDER.status).toBe("optional");
  expect(body.variables.GEMINI_API_KEY.status).toBe("optional");
  expect(body.variables.GEMINI_MODEL.value).toBe("gemini-2.5-flash");
  expect(body.variables.DEEPSEEK_API_KEY.status).toBe("optional");
  expect(body.variables.DEEPSEEK_API_KEY.label).toBe("DeepSeek 学习分析：未启用（可选）");
  expect(body.variables.DEEPSEEK_MODEL.value).toBe("deepseek-v4-flash");
  expect(body.supabase.connected).toEqual(expect.any(Boolean));
  expect(body.edgeFunctions.docsPresent).toBe(true);
});

test("mobile viewport has no obvious horizontal scroll and keeps bottom nav visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of [
    "/",
    "/import",
    "/settings",
    "/sprint",
    "/practice",
    "/questions",
    "/upload",
    "/review",
    "/reports",
    "/login",
  ]) {
    await page.goto(route);
    await expectPageHasNoHorizontalOverflow(page);

    if (!page.url().includes("/login")) {
      await expectBottomNav(page);
    }
  }
});
