type Language = "fr" | "en";

const FR_TO_EN: Record<string, string> = {
  "/mentions-legales": "/en/legal",
  "/confidentialite": "/en/privacy",
  "/profil": "/en/profile",
  "/compte": "/en/profile",
};

const EN_TO_FR: Record<string, string> = {
  "/en/legal": "/mentions-legales",
  "/en/privacy": "/confidentialite",
  "/en/profile": "/profil",
};

const PARALLEL_ROOTS = new Set([
  "alertes", "calculateur", "carte", "comparer", "connexion", "deals",
  "destinations", "entreprises", "flights", "miles-alerts", "onboarding",
  "prix", "pro", "programmes", "vol",
]);

export function localizedPath(pathname: string, language: Language): string {
  if (language === "en") {
    if (pathname === "/en" || pathname.startsWith("/en/")) return pathname;
    if (pathname === "/") return "/en";
    if (FR_TO_EN[pathname]) return FR_TO_EN[pathname];
    const root = pathname.split("/")[1];
    return PARALLEL_ROOTS.has(root) ? `/en${pathname}` : "/en";
  }

  if (pathname === "/en") return "/";
  if (!pathname.startsWith("/en/")) return pathname;
  if (EN_TO_FR[pathname]) return EN_TO_FR[pathname];
  const relativePath = pathname.slice(3);
  const root = relativePath.split("/")[1];
  return PARALLEL_ROOTS.has(root) ? relativePath : "/";
}
