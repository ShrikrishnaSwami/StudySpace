import { test, expect } from "@playwright/test";

test("login and signup pages render", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("input[type=email]")).toBeVisible();
  await page.goto("/signup");
  await expect(page.locator("input[type=email]")).toBeVisible();
});

test("admin statistics fail closed without a bearer token", async ({ request }) => {
  const response = await request.get("/api/admin/stats");
  expect(response.status()).toBe(401);
  expect((await response.json()).error).toMatch(/sign in/i);
});

test("admin backup status fails closed without a bearer token", async ({ request }) => {
  const response = await request.get("/api/admin/backups");
  expect(response.status()).toBe(401);
});

test("AI grading fails closed without a bearer token", async ({ request }) => {
  const response = await request.post("/api/assignments/grade", {
    data: { assignmentId: "00000000-0000-4000-8000-000000000001", submissionId: "00000000-0000-4000-8000-000000000002" },
  });
  expect(response.status()).toBe(401);
});