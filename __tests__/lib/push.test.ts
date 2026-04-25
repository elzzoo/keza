// __tests__/lib/push.test.ts
// Tests for push subscription CRUD — Redis is mocked to avoid I/O in tests.

const mockSadd = jest.fn();
const mockSmembers = jest.fn();
const mockSrem = jest.fn();
const mockScard = jest.fn();
const mockExpire = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    sadd: (...args: unknown[]) => mockSadd(...args),
    smembers: (...args: unknown[]) => mockSmembers(...args),
    srem: (...args: unknown[]) => mockSrem(...args),
    scard: (...args: unknown[]) => mockScard(...args),
    expire: (...args: unknown[]) => mockExpire(...args),
  },
}));

import {
  savePushSubscription,
  getPushSubscriptions,
  removePushSubscription,
  savePushSubscriptionForEmail,
  getPushSubscriptionsForEmail,
  removePushSubscriptionForEmail,
  type PushSubscriptionRecord,
} from "@/lib/push";

const SUB_A: PushSubscriptionRecord = {
  endpoint: "https://push.example.com/sub/a",
  keys: { p256dh: "key-a", auth: "auth-a" },
};

const SUB_B: PushSubscriptionRecord = {
  endpoint: "https://push.example.com/sub/b",
  keys: { p256dh: "key-b", auth: "auth-b" },
};

beforeEach(() => jest.clearAllMocks());

describe("savePushSubscription", () => {
  it("calls redis.sadd with serialised subscription", async () => {
    mockSadd.mockResolvedValue(1);
    await savePushSubscription(SUB_A);
    expect(mockSadd).toHaveBeenCalledWith(
      "keza:push:subscriptions",
      JSON.stringify(SUB_A)
    );
  });
});

describe("getPushSubscriptions", () => {
  it("returns empty array when set is empty", async () => {
    mockSmembers.mockResolvedValue([]);
    const result = await getPushSubscriptions();
    expect(result).toEqual([]);
  });

  it("parses and returns valid subscriptions", async () => {
    mockSmembers.mockResolvedValue([
      JSON.stringify(SUB_A),
      JSON.stringify(SUB_B),
    ]);
    const result = await getPushSubscriptions();
    expect(result).toHaveLength(2);
    expect(result[0].endpoint).toBe(SUB_A.endpoint);
    expect(result[1].endpoint).toBe(SUB_B.endpoint);
  });

  it("silently skips malformed entries", async () => {
    mockSmembers.mockResolvedValue(["{invalid-json", JSON.stringify(SUB_A)]);
    const result = await getPushSubscriptions();
    expect(result).toHaveLength(1);
    expect(result[0].endpoint).toBe(SUB_A.endpoint);
  });
});

describe("removePushSubscription", () => {
  it("removes the matching subscription from Redis", async () => {
    mockSmembers.mockResolvedValue([JSON.stringify(SUB_A), JSON.stringify(SUB_B)]);
    mockSrem.mockResolvedValue(1);

    await removePushSubscription(SUB_A.endpoint);

    expect(mockSrem).toHaveBeenCalledWith(
      "keza:push:subscriptions",
      JSON.stringify(SUB_A)
    );
  });

  it("does nothing when endpoint is not found", async () => {
    mockSmembers.mockResolvedValue([JSON.stringify(SUB_B)]);
    await removePushSubscription("https://unknown.endpoint");
    expect(mockSrem).not.toHaveBeenCalled();
  });
});

describe("savePushSubscriptionForEmail", () => {
  it("calls redis.sadd with per-email key and serialised subscription", async () => {
    mockSadd.mockResolvedValue(1);
    mockExpire.mockResolvedValue(1);
    await savePushSubscriptionForEmail("User@Example.com", SUB_A);
    expect(mockSadd).toHaveBeenCalledWith(
      "keza:push:subs:user@example.com",
      JSON.stringify(SUB_A)
    );
    expect(mockExpire).toHaveBeenCalledWith(
      "keza:push:subs:user@example.com",
      90 * 24 * 60 * 60
    );
  });
});

describe("getPushSubscriptionsForEmail", () => {
  it("returns empty array when set is empty", async () => {
    mockSmembers.mockResolvedValue([]);
    const result = await getPushSubscriptionsForEmail("user@example.com");
    expect(result).toEqual([]);
  });

  it("parses and returns valid subscriptions", async () => {
    mockSmembers.mockResolvedValue([JSON.stringify(SUB_A), JSON.stringify(SUB_B)]);
    const result = await getPushSubscriptionsForEmail("user@example.com");
    expect(result).toHaveLength(2);
  });

  it("skips malformed entries", async () => {
    mockSmembers.mockResolvedValue(["{bad", JSON.stringify(SUB_A)]);
    const result = await getPushSubscriptionsForEmail("user@example.com");
    expect(result).toHaveLength(1);
  });
});

describe("removePushSubscriptionForEmail", () => {
  it("removes matching subscription for email", async () => {
    mockSmembers.mockResolvedValue([JSON.stringify(SUB_A), JSON.stringify(SUB_B)]);
    mockSrem.mockResolvedValue(1);
    await removePushSubscriptionForEmail("user@example.com", SUB_A.endpoint);
    expect(mockSrem).toHaveBeenCalledWith(
      "keza:push:subs:user@example.com",
      JSON.stringify(SUB_A)
    );
  });

  it("does nothing when endpoint not found", async () => {
    mockSmembers.mockResolvedValue([JSON.stringify(SUB_B)]);
    await removePushSubscriptionForEmail("user@example.com", "https://not.found");
    expect(mockSrem).not.toHaveBeenCalled();
  });
});
