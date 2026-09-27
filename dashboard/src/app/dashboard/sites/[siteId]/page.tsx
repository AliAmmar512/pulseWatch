"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
} from "recharts";

type SiteDetail = {
  id: string;
  name: string;
  url: string;
  check_interval_seconds: number;
  is_active: boolean;
  recent_checks: { status: string; response_time_ms: number | null; checked_at: string }[];
  incidents: { id: string; started_at: string; resolved_at: string | null; is_resolved: boolean }[];
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

  const loadSite = () => {
    setLoading(true);
    apiGet(`/sites/${siteId}`)
      .then((data) => {
        setSite(data);
        setEditName(data.name);
        setEditInterval(data.check_interval_seconds);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

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

  if (loading) return <main className="p-10 text-on-surface-variant">Loading...</main>;
  if (error) return <main className="p-10 text-danger">Error: {error}</main>;
  if (!site) return null;

  const chartData = (site.recent_checks || [])
    .slice()
    .reverse()
    .map((c) => ({
      time: new Date(c.checked_at).toLocaleTimeString(),
      ms: c.response_time_ms ?? 0,
    }));

  return (
    <main className="min-h-screen px-8 py-10 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-1">
        <div>
          {editing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-2xl font-semibold bg-transparent border-b border-white/20 outline-none focus:border-primary"
            />
          ) : (
            <h1 className="text-2xl font-semibold">{site.name}</h1>
          )}
          <p className="text-on-surface-variant text-sm mt-1">{site.url}</p>
        </div>

        <div className="flex gap-2">
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
        <div className="mb-6 mt-3">
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
              contentStyle={{ background: "#1B1E28", border: "none", borderRadius: 8, fontSize: 12 }}
            />
            <Area type="monotone" dataKey="ms" stroke="#8B7CFF" strokeWidth={2} fill="url(#fill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface rounded-2xl overflow-hidden">
        <p className="text-sm font-medium px-6 pt-5 pb-3">Incident history</p>
        {site.incidents.length === 0 && (
          <p className="text-on-surface-variant text-sm px-6 pb-5">No incidents recorded.</p>
        )}
        {site.incidents.map((inc, i) => (
          <div
            key={inc.id}
            className="flex items-center justify-between px-6 py-3.5"
            style={{ borderTop: i === 0 ? "none" : "1px solid #0D0F14" }}
          >
            <span className="text-sm">{new Date(inc.started_at).toLocaleString()}</span>
            <span
              className="text-xs"
              style={{ color: inc.is_resolved ? "#3ECF8E" : "#F0616B" }}
            >
              {inc.is_resolved ? "Resolved" : "Ongoing"}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}