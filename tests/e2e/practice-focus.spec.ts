import { expect, test, type Page } from "@playwright/test";

const practiceMockEnabled = process.env.E2E_PRACTICE_MOCK === "1";

const mockQuestions = [
  {
    id: "practice-focus-one",
    user_id: "practice-focus-user",
    subject: "操作系统",
    chapter: "进程与线程",
    knowledge_point: "进程状态转换",
    difficulty: "中等",
    image_path: null,
    question_text:
      "在进程状态转换中，下列说法正确的是哪一项？为验证长题滚动区域，这里补充一段较长的题干说明。".repeat(
        5,
      ),
    choices: [
      { label: "A", text: "运行态进程可能因等待资源进入阻塞态" },
      { label: "B", text: "阻塞态进程可以直接变为运行态" },
      { label: "C", text: "就绪态进程已经占有处理器" },
      { label: "D", text: "创建态进程必然直接进入运行态" },
    ],
    question_text_status: "verified",
    mastery_status: "有一点思路",
    user_note: null,
    mistake_types: ["概念混淆"],
    solution_summary: null,
    standard_answer: "A",
    answer_explanation:
      "过程：A：等待事件发生时会由运行态转为阻塞态；B：阻塞态应先转为就绪态；C：就绪态尚未占有处理器；D：创建完成后通常先进入就绪态。",
    key_steps: ["区分就绪态和阻塞态"],
    one_sentence_tip: "先判断进程是否正在等待事件。",
    related_practice_questions: [],
    review_priority: "high",
    confidence: "high",
    needs_manual_check: false,
    source: "chatgpt_import",
    source_info: {
      type: "真题",
      name: "2023 年 408 真题",
      section: "",
      part: "",
      volume: "",
      paper: "",
      page: "",
      problem_number: "1",
      raw: "",
    },
    answer_status: "verified",
    answer_source: "chatgpt_import",
    created_at: "2026-07-23T08:00:00.000Z",
    analyzed_at: null,
    deleted_at: null,
    deleted_reason: null,
  },
  {
    id: "practice-focus-two",
    user_id: "practice-focus-user",
    subject: "操作系统",
    chapter: "进程与线程",
    knowledge_point: "进程映像",
    difficulty: "基础",
    image_path: null,
    question_text: "一个进程映像由哪些部分组成？",
    choices: [
      { label: "A", text: "只有程序代码" },
      { label: "B", text: "程序、数据和进程控制块" },
      { label: "C", text: "只有进程控制块" },
      { label: "D", text: "只有程序和数据" },
    ],
    question_text_status: "verified",
    mastery_status: "做对但不稳",
    user_note: null,
    mistake_types: ["记忆不牢"],
    solution_summary: null,
    standard_answer: "B",
    answer_explanation:
      "A. 缺少数据和进程控制块；B. 程序、数据和 PCB 共同构成进程映像；C. PCB 只是其中一部分；D. 还缺少 PCB。",
    key_steps: ["记住程序、数据、PCB 三部分"],
    one_sentence_tip: "进程映像不只包含程序本身。",
    related_practice_questions: [],
    review_priority: "medium",
    confidence: "high",
    needs_manual_check: false,
    source: "chatgpt_import",
    source_info: {
      type: "真题",
      name: "2024 年 408 真题",
      section: "",
      part: "",
      volume: "",
      paper: "",
      page: "",
      problem_number: "2",
      raw: "",
    },
    answer_status: "verified",
    answer_source: "chatgpt_import",
    created_at: "2026-07-23T09:00:00.000Z",
    analyzed_at: null,
    deleted_at: null,
    deleted_reason: null,
  },
  {
    id: "practice-focus-missing-image",
    user_id: "practice-focus-user",
    subject: "操作系统",
    chapter: "进程与线程",
    knowledge_point: "进程调度",
    difficulty: "中等",
    image_path: null,
    question_text: "如图所示，调度顺序正确的是哪一项？",
    choices: [
      { label: "A", text: "顺序一" },
      { label: "B", text: "顺序二" },
      { label: "C", text: "顺序三" },
      { label: "D", text: "顺序四" },
    ],
    question_text_status: "verified",
    mastery_status: "完全没思路",
    user_note: "image_code: required",
    mistake_types: ["缺少原图"],
    solution_summary: null,
    standard_answer: "A",
    answer_explanation: "A：正确；B：错误；C：错误；D：错误。",
    key_steps: [],
    one_sentence_tip: null,
    related_practice_questions: [],
    review_priority: "high",
    confidence: "low",
    needs_manual_check: true,
    source: "chatgpt_import",
    source_info: null,
    answer_status: "verified",
    answer_source: "chatgpt_import",
    created_at: "2026-07-23T10:00:00.000Z",
    analyzed_at: null,
    deleted_at: null,
    deleted_reason: null,
  },
];

