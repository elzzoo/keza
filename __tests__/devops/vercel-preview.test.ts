/**
 * Vercel Preview Deployments Configuration Tests
 * Verifies that vercel.json is properly configured for preview environments
 * and production approval gates.
 */

describe("Vercel Preview Deployments", () => {
  it("loads vercel.json configuration", async () => {
    // Read the vercel.json file (verified to exist)
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "vercel.json");
    const configStr = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configStr);
    expect(config).toBeDefined();
  });

  it("has crons configured for task scheduling", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "vercel.json");
    const configStr = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configStr);
    expect(config.crons).toBeDefined();
    expect(Array.isArray(config.crons)).toBe(true);
    expect(config.crons.length).toBeGreaterThan(0);
  });

  it("enables GitHub integration for automatic deployments", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "vercel.json");
    const configStr = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configStr);
    expect(config.github).toBeDefined();
    expect(config.github.enabled).toBe(true);
  });

  it("disables auto-domain assignment for preview deployments", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "vercel.json");
    const configStr = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configStr);
    expect(config.github?.autoAssignCustomDomains).toBe(false);
  });

  it("enables auto aliasing for deployments", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "vercel.json");
    const configStr = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configStr);
    expect(config.github?.autoAlias).toBe(true);
  });

  it("enables comments from team members on PRs", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "vercel.json");
    const configStr = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configStr);
    expect(config.github?.autoCommentTeamOnPR).toBe(true);
  });

  it("specifies build and output configuration", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "vercel.json");
    const configStr = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configStr);
    expect(config.buildCommand).toBeDefined();
    expect(config.outputDirectory).toBeDefined();
    expect(config.buildCommand).toBe("npm run build");
    expect(config.outputDirectory).toBe(".next");
  });
});
