import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KEZA pour les entreprises — Optimisez votre budget voyage d'affaires",
  description:
    "KEZA aide les travel managers et équipes finance à maximiser les économies sur chaque vol — en comparant automatiquement cash et miles pour toute votre équipe.",
};

export default function EntreprisesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