async function installMockSupabase(page: Page) {
  await page.route("http://127.0.0.1:3139/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/rest/v1/questions" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "content-range": `0-${mockQuestions.length - 1}/${mockQuestions.length}` },
        body: JSON.stringify(mockQuestions),
      });
      return;
    }

    if (url.pathname === "/auth/v1/user") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "practice-focus-user",
          aud: "authenticated",
          role: "authenticated",
          email: "practice-focus@example.com",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: request.method() === "GET" ? "[]" : "{}",
    });
  });
}

async function activeQuestionText(page: Page) {
  return page.locator("div.overflow-y-auto.overscroll-contain").last().innerText();
}

async function dragCard(page: Page, deltaX: number, deltaY: number) {
  const card = page.locator("div.touch-pan-y").last();
  const box = await card.boundingBox();

  expect(box).not.toBeNull();
  const startX = (box?.x ?? 0) + (box?.width ?? 0) / 2;
  const startY = (box?.y ?? 0) + Math.min((box?.height ?? 0) / 2, 260);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 8 });
  await page.mouse.up();
}

test.describe("固定刷题模式", () => {
  test.skip(!practiceMockEnabled, "需要 E2E_PRACTICE_MOCK=1 和本地模拟 Supabase 地址");

  for (const viewport of [
    { width: 390, height: 667, label: "compact-mobile" },
    { width: 390, height: 844, label: "mobile" },
    { width: 1280, height: 900, label: "desktop" },
  ]) {
    test(`${viewport.label} 固定布局、续刷、手势、逐项解析和缺图过滤`, async ({ page }) => {
      await installMockSupabase(page);
      await page.setViewportSize(viewport);
      await page.goto("/");
      await page.evaluate(() => window.localStorage.clear());
      await page.goto("/practice?mode=exam408-choice&subject=操作系统");

      await expect(page.getByText(/缺图跳过 1 题/)).toBeVisible();
      await expect(page.getByText(/剩余 2 题/)).toBeVisible();
      await expect(page.getByRole("button", { name: "提交答案" })).toBeVisible();

      const scrollArea = page.locator("div.overflow-y-auto.overscroll-contain").last();
      const optionLayout = await page.locator("button.answer-choice").evaluateAll(
        (buttons) =>
          buttons.map((button) => ({
            width: button.getBoundingClientRect().width,
            scrollOverflow: button.scrollWidth - button.clientWidth,
          })),
      );
      const scrollAreaMetrics = await scrollArea.evaluate((element) => ({
        width: element.clientWidth,
        height: element.clientHeight,
        horizontalOverflow: element.scrollWidth - element.clientWidth,
      }));

      expect(optionLayout).toHaveLength(4);
      for (const option of optionLayout) {
        expect(option.width).toBeGreaterThanOrEqual(scrollAreaMetrics.width - 40);
        expect(option.scrollOverflow).toBeLessThanOrEqual(1);
      }
      expect(scrollAreaMetrics.height).toBeGreaterThanOrEqual(
        viewport.height < 720 ? 240 : 280,
      );
      expect(scrollAreaMetrics.horizontalOverflow).toBeLessThanOrEqual(1);

      const firstQuestion = await activeQuestionText(page);
      await page.reload();
      const resumedQuestion = await activeQuestionText(page);
      expect(resumedQuestion).not.toBe(firstQuestion);

      const fixedMetrics = await page.evaluate(() => {
        const root = document.documentElement;
        const shellMain = document.querySelector("main");
        return {
          horizontalOverflow: root.scrollWidth - root.clientWidth,
          documentOverflow: root.scrollHeight - root.clientHeight,
          mainOverflow: shellMain
            ? shellMain.scrollHeight - shellMain.clientHeight
            : Number.POSITIVE_INFINITY,
        };
      });
      expect(fixedMetrics.horizontalOverflow).toBeLessThanOrEqual(1);
      expect(fixedMetrics.documentOverflow).toBeLessThanOrEqual(1);
      expect(fixedMetrics.mainOverflow).toBeLessThanOrEqual(1);

      const beforeVerticalDrag = await activeQuestionText(page);
      await dragCard(page, 6, -110);
      expect(await activeQuestionText(page)).toBe(beforeVerticalDrag);

      const beforeScrollTop = await scrollArea.evaluate((element) => element.scrollTop);
      const scrollOverflow = await scrollArea.evaluate(
        (element) => element.scrollHeight - element.clientHeight,
      );
      await scrollArea.hover();
      await page.mouse.wheel(0, 460);
      const afterScrollTop = await scrollArea.evaluate((element) => element.scrollTop);
      if (scrollOverflow > 1) {
        expect(afterScrollTop).toBeGreaterThan(beforeScrollTop);
      } else {
        expect(afterScrollTop).toBe(beforeScrollTop);
      }

      const beforeHorizontalDrag = await activeQuestionText(page);
      const canGoNext = await page
        .getByRole("button", { name: "下一题", exact: true })
        .last()
        .isEnabled();
      await dragCard(page, canGoNext ? -90 : 90, 5);
      await expect.poll(() => activeQuestionText(page)).not.toBe(beforeHorizontalDrag);

      await page.locator("button.answer-choice").first().click();
      await page.getByRole("button", { name: "提交答案" }).click();
      for (const label of ["A", "B", "C", "D"]) {
        await expect(page.getByText(`${label} 项解析`, { exact: false })).toHaveCount(1);
      }

      const primaryNext = page.getByRole("button", { name: "下一题", exact: true }).first();
      await expect(primaryNext).toBeVisible();
      const nextBox = await primaryNext.boundingBox();
      expect((nextBox?.y ?? viewport.height) + (nextBox?.height ?? 0)).toBeLessThanOrEqual(
        viewport.height,
      );
    });

    test(`${viewport.label} 每日一题、高频错题和考点刷题入口可用`, async ({ page }) => {
      await installMockSupabase(page);
      await page.setViewportSize(viewport);
      await page.goto("/practice");

      await expect(page.getByRole("button", { name: /每日一题/ })).toBeVisible();
      await expect(page.getByRole("button", { name: /个人高频错题/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /按考点刷题/ })).toHaveAttribute(
        "href",
        "/knowledge-map",
      );
      await expect(page.getByRole("link", { name: /二刷错题/ })).toHaveAttribute(
        "href",
        "/review",
      );

      await page.getByRole("button", { name: /每日一题/ }).click();
      await expect(page.getByText("每日一题", { exact: true })).toBeVisible();
      await expect(page.getByText(/剩余 1 题/)).toBeVisible();

      await page.goto("/knowledge-map");
      await expect(
        page.getByRole("heading", { name: "考点刷题与考频" }),
      ).toBeVisible();
      await expect(page.getByText("进程与线程", { exact: true })).toBeVisible();
      await expect(page.getByText(/开始刷本章 3 道选择题/)).toBeVisible();
      await expect(page.getByText(/2023、2024 年/)).toBeVisible();

      const horizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(horizontalOverflow).toBeLessThanOrEqual(1);
    });
  }
});

