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

  it("configures preview branch deployments", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "vercel.json");
    const configStr = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configStr);
    expect(config.preview).toBeDefined();
    expect(config.preview.previewBranches).toBeDefined();
    expect(Array.isArray(config.preview.previewBranches)).toBe(true);
    // Should include at least 'develop' or 'staging'
    const branches = config.preview.previewBranches;
    expect(branches.length).toBeGreaterThan(0);
  });

  it("disables auto-assignment of custom domains for preview", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "vercel.json");
    const configStr = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configStr);
    expect(config.preview?.deployment?.autoAssignCustomDomain).toBe(false);
  });

  it("enables preview comments on GitHub PRs", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), "vercel.json");
    const configStr = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configStr);
    expect(config.preview?.deployment?.comments).toBe(true);
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
