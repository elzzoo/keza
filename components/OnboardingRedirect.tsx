"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useProfile } from "@/hooks/useProfile";

/**
 * Client-side redirect to localized onboarding if user is new (no loyalty programs set).
 */
export function OnboardingRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { profile, isLoaded } = useProfile();

  useEffect(() => {
    const isEnglishRoute = pathname === "/en" || pathname.startsWith("/en/");
    const onboardingPath = isEnglishRoute ? "/en/onboarding" : "/onboarding";

    // Skip redirect for these paths
    const exemptPaths = [
      "/onboarding",
      "/en/onboarding",
      "/compte",
      "/en/profile",
      "/alertes",
      "/en/alertes",
      "/pro",
      "/en/pro",
      "/deconnexion",
    ];
    const isExempt =
      exemptPaths.some((p) => pathname.startsWith(p)) ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/");

    if (isExempt || !session || !isLoaded || !profile) return;

    // If user is authenticated but has no programs AND hasn't onboarded, redirect
    if (
      Array.isArray(profile.programs) &&
      profile.programs.length === 0 &&
      !profile.hasOnboarded
    ) {
      router.push(onboardingPath);
    }
  }, [session, profile, isLoaded, pathname, router]);

  return null;
}
