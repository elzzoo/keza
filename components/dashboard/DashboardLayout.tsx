"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard" },
  { label: "Routes", href: "/dashboard/routes" },
  { label: "Users", href: "/dashboard/users" },
  { label: "Alerts", href: "/dashboard/alerts" },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-bg text-fg">
      {/* Navigation Sidebar */}
      <nav
        className="w-64 bg-surface-1 border-r border-border flex flex-col dark:bg-slate-900 dark:border-slate-700"
      >
        <div className="p-6 border-b border-border dark:border-slate-700">
          <h1 className="text-xl font-bold">Dashboard</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "block px-4 py-2 rounded-lg font-medium transition-all duration-150",
                    isActive(item.href)
                      ? "bg-primary text-white dark:bg-blue-600"
                      : "text-muted hover:bg-surface-2 hover:text-fg dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
