"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Globe,
  LayoutDashboard,
  Radio,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Domains & SSL", href: "/dashboard/domains", icon: Globe },
  { label: "Incidents", href: "/dashboard/incidents", icon: Activity },
  { label: "Status Pages", href: "/dashboard/status-pages", icon: Radio },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardSidebar({
  className = "",
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
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
    <aside
      className={`w-60 shrink-0 border-r border-white/5 px-5 py-6 flex flex-col gap-1 h-screen bg-background ${className}`}
    >
      <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2 mb-8 px-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-on-primary font-bold text-sm">
          P
        </div>
        <span className="text-lg font-semibold tracking-tight">Pulsewatch</span>
      </Link>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard" || pathname.startsWith("/dashboard/sites/")
            : pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive
                ? "bg-surface-raised text-on-surface font-semibold"
                : "text-on-surface-variant hover:bg-surface hover:text-on-surface"
            }`}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}

      <div className="mt-auto pt-4 border-t border-white/5">
        <div className="px-2 mb-2">
          <p className="text-xs text-on-surface-variant truncate">{email || "Signed in"}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-raised hover:text-on-surface transition-colors"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
