/**
 * @jest-environment jsdom
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { readFileSync } from "fs";
import path from "path";

describe("NewsletterSignup", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("submits a French email and shows the success state", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ alreadySubscribed: false }),
    } as Response);

    render(<NewsletterSignup lang="fr" />);

    fireEvent.change(screen.getByPlaceholderText("ton@email.com"), {
      target: { value: "amina@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /recevoir les deals/i }));

    await waitFor(() => {
      expect(screen.getByText(/Inscription confirmée/i)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/newsletter", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "amina@example.com", lang: "fr" }),
    }));
  });

  it("shows the duplicate state when the email is already subscribed", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ alreadySubscribed: true }),
    } as Response);

    render(<NewsletterSignup lang="en" variant="compact" />);

    fireEvent.change(screen.getByPlaceholderText("your@email.com"), {
      target: { value: "reader@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /get deals/i }));

    await waitFor(() => {
      expect(screen.getByText(/already subscribed/i)).toBeInTheDocument();
    });
  });

  it("keeps the newsletter card free of visible emoji symbols", () => {
    const source = readFileSync(path.join(process.cwd(), "components/NewsletterSignup.tsx"), "utf8");
    expect(source).not.toMatch(/[✅✉️]/u);
  });
});
