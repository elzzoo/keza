import { NextRequest, NextResponse } from "next/server";
import { deactivateAlert } from "@/lib/alerts";
import { SITE_URL } from "@/lib/siteConfig";

// GET /api/alerts/unsubscribe?id=alt_xxx — deactivate an alert (from email link)
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return new NextResponse(html("Missing alert ID", false), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const success = await deactivateAlert(id);

  return new NextResponse(
    html(
      success
        ? "Your price alert has been deactivated. You won't receive further emails for this route."
        : "Alert not found or already deactivated.",
      success
    ),
    {
      status: success ? 200 : 404,
      headers: { "Content-Type": "text/html" },
    }
  );
}

function html(message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>KEZA – ${success ? "Unsubscribed" : "Error"}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #1a1a2e; border-radius: 16px; padding: 40px; text-align: center; max-width: 400px; }
    .logo { font-size: 28px; font-weight: 900; margin-bottom: 16px; }
    .logo span:first-child { color: #3b82f6; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    p { color: #94a3b8; line-height: 1.6; }
    a { color: #3b82f6; text-decoration: none; display: inline-block; margin-top: 20px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo"><span>KE</span><span>ZA</span></div>
    <div class="icon">${success ? "✅" : "⚠️"}</div>
    <p>${message}</p>
    <a href="${SITE_URL}/">← Back to KEZA</a>
  </div>
</body>
</html>`;
}
