"use client";

import { FlightRouteError } from "@/components/FlightRouteError";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <FlightRouteError error={error} reset={reset} initialLang="en" />;
}
