import {
  clearDestinationLocaleHandoff,
  readDestinationLocaleHandoff,
  saveDestinationLocaleHandoff,
} from "@/lib/destinationLocaleHandoff";

const snapshot = {
  draft: {
    from: "DSS",
    to: "DXB",
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

describe("destination locale handoff", () => {
  beforeEach(() => {
    clearDestinationLocaleHandoff();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "window");
  });

  it("does not expose a handoff during server rendering", () => {
    saveDestinationLocaleHandoff("en", "DXB", snapshot);
    expect(readDestinationLocaleHandoff("en", "DXB")).toBeNull();
  });

  it("matches the target language and destination only", () => {
    Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
    saveDestinationLocaleHandoff("en", "DXB", snapshot);
    expect(readDestinationLocaleHandoff("fr", "DXB")).toBeNull();
    expect(readDestinationLocaleHandoff("en", "JFK")).toBeNull();
    expect(readDestinationLocaleHandoff("en", "dxb")).toBe(snapshot);
    clearDestinationLocaleHandoff();
    expect(readDestinationLocaleHandoff("en", "DXB")).toBeNull();
  });

  it("expires a stale handoff", () => {
    Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
    jest.spyOn(Date, "now").mockReturnValueOnce(1_000).mockReturnValue(31_001);
    saveDestinationLocaleHandoff("en", "DXB", snapshot);
    expect(readDestinationLocaleHandoff("en", "DXB")).toBeNull();
  });
});
