import { localizedPath } from "@/lib/localizedPath";

describe("localizedPath", () => {
  it.each([
    ["/", "en", "/en"],
    ["/en", "fr", "/"],
    ["/mentions-legales", "en", "/en/legal"],
    ["/en/legal", "fr", "/mentions-legales"],
    ["/confidentialite", "en", "/en/privacy"],
    ["/en/privacy", "fr", "/confidentialite"],
    ["/profil", "en", "/en/profile"],
    ["/compte", "en", "/en/profile"],
    ["/en/profile", "fr", "/profil"],
    ["/programmes/flying-blue", "en", "/en/programmes/flying-blue"],
    ["/en/vol/dss-cdg", "fr", "/vol/dss-cdg"],
    ["/deals", "en", "/en/deals"],
    ["/en/deals", "fr", "/deals"],
    ["/admin", "en", "/en"],
    ["/en/unknown", "fr", "/"],
  ] as const)("maps %s to %s as %s", (path, language, expected) => {
    expect(localizedPath(path, language)).toBe(expected);
  });

  it("keeps a path already in the target language", () => {
    expect(localizedPath("/en/deals", "en")).toBe("/en/deals");
    expect(localizedPath("/deals", "fr")).toBe("/deals");
  });
});
