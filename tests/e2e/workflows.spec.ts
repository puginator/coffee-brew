import { expect, test } from "@playwright/test";

test("create -> publish -> share -> brew -> remix flow", async ({ page }) => {
  const suffix = Date.now();
  const recipeTitle = `Playwright Brew ${suffix}`;
  const recipeSlug = `playwright-brew-${suffix}`;

  await page.goto("/studio/new");
  await expect(page.getByTestId("recipe-title-input")).toBeVisible();

  await page.getByTestId("recipe-title-input").fill(recipeTitle);
  await page.getByTestId("recipe-slug-input").fill(recipeSlug);
  await page.getByTestId("add-step-pour").click();

  await page.getByTestId("save-draft-button").click();
  await expect(page.getByTestId("editor-message")).toContainText("Recipe saved.");

  await page.getByTestId("publish-share-button").click();
  await expect(page.getByTestId("editor-message")).toContainText("Published");

  const shareUrl = (await page.getByTestId("editor-share-url").textContent())?.trim();
  expect(shareUrl).toBeTruthy();
  expect(shareUrl).toContain("/share/");

  await page.goto(shareUrl!);
  await expect(page.getByRole("heading", { name: "Shared Brew Card" })).toBeVisible();

  await page.getByRole("link", { name: "Start Brew" }).click();
  await expect(page.getByRole("heading", { name: "Guided Brew Session" })).toBeVisible();

  await page.goto(shareUrl!);
  await page.getByTestId("share-remix-button").click();
  await expect(page).toHaveURL(/\/studio\/.+\/edit/);
  await expect(page.getByTestId("recipe-title-input")).toHaveValue(/Remix/);
});

test("seed recipe share pages stay accessible", async ({ page }) => {
  await page.goto("/share/seed-chemex");

  await expect(page.getByRole("heading", { name: "Shared Brew Card" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chemex" })).toBeVisible();
  await page.getByRole("link", { name: "Start Brew" }).click();
  await expect(page).toHaveURL(/\/brew\/chemex/);
});
