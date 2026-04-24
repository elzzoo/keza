// scripts/generate-vapid.mjs
// Usage: node scripts/generate-vapid.mjs
import { generateVAPIDKeys } from "web-push";

const keys = generateVAPIDKeys();

console.log("\n✅ VAPID Keys generated — add these to Vercel env vars:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:contact@keza.app`);
console.log("\n⚠️  VAPID_PRIVATE_KEY must be kept secret — never commit it.\n");
