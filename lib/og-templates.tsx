// lib/og-templates.tsx
// Shared JSX layout helpers for all opengraph-image.tsx route files.
// IMPORTANT: inline styles only — no Tailwind, no CSS modules (satori requirement).

import React from "react";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Full-bleed gradient background with decorative circles. Wraps all three sections. */
export function ogWrapper(children: React.ReactNode): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "48px 56px",
        background:
          "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circle — top-right */}
      <div
        style={{
          position: "absolute",
          right: -80,
          top: -80,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "rgba(99, 102, 241, 0.15)",
          display: "flex",
        }}
      />
      {/* Decorative circle — bottom-right */}
      <div
        style={{
          position: "absolute",
          right: 40,
          bottom: -100,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "rgba(99, 102, 241, 0.08)",
          display: "flex",
        }}
      />
      {children}
    </div>
  );
}

/** Top bar: Keza logo (left) + pill label (right) */
export function ogTopBar(tag: string): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: "#6366f1",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          ✈
        </div>
        <span style={{ color: "#ffffff", fontWeight: 700, fontSize: 17 }}>
          Keza
        </span>
      </div>
      {/* Pill */}
      <div
        style={{
          display: "flex",
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(165,180,252,0.2)",
          borderRadius: 24,
          padding: "5px 16px",
        }}
      >
        <span style={{ color: "#a5b4fc", fontSize: 13 }}>{tag}</span>
      </div>
    </div>
  );
}

/** Bottom bar: left text + keza.app (right) */
export function ogBottomBar(leftText: string): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        position: "relative",
      }}
    >
      <span style={{ color: "#4b5563", fontSize: 13 }}>{leftText}</span>
      <span style={{ color: "#374151", fontSize: 13 }}>keza.app</span>
    </div>
  );
}
