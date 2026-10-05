import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ContactForm } from "@/app/entreprises/ContactForm";

describe("ContactForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("exposes accessible labels for the English business contact fields", () => {
    render(<ContactForm lang="en" />);

    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Company" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Work email" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Team size" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message (optional)" })).toBeInTheDocument();
  });

  it("submits the B2B lead payload and renders the success state", async () => {
    render(<ContactForm lang="en" />);

    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "Jane Smith" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Company" }), {
      target: { value: "Acme Corp" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Work email" }), {
      target: { value: "jane@acme.com" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Team size" }), {
      target: { value: "11-50" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Message (optional)" }), {
      target: { value: "We travel every week." },
    });

    fireEvent.click(screen.getByRole("button", { name: /request a demo/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Jane Smith",
          company: "Acme Corp",
          email: "jane@acme.com",
          teamSize: "11-50",
          message: "We travel every week.",
        }),
      })
    );

    expect(await screen.findByText("Request received!")).toBeInTheDocument();
  });
});
