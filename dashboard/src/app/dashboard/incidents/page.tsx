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

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<(Incident & { siteName: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const sites: Site[] = await apiGet("/sites");
      const all: (Incident & { siteName: string })[] = [];

      for (const site of sites) {
        const siteIncidents: Incident[] = await apiGet(`/incidents?site_id=${site.id}`);
        for (const inc of siteIncidents) {
          all.push({ ...inc, siteName: site.name });
        }
      }

      all.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
      setIncidents(all);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="min-h-screen px-8 py-10 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Incidents</h1>
      <p className="text-on-surface-variant text-sm mb-8">
        Full history of downtime across your monitored sites
      </p>

      {loading && <p className="text-on-surface-variant">Loading incidents...</p>}

      {!loading && incidents.length === 0 && (
        <p className="text-on-surface-variant">No incidents recorded — good sign.</p>
      )}

      <div className="bg-surface rounded-2xl overflow-hidden">
        {incidents.map((inc, i) => (
          <div
            key={inc.id}
            className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: i === 0 ? "none" : "1px solid #0D0F14" }}
          >
            <div>
              <p className="text-sm font-medium">{inc.siteName}</p>
              <p className="text-xs text-on-surface-variant">{inc.cause}</p>
            </div>
            <div className="text-right text-xs text-on-surface-variant">
              <p>Started {new Date(inc.started_at).toLocaleString()}</p>
              <p style={{ color: inc.is_resolved ? "#3ECF8E" : "#F0616B" }}>
                {inc.is_resolved ? "Resolved" : "Ongoing"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}