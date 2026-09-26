"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type Domain = {
  id: string;
  domain_name: string;
  created_at: string;
};

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDomains = useCallback(() => {
    setLoading(true);
    apiGet("/domains")
      .then(setDomains)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;
    setSubmitting(true);
    try {
      await apiPost("/domains", { domain_name: newDomain });
      setNewDomain("");
      loadDomains();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-8 py-10 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Domains & SSL</h1>
      <p className="text-on-surface-variant text-sm mb-8">
        Track SSL certificate and DNS health across your domains
      </p>

      <form onSubmit={handleAdd} className="flex gap-2 mb-8">
        <input
          type="text"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="example.com"
          className="flex-1 bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-on-primary text-sm font-medium px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-50"
        >
          Add domain
        </button>
      </form>

      {loading && <p className="text-on-surface-variant">Loading domains...</p>}

      {!loading && domains.length === 0 && (
        <p className="text-on-surface-variant">No domains tracked yet.</p>
      )}

      <div className="bg-surface rounded-2xl overflow-hidden">
        {domains.map((domain, i) => (
          <div
            key={domain.id}
            className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: i === 0 ? "none" : "1px solid #0D0F14" }}
          >
            <span className="text-sm font-medium">{domain.domain_name}</span>
            <span className="text-xs text-on-surface-variant">
              Added {new Date(domain.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}