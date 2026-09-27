"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

type Domain = {
  id: string;
  domain_name: string;
  created_at: string;
  ssl_expiry_date: string | null;
  ssl_issuer: string | null;
  last_checked_at: string | null;
};

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

  return (
    <main className="px-10 py-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Domains & SSL</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Track SSL certificate and DNS health across your domains
        </p>
      </div>

      <form onSubmit={handleAdd} className="bg-surface rounded-2xl p-5 mb-6 flex gap-2">
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
          className="bg-primary text-on-primary text-sm font-medium px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add domain"}
        </button>
      </form>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}
      {loading && <p className="text-on-surface-variant">Loading domains...</p>}

      {!loading && domains.length === 0 && (
        <div className="bg-surface rounded-2xl p-10 text-center">
          <p className="text-on-surface-variant">No domains tracked yet.</p>
        </div>
      )}

      {domains.length > 0 && (
      <div className="bg-surface rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_160px_160px_80px] px-6 py-3 text-xs uppercase tracking-wider text-on-surface-variant font-mono border-b border-black/20">
            <div>Domain</div>
            <div>SSL Expiry</div>
            <div>Issuer</div>
            <div></div>
          </div>
          {domains.map((domain, i) => {
            const daysLeft = domain.ssl_expiry_date
              ? Math.ceil((new Date(domain.ssl_expiry_date).getTime() - Date.now()) / 86400000)
              : null;
            const sslColor =
              daysLeft === null ? "text-on-surface-variant" :
              daysLeft <= 7 ? "text-danger" :
              daysLeft <= 30 ? "text-yellow-400" : "text-success";
            return (
              <div
                key={domain.id}
                className="grid grid-cols-[1fr_160px_160px_80px] items-center px-6 py-4"
                style={{ borderTop: i === 0 ? "none" : "1px solid #0D0F14" }}
              >
                <span className="text-sm font-medium">{domain.domain_name}</span>
                <span className={`text-xs font-mono ${sslColor}`}>
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
      )}
    </main>
  );
}