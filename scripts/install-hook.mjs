import { copyFileSync, chmodSync, existsSync, mkdirSync } from "fs";

// Skip if not in a git repo (e.g. Vercel build environment)
if (!existsSync(".git")) process.exit(0);

mkdirSync(".git/hooks", { recursive: true });
copyFileSync("scripts/pre-push", ".git/hooks/pre-push");
chmodSync(".git/hooks/pre-push", 0o755);
console.log("✅ pre-push hook installé");
