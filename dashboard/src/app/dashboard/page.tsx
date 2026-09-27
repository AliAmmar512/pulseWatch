"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useLiveEvents } from "@/lib/useLiveEvents";
import { AddSiteModal } from "@/components/AddSiteModal";
import { Sparkline } from "@/components/Sparkline";
import Link from "next/link";

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
  sparkline: number[];
};

type ActivityItem = {
  id: string;
  text: string;
  time: string;
  color: string;
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

function StatusBadge({ status }: { status: string }) {
  const color = statusColor[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}1F`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {statusLabel[status]}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="bg-surface rounded-2xl p-5">
      <p className="text-xs uppercase tracking-wider text-on-surface-variant mb-2 font-mono">
        {label}
      </p>
      <p className="text-2xl font-semibold font-mono">{value}</p>
      {sub && (
        <p className="text-xs mt-1.5" style={{ color: subColor ?? "#9DA3B4" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

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

  const handleLiveEvent = useCallback(
    (event: { type: string; site_id?: string; status?: string }) => {
      if (event.type === "status_update" && event.site_id && event.status) {
        setSites((prev) =>
          prev.map((s) =>
            s.id === event.site_id ? { ...s, current_status: event.status as "up" | "down" } : s
          )
        );
      }

      if (event.type === "incident_created" || event.type === "incident_resolved") {
        setActivity((prev) => [
          {
            id: `${Date.now()}`,
            text:
              event.type === "incident_created"
                ? "Incident detected"
                : "Incident resolved",
            time: "just now",
            color: event.type === "incident_created" ? "#F0616B" : "#3ECF8E",
          },
          ...prev.slice(0, 9),
        ]);
      }
    },
    []
  );

  useLiveEvents(handleLiveEvent);

  const upCount = sites.filter((s) => s.current_status === "up").length;
  const downCount = sites.filter((s) => s.current_status === "down").length;
  const avgUptime =
    sites.length > 0
      ? (sites.reduce((sum, s) => sum + (s.uptime_30d ?? 100), 0) / sites.length).toFixed(2)
      : "—";
  const avgResponse =
    sites.filter((s) => s.last_response_ms != null).length > 0
      ? Math.round(
          sites.reduce((sum, s) => sum + (s.last_response_ms ?? 0), 0) /
            sites.filter((s) => s.last_response_ms != null).length
        )
      : null;

  return (
    <main className="px-10 py-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Live status across your monitored sites
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-on-primary text-sm font-medium px-4 py-2.5 rounded-lg hover:brightness-110 transition-all"
        >
          + Add site
        </button>
      </div>

      {loading && <p className="text-on-surface-variant">Loading sites...</p>}
      {error && <p className="text-danger">Error: {error}</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Fleet uptime" value={`${avgUptime}%`} sub="last 30 days" />
            <StatCard
              label="Operational"
              value={`${upCount}/${sites.length}`}
              sub={downCount > 0 ? `${downCount} down` : "all systems normal"}
              subColor={downCount > 0 ? "#F0616B" : "#3ECF8E"}
            />
            <StatCard
              label="Avg response"
              value={avgResponse != null ? `${avgResponse}ms` : "—"}
            />
            <StatCard label="Sites monitored" value={String(sites.length)} />
          </div>

          {sites.length === 0 && (
            <div className="bg-surface rounded-2xl p-10 text-center">
              <p className="text-on-surface-variant">No sites yet — add one to get started.</p>
            </div>
          )}

          {sites.length > 0 && (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 bg-surface rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[1fr_130px_90px_80px_90px] px-6 py-3 text-xs uppercase tracking-wider text-on-surface-variant font-mono border-b border-black/20">
                  <div>Site</div>
                  <div>Status</div>
                  <div>Resp.</div>
                  <div>Uptime</div>
                  <div>Trend</div>
                </div>
                {sites.map((site, i) => (
                  <Link
                    key={site.id}
                    href={`/dashboard/sites/${site.id}`}
                    className="grid grid-cols-[1fr_130px_90px_80px_90px] items-center px-6 py-4 hover:bg-surface-raised transition-colors"
                    style={{ borderTop: i === 0 ? "none" : "1px solid #0D0F14" }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{site.name}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                        {site.url}
                      </p>
                    </div>
                    <div>
                      <StatusBadge status={site.current_status} />
                    </div>
                    <div className="text-sm font-mono text-on-surface-variant">
                      {site.last_response_ms != null ? `${site.last_response_ms}ms` : "—"}
                    </div>
                    <div className="text-sm font-mono text-on-surface-variant">
                      {site.uptime_30d != null ? `${site.uptime_30d}%` : "—"}
                    </div>
                    <div>
                      {site.sparkline && site.sparkline.length > 1 ? (
                        <Sparkline
                          data={site.sparkline}
                          color={statusColor[site.current_status]}
                        />
                      ) : (
                        <span className="text-xs text-on-surface-variant">—</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              <div className="bg-surface rounded-2xl p-5">
                <p className="text-sm font-medium mb-4">Live activity</p>
                {activity.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">
                    Nothing yet — events will appear here as they happen.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {activity.map((item) => (
                      <div key={item.id} className="flex gap-2.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <div>
                          <p className="text-xs">{item.text}</p>
                          <p className="text-[11px] text-on-surface-variant mt-0.5">
                            {item.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {showAddModal && (
        <AddSiteModal onClose={() => setShowAddModal(false)} onCreated={loadSites} />
      )}
    </main>
  );
}