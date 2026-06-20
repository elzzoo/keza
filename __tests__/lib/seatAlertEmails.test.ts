import { renderSeatAlertEmail, SeatAlertEmailProps } from "@/lib/seatAlertEmails";

describe("Seat Alert Email Template", () => {
  it("renders email with deal details", () => {
    const props: SeatAlertEmailProps = {
      subscriberEmail: "user@example.com",
      route: "SIN-LAX",
      cabin: "BUSINESS",
      currentPrice: 4200,
      historicalAvg: 5500,
      discount: 23.6,
      bookingUrl: "https://keza.app/book?route=SIN-LAX&cabin=BUSINESS",
      unsubscribeUrl: "https://keza.app/alerts/unsubscribe?token=abc123",
    };

    const html = renderSeatAlertEmail(props);
    expect(html).toContain("Business Class");
    expect(html).toContain("SIN → LAX");
    expect(html).toContain("$4,200");
    expect(html).toContain("23.6%");
    expect(html).toContain(props.bookingUrl);
  });
});
