async function getPublicStatus(slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/status-pages/${slug}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPublicStatus(slug);

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-on-surface-variant">Status page not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-8 py-16 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Service Status</h1>
      <p className="text-on-surface-variant text-sm mb-8">Live status of monitored services</p>

      <div className="bg-surface rounded-2xl overflow-hidden">
        {data.sites.map((site: { name: string; current_status: string; uptime_30d: number | null }, i: number) => (
          <div
            key={site.name}
            className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: i === 0 ? "none" : "1px solid #0D0F14" }}
          >
            <span className="text-sm font-medium">{site.name}</span>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-on-surface-variant font-mono">
                {site.uptime_30d != null ? `${site.uptime_30d}%` : "—"}
              </span>
              <span
                style={{
                  color: site.current_status === "up" ? "#3ECF8E" : "#F0616B",
                }}
              >
                {site.current_status === "up" ? "Operational" : "Down"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}