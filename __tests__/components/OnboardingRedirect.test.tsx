import React from "react";
import { render, waitFor } from "@testing-library/react";
import { OnboardingRedirect } from "@/components/OnboardingRedirect";

const mockPush = jest.fn();
const mockUseSession = jest.fn();
const mockUseProfile = jest.fn();
let mockPathname = "/";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

jest.mock("@/hooks/useProfile", () => ({
  useProfile: () => mockUseProfile(),
}));

describe("OnboardingRedirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/";
    mockUseSession.mockReturnValue({
      data: { user: { email: "user@example.com" } },
      status: "authenticated",
    });
    mockUseProfile.mockReturnValue({
      isLoaded: true,
      profile: { programs: [], hasOnboarded: false },
    });
  });

  it("redirects new users on English routes to English onboarding", async () => {
    mockPathname = "/en/deals";

    render(<OnboardingRedirect />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/en/onboarding"));
  });

  it("redirects new users on French routes to French onboarding", async () => {
    mockPathname = "/deals";

    render(<OnboardingRedirect />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/onboarding"));
  });

  it("does not redirect from the English onboarding route itself", async () => {
    mockPathname = "/en/onboarding";

    render(<OnboardingRedirect />);

    await waitFor(() => expect(mockPush).not.toHaveBeenCalled());
  });
});
