import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProClient } from "@/app/pro/ProClient";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

jest.mock("@/components/Header", () => ({
  Header: () => <header data-testid="header" />,
}));

jest.mock("@/components/Footer", () => ({
  Footer: () => <footer data-testid="footer" />,
}));

describe("ProClient auth redirect", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("redirects unauthenticated English users to the English sign-in page", () => {
    render(<ProClient isLoggedIn={false} lang="en" />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Upgrade to Pro/i }));

    expect(push).toHaveBeenCalledWith(
      "/en/connexion?callbackUrl=%2Fen%2Fpro%3Femail%3Dtest%2540example.com"
    );
  });
});
