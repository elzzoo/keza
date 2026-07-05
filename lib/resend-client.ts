import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendMilesAlertEmailParams {
  email: string;
  route: string; // "SIN-LAX"
  program: string; // "Singapore KrisFlyer"
  cpp: number; // 0.77
  threshold: number; // 0.8
  flight?: {
    selectedOption?: {
      miles: number;
      cost: number;
    };
  };
}

/**
 * Sends a formatted miles alert email via Resend when a deal matching
 * the user's criteria is found.
 *
 * @param params - Email parameters including route, program, cpp, and flight details
 * @returns Promise with success status and Resend messageId
 * @throws Error if email sending fails
 */
export async function sendMilesAlertEmail(
  params: SendMilesAlertEmailParams
): Promise<{ success: boolean; messageId?: string }> {
  const { email, route, program, cpp, threshold, flight } = params;

  // Extract from/to from route (e.g., "SIN-LAX" -> from="SIN", to="LAX")
  const [from, to] = route.split("-");

  if (!from || !to) {
    throw new Error(`Invalid route format: ${route}. Expected "FROM-TO" format.`);
  }

  const miles = flight?.selectedOption?.miles;
  const cost = flight?.selectedOption?.cost;

  // Generate email subject
  const subject = `Great deal! ${from}→${to} via ${program} — ${cpp}cpp`;

  // Generate HTML email template
  const html = generateMilesAlertEmailHTML({
    from,
    to,
    program,
    cpp,
    threshold,
    miles,
    cost,
    email,
  });

  try {
    const response = await resend.emails.send({
      from: "alerts@keza.app",
      to: email,
      subject,
      html,
    });

    if (!response || response.error) {
      const errorMsg = response?.error?.message || "Unknown Resend error";
      throw new Error(`Resend API Error: ${errorMsg}`);
    }

    return {
      success: true,
      messageId: response.id,
    };
  } catch (error) {
    console.error("[miles-alert-email] Failed to send email", {
      email,
      route,
      program,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Generates a formatted HTML email template for miles alert notifications.
 */
function generateMilesAlertEmailHTML({
  from,
  to,
  program,
  cpp,
  threshold,
  miles,
  cost,
  email,
}: {
  from: string;
  to: string;
  program: string;
  cpp: number;
  threshold: number;
  miles?: number;
  cost?: number;
  email: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f9f9f9;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 16px;
      color: #333333;
      margin: 0 0 20px 0;
      line-height: 1.6;
    }
    .summary {
      font-size: 16px;
      color: #555555;
      margin: 0 0 30px 0;
      line-height: 1.6;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      background-color: #f5f5f5;
      border-radius: 6px;
      overflow: hidden;
    }
    .details-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #ebebeb;
      font-size: 14px;
    }
    .details-table td:first-child {
      font-weight: 600;
      color: #333333;
      width: 35%;
      background-color: #fafafa;
    }
    .details-table td:last-child {
      color: #555555;
    }
    .details-table tr:last-child td {
      border-bottom: none;
    }
    .highlight {
      font-weight: 700;
      color: #667eea;
    }
    .cta-button {
      display: inline-block;
      background-color: #667eea;
      color: #ffffff;
      padding: 14px 32px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      margin: 30px 0;
      transition: background-color 0.3s ease;
    }
    .cta-button:hover {
      background-color: #764ba2;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 30px;
      border-top: 1px solid #ebebeb;
      font-size: 12px;
      color: #999999;
      text-align: center;
      line-height: 1.8;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .footer-links {
      margin: 15px 0 0 0;
    }
    .footer-links a {
      margin: 0 8px;
    }
    .keza-logo {
      font-weight: 700;
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🎉 Miles Deal Alert</h1>
    </div>

    <!-- Main Content -->
    <div class="content">
      <p class="greeting">Hi there,</p>

      <p class="summary">
        We found a great miles deal matching your alert! Check out this opportunity for your next trip.
      </p>

      <!-- Details Table -->
      <table class="details-table">
        <tr>
          <td>Route</td>
          <td><strong>${from} → ${to}</strong></td>
        </tr>
        <tr>
          <td>Program</td>
          <td>${program}</td>
        </tr>
        <tr>
          <td>Cost Per Point</td>
          <td><span class="highlight">${cpp}¢</span> <span style="color: #999999;">(your threshold: ${threshold}¢)</span></td>
        </tr>
        ${
          miles && cost
            ? `
        <tr>
          <td>Award Cost</td>
          <td>${miles.toLocaleString()} miles + $${cost.toFixed(2)}</td>
        </tr>
        `
            : ""
        }
      </table>

      <!-- CTA Button -->
      <div style="text-align: center;">
        <a href="https://keza.app/flights?from=${from}&to=${to}" class="cta-button">Search Now</a>
      </div>

      <p style="font-size: 14px; color: #999999; text-align: center; margin-top: 20px;">
        This deal matches your saved alert criteria. Sign in to <span class="keza-logo">KEZA</span> to book your award flight.
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0 0 10px 0;">Questions? We're here to help.</p>
      <div class="footer-links">
        <a href="https://keza.app/miles-alerts?email=${encodeURIComponent(email)}">Manage alerts</a>
        <span style="color: #ebebeb;">•</span>
        <a href="https://keza.app/miles-alerts?email=${encodeURIComponent(email)}&unsubscribe=true">Unsubscribe</a>
      </div>
      <p style="margin: 15px 0 0 0; color: #bbb;">
        © 2026 <span class="keza-logo">KEZA</span> • Your miles, optimized.
      </p>
    </div>
  </div>
</body>
</html>
`;
}
