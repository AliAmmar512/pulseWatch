"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type Site = { id: string; name: string };
type Incident = {
  id: string;
  site_id: string;
  cause: string;
  started_at: string;
  resolved_at: string | null;
  is_resolved: boolean;
};

function StatusBadge({ resolved }: { resolved: boolean }) {
  const color = resolved ? "#3ECF8E" : "#F0616B";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}1F`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {resolved ? "Resolved" : "Ongoing"}
    </span>
  );
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<(Incident & { siteName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const incidents: (Incident & { siteName: string })[] = await apiGet("/incidents");
        setIncidents(incidents);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load incidents");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeCount = incidents.filter((i) => !i.is_resolved).length;

  return (
    <main className="px-10 py-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Incidents</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Full history of downtime across your monitored sites
          </p>
        </div>
        {activeCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-danger/10 text-danger">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            {activeCount} ongoing
          </span>
        )}
      </div>

      {error && <p className="text-danger mb-4">Error: {error}</p>}
      {loading && <p className="text-on-surface-variant">Loading incidents...</p>}

      {!loading && !error && incidents.length === 0 && (
        <div className="bg-surface rounded-2xl p-10 text-center">
          <p className="text-on-surface-variant">No incidents recorded — good sign.</p>
        </div>
      )}

      {incidents.length > 0 && (
        <div className="bg-surface rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_120px] px-6 py-3 text-xs uppercase tracking-wider text-on-surface-variant font-mono border-b border-black/20">
            <div>Site</div>
            <div>Started</div>
            <div>Status</div>
          </div>
          {incidents.map((inc, i) => (
            <div
              key={inc.id}
              className="grid grid-cols-[1fr_1fr_120px] items-center px-6 py-4"
              style={{ borderTop: i === 0 ? "none" : "1px solid #0D0F14" }}
            >
              <div>
                <p className="text-sm font-medium">{inc.siteName}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{inc.cause}</p>
              </div>
              <p className="text-xs text-on-surface-variant font-mono">
                {new Date(inc.started_at).toLocaleString()}
              </p>
              <div>
                <StatusBadge resolved={inc.is_resolved} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}