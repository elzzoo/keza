import { querySeatAvailability } from "@/lib/seatMapsIntegration-server";
import { safeGet, safeSet } from "@/lib/redis";

jest.mock("@/lib/redis", () => ({ safeGet: jest.fn(), safeSet: jest.fn() }));

const mockGet = safeGet as jest.MockedFunction<typeof safeGet>;
const mockSet = safeSet as jest.MockedFunction<typeof safeSet>;
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

function apiResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe("seat availability count validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    mockGet.mockResolvedValue(null);
  });

  it.each([
    [
      "zero seats",
      { cabins: { economy: { seats: { available: 0, occupied: 0, blocked: 0 } } } },
      { layout: { cabins: { economy: { available: 0, occupied: 0, blocked: 0 } } } },
    ],
    [
      "non-numeric and negative counts",
      { cabins: { economy: { seats: { available: "10", occupied: 20, blocked: 0 } } } },
      { layout: { cabins: { economy: { available: -1, occupied: 20, blocked: 0 } } } },
    ],
  ])("rejects %s without caching an availability claim", async (_case, primary, secondary) => {
    mockFetch.mockResolvedValueOnce(apiResponse(primary)).mockResolvedValueOnce(apiResponse(secondary));

    const result = await querySeatAvailability("SQ", "B787", "SIN", "LAX", "economy");

    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("accepts valid supplier counts with an omitted blocked count", async () => {
    mockFetch.mockResolvedValueOnce(apiResponse({
      cabins: { economy: { seats: { available: 4, occupied: 6 } } },
    }));

    const result = await querySeatAvailability("SQ", "B787", "SIN", "LAX", "economy");

    expect(result).toMatchObject({ available: 4, occupied: 6, blocked: 0, total: 10, percentAvailable: 40 });
    expect(mockSet).toHaveBeenCalledTimes(1);
  });
});
