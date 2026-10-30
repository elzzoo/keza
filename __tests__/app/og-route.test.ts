import { isValidElement, type ReactElement, type ReactNode } from "react";
import type { NextRequest } from "next/server";
import { GET } from "@/app/api/og/route";

jest.mock("next/og", () => ({
  ImageResponse: jest.fn((element) => ({ element })),
}));

function getText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getText).join(" ");
  if (isValidElement(node)) return getText((node.props as { children?: ReactNode }).children);
  return "";
}

it("does not render price or savings claims supplied in the OG URL", async () => {
  const url = "https://example.com/api/og?from=CDG&to=JFK&lang=en&savings=%24999999&price=%241&program=Fake+Program";
  const response = await GET({ url } as NextRequest) as unknown as { element: ReactElement };
  const text = getText(response.element);

  expect(text).toContain("CDG");
  expect(text).toContain("JFK");
  expect(text).not.toContain("999999");
  expect(text).not.toContain("Fake Program");
  expect(text).not.toContain("$1");
});
