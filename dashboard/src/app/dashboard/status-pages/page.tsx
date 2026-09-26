"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type Site = { id: string; name: string };
type StatusPage = { id: string; slug: string; is_public: boolean; created_at: string };

export default function StatusPagesPage() {
  const [pages, setPages] = useState<StatusPage[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState("");
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([apiGet("/status-pages"), apiGet("/sites")])
      .then(([pagesData, sitesData]) => {
        setPages(pagesData);
        setSites(sitesData);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSite = (id: string) => {
    setSelectedSiteIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/status-pages", { slug, site_ids: selectedSiteIds });
      setSlug("");
      setSelectedSiteIds([]);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-8 py-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Status Pages</h1>
      <p className="text-on-surface-variant text-sm mb-8">
        Create shareable public pages for your clients
      </p>

      <form onSubmit={handleCreate} className="bg-surface rounded-2xl p-6 mb-8 flex flex-col gap-4">
        <div>
          <label className="text-sm text-on-surface-variant mb-1 block">Page slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="acme-client-status"
            required
            className="w-full bg-surface-raised border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-sm text-on-surface-variant mb-2 block">Sites to include</label>
          <div className="flex flex-col gap-2">
            {sites.map((site) => (
              <label key={site.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedSiteIds.includes(site.id)}
                  onChange={() => toggleSite(site.id)}
                />
                {site.name}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting || selectedSiteIds.length === 0}
          className="bg-primary text-on-primary text-sm font-medium py-2 rounded-lg hover:brightness-110 disabled:opacity-50"
        >
          Create status page
        </button>
      </form>

      {loading && <p className="text-on-surface-variant">Loading...</p>}

      <div className="bg-surface rounded-2xl overflow-hidden">
        {pages.map((page, i) => (
          <div
            key={page.id}
            className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: i === 0 ? "none" : "1px solid #0D0F14" }}
          >
            <span className="text-sm font-medium">{page.slug}</span>
            <a
              href={`/status/${page.slug}`}
              target="_blank"
              className="text-xs text-primary hover:underline"
            >
              View public page -&gt;
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}