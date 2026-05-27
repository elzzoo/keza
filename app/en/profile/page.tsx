import type { Metadata } from "next";
import { ProfilClient } from "@/app/profil/ProfilClient";

export const metadata: Metadata = {
  title: "My Profile – KEZA",
  description: "Manage your miles, loyalty programs and favourite routes.",
  robots: { index: false },
};

export default function ProfileEnPage() {
  return <ProfilClient />;
}
