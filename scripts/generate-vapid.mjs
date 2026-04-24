#!/usr/bin/env node
/**
 * KEZA — Generate VAPID keys for Web Push notifications
 *
 * Usage (run once):
 *   node scripts/generate-vapid.mjs
 *
 * Then add the printed values to Vercel → Settings → Environment Variables
 * for both Production and Preview environments:
 *
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY   ← safe to expose in browser
 *   VAPID_PRIVATE_KEY              ← server-only, keep secret!
 *   VAPID_EMAIL                    ← mailto: contact address
 *
 * After adding variables, trigger a new Vercel deployment (or redeploy).
 * The PushAlertButton and PushNotifBanner will then activate automatically.
 *
 * To verify the push flow end-to-end, use the admin dashboard at /admin:
 *   → "Test Push" sends a notification to all stored subscribers.
 */

import pkg from "web-push";
const { generateVAPIDKeys } = pkg;

const keys = generateVAPIDKeys();

console.log("\n✅  VAPID keys generated\n");
console.log("─────────────────────────────────────────────────────────────────");
console.log("Copy these values into Vercel → Settings → Environment Variables");
console.log("─────────────────────────────────────────────────────────────────\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:contact@keza.app`);
console.log("\n─────────────────────────────────────────────────────────────────");
console.log("⚠️  VAPID_PRIVATE_KEY is a server secret — never commit it to git!");
console.log("─────────────────────────────────────────────────────────────────\n");
