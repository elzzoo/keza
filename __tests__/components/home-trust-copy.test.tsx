/**
 * @jest-environment jsdom
 */
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { HowItWorks } from "@/components/HowItWorks";
import { TrustBar } from "@/components/TrustBar";

const repoRoot = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(repoRoot, file), "utf8");
}

describe("homepage trust copy", () => {
  it("renders concrete trust metrics in both languages", () => {
    const { rerender } = render(<TrustBar lang="fr" />);
    expect(screen.getByText("7 900+")).toBeInTheDocument();
    expect(screen.getByText("programmes miles")).toBeInTheDocument();

    rerender(<TrustBar lang="en" />);
    expect(screen.getByText("7,900+")).toBeInTheDocument();
    expect(screen.getByText("miles programs")).toBeInTheDocument();
  });

  it("explains the workflow without internal verdict jargon", () => {
    const { rerender } = render(<HowItWorks lang="fr" />);
    expect(screen.getByText("Comparez le vrai coût")).toBeInTheDocument();
    expect(screen.getByText(/signale les prix estimés/i)).toBeInTheDocument();
    expect(screen.queryByText(/MILES WIN/i)).not.toBeInTheDocument();

    rerender(<HowItWorks lang="en" />);
    expect(screen.getByText("Compare real cost")).toBeInTheDocument();
    expect(screen.getByText(/flags estimated prices/i)).toBeInTheDocument();
    expect(screen.queryByText(/CASH WINS/i)).not.toBeInTheDocument();
  });

  it("keeps homepage trust components free of emoji-led symbols", () => {
    const noisyEmoji = /[🗺⚡✅🏆🌍🆓]/u;

    expect(read("components/TrustBar.tsx")).not.toMatch(noisyEmoji);
    expect(read("components/HowItWorks.tsx")).not.toMatch(noisyEmoji);
  });
});
