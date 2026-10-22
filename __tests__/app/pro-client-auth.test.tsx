import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  const originalFetch = global.fetch;

  beforeEach(() => {
    push.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
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

  it("joins the waitlist when checkout is unavailable for a signed-in user", async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "Payments unavailable" }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ position: 4 }) });
    global.fetch = fetchMock as typeof fetch;
    render(<ProClient isLoggedIn lang="fr" />);

    fireEvent.change(screen.getByPlaceholderText("ton@email.com"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Passer en Pro — 9\$ \/ mois/i }));

    await waitFor(() => expect(screen.getByText("Tu es sur la liste !")).toBeInTheDocument());
    expect(screen.getByText(/n°4 sur la liste/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pro/checkout");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/pro/waitlist");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ email: "alex@example.com" });
    expect(push).not.toHaveBeenCalled();
  });

  it("keeps a checkout error out of the waitlist when payments are available", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Checkout temporarily unavailable" }),
    });
    global.fetch = fetchMock as typeof fetch;
    render(<ProClient isLoggedIn lang="en" />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Upgrade to Pro — \$9 \/ month/i }));

    await waitFor(() => expect(screen.getByText("Checkout temporarily unavailable")).toBeInTheDocument());
    expect(screen.queryByText("You're on the list!")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pro/checkout");
    expect(push).not.toHaveBeenCalled();
  });
});
