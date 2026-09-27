async function getPublicStatus(slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/status-pages/${slug}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

type PublicSite = {
  name: string;
  current_status: string;
  uptime_30d: number | null;
};

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

  const allUp = data.sites.every((s: PublicSite) => s.current_status === "up");

  return (
    <main className="min-h-screen px-6 py-20 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: allUp ? "#3ECF8E" : "#F0616B" }}
        />
        <span className="text-sm font-medium" style={{ color: allUp ? "#3ECF8E" : "#F0616B" }}>
          {allUp ? "All systems operational" : "Some systems affected"}
        </span>
      </div>
      <h1 className="text-2xl font-semibold mb-8">Service Status</h1>

      <div className="bg-surface rounded-2xl overflow-hidden">
        {data.sites.map((site: PublicSite, i: number) => (
          <div
            key={site.name}
            className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: i === 0 ? "none" : "1px solid #0D0F14" }}
          >
            <span className="text-sm font-medium">{site.name}</span>
            <div className="flex items-center gap-4">
              <span className="text-xs text-on-surface-variant font-mono">
                {site.uptime_30d != null ? `${site.uptime_30d}% uptime` : "—"}
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: site.current_status === "up" ? "#3ECF8E1F" : "#F0616B1F",
                  color: site.current_status === "up" ? "#3ECF8E" : "#F0616B",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: site.current_status === "up" ? "#3ECF8E" : "#F0616B",
                  }}
                />
                {site.current_status === "up" ? "Operational" : "Down"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-on-surface-variant text-center mt-8">
        Powered by Pulsewatch
      </p>
    </main>
  );
}