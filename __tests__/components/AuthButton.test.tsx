import { render, screen } from "@testing-library/react";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

import { AuthButton } from "@/components/AuthButton";

describe("AuthButton", () => {
  it("shows login button when not authenticated", () => {
    render(<AuthButton lang="fr" />);
    expect(screen.getByRole("button", { name: /connexion/i })).toBeInTheDocument();
  });
});
