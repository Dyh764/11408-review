import { expect, test, type Page } from "@playwright/test";

const protectedRoutes = ["/upload", "/import", "/questions", "/reports"];
const utilityRoutes = ["/settings", "/sprint"];

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

  await expect(page.getByRole("link", { name: /拍题上传/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /导入 ChatGPT 错题卡/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /开始今日复习/ })).toBeVisible();
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

  await page.getByRole("button", { name: "插入示例 JSON" }).click();
  await page.getByRole("button", { name: "解析" }).click();

  await expect(page.getByText("预览 1 张错题卡")).toBeVisible();
  await expect(page.getByRole("heading", { name: "文字错题卡" })).toBeVisible();
  await expect(page.getByText("文字题卡预览")).toBeVisible();
  const textPreview = page.locator("article").filter({ hasText: "文字题卡预览" });
  await expect(textPreview.getByText("二重积分", { exact: true })).toBeVisible();
  await expect(textPreview.getByText("题目文字", { exact: true })).toBeVisible();
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

  await expect(page.getByText("暂无日报")).toBeVisible();
  await expect(page.getByText("完成上传、导入或复习后，这里会生成学习总结。")).toBeVisible();
  await expect(page.getByRole("button", { name: "生成今日报告" })).toBeVisible();
  await expect(page.getByText(/Cron|Edge Function/)).toHaveCount(0);
});

test("home page explains optional DeepSeek suggestions without auto analysis", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByText("智能建议")).toBeVisible();
  await expect(page.getByText("当前使用规则统计，DeepSeek 可选启用。")).toBeVisible();
  await expect(page.getByRole("button", { name: "刷新智能分析" })).toBeDisabled();
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
  expect(body.variables.OPENAI_API_KEY.label).toBe("AI 自动分析未启用（可选）");
  expect(body.variables.DEEPSEEK_API_KEY.status).toBe("optional");
  expect(body.variables.DEEPSEEK_API_KEY.label).toBe("DeepSeek 学习分析未启用（可选）");
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
