/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

// Mock next/link
jest.mock("next/link", () => {
  // eslint-disable-next-line @next/next/no-html-link-for-pages,react/display-name
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

describe("DashboardLayout", () => {
  it("should render navigation menu", () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();

    const overviewLink = screen.getByRole("link", { name: /overview/i });
    expect(overviewLink).toBeInTheDocument();
  });

  it("should render children content", () => {
    const testContent = "Test Dashboard Content";
    render(
      <DashboardLayout>
        <div>{testContent}</div>
      </DashboardLayout>
    );

    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  it("should have navigation links", () => {
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByRole("link", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /routes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /alerts/i })).toBeInTheDocument();
  });
});
