import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KEZA for Business — Optimize Your Corporate Travel Budget",
  description:
    "KEZA helps travel managers and finance teams maximize savings on every flight — automatically comparing cash vs miles for your entire team.",
};

export default function EntreprisesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
