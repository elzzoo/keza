// __tests__/components/OnboardingWizard.test.tsx
//
// Covers a real accessibility gap found while auditing the site: the modal
// had no role="dialog"/aria-modal, and Escape didn't dismiss it like the
// explicit "Plus tard" button does — both are expected behavior for any
// dialog per the WAI-ARIA pattern.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { OnboardingWizard } from "@/components/OnboardingWizard";

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn().mockRejectedValue(new Error("network disabled in test"));
});

function renderWizard() {
  return render(
    <ProfileProvider>
      <OnboardingWizard lang="fr" />
    </ProfileProvider>
  );
}

describe("OnboardingWizard", () => {
  it("does not interrupt the first landing-page impression", () => {
    renderWizard();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem("keza_onboarding_seen_first_visit")).toBe("1");
  });

  it("appears as a proper ARIA dialog for a returning user", async () => {
    localStorage.setItem("keza_onboarding_seen_first_visit", "1");
    renderWizard();

    const dialog = await screen.findByRole("dialog", undefined, { timeout: 7000 });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "onboarding-wizard-title");
  });

  it("dismisses on Escape, same as the explicit skip button", async () => {
    const user = userEvent.setup();
    localStorage.setItem("keza_onboarding_seen_first_visit", "1");
    renderWizard();

    await screen.findByRole("dialog", undefined, { timeout: 7000 });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("does not show the dialog once the profile is already onboarded", () => {
    localStorage.setItem("keza_profile", JSON.stringify({ hasOnboarded: true }));
    renderWizard();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
