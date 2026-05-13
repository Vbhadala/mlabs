import { test, expect } from "@playwright/test"

// Smoke: capture screenshots of the post-redirect login pages so the QA
// report has visual evidence the routing chain still terminates correctly.

test("/messages redirect screenshot", async ({ page }) => {
  await page.goto("/messages")
  await expect(page).toHaveURL(/\/login$/)
  await page.screenshot({
    path: ".mstack/qa/2026-05-13-1215/assets/messages-redirect-login.png",
    fullPage: true,
  })
})

test("/notifications redirect screenshot", async ({ page }) => {
  await page.goto("/notifications")
  await expect(page).toHaveURL(/\/login$/)
  await page.screenshot({
    path: ".mstack/qa/2026-05-13-1215/assets/notifications-redirect-login.png",
    fullPage: true,
  })
})
