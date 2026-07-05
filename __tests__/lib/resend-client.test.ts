/**
 * Tests for Resend email client - Miles Alert Email
 * Tests email generation, template formatting, and Resend API integration
 */

// Mock the resend module BEFORE importing the client
const mockSend = jest.fn();

jest.mock("resend", () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: mockSend,
      },
    })),
  };
});

import { sendMilesAlertEmail } from "@/lib/resend-client";

describe("Resend Email Client - Miles Alert", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should generate email with correct structure and content", async () => {
    mockSend.mockResolvedValue({ data: { id: "test-message-id" }, error: null });

    const params = {
      email: "user@example.com",
      route: "SIN-LAX",
      program: "Singapore KrisFlyer",
      cpp: 0.77,
      threshold: 0.8,
      flight: {
        selectedOption: {
          miles: 65000,
          cost: 50.25,
        },
      },
    };

    const result = await sendMilesAlertEmail(params);

    // Verify the email was sent
    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArgs = mockSend.mock.calls[0][0];

    // Verify email headers
    expect(callArgs.from).toBe("alerts@keza.app");
    expect(callArgs.to).toBe("user@example.com");
    expect(callArgs.subject).toContain("Great deal!");
    expect(callArgs.subject).toContain("SIN");
    expect(callArgs.subject).toContain("LAX");
    expect(callArgs.subject).toContain("Singapore KrisFlyer");
    expect(callArgs.subject).toContain("0.77cpp");

    // Verify HTML content
    expect(callArgs.html).toContain("🎉");
    expect(callArgs.html).toContain("Miles Deal Alert");
    expect(callArgs.html).toContain("Singapore KrisFlyer");
    expect(callArgs.html).toContain("0.77");
    expect(callArgs.html).toContain("65,000"); // formatted with comma
    expect(callArgs.html).toContain("$50.25");
    expect(callArgs.html).toContain("Search Now");
    expect(callArgs.html).toContain("https://keza.app/flights?from=SIN&to=LAX");
    expect(callArgs.html).toContain("Manage alerts");
    expect(callArgs.html).toContain("user%40example.com");

    // Verify result
    expect(result.success).toBe(true);
    expect(result.messageId).toBe("test-message-id");
  });

  it("should handle flight details correctly when provided", async () => {
    mockSend.mockResolvedValue({ data: { id: "test-id-2" }, error: null });

    const params = {
      email: "test@example.com",
      route: "CDG-TYO",
      program: "Air France Flying Blue",
      cpp: 0.65,
      threshold: 0.7,
      flight: {
        selectedOption: {
          miles: 80000,
          cost: 120.0,
        },
      },
    };

    const result = await sendMilesAlertEmail(params);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArgs = mockSend.mock.calls[0][0];

    // Verify route is properly extracted and used
    expect(callArgs.subject).toContain("CDG");
    expect(callArgs.subject).toContain("TYO");
    expect(callArgs.html).toContain("CDG");
    expect(callArgs.html).toContain("TYO");
    expect(callArgs.html).toContain("Air France Flying Blue");
    expect(callArgs.html).toContain("80,000"); // formatted with comma
    expect(callArgs.html).toContain("120");

    expect(result.success).toBe(true);
  });

  it("should handle Resend API errors gracefully", async () => {
    const mockError = new Error("Resend API Error");
    mockSend.mockRejectedValue(mockError);

    const params = {
      email: "error@example.com",
      route: "JFK-LHR",
      program: "American AAdvantage",
      cpp: 0.72,
      threshold: 0.75,
    };

    await expect(sendMilesAlertEmail(params)).rejects.toThrow("Resend API Error");
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("should include footer with unsubscribe link", async () => {
    mockSend.mockResolvedValue({ data: { id: "footer-test" }, error: null });

    const params = {
      email: "footer@example.com",
      route: "NRT-LAX",
      program: "ANA Mileage Club",
      cpp: 0.8,
      threshold: 0.85,
    };

    await sendMilesAlertEmail(params);

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.html).toContain("unsubscribe=true");
    // The email is URL-encoded in the href attributes
    expect(callArgs.html).toContain("footer%40example.com");
  });

  it("should format CPP values correctly in subject and body", async () => {
    mockSend.mockResolvedValue({ data: { id: "cpp-test" }, error: null });

    const params = {
      email: "cpp@example.com",
      route: "MUC-BKK",
      program: "Lufthansa Miles & More",
      cpp: 0.555,
      threshold: 0.6,
      flight: {
        selectedOption: {
          miles: 75000,
          cost: 41.625,
        },
      },
    };

    await sendMilesAlertEmail(params);

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.subject).toContain("0.555cpp");
    expect(callArgs.html).toContain("0.555");
    expect(callArgs.html).toContain("0.6");
  });
});
