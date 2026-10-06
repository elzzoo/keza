import { readFileSync } from "fs";
import path from "path";

describe("alert conversion polish", () => {
  const guardedFiles = [
    "components/PushAlertButton.tsx",
    "components/SeatAlertButton.tsx",
    "components/ReferralCard.tsx",
  ];

  it.each(guardedFiles)("%s avoids visible emoji-led UI", (file) => {
    const source = readFileSync(path.join(process.cwd(), file), "utf8");
    expect(source).not.toMatch(/[🔔🎁📱✈️⏳]/u);
  });
});
