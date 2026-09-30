"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import DashboardSidebar from "./DashboardSidebar";

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setReady(true);
    });
  }, [router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-on-surface-variant">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <DashboardSidebar
        className={`fixed z-40 transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        onNavigate={() => setMobileOpen(false)}
      />

      <div className="flex-1 min-w-0 lg:ml-60">
        <header className="h-14 border-b border-white/5 flex items-center gap-3 px-4 md:px-10 sticky top-0 bg-background/90 backdrop-blur-sm z-10">
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg hover:bg-surface-raised text-on-surface-variant"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
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
