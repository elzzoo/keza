import "server-only";
import { Resend } from "resend";
import { logError } from "@/lib/logger";

export interface SeatAlertEmailProps {
  subscriberEmail: string;
  route: string;
  cabin: string;
  currentPrice: number;
  historicalAvg: number;
  discount: number;
  bookingUrl: string;
  unsubscribeUrl: string;
}

export function renderSeatAlertEmail(props: SeatAlertEmailProps): string {
  const cabinLabel = {
    ECONOMY: "Economy",
    PREMIUM_ECONOMY: "Premium Economy",
    BUSINESS: "Business Class",
    FIRST: "First Class",
  }[props.cabin] || props.cabin;

  const [from, to] = props.route.split("-");
  const routeDisplay = `${from?.toUpperCase()} → ${to?.toUpperCase()}`;

  return `
    <html>
      <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0066cc;">Great Deal on ${cabinLabel}!</h1>
        <p>Hi there! We found an amazing deal matching your preferences.</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2>${routeDisplay}</h2>
          <p><strong>Class:</strong> ${cabinLabel}</p>
          <p><strong>Price:</strong> $${props.currentPrice.toLocaleString()}</p>
          <p><strong>Usually:</strong> $${props.historicalAvg.toLocaleString()}</p>
          <p style="font-size: 18px; color: #00aa00;">
            <strong>Save ${props.discount.toFixed(1)}%!</strong>
          </p>
        </div>

        <p>
          <a href="${props.bookingUrl}" style="
            display: inline-block;
            background: #0066cc;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
          ">Book Now</a>
        </p>

        <hr style="margin: 40px 0;" />
        <p style="font-size: 12px; color: #666;">
          <a href="${props.unsubscribeUrl}">Unsubscribe from this alert</a>
        </p>
      </body>
    </html>
  `;
}

export async function sendSeatAlertEmail(
  subscriberEmail: string,
  route: string,
  cabin: string,
  currentPrice: number,
  historicalAvg: number,
  discount: number,
  bookingUrl: string,
  unsubscribeToken: string
): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/alerts/seat/unsubscribe?token=${unsubscribeToken}`;

    const html = renderSeatAlertEmail({
      subscriberEmail,
      route,
      cabin,
      currentPrice,
      historicalAvg,
      discount,
      bookingUrl,
      unsubscribeUrl,
    });

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "KEZA Alerts <alerts@keza.app>",
      to: subscriberEmail,
      subject: `Deal Alert: ${cabin} Class on ${route} - Save ${discount.toFixed(1)}%`,
      html,
    });

    return true;
  } catch (err) {
    logError("[seatAlertEmails] Failed to send seat alert email", err);
    return false;
  }
}
