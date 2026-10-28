/**
 * @jest-environment jsdom
 */
import React from "react";
import { render } from "@testing-library/react";
import FrRoutePage from "@/app/flights/[route]/page";
import EnRoutePage from "@/app/en/flights/[route]/page";

jest.mock("@/lib/engine", () => ({
  fetchCalendarPrices: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/app/flights/[route]/RoutePageClient", () => ({
  RoutePageClient: () => <div />,
}));

function milesAnswer(container: HTMLElement): string {
  const scripts = Array.from(container.querySelectorAll('script[type="application/ld+json"]'));
  const faq = scripts
    .map((script) => JSON.parse(script.textContent ?? "{}") as {
      "@type": string;
      mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>;
    })
    .find((schema) => schema["@type"] === "FAQPage");
  const answer = faq?.mainEntity.find((item) => /^(Combien de miles|How many miles)/i.test(item.name));
  if (!answer) throw new Error("Miles FAQ answer missing");
  return answer.acceptedAnswer.text;
}

describe("flight route award FAQ provenance", () => {
  it.each([
    ["dss-cdg", FrRoutePage, /disponibilité des sièges primes/i],
    ["aaa-bbb", FrRoutePage, /sans vérifier en temps réel/i],
    ["dss-cdg", EnRoutePage, /confirm award-seat availability/i],
    ["aaa-bbb", EnRoutePage, /does not verify award-seat availability/i],
  ])("qualifies the %s award answer", async (route, Page, caveat) => {
    const { container } = render(await Page({ params: Promise.resolve({ route }) }));
    const answer = milesAnswer(container);
    expect(answer).toMatch(caveat);
    expect(answer).not.toMatch(/checks all 33 loyalty programs in real time|vérifie les 33 programmes de fidélité en temps réel/i);
  });
});
