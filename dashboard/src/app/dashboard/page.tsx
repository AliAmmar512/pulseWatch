"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiGet } from "@/lib/api";
import { useLiveEvents } from "@/lib/useLiveEvents";
import { statusColor } from "@/lib/status";
import { AddSiteModal } from "@/components/AddSiteModal";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { Sparkline } from "@/components/Sparkline";
import { StatusBadge } from "@/components/StatusBadge";

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

type ActivityItem = { id: string; text: string; time: string; color: string };

function UptimeRing({ value }: { value: number }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative w-[112px] h-[112px] shrink-0">
      <svg width="112" height="112" className="-rotate-90">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="#1B1E28" strokeWidth="9" />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="#8B7CFF"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-mono tracking-tight">{value}%</span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  subColor,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  icon: ReactNode;
  accent?: string;
}) {
  return (
    <div className="p-5 rounded-2xl bg-surface relative overflow-hidden hover:bg-surface-raised transition-colors">
      <div
        className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl opacity-25 pointer-events-none"
        style={{ backgroundColor: accent ?? "#8B7CFF" }}
      />
      <div className="flex items-start justify-between relative">
        <span className="text-xs uppercase tracking-wider text-on-surface-variant font-mono">
          {label}
        </span>
        <span style={{ color: accent ?? "#9DA3B4" }}>{icon}</span>
      </div>
      <p className="text-[28px] font-bold font-mono mt-3 tracking-tight relative">{value}</p>
      {sub && (
        <p className="text-xs mt-1.5 relative" style={{ color: subColor ?? "#9DA3B4" }}>
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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "up" | "down">("all");

  const sitesRef = useRef<Site[]>([]);
  sitesRef.current = sites;

  const loadSites = useCallback(() => {
    setLoading(true);
    setError(null);
    apiGet("/sites")
      .then(setSites)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const handleLiveEvent = useCallback(
    (event: {
      type: string;
      site_id?: string;
      status?: string;
      days_left?: number;
    }) => {
      const siteName = event.site_id
        ? sitesRef.current.find((s) => s.id === event.site_id)?.name
        : undefined;

      if (event.type === "status_update" && event.site_id && event.status) {
        setSites((prev) =>
          prev.map((s) =>
            s.id === event.site_id
              ? { ...s, current_status: event.status as "up" | "down" }
              : s
          )
        );
      }

      if (event.type === "incident_created" || event.type === "incident_resolved") {
        const isDown = event.type === "incident_created";
        setActivity((prev) => [
          {
            id: `${Date.now()}`,
            text: isDown
              ? `Incident on ${siteName ?? "a site"}`
              : `${siteName ?? "A site"} recovered`,
            time: "just now",
            color: isDown ? statusColor.down : statusColor.up,
          },
          ...prev.slice(0, 9),
        ]);
      }

      if (event.type === "domain_expiry_warning") {
        setActivity((prev) => [
          {
            id: `${Date.now()}`,
            text: `SSL expires in ${event.days_left ?? "?"} days`,
            time: "just now",
            color: "#F5A742",
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
      ? Number(
          (
            sites.reduce((sum, s) => sum + (s.uptime_30d ?? 100), 0) / sites.length
          ).toFixed(2)
        )
      : 0;
  const withResponse = sites.filter((s) => s.last_response_ms != null);
  const avgResponse =
    withResponse.length > 0
      ? Math.round(
          withResponse.reduce((sum, s) => sum + (s.last_response_ms ?? 0), 0) /
            withResponse.length
        )
      : null;

  const aggregateChartData = useMemo(() => {
    const maxLen = Math.max(...sites.map((s) => s.sparkline?.length ?? 0), 0);
    if (maxLen === 0) return [];
    return Array.from({ length: maxLen }, (_, i) => {
      const valuesAtIndex = sites
        .map((s) => s.sparkline?.[i])
        .filter((v): v is number => v != null && v > 0);
      const avg = valuesAtIndex.length
        ? valuesAtIndex.reduce((a, b) => a + b, 0) / valuesAtIndex.length
        : 0;
      return { i, ms: Math.round(avg) };
    });
  }, [sites]);

  const filteredSites = useMemo(() => {
    return sites.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.url.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || s.current_status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [sites, search, filter]);

  const allOperational = downCount === 0 && sites.length > 0;
  const fastest = [...withResponse].sort(
    (a, b) => (a.last_response_ms ?? 0) - (b.last_response_ms ?? 0)
  )[0];

  return (
    <main className="px-4 md:px-10 py-8 md:py-10 max-w-6xl mx-auto">
      <PageHeader
        title="Dashboard"
        eyebrow={
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider w-fit"
            style={{
              backgroundColor: allOperational
                ? "#3ECF8E1A"
                : sites.length
                  ? "#F0616B1A"
                  : "#5A60721A",
              color: allOperational
                ? "#3ECF8E"
                : sites.length
                  ? "#F0616B"
                  : "#9DA3B4",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{
                backgroundColor: allOperational
                  ? "#3ECF8E"
                  : sites.length
                    ? "#F0616B"
                    : "#5A6072",
              }}
            />
            {allOperational
              ? "All systems operational"
              : sites.length
                ? `${downCount} site${downCount > 1 ? "s" : ""} down`
                : "No sites yet"}
          </span>
        }
        actions={
          <>
            <button
              onClick={loadSites}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface hover:bg-surface-raised text-sm transition-colors"
            >
              <RefreshCw size={15} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-primary text-on-primary text-sm font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition-all"
            >
              <Plus size={16} />
              Add site
            </button>
          </>
        }
      />

      {loading && (
        <p className="text-on-surface-variant text-sm">Loading sites...</p>
      )}
      {error && (
        <p className="text-danger text-sm mb-4">
          {error}{" "}
          <button onClick={loadSites} className="underline">
            Retry
          </button>
        </p>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <div className="p-5 rounded-2xl bg-surface flex items-center gap-4">
              <UptimeRing value={avgUptime} />
              <div>
                <p className="text-xs uppercase tracking-wider text-on-surface-variant font-mono mb-1">
                  Fleet uptime
                </p>
                <p className="text-xs text-on-surface-variant">last 30 days</p>
              </div>
            </div>
            <StatCard
              label="Operational"
              value={`${upCount}/${sites.length}`}
              sub={downCount > 0 ? `${downCount} down` : "all systems normal"}
              subColor={downCount > 0 ? "#F0616B" : "#3ECF8E"}
              icon={<Activity size={18} />}
              accent="#3ECF8E"
            />
            <StatCard
              label="Avg response"
              value={avgResponse != null ? `${avgResponse}ms` : "—"}
              icon={<Zap size={18} />}
              accent="#4FD1E8"
            />
            <StatCard
              label="Sites down"
              value={String(downCount)}
              sub={downCount > 0 ? "needs attention" : "none active"}
              subColor={downCount > 0 ? "#F0616B" : undefined}
              icon={<AlertTriangle size={18} />}
              accent={downCount > 0 ? "#F0616B" : "#5A6072"}
            />
          </div>

          {sites.length > 0 && aggregateChartData.length > 1 && (
            <div className="bg-surface rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={15} className="text-accent" />
                <p className="text-sm font-medium">Fleet response time</p>
                <span className="text-xs text-on-surface-variant font-mono ml-auto">
                  recent checks, averaged
                </span>
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={aggregateChartData}>
                  <defs>
                    <linearGradient id="fleetFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4FD1E8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#4FD1E8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="i" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "#1B1E28",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${value}ms`, "avg"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="ms"
                    stroke="#4FD1E8"
                    strokeWidth={2}
                    fill="url(#fleetFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {sites.length === 0 ? (
            <EmptyState
              title="No sites yet"
              description="Add a client site and Pulsewatch will start checking it on your interval."
              action={
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-1.5 bg-primary text-on-primary text-sm font-semibold px-4 py-2 rounded-lg hover:brightness-110"
                >
                  <Plus size={16} />
                  Add your first site
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 flex flex-col gap-4 min-w-0">
                <div className="p-3 rounded-xl bg-surface flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Filter by name or URL..."
                      className="w-full bg-surface-raised rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-raised">
                    {(["all", "up", "down"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className="flex-1 sm:flex-none px-3 py-1 rounded-md text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: filter === f ? "#232838" : "transparent",
                          color: filter === f ? "#F1F3F9" : "#9DA3B4",
                        }}
                      >
                        {f === "all" ? "All" : f === "up" ? "Up" : "Down"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-surface rounded-2xl overflow-x-auto">
                  <div className="min-w-[640px]">
                    <div className="grid grid-cols-[1fr_130px_90px_80px_90px] px-6 py-3 text-xs uppercase tracking-wider text-on-surface-variant font-mono border-b border-black/20">
                      <div>Site</div>
                      <div>Status</div>
                      <div>Resp.</div>
                      <div>Uptime</div>
                      <div>Trend</div>
                    </div>
                    {filteredSites.length === 0 && (
                      <p className="px-6 py-8 text-sm text-on-surface-variant">
                        No sites match your filter.
                      </p>
                    )}
                    {filteredSites.map((site, i) => (
                      <Link
                        key={site.id}
                        href={`/dashboard/sites/${site.id}`}
                        className="grid grid-cols-[1fr_130px_90px_80px_90px] items-center px-6 py-4 hover:bg-surface-raised transition-colors"
                        style={{ borderTop: i === 0 ? "none" : "1px solid #0D0F14" }}
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                            style={{
                              backgroundColor: `${statusColor[site.current_status]}1A`,
                              color: statusColor[site.current_status],
                            }}
                          >
                            {site.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{site.name}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                              {site.url}
                            </p>
                          </div>
                        </div>
                        <div>
                          <StatusBadge status={site.current_status} />
                        </div>
                        <div className="text-sm font-mono text-on-surface-variant">
                          {site.last_response_ms != null
                            ? `${site.last_response_ms}ms`
                            : "—"}
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
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-surface rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                    <p className="text-sm font-medium">Live activity</p>
                  </div>
                  {activity.length === 0 ? (
                    <p className="text-xs text-on-surface-variant">
                      Nothing yet — incidents and SSL warnings will show up here.
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

                <div className="rounded-2xl p-5 bg-primary/10">
                  <p className="text-xs uppercase tracking-wider text-on-surface-variant font-mono mb-2">
                    Fastest site
                  </p>
                  {fastest ? (
                    <>
                      <p className="text-lg font-semibold truncate">{fastest.name}</p>
                      <p className="text-2xl font-bold font-mono text-accent mt-1">
                        {fastest.last_response_ms}ms
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-on-surface-variant">No response data yet</p>
                  )}
                </div>
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
