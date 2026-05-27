// hooks/useAuth.ts
"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export interface AuthUser {
  email: string;
  name:  string | null;
  image: string | null;
}

export interface UseAuthReturn {
  user:       AuthUser | null;
  isLoggedIn: boolean;
  isLoading:  boolean;
  login:      () => void;
  logout:     () => void;
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();

  const user: AuthUser | null = session?.user?.email
    ? {
        email: session.user.email,
        name:  session.user.name  ?? null,
        image: session.user.image ?? null,
      }
    : null;

  return {
    user,
    isLoggedIn: !!user,
    isLoading:  status === "loading",
    login:  () => signIn("google"),
    logout: () => signOut({ callbackUrl: "/" }),
  };
}
