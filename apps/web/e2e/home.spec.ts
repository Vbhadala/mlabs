import { test, expect } from "@playwright/test"
import { brand } from "@mlabs/config"

test("home renders brand name and links", async ({ page }) => {
  await page.goto("/")

  // <h1> reflects the brand config
  await expect(page.getByRole("heading", { level: 1, name: brand.name })).toBeVisible()

  // Both primary CTAs present
  await expect(page.getByRole("link", { name: "Get started" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible()
})
