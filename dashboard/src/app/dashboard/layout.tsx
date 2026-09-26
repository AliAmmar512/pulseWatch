import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Domains & SSL", href: "/dashboard/domains" },
  { label: "Incidents", href: "/dashboard/incidents" },
  { label: "Status Pages", href: "/dashboard/status-pages" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-white/5 px-5 py-6 flex flex-col gap-1">
        <div className="text-lg font-semibold mb-8 px-2">Pulsewatch</div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface hover:text-on-surface transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}