"use client";
import { useEffect } from "react";

/**
 * Injects a JSON-LD <script> block into <head> after hydration.
 * Googlebot executes JS so this is indexed correctly.
 */
export function JsonLd({ data }: { data: object }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
