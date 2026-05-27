// lib/serverProfile.ts
import "server-only";
import { redis } from "@/lib/redis";
import type { UserProfile } from "@/lib/userProfile";

const profileKey = (email: string) =>
  `keza:profile:server:${email.toLowerCase().trim()}`;

const TTL = 90 * 24 * 60 * 60; // 90 days

export async function getServerProfile(email: string): Promise<UserProfile | null> {
  try {
    return await redis.get<UserProfile>(profileKey(email));
  } catch {
    return null;
  }
}

export async function saveServerProfile(
  email: string,
  profile: UserProfile
): Promise<void> {
  try {
    await redis.set(profileKey(email), profile, { ex: TTL });
  } catch {
    // fail silently — localStorage is the fallback
  }
}

export async function deleteServerProfile(email: string): Promise<void> {
  try {
    await redis.del(profileKey(email));
  } catch { /* ignore */ }
}
