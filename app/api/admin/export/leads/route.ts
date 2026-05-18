import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redis } from "@/lib/redis";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/auth";

interface B2BLead {
  name: string;
  company: string;
  email: string;
  teamSize: string;
  message?: string;
  receivedAt: string;
}

// GET /api/admin/export/leads — download B2B leads as CSV
// Protected by admin session cookie (same auth as /admin page)
export async function GET() {
  // Auth: verify admin session cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSessionToken(sessionToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all leads (up to 500)
  const raw = await redis.lrange("keza:b2b:leads", 0, 499);
  const leads: B2BLead[] = raw
    .map((item) => {
      try {
        return typeof item === "string" ? (JSON.parse(item) as B2BLead) : (item as B2BLead);
      } catch {
        return null;
      }
    })
    .filter((x): x is B2BLead => x !== null);

  // Build CSV
  const headers = ["Date", "Nom", "Entreprise", "Email", "Taille équipe", "Message"];
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const rows = leads.map((l) =>
    [
      escape(new Date(l.receivedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })),
      escape(l.name),
      escape(l.company),
      escape(l.email),
      escape(l.teamSize),
      escape(l.message ?? ""),
    ].join(",")
  );

  const csv = [headers.join(","), ...rows].join("\r\n");
  const filename = `keza-leads-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Prevent caching of sensitive data
      "Cache-Control": "no-store",
    },
  });
}
