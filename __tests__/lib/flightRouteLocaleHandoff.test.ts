import {
  clearFlightRouteLocaleHandoff,
  readFlightRouteLocaleHandoff,
  saveFlightRouteLocaleHandoff,
} from "@/lib/flightRouteLocaleHandoff";

const snapshot = {
  draft: {
    from: "DSS",
    to: "CDG",
    tripType: "roundtrip" as const,
    depDate: "2026-12-01",
    retDate: "2026-12-15",
    cabin: "economy" as const,
    passengers: 1,
    programs: "",
  },
  results: [],
  hasSearched: false,
};

describe("flight route locale handoff", () => {
  beforeEach(() => {
    clearFlightRouteLocaleHandoff();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "window");
  });

  it("does not expose a handoff during server rendering", () => {
    saveFlightRouteLocaleHandoff("en", "DSS-CDG", snapshot);
    expect(readFlightRouteLocaleHandoff("en", "DSS-CDG")).toBeNull();
  });

  it("matches the target language and route only", () => {
    Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
    saveFlightRouteLocaleHandoff("en", "DSS-CDG", snapshot);
    expect(readFlightRouteLocaleHandoff("fr", "DSS-CDG")).toBeNull();
    expect(readFlightRouteLocaleHandoff("en", "DSS-JFK")).toBeNull();
    expect(readFlightRouteLocaleHandoff("en", "dss-cdg")).toBe(snapshot);
    clearFlightRouteLocaleHandoff();
    expect(readFlightRouteLocaleHandoff("en", "DSS-CDG")).toBeNull();
  });

  it("expires a stale handoff", () => {
    Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
    jest.spyOn(Date, "now").mockReturnValueOnce(1_000).mockReturnValue(31_001);
    saveFlightRouteLocaleHandoff("en", "DSS-CDG", snapshot);
    expect(readFlightRouteLocaleHandoff("en", "DSS-CDG")).toBeNull();
  });
});
