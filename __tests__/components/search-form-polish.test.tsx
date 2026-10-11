import fs from "fs";
import path from "path";

describe("SearchForm polish", () => {
  it("keeps warning/error affordances free of visible emoji markers", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/SearchForm.tsx"),
      "utf8"
    );

    expect(source).not.toMatch(/[⚠️]/u);
  });
});
