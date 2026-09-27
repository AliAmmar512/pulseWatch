"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Domains & SSL", href: "/dashboard/domains" },
  { label: "Incidents", href: "/dashboard/incidents" },
  { label: "Status Pages", href: "/dashboard/status-pages" },
  { label: "Settings", href: "/dashboard/settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email ?? "");
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-white/5 px-5 py-6 flex flex-col gap-1 fixed h-screen bg-[#0D0F14]">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-on-primary font-bold text-sm">
            P
          </div>
          <span className="text-lg font-semibold tracking-tight">Pulsewatch</span>
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: isActive ? "#1B1E28" : "transparent",
                color: isActive ? "#F1F3F9" : "#9DA3B4",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {item.label}
            </Link>
          );
        })}

        <div className="mt-auto pt-4 border-t border-white/5">
          <div className="px-2 mb-2">
            <p className="text-xs text-on-surface-variant truncate">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-raised hover:text-on-surface transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-60">
        <header className="h-14 border-b border-white/5 flex items-center px-10 sticky top-0 bg-[#0D0F14]/90 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-secondary/10">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider text-secondary">
              Live
            </span>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}