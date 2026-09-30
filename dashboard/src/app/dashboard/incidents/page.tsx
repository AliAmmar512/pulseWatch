"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { IncidentBadge } from "@/components/StatusBadge";

type Incident = {
  id: string;
  site_id: string;
  cause: string;
  started_at: string;
  resolved_at: string | null;
  is_resolved: boolean;
  siteName: string;
};

function durationLabel(startedAt: string, resolvedAt: string | null) {
  const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
  const mins = Math.max(1, Math.round((end - new Date(startedAt).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet("/incidents")
      .then(setIncidents)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load incidents")
      )
      .finally(() => setLoading(false));
  }, []);

  const activeCount = incidents.filter((i) => !i.is_resolved).length;

  return (
    <main className="px-4 md:px-10 py-8 md:py-10 max-w-4xl mx-auto">
      <PageHeader
        title="Incidents"
        description="Downtime history across every monitored site. Alerts only open after three failed checks."
        actions={
          activeCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-danger/10 text-danger">
              <span className="w-1.5 h-1.5 rounded-full bg-danger" />
              {activeCount} ongoing
            </span>
          ) : undefined
        }
      />

      {error && <p className="text-danger mb-4 text-sm">Error: {error}</p>}
      {loading && <p className="text-on-surface-variant text-sm">Loading incidents...</p>}

      {!loading && !error && incidents.length === 0 && (
        <EmptyState
          title="No incidents recorded"
          description="When a site fails three checks in a row, it will show up here with start time and duration."
        />
      )}

      {incidents.length > 0 && (
        <div className="bg-surface rounded-2xl overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[1fr_1fr_90px_120px] px-6 py-3 text-xs uppercase tracking-wider text-on-surface-variant font-mono border-b border-black/20">
              <div>Site</div>
              <div>Started</div>
              <div>Duration</div>
              <div>Status</div>
            </div>
            {incidents.map((inc, i) => (
              <Link
                key={inc.id}
                href={`/dashboard/sites/${inc.site_id}`}
                className="grid grid-cols-[1fr_1fr_90px_120px] items-center px-6 py-4 hover:bg-surface-raised transition-colors"
                style={{ borderTop: i === 0 ? "none" : "1px solid #0D0F14" }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{inc.siteName}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                    {inc.cause}
                  </p>
                </div>
                <p className="text-xs text-on-surface-variant font-mono">
                  {new Date(inc.started_at).toLocaleString()}
                </p>
                <p className="text-xs font-mono text-on-surface-variant">
                  {durationLabel(inc.started_at, inc.resolved_at)}
                </p>
                <div>
                  <IncidentBadge resolved={inc.is_resolved} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
