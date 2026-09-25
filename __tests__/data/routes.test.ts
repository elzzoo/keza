import { POPULAR_ROUTES } from "@/data/popularRoutes";
import { getRouteMeta, ROUTE_META } from "@/data/routeMeta";

const ROUTE_RE = /^[A-Z]{3}-[A-Z]{3}$/;

describe("route data integrity", () => {
  it("POPULAR_ROUTES contains unique, valid airport pairs", () => {
    const seen = new Set<string>();
    const invalid: string[] = [];
    const duplicates: string[] = [];

    for (const route of POPULAR_ROUTES) {
      const [from, to] = route.split("-");
      if (!ROUTE_RE.test(route) || from === to) {
        invalid.push(route);
      }
      if (seen.has(route)) {
        duplicates.push(route);
      }
      seen.add(route);
    }

    expect(invalid).toEqual([]);
    expect(duplicates).toEqual([]);
  });

  it("ROUTE_META entries have valid route keys and complete metadata", () => {
    const invalid: string[] = [];

    for (const [route, meta] of ROUTE_META.entries()) {
      const [from, to] = route.split("-");
      if (!ROUTE_RE.test(route) || from === to) invalid.push(`${route}: invalid key`);
      if (meta.durationMin <= 0) invalid.push(`${route}: invalid duration`);
      if (meta.milesToEconomy <= 0) invalid.push(`${route}: invalid economy miles`);
      if (meta.milesToBusiness <= meta.milesToEconomy) invalid.push(`${route}: invalid business miles`);
      if (meta.airlines.length === 0) invalid.push(`${route}: missing airlines`);
      if (meta.bestPrograms.length === 0) invalid.push(`${route}: missing best programs`);
      if (!meta.seasonTip.fr || !meta.seasonTip.en) invalid.push(`${route}: missing season tips`);
      if (!meta.isNonstop && !meta.hub) invalid.push(`${route}: missing connection hub`);
    }

    expect(invalid).toEqual([]);
  });

  it("getRouteMeta resolves routes bidirectionally", () => {
    for (const route of Array.from(ROUTE_META.keys()).slice(0, 20)) {
      const [from, to] = route.split("-");
      expect(getRouteMeta(from, to)).toBeDefined();
      expect(getRouteMeta(to, from)).toBeDefined();
    }
  });
});
