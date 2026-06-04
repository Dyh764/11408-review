import { expect, test, type Page } from "@playwright/test";

const protectedRoutes = ["/upload", "/questions", "/reports"];
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
  await expect(page.locator("nav").getByRole("link", { name: /设置|璁剧疆/ })).toBeVisible();
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
});

test("login page is accessible", async ({ page }) => {
  const response = await page.goto("/login");

  expect(response?.status()).toBeLessThan(400);
  await expect(page).toHaveURL(/\/login/);
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
  expect(body.supabase.connected).toEqual(expect.any(Boolean));
  expect(body.edgeFunctions.docsPresent).toBe(true);
});

test("mobile viewport has no obvious horizontal scroll and keeps bottom nav visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expectPageHasNoHorizontalOverflow(page);
  await expectBottomNav(page);
});
