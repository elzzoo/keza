import fs from "fs";
import path from "path";
import { metadata as frIndexMetadata } from "@/app/vol/page";
import { metadata as enIndexMetadata } from "@/app/en/vol/page";
import { generateStaticParams as frRoutes } from "@/app/vol/[route]/page";
import { generateStaticParams as enRoutes } from "@/app/en/vol/[route]/page";
import { iataToSlug } from "@/lib/routeSlug";

jest.mock("server-only", () => ({}));

const pages = [
  "app/vol/page.tsx",
  "app/en/vol/page.tsx",
  "app/vol/[route]/page.tsx",
  "app/en/vol/[route]/page.tsx",
];

describe("static route price truth", () => {
  it("does not advertise real-time prices on route guides", () => {
    for (const page of pages) {
      const source = fs.readFileSync(path.join(process.cwd(), page), "utf8");
      expect(source).not.toMatch(/prix en temps réel|prix cash en temps réel|live prices|live cash prices|in real time/i);
    }
    expect(frIndexMetadata.openGraph?.description).toContain("indicatifs");
    expect(enIndexMetadata.openGraph?.description).toContain("indicative");
  });

  it("does not declare an offer or stock for static corridor guides", () => {
    for (const page of pages.slice(2)) {
      const source = fs.readFileSync(path.join(process.cwd(), page), "utf8");
      expect(source).not.toMatch(/AggregateOffer|schema\.org\/InStock|"@type": "Product"/);
      expect(source).toMatch(/vérifiez prix et disponibilité|verify fares and availability/i);
    }
  });

  it.each([
    ["DSS", "CDG"],
    ["ABJ", "CDG"],
    ["LOS", "LHR"],
  ])("keeps the %s-%s corridor guides in both languages", (from, to) => {
    const route = iataToSlug(from, to);
    expect(frRoutes()).toContainEqual({ route });
    expect(enRoutes()).toContainEqual({ route });
  });
});
