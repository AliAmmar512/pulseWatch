import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description?: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div className="flex flex-col gap-2 min-w-0">
        {eyebrow}
        <h1 className="text-[28px] md:text-[32px] font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-on-surface-variant text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-surface rounded-2xl px-8 py-14 text-center">
      <p className="font-medium mb-1">{title}</p>
      <p className="text-sm text-on-surface-variant max-w-md mx-auto">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
