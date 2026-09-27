import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { signIn } from "next-auth/react";
import { ConnexionClient } from "@/app/connexion/ConnexionClient";

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

describe("ConnexionClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes a safe callback URL to Google sign-in", () => {
    render(<ConnexionClient callbackUrl="/pro?email=test%40example.com" />);

    fireEvent.click(screen.getByRole("button", { name: "Continuer avec Google" }));

    expect(signIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/pro?email=test%40example.com",
    });
  });

  it("falls back when callback URL is external", () => {
    render(<ConnexionClient callbackUrl="https://evil.example/phish" />);

    fireEvent.click(screen.getByRole("button", { name: "Continuer avec Google" }));

    expect(signIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/profil",
    });
  });

  it("renders English copy and default callback on the English route", () => {
    render(<ConnexionClient lang="en" />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(screen.getByText("Privacy policy")).toHaveAttribute("href", "/en/privacy");
    expect(signIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/en/profile",
    });
  });
});
