import type { Metadata } from "next";
import { AlertesClient } from "./AlertesClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Mes alertes prix | KEZA",
  description:
    "Gérez vos alertes prix KEZA — recevez un email quand un tarif baisse de 10%+.",
};

export default function AlertesPage() {
  return (
    <ErrorBoundary lang="fr">
      <AlertesClient />
    </ErrorBoundary>
  );
}
