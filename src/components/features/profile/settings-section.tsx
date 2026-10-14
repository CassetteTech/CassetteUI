'use client';

import { useId, type ReactNode } from 'react';
import { Label } from '@/components/ui/label';

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <div className="border-b border-border pb-3">
        <h2 id={headingId} className="text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </section>
  );
}

export function SettingsField({
  label,
  htmlFor,
  labelId,
  description,
  children,
}: {
  label: string;
  htmlFor?: string;
  labelId?: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 py-5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-8">
      <div className="min-w-0 sm:pt-2">
        {htmlFor ? (
          <Label htmlFor={htmlFor} id={labelId}>{label}</Label>
        ) : (
          <p id={labelId} className="text-sm font-medium leading-none">{label}</p>
        )}
        {description && <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
