"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiDelete, apiGet, apiPatch } from "@/lib/api";
import { useLiveEvents } from "@/lib/useLiveEvents";
import { IncidentBadge, StatusBadge } from "@/components/StatusBadge";

type SiteDetail = {
  id: string;
  name: string;
  url: string;
  check_interval_seconds: number;
  is_active: boolean;
  recent_checks: {
    status: string;
    response_time_ms: number | null;
    checked_at: string;
  }[];
  incidents: {
    id: string;
    started_at: string;
    resolved_at: string | null;
    is_resolved: boolean;
  }[];
};

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;

  const [site, setSite] = useState<SiteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editInterval, setEditInterval] = useState(60);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadSite = useCallback(() => {
    setLoading(true);
    apiGet(`/sites/${siteId}`)
      .then((data) => {
        setSite(data);
        setEditName(data.name);
        setEditInterval(data.check_interval_seconds);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [siteId]);

  useEffect(() => {
    loadSite();
  }, [loadSite]);

  const handleLiveEvent = useCallback(
    (event: { type: string; site_id?: string; status?: string }) => {
      if (event.site_id !== siteId) return;
      if (event.type === "incident_created" || event.type === "incident_resolved") {
        loadSite();
      }
    },
    [loadSite, siteId]
  );

  useLiveEvents(handleLiveEvent);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch(`/sites/${siteId}`, {
        name: editName,
        check_interval_seconds: editInterval,
      });
      setEditing(false);
      loadSite();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this site? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await apiDelete(`/sites/${siteId}`);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="px-4 md:px-10 py-10 text-on-surface-variant text-sm">
        Loading...
      </main>
    );
  }
  if (error) {
    return (
      <main className="px-4 md:px-10 py-10">
        <p className="text-danger text-sm mb-4">Error: {error}</p>
        <Link href="/dashboard" className="text-sm text-primary hover:underline">
          Back to dashboard
        </Link>
      </main>
    );
  }
  if (!site) return null;

  const latest = site.recent_checks?.[0];
  const currentStatus = latest?.status ?? "unknown";
  const chartData = (site.recent_checks || [])
    .slice()
    .reverse()
    .map((c) => ({
      time: new Date(c.checked_at).toLocaleTimeString(),
      ms: c.response_time_ms ?? 0,
    }));

  return (
    <main className="px-4 md:px-10 py-8 md:py-10 max-w-4xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface mb-6"
      >
        <ArrowLeft size={14} />
        Dashboard
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-1">
        <div className="min-w-0">
          {editing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-[28px] font-bold bg-transparent border-b border-white/20 outline-none focus:border-primary w-full"
            />
          ) : (
            <h1 className="text-[28px] md:text-[32px] font-bold tracking-tight">
              {site.name}
            </h1>
          )}
          <p className="text-on-surface-variant text-sm mt-1 truncate">{site.url}</p>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <StatusBadge status={currentStatus} />
            <span className="text-xs font-mono text-on-surface-variant">
              every {site.check_interval_seconds}s
              {site.is_active ? "" : " · paused"}
            </span>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="text-sm px-3 py-1.5 rounded-lg border border-white/10 hover:bg-surface-raised"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm px-3 py-1.5 rounded-lg bg-primary text-on-primary font-medium hover:brightness-110 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="text-sm px-3 py-1.5 rounded-lg border border-white/10 hover:bg-surface-raised"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm px-3 py-1.5 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="mb-6 mt-4">
          <label className="text-sm text-on-surface-variant mb-1 block">
            Check interval (seconds)
          </label>
          <input
            type="number"
            value={editInterval}
            onChange={(e) => setEditInterval(Number(e.target.value))}
            min={10}
            className="bg-surface-raised border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary w-40"
          />
        </div>
      )}

      <div className="bg-surface rounded-2xl p-6 mb-6 mt-6">
        <p className="text-sm font-medium mb-3">Response time (recent checks)</p>
        {chartData.length < 2 ? (
          <p className="text-sm text-on-surface-variant">
            Not enough checks yet for a chart.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B7CFF" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8B7CFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "#1B1E28",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => [`${value}ms`, "response"]}
              />
              <Area
                type="monotone"
                dataKey="ms"
                stroke="#8B7CFF"
                strokeWidth={2}
                fill="url(#fill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-surface rounded-2xl overflow-hidden">
        <p className="text-sm font-medium px-6 pt-5 pb-3">Incident history</p>
        {site.incidents.length === 0 && (
          <p className="text-on-surface-variant text-sm px-6 pb-5">
            No incidents recorded.
          </p>
        )}
        {site.incidents.map((inc, i) => (
          <div
            key={inc.id}
            className="flex items-center justify-between px-6 py-3.5"
            style={{ borderTop: i === 0 ? "none" : "1px solid #0D0F14" }}
          >
            <span className="text-sm">
              {new Date(inc.started_at).toLocaleString()}
            </span>
            <IncidentBadge resolved={inc.is_resolved} />
          </div>
        ))}
      </div>
    </main>
  );
}
