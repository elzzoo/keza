import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const metadata = {
  title: "Dashboard — Xalifly",
  description: "Dashboard analytics and insights",
};

export const dynamic = "force-dynamic";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Business KPIs (users, revenue, conversions) — admin-only. Was previously
  // wide open (this layout + all four /api/dashboard/* routes had zero
  // auth check). /admin already owns the login form for this same session
  // cookie, so unauthenticated visitors are sent there instead of duplicating it.
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSessionToken(sessionToken)) {
    redirect("/admin");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
