import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(repoRoot, file), "utf8");
}

describe("results UI polish", () => {
  it("keeps decision and alert surfaces free of emoji-led copy", () => {
    const files = [
      "components/Results.tsx",
      "components/FlightCard.tsx",
      "components/PriceAlertForm.tsx",
    ];
    const noisyEmoji = /[📡🧮🏆ℹ️⚠️🥇💎💵❤️🤍🔥🔔🎁🔒]/u;

    for (const file of files) {
      expect(read(file)).not.toMatch(noisyEmoji);
    }
  });
});
