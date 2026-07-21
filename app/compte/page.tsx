import type { Metadata } from "next";
import { CompteClient } from "./CompteClient";

export const metadata: Metadata = {
  title: "Mon compte — Xalifly",
  robots: { index: false },
};

export default function ComptePage() {
  return <CompteClient />;
}
