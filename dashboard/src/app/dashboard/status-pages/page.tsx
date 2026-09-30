"use client";

import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { EmptyState, PageHeader } from "@/components/PageHeader";

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
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([apiGet("/status-pages"), apiGet("/sites")])
      .then(([pagesData, sitesData]) => {
        setPages(pagesData);
        setSites(sitesData);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this status page?")) return;
    await apiDelete(`/status-pages/${id}`);
    load();
  };

  const copyLink = async (pageSlug: string) => {
    const url = `${window.location.origin}/status/${pageSlug}`;
    await navigator.clipboard.writeText(url);
    setCopied(pageSlug);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <main className="px-4 md:px-10 py-8 md:py-10 max-w-3xl mx-auto">
      <PageHeader
        title="Status Pages"
        description="Share a public page with clients so they can see uptime without logging in."
      />

      <form
        onSubmit={handleCreate}
        className="bg-surface rounded-2xl p-6 mb-6 flex flex-col gap-4"
      >
        <div>
          <label className="text-sm text-on-surface-variant mb-1.5 block">Page slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
            placeholder="acme-client-status"
            required
            className="w-full bg-surface-raised border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-mono"
          />
        </div>

        <div>
          <label className="text-sm text-on-surface-variant mb-2 block">Sites to include</label>
          {sites.length === 0 ? (
            <p className="text-xs text-on-surface-variant">
              Add a site on the dashboard first, then come back to publish it.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {sites.map((site) => (
                <label key={site.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSiteIds.includes(site.id)}
                    onChange={() => toggleSite(site.id)}
                    className="accent-primary"
                  />
                  {site.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting || selectedSiteIds.length === 0}
          className="bg-primary text-on-primary text-sm font-medium py-2.5 rounded-lg hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create status page"}
        </button>
      </form>

      {loading && <p className="text-on-surface-variant text-sm">Loading...</p>}

      {!loading && pages.length === 0 && (
        <EmptyState
          title="No status pages yet"
          description="Pick a slug, choose the sites a client should see, and share the public link."
        />
      )}

      {pages.length > 0 && (
        <div className="bg-surface rounded-2xl overflow-hidden">
          {pages.map((page, i) => (
            <div
              key={page.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4"
              style={{ borderTop: i === 0 ? "none" : "1px solid #0D0F14" }}
            >
              <div>
                <p className="text-sm font-medium font-mono">/{page.slug}</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  {page.is_public ? "Public" : "Private"} · created{" "}
                  {new Date(page.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => copyLink(page.slug)}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  {copied === page.slug ? "Copied" : "Copy link"}
                </button>
                <a
                  href={`/status/${page.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  View
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(page.id)}
                  className="text-danger hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
