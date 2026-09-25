/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EmailEngagementSection } from "@/app/admin/components/EmailEngagementSection";

describe("EmailEngagementSection", () => {
  it("renders email engagement metrics", () => {
    render(
      <EmailEngagementSection
        confirmationOpens={12}
        priceDropOpens={7}
        digestOpens={4}
      />,
    );

    expect(screen.getByText("Email Engagement — 7 derniers jours")).toBeInTheDocument();
    expect(screen.getByText("Confirmations ouvertes")).toBeInTheDocument();
    expect(screen.getByText("Alertes prix ouvertes")).toBeInTheDocument();
    expect(screen.getByText("Digests ouverts")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
