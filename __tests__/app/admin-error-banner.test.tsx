/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AdminErrorBanner } from "@/app/admin/components/AdminErrorBanner";

describe("AdminErrorBanner", () => {
  it("renders the Redis error message", () => {
    render(<AdminErrorBanner message="Redis timeout" />);

    expect(screen.getByText("Erreur Redis :")).toBeInTheDocument();
    expect(screen.getByText("Redis timeout")).toBeInTheDocument();
  });
});
