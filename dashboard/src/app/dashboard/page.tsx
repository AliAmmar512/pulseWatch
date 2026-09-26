"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type Site = {
  id: string;
  url: string;
  name: string;
  check_interval_seconds: number;
  is_active: boolean;
  created_at: string;
};

export default function DashboardPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet("/sites")
      .then((data) => setSites(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen px-8 py-10 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
      <p className="text-on-surface-variant text-sm mb-8">
        Live status across your monitored sites
      </p>

      {loading && <p className="text-on-surface-variant">Loading sites...</p>}
      {error && <p className="text-danger">Error: {error}</p>}

      {!loading && !error && sites.length === 0 && (
        <p className="text-on-surface-variant">No sites yet — add one to get started.</p>
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
            <div className="text-xs text-on-surface-variant font-mono">
              every {site.check_interval_seconds}s
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}