import { test, expect } from "@playwright/test";

test.describe("Push notification API", () => {
  // ── /api/push/subscribe ──────────────────────────────────────────────────

  test("POST /api/push/subscribe rejects missing body", async ({ request }) => {
    const res = await request.post("/api/push/subscribe", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/push/subscribe rejects incomplete subscription", async ({ request }) => {
    const res = await request.post("/api/push/subscribe", {
      data: { endpoint: "https://example.com/push", keys: { p256dh: "" } },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  // ── /api/push/test ───────────────────────────────────────────────────────

  test("GET /api/push/test returns 401 without secret", async ({ request }) => {
    const res = await request.get("/api/push/test");
    expect(res.status()).toBe(401);
  });

  test("POST /api/push/test returns 401 without secret", async ({ request }) => {
    const res = await request.post("/api/push/test");
    expect(res.status()).toBe(401);
  });

  test("GET /api/push/test returns 401 with wrong secret", async ({ request }) => {
    const res = await request.get("/api/push/test?secret=wrong-secret-xyz");
    expect(res.status()).toBe(401);
  });
});
