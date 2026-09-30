"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { EmptyState, PageHeader } from "@/components/PageHeader";

type Domain = {
  id: string;
  domain_name: string;
  created_at: string;
  ssl_expiry_date: string | null;
  ssl_issuer: string | null;
  last_checked_at: string | null;
};

function sslTone(daysLeft: number | null) {
  if (daysLeft === null) return "text-on-surface-variant";
  if (daysLeft <= 7) return "text-danger";
  if (daysLeft <= 30) return "text-warning";
  return "text-success";
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDomains = useCallback(() => {
    setLoading(true);
    apiGet("/domains")
      .then(setDomains)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiPost("/domains", { domain_name: newDomain });
      setNewDomain("");
      loadDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this domain from tracking?")) return;
    await apiDelete(`/domains/${id}`);
    loadDomains();
  };

  const expiringSoon = domains.filter((d) => {
    if (!d.ssl_expiry_date) return false;
    const days = Math.ceil(
      (new Date(d.ssl_expiry_date).getTime() - Date.now()) / 86400000
    );
    return days <= 30;
  }).length;

  return (
    <main className="px-4 md:px-10 py-8 md:py-10 max-w-4xl mx-auto">
      <PageHeader
        title="Domains & SSL"
        description="Track certificate expiry across the domains you manage for clients."
        actions={
          expiringSoon > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
              {expiringSoon} expiring within 30 days
            </span>
          ) : undefined
        }
      />

      <form
        onSubmit={handleAdd}
        className="bg-surface rounded-2xl p-5 mb-6 flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="example.com"
          className="flex-1 bg-surface-raised border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-1.5 bg-primary text-on-primary text-sm font-medium px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-50"
        >
          <Plus size={15} />
          {submitting ? "Adding..." : "Add domain"}
        </button>
      </form>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}
      {loading && <p className="text-on-surface-variant text-sm">Loading domains...</p>}

      {!loading && domains.length === 0 && (
        <EmptyState
          title="No domains tracked yet"
          description="Add a hostname to watch SSL expiry. Pulsewatch checks certificates about once an hour."
        />
      )}

      {domains.length > 0 && (
        <div className="bg-surface rounded-2xl overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[1fr_180px_1fr_80px] px-6 py-3 text-xs uppercase tracking-wider text-on-surface-variant font-mono border-b border-black/20">
              <div>Domain</div>
              <div>SSL expiry</div>
              <div>Issuer</div>
              <div></div>
            </div>
            {domains.map((domain, i) => {
              const daysLeft = domain.ssl_expiry_date
                ? Math.ceil(
                    (new Date(domain.ssl_expiry_date).getTime() - Date.now()) /
                      86400000
                  )
                : null;
              return (
                <div
                  key={domain.id}
                  className="grid grid-cols-[1fr_180px_1fr_80px] items-center px-6 py-4 hover:bg-surface-raised/60"
                  style={{ borderTop: i === 0 ? "none" : "1px solid #0D0F14" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{domain.domain_name}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      {domain.last_checked_at
                        ? `Checked ${new Date(domain.last_checked_at).toLocaleString()}`
                        : "Waiting for first check"}
                    </p>
                  </div>
                  <span className={`text-xs font-mono ${sslTone(daysLeft)}`}>
                    {domain.ssl_expiry_date
                      ? `${new Date(domain.ssl_expiry_date).toLocaleDateString()} (${daysLeft}d)`
                      : "—"}
                  </span>
                  <span className="text-xs text-on-surface-variant truncate pr-2">
                    {domain.ssl_issuer ?? "—"}
                  </span>
                  <button
                    onClick={() => handleDelete(domain.id)}
                    className="text-xs text-danger hover:underline text-right"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
