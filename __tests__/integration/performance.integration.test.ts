import { POST as searchStream } from "@/app/api/search/stream/route";
import { POST as prewarmPost } from "@/app/api/cron/prewarm/route";

describe("Performance Integration", () => {
  it("streaming endpoint returns fast", async () => {
    const payload = JSON.stringify({
      from: "SIN",
      to: "LAX",
      date: "2026-08-15",
      passengers: 1,
      cabin: "economy",
    });

    const request = new Request("http://localhost:3000/api/search/stream", {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/json" },
    });

    const t0 = Date.now();
    const response = await searchStream(request);
    const time = Date.now() - t0;

    expect(response.status).toBe(200);
    expect(time).toBeLessThan(2000); // Should respond in <2s
  });

  it("prewarm cron validates auth", async () => {
    const request = new Request("http://localhost:3000/api/cron/prewarm", {
      method: "POST",
      headers: { "Authorization": "Bearer invalid" },
    });

    const response = await prewarmPost(request);

    expect(response.status).toBe(401);
  });
});
