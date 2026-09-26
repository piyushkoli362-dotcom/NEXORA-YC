import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("WCAG A/AA checks on public, identity, and founder workspace", async ({
  page,
}) => {
  for (const path of ["/", "/register", "/login", "/startups"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  if (process.env.SEED_FOUNDER_PASSWORD) {
    await page.goto("/login");
    await page
      .getByLabel("Email address")
      .fill("founder1@demo.nexora.example.com");
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.SEED_FOUNDER_PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
    for (const path of [
      "/dashboard",
      "/onboarding",
      "/application",
      "/settings",
    ]) {
      await page.goto(path);
      await expect(page.locator(".workspace-main h1")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    }
  }
});
