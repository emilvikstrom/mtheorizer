import { expect, test } from "@playwright/test";

test("a chord is picked and shown on the piano", async ({ page }) => {
  await page.goto("/#/C/major");
  await expect(
    page.getByRole("img", { name: /Piano keyboard showing C major: C, E, G/ }),
  ).toBeVisible();

  await page
    .getByRole("group", { name: "Root" })
    .getByRole("radio", { name: "G", exact: true })
    .check();
  await expect(
    page.getByRole("img", { name: /Piano keyboard showing G major: G, B, D/ }),
  ).toBeVisible();
  await expect(page).toHaveURL(/#\/G\/major/);
});

test("a chord symbol is spelled with the right accidentals", async ({ page }) => {
  await page.goto("/#/Eb/minor");
  await expect(page.getByRole("img", { name: /E♭ minor: E♭, G♭, B♭/ })).toBeVisible();
});

test("chords & scales: C major screenshot", async ({ page }) => {
  await page.goto("/#/C/major");
  await expect(page.getByRole("img", { name: /Piano keyboard showing C major/ })).toBeVisible();
  await expect(page).toHaveScreenshot("lookup-c-major.png", { fullPage: true });
});

test("circle of fifths screenshot", async ({ page }) => {
  await page.goto("/#/circle");
  await expect(page.getByRole("tab", { name: "Circle of fifths" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page).toHaveScreenshot("circle-of-fifths.png", { fullPage: true });
});
