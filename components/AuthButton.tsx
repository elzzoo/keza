"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";

interface Props {
  lang: "fr" | "en";
}

export function AuthButton({ lang }: Props) {
  const { data: session, status } = useSession();
  const fr = lang === "fr";

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-surface-2 animate-pulse" />;
  }

  if (session?.user) {
    return (
      <div className="relative group">
        <button
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 hover:border-primary/40 transition-all overflow-hidden"
          aria-label={fr ? "Mon compte" : "My account"}
        >
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "avatar"}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {(session.user.name ?? session.user.email ?? "?")[0]?.toUpperCase()}
            </div>
          )}
        </button>

        {/* Dropdown */}
        <div className="absolute right-0 top-10 z-50 hidden group-focus-within:flex flex-col bg-surface border border-border rounded-xl shadow-lg overflow-hidden min-w-[160px]">
          <a
            href="/compte"
            className="px-4 py-2.5 text-xs text-fg hover:bg-surface-2 transition-colors"
          >
            👤 {fr ? "Mon compte" : "My account"}
          </a>
          <a
            href="/profil"
            className="px-4 py-2.5 text-xs text-fg hover:bg-surface-2 transition-colors"
          >
            💳 {fr ? "Wallet miles" : "Miles wallet"}
          </a>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="px-4 py-2.5 text-xs text-left text-muted hover:text-fg hover:bg-surface-2 transition-colors border-t border-border"
          >
            {fr ? "Se déconnecter" : "Sign out"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-2 text-xs font-semibold text-muted hover:text-fg hover:border-primary/40 transition-all"
      aria-label={fr ? "Connexion" : "Sign in"}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
      </svg>
      {fr ? "Connexion" : "Sign in"}
    </button>
  );
}
