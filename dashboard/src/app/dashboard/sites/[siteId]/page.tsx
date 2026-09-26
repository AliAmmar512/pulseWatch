"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
} from "recharts";

type SiteDetail = {
  id: string;
  name: string;
  url: string;
  check_interval_seconds: number;
  recent_checks: { status: string; response_time_ms: number | null; checked_at: string }[];
  incidents: { id: string; started_at: string; resolved_at: string | null; is_resolved: boolean }[];
};

export default function SiteDetailPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [site, setSite] = useState<SiteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet(`/sites/${siteId}`)
      .then(setSite)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [siteId]);

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
      <h1 className="text-2xl font-semibold mb-1">{site.name}</h1>
      <p className="text-on-surface-variant text-sm mb-8">{site.url}</p>

      <div className="bg-surface rounded-2xl p-6 mb-6">
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