import { statusColor, statusLabel, type MonitorStatus } from "@/lib/status";

export function StatusBadge({
  status,
  pulse = true,
}: {
  status: MonitorStatus | string;
  pulse?: boolean;
}) {
  const key = (status in statusColor ? status : "unknown") as MonitorStatus;
  const color = statusColor[key];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}1F`, color }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${pulse && key === "up" ? "animate-pulse" : ""}`}
        style={{ backgroundColor: color }}
      />
      {statusLabel[key]}
    </span>
  );
}

export function IncidentBadge({ resolved }: { resolved: boolean }) {
  const color = resolved ? statusColor.up : statusColor.down;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}1F`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {resolved ? "Resolved" : "Ongoing"}
    </span>
  );
}
