"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useLiveEvents } from "@/lib/useLiveEvents";
import { AddSiteModal } from "@/components/AddSiteModal";

type Site = {
  id: string;
  url: string;
  name: string;
  check_interval_seconds: number;
  is_active: boolean;
  created_at: string;
  current_status: "up" | "down" | "unknown";
  last_response_ms: number | null;
  uptime_30d: number | null;
};

const statusColor: Record<string, string> = {
  up: "#3ECF8E",
  down: "#F0616B",
  unknown: "#5A6072",
};

const statusLabel: Record<string, string> = {
  up: "Operational",
  down: "Down",
  unknown: "No data yet",
};

export default function DashboardPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadSites = useCallback(() => {
    setLoading(true);
    apiGet("/sites")
      .then((data) => setSites(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const handleLiveEvent = useCallback((event: { type: string; site_id?: string; status?: string }) => {
    if (event.type === "status_update" && event.site_id && event.status) {
      setSites((prev) =>
        prev.map((s) =>
          s.id === event.site_id
            ? { ...s, current_status: event.status as "up" | "down" }
            : s
        )
      );
    }
  }, []);

  useLiveEvents(handleLiveEvent);

  const upCount = sites.filter((s) => s.current_status === "up").length;
  const avgUptime =
    sites.length > 0
      ? (
          sites.reduce((sum, s) => sum + (s.uptime_30d ?? 100), 0) / sites.length
        ).toFixed(2)
      : null;

  return (
    <main className="min-h-screen px-8 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-on-primary text-sm font-medium px-4 py-2 rounded-lg hover:brightness-110"
        >
          + Add site
        </button>
      </div>
      <p className="text-on-surface-variant text-sm mb-8">
        Live status across your monitored sites
      </p>

      {loading && <p className="text-on-surface-variant">Loading sites...</p>}
      {error && <p className="text-danger">Error: {error}</p>}

      {!loading && !error && (
        <>
          <div className="flex items-baseline gap-3 mb-8">
            <span className="text-[40px] font-semibold tracking-tight leading-none">
              {avgUptime ?? "—"}%
            </span>
            <span className="text-sm text-on-surface-variant">
              fleet uptime · 30 days
            </span>
            <span className="ml-4 text-sm text-on-surface-variant">
              {upCount}/{sites.length} operational
            </span>
          </div>

          {sites.length === 0 && (
            <p className="text-on-surface-variant">
              No sites yet — add one to get started.
            </p>
          )}

          <div className="bg-surface rounded-2xl overflow-hidden">
            {sites.map((site, i) => (
              <div
                key={site.id}
                className="flex items-center justify-between px-6 py-4"
                style={{ borderTop: i === 0 ? "none" : "1px solid #0D0F14" }}
              >
                <div>
                  <p className="text-sm font-medium">{site.name}</p>
                  <p className="text-xs text-on-surface-variant">{site.url}</p>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <span className="text-on-surface-variant font-mono">
                    {site.last_response_ms != null ? `${site.last_response_ms}ms` : "—"}
                  </span>
                  <span className="text-on-surface-variant font-mono">
                    {site.uptime_30d != null ? `${site.uptime_30d}%` : "—"}
                  </span>
                  <span
                    className="flex items-center gap-2"
                    style={{ color: statusColor[site.current_status] }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: statusColor[site.current_status] }}
                    />
                    {statusLabel[site.current_status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showAddModal && (
        <AddSiteModal
          onClose={() => setShowAddModal(false)}
          onCreated={loadSites}
        />
      )}
    </main>
  );
}