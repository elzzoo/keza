import fs from "node:fs";
import path from "node:path";

function read(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

describe("pro conversion copy polish", () => {
  it("keeps Pro page conversion surfaces free of emoji-led symbols", () => {
    const source = read("app/pro/ProClient.tsx");

    expect(source).not.toMatch(/[🔔📱📊✈️💎🔒🎉✨✅]/u);
  });
});
