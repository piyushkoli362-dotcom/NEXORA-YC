import { test, expect } from "@playwright/test";
import { steps } from "../../apps/web/lib/onboarding";

test("founder registration, verification, saved onboarding, submission, and admin review", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@example.com`,
    password = "End-to-end founder passphrase 847!";
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Jamie Founder");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const registered = page.waitForResponse((r) =>
    r.url().endsWith("/auth/register"),
  );
  await page.getByRole("button", { name: "Create founder account" }).click();
  const response = await registered;
  expect(response.status()).toBe(201);
  const registration = await response.json();
  await expect(page).toHaveURL(/onboarding/);
  if (registration.development_link) {
    await page.goto(registration.development_link);
    await page
      .getByRole("button", { name: "Verify email", exact: true })
      .click();
    await expect(
      page.getByText("Email verified. You can now submit your application."),
    ).toBeVisible();
  }
  await page.goto("/onboarding");
  for (let step = 0; step < 11; step++) {
    for (const f of steps[step].fields) {
      const locator = page.getByLabel(
        f.label + (f.optional ? " (optional)" : " *"),
        { exact: true },
      );
      if (f.key === "stage") await locator.selectOption("MVP");
      else
        await locator.fill(
          [
            "linkedin",
            "portfolio",
            "photo_url",
            "website",
            "pitch_deck",
            "business_plan",
            "demo",
            "other_documents",
          ].includes(f.key)
            ? "https://example.com"
            : step === 0 && f.key === "name"
              ? "Jamie Founder"
              : step === 1 && f.key === "name"
                ? "E2E Startup"
                : `Validated answer for ${f.label}`,
        );
    }
    await page.getByRole("button", { name: "Save & continue" }).click();
    await expect(
      page.getByText(`Step ${step + 2} of 12`, { exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Review application", exact: true })
    .click();
  await expect(page).toHaveURL(/application/);
  await expect(
    page.getByText("Your required information is complete."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Submit for human review" }).click();
  await page.getByRole("button", { name: "Confirm submission" }).click();
  await expect(
    page.getByRole("heading", { name: "Submitted", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Submitted snapshot" }),
  ).toBeVisible();
  await page
    .getByLabel("Message the review team")
    .fill("Could you confirm the next steps?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByText("Could you confirm the next steps?", { exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Let’s build what’s next, Jamie/ }),
  ).toBeVisible();
  await page.screenshot({
    path: ".local/dashboard-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Open menu", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".local/dashboard-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("link", { name: "My application", exact: true }).click();
  await expect(page).toHaveURL(/application/);
  if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByLabel("Email address").fill(process.env.SEED_ADMIN_EMAIL);
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.SEED_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/admin/);
    await page.getByLabel("Filter applications").fill("E2E Startup");
    await page
      .getByRole("button", { name: "Review E2E Startup", exact: true })
      .first()
      .click();
    await page.getByLabel("Next status").selectOption("SCREENING");
    await page.getByRole("button", { name: "Save review changes" }).click();
    await expect(
      page.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Review note", { exact: true })
      .fill("PRIVATE: internal review reasoning");
    await page.getByRole("button", { name: "Add private note" }).click();
    await expect(
      page.getByText("Private note saved.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.goto("/application");
    await expect(
      page.getByRole("heading", { name: "Screening", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("PRIVATE: internal review reasoning"),
    ).toHaveCount(0);
  }
});

test("public desktop/mobile routes and private redirect", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Build the next/ }),
  ).toBeVisible();
  await page.screenshot({
    path: ".local/home-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".local/home-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Open site menu", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Mobile site navigation" })
    .getByRole("link", { name: "Programs", exact: true })
    .click();
  await expect(page).toHaveURL(/programs/);
  for (const path of [
    "/about",
    "/how-it-works",
    "/startups",
    "/founders",
    "/investors",
    "/programs",
    "/challenges",
    "/resources",
    "/pricing",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
  }
  await page.goto("/admin");
  await expect(page).toHaveURL(/login/);
});
