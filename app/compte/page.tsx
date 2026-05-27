import type { Metadata } from "next";
import { CompteClient } from "./CompteClient";

export const metadata: Metadata = {
  title: "Mon compte — KEZA",
  robots: { index: false },
};

export default function ComptePage() {
  return <CompteClient />;
}
