import { expect, test } from "@playwright/test";

test("@desktop reader keeps real pages through flip navigation and completes the quiz", async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Kenali Anemia" }).first()).toBeVisible();
  await expect(page.getByText("Mode flip")).toBeVisible();
  await expect(page.locator("[data-flip-page]")).toHaveCount(6);
  await expect(page.locator("[data-flip-page]").first()).toContainText("Kenali Anemia");

  const reader = page.getByRole("region", { name: "Pembaca booklet" });
  await reader.focus();
  await expect(reader).toBeFocused();
  await expect(reader).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("2 / 6", { exact: true })).toBeVisible();

  const next = page.getByRole("button", { name: "Halaman berikutnya" });
  for (const expected of [4, 6]) {
    await next.click();
    await expect(page.getByText(`${expected} / 6`, { exact: true })).toBeVisible();
  }
  expect(pageErrors.map((error) => error.message)).not.toContainEqual(
    expect.stringContaining("NotFoundError"),
  );

  await page.getByRole("button", { name: "Mulai kuis" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Perlu dilihat bersama informasi lain").check();
  await page.getByRole("button", { name: "Pertanyaan berikutnya" }).click();
  await page.getByLabel("Ikuti panduan tenaga/program kesehatan").check();
  await page.getByRole("button", { name: "Pertanyaan berikutnya" }).click();
  await page.getByLabel("Materi edukasi").check();
  await page.getByRole("button", { name: "Lihat hasil" }).click();
  await expect(page.getByText("3 dari 3 jawaban tepat.")).toBeVisible();
});

test("@mobile uses the semantic vertical reader", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Mode baca vertikal aktif")).toBeVisible();
  await expect(page.locator("[data-vertical-page-id]")).toHaveCount(6);
});
