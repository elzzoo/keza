// __tests__/hooks/useCurrency.test.tsx
//
// Regression test for a real production bug: useCurrency() used to maintain
// its own independent currency state (separate "keza_currency" localStorage
// key, separate /api/forex fetch), completely disconnected from
// ProfileContext — which is what the header's CurrencyPicker actually
// updates. Switching currency in the header changed profile.currency, but
// every component built on useCurrency()'s formatPrice() (search results,
// CheapestRouteBanner, etc.) kept formatting in whatever currency it had
// last, silently ignoring the user's choice.
//
// useCurrency() is now a thin wrapper around useProfile(), so this test
// verifies there is exactly one source of truth: setCurrency() from either
// hook is visible through both.

import React from "react";
import { renderHook, act } from "@testing-library/react";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { useProfile } from "@/hooks/useProfile";
import { useCurrency } from "@/hooks/useCurrency";

function wrapper({ children }: { children: React.ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>;
}

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn().mockRejectedValue(new Error("network disabled in test"));
});

describe("useCurrency / ProfileContext currency consistency", () => {
  it("useCurrency() reflects the currency already saved in the profile", () => {
    localStorage.setItem("keza_profile", JSON.stringify({ currency: "EUR" }));

    const { result } = renderHook(() => useCurrency(), { wrapper });

    expect(result.current.currency).toBe("EUR");
  });

  it("setCurrency() from useCurrency() updates useProfile()'s currency too", () => {
    const { result } = renderHook(
      () => ({ currencyHook: useCurrency(), profileHook: useProfile() }),
      { wrapper }
    );

    expect(result.current.profileHook.currency).toBe("USD");

    act(() => {
      result.current.currencyHook.setCurrency("GBP");
    });

    expect(result.current.currencyHook.currency).toBe("GBP");
    expect(result.current.profileHook.currency).toBe("GBP");
  });

  it("a currency change made via useProfile() is visible through useCurrency()", () => {
    const { result } = renderHook(
      () => ({ currencyHook: useCurrency(), profileHook: useProfile() }),
      { wrapper }
    );

    act(() => {
      result.current.profileHook.setCurrency("JPY");
    });

    // This is exactly what CurrencyPicker does (calls useProfile().setCurrency) —
    // any component reading price via useCurrency() must see the new currency.
    expect(result.current.currencyHook.currency).toBe("JPY");
  });

  it("formatPrice() converts using the currency set via the header's setCurrency path", () => {
    const { result } = renderHook(
      () => ({ currencyHook: useCurrency(), profileHook: useProfile() }),
      { wrapper }
    );

    act(() => {
      result.current.profileHook.setCurrency("EUR");
    });

    // formatPrice must not still be formatting in USD after the switch.
    expect(result.current.currencyHook.formatPrice(100)).not.toMatch(/^\$100$/);
  });
});