test.describe("首页专业刷题", () => {
  test.skip(!practiceMockEnabled, "需要 E2E_PRACTICE_MOCK=1 和本地模拟 Supabase 地址");

  test("手机端从首页进入并完成修改、多刷、开卷和快速回填", async ({ page }) => {
    await installMockSupabase(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    const launcher = page.locator('[data-testid="professional-practice-section"]:visible');

    await expect(launcher.getByText("408 专业刷题", { exact: true })).toBeVisible();
    await expect(launcher.getByText("4/4 可用", { exact: true })).toBeVisible();
    await launcher.getByLabel("专业刷题题源").selectOption("exam");
    await launcher.getByLabel("专业刷题科目").selectOption("操作系统");
    await expect(launcher.getByText(/修改模式 · 2 题/)).toBeVisible();
    await launcher.getByRole("link", { name: "开始刷题" }).click();
    await expect(page).toHaveURL(/answerMode=editable/);
    await expect(page).toHaveURL(/sourceRange=exam/);
    await page.locator("button.answer-choice").first().click();
    await page.getByRole("button", { name: "提交答案" }).click();
    await expect(page.getByRole("button", { name: "修改答案" })).toBeVisible();
    await page.getByRole("button", { name: "修改答案" }).click();
    await expect(page.getByRole("button", { name: "提交答案" })).toBeVisible();
    await page.getByRole("button", { name: "提交答案" }).click();
    await page.getByRole("button", { name: "下一题", exact: true }).first().click();
    await page.goto("/");

    await launcher
      .getByRole("button", { name: /^开卷模式/ })
      .click();
    await launcher.getByRole("link", { name: "开始刷题" }).click();
    await expect(page.getByRole("button", { name: "看完，下一题" })).toBeVisible();
    await expect(page.getByText(/正确答案：/)).toHaveCount(0);
    await page.getByRole("button", { name: "看完，下一题" }).click();
    await page.goto("/");

    await launcher
      .getByRole("button", { name: /^快速回填/ })
      .click();
    await launcher.getByRole("link", { name: "开始刷题" }).click();
    await expect(page.getByRole("button", { name: "标记做错" })).toBeVisible();
    await expect(page.getByRole("button", { name: "标记做对" })).toBeVisible();
    await page.getByRole("button", { name: "标记做对" }).click();
    await page.goto("/");

    await launcher
      .getByRole("button", { name: /^多刷模式/ })
      .click();
    await launcher.getByRole("link", { name: "开始刷题" }).click();
    await page.locator("button.answer-choice").first().click();
    await page.getByRole("button", { name: "提交答案" }).click();
    await expect(page.getByText(/已作答 1 次/)).toBeVisible();
    await page.getByRole("button", { name: "下一题", exact: true }).first().click();
    await expect(page.getByText(/本组 2 题/)).toBeVisible();
  });

  test("首页显示每个配套模块的数据状态且入口可到达", async ({ page }) => {
    await installMockSupabase(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const launcher = page.locator('[data-testid="professional-practice-section"]:visible');

    await launcher.getByText("配套模块检测", { exact: true }).click();
    const modules = [
      { name: /错题二刷/, path: "/review" },
      { name: /收藏 \/ PDF/, path: "/collections" },
      { name: /学习笔记/, path: "/notes" },
      { name: /考点考频/, path: "/knowledge-map" },
    ];

    for (const practiceModule of modules) {
      const link = launcher.getByRole("link", { name: practiceModule.name });
      await expect(link).toHaveAttribute("href", practiceModule.path);
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${practiceModule.path.replace("/", "\\/")}$`));
      await page.goto("/");
      await launcher.getByText("配套模块检测", { exact: true }).click();
    }
  });
});
