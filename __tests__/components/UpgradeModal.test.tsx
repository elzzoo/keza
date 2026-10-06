/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import fs from "node:fs";
import path from "node:path";
import { UpgradeModal } from "@/components/UpgradeModal";

describe("UpgradeModal", () => {
  it("uses English product links on English surfaces", () => {
    render(<UpgradeModal lang="en" onClose={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /learn more/i })).toHaveAttribute("href", "/en/pro");
    expect(screen.getByRole("link", { name: /refer a friend/i })).toHaveAttribute("href", "/en/alertes");
  });

  it("keeps French product links on French surfaces", () => {
    render(<UpgradeModal lang="fr" onClose={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /en savoir plus/i })).toHaveAttribute("href", "/pro");
    expect(screen.getByRole("link", { name: /parraine un ami/i })).toHaveAttribute("href", "/alertes");
  });

  it("keeps conversion copy free of emoji-led symbols", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/UpgradeModal.tsx"), "utf8");

    expect(source).not.toMatch(/[🔔📱📊✈️⚡🔒🎁💎]/u);
  });
});
