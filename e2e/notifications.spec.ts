import { test, expect } from "@playwright/test"

test("/notifications redirects unauthenticated visitors to /login", async ({
  page,
}) => {
  await page.goto("/notifications")
  await expect(page).toHaveURL(/\/login$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "Sign in" }),
  ).toBeVisible()
})

test("/api/notifications/unread-count returns 401 when unauthenticated", async ({
  request,
}) => {
  const res = await request.get("/api/notifications/unread-count")
  expect(res.status()).toBe(401)
})
