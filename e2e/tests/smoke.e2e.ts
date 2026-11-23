import { expect, test } from "@playwright/test";

const TABS = [
  "Chords",
  "Scales",
  "Circle of fifths",
  "Progressions",
  "What chord is this?",
  "Tonnetz",
  "Practice",
  "Settings",
];

test("every tab opens without errors", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "mtheorizer" })).toBeVisible();

  for (const name of TABS) {
    const tab = page.getByRole("tab", { name });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    // The circle's key panel has a tab list of its own, so take the app's panel by name.
    const panel = page.getByRole("tabpanel", { name, exact: true });
    await expect(panel).toBeVisible();
    await expect(panel).not.toBeEmpty();
  }

  expect(problems).toEqual([]);
});

test("a link opens the view it names", async ({ page }) => {
  await page.goto("/#/circle");
  await expect(page.getByRole("tab", { name: "Circle of fifths" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.goto("/#/identify");
  await expect(page.getByRole("tab", { name: "What chord is this?" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("the page does not scroll sideways on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  for (const name of TABS) {
    await page.getByRole("tab", { name }).click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${name} is wider than the screen`).toBeLessThanOrEqual(0);
  }
});
