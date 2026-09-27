import fs from "fs";
import path from "path";

describe("profile i18n routing", () => {
  it("renders the English profile route with the English profile client", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/en/profile/page.tsx"),
      "utf8"
    );

    expect(source).toContain('<ProfilClient lang="en" />');
  });

  it("keeps localized profile links inside ProfilClient", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/profil/ProfilClient.tsx"),
      "utf8"
    );

    expect(source).toContain('homeHref: "/en"');
    expect(source).toContain('routePrefix: "/en/vol"');
    expect(source).toContain('title: "My profile"');
    expect(source).toContain('href={t.homeHref}');
  });
});
