import { PROGRAMS } from "@/data/programs";

// Test the data logic behind ProgramsWidget (TOP5 = PROGRAMS.slice(0, 5))
describe("ProgramsWidget data", () => {
  const TOP5 = PROGRAMS.slice(0, 5);

  it("shows exactly 5 programs", () => {
    expect(TOP5).toHaveLength(5);
  });

  it("top 5 are sorted by score descending", () => {
    for (let i = 0; i < TOP5.length - 1; i++) {
      expect(TOP5[i].score).toBeGreaterThanOrEqual(TOP5[i + 1].score);
    }
  });

  it("all 5 have a valid /programmes anchor href", () => {
    TOP5.forEach((p) => {
      const href = `/programmes#${p.id}`;
      expect(href).toMatch(/^\/programmes#[a-z0-9-]+$/);
    });
  });
});
