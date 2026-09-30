export const statusColor = {
  up: "#3ECF8E",
  down: "#F0616B",
  unknown: "#5A6072",
} as const;

export const statusLabel = {
  up: "Operational",
  down: "Down",
  unknown: "No data yet",
} as const;

export type MonitorStatus = keyof typeof statusColor;
