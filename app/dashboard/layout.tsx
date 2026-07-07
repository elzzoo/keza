import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const metadata = {
  title: "Dashboard — KEZA",
  description: "Dashboard analytics and insights",
};

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
