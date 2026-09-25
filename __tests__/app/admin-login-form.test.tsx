/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LoginForm } from "@/app/admin/components/LoginForm";

describe("LoginForm", () => {
  it("renders the admin login form", () => {
    render(<LoginForm hasError={false} />);

    expect(screen.getByRole("heading", { name: "Admin Xalifly" })).toBeInTheDocument();
    expect(screen.getByLabelText("Secret")).toHaveAttribute("name", "secret");
    expect(screen.getByRole("button", { name: "Accéder →" })).toHaveAttribute("type", "submit");
    expect(screen.queryByText("Secret incorrect. Réessayez.")).not.toBeInTheDocument();
  });

  it("renders the error state", () => {
    render(<LoginForm hasError />);

    expect(screen.getByText("Secret incorrect. Réessayez.")).toBeInTheDocument();
  });
});
