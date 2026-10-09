import { readFileSync } from "fs";
import path from "path";

describe("miles decision polish", () => {
  const guardedFiles = [
    "components/PortfolioCheck.tsx",
    "components/MilesValueScore.tsx",
  ];

  it.each(guardedFiles)("%s avoids visible emoji-led decision copy", (file) => {
    const source = readFileSync(path.join(process.cwd(), file), "utf8");
    expect(source).not.toMatch(/[✅🔁⚠️💡]/u);
  });
});
