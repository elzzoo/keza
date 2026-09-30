/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { Badge, Button, Card, EmptyState, FieldMessage } from "@/components/ui";

describe("UI primitives", () => {
  it("renders a button with loading state and prevents clicks", async () => {
    const onClick = jest.fn();
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>
    );

    const button = screen.getByRole("button", { name: /Saving/i });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders badge tones without losing content", () => {
    render(<Badge tone="success">Live 3</Badge>);
    expect(screen.getByText("Live 3")).toBeInTheDocument();
  });

  it("renders a card container", () => {
    render(<Card>Trust block</Card>);
    expect(screen.getByText("Trust block")).toBeInTheDocument();
  });

  it("renders empty state tips and action", () => {
    render(
      <EmptyState
        title="No results"
        description="Try broader dates."
        tips={["Use a nearby airport", "Try another cabin"]}
        action={<Button variant="secondary">Reset</Button>}
      />
    );

    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Try broader dates.")).toBeInTheDocument();
    expect(screen.getByText("Use a nearby airport")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });

  it("uses status role by default for field messages", () => {
    render(<FieldMessage tone="warning">Check your route</FieldMessage>);
    expect(screen.getByRole("status")).toHaveTextContent("Check your route");
  });
});
