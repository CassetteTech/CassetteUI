'use client';

import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function Line({ box, bar }: { box: string; bar: string }) {
  return (
    <div className={cn('flex items-center', box)}>
      <Skeleton className={bar} />
    </div>
  );
}

/** SettingsSection: a title and a description over a rule, then divided rows. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="border-b border-border pb-3">
        <Line box="h-6" bar={cn('h-4', title)} />
        <Line box="mt-1 h-5" bar="h-3 w-2/3 max-w-80" />
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  );
}

/** SettingsField: the label column beside the control from the sm breakpoint, above it below. */
function Field({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-3 py-5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-8">
      <div className="min-w-0 sm:pt-2">
        <Line box="h-3.5" bar={cn('h-3', label)} />
        {description}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const serviceRows = ['w-16', 'w-24', 'w-14'];

/** The Profile tab of EditProfileForm under the page header, with its line boxes. */
export function EditProfileSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Line box="h-9 sm:h-12" bar="h-7 w-40 sm:h-9 sm:w-52" />
        <Skeleton className="h-8 w-[7.75rem]" />
      </div>
      <div className="flex gap-1 border-b border-border">
        <Line box="h-10 px-3" bar="h-3.5 w-11" />
        <Line box="h-10 px-3" bar="h-3.5 w-14" />
      </div>
      <div className="mt-8 space-y-12">
        <Section title="w-28">
          <Field label="w-12" description={<Line box="mt-1.5 h-4" bar="h-2.5 w-44" />}>
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="h-8 w-[7.25rem]" />
            </div>
          </Field>
          <Field label="w-12">
            <Skeleton className="h-9 w-full" />
          </Field>
          <Field label="w-16">
            <Skeleton className="h-9 w-full" />
            <Line box="mt-1.5 h-4" bar="h-2.5 w-48" />
          </Field>
          <Field label="w-8">
            {/* Three rows of the textarea: 16px text below md, 14px from md. */}
            <Skeleton className="h-[90px] w-full md:h-[78px]" />
            <Line box="mt-1.5 h-4 justify-end" bar="h-2.5 w-10" />
          </Field>
          <Field
            label="w-10"
            description={
              <>
                <Line box="mt-1.5 h-4" bar="h-2.5 w-44" />
                <Line box="h-4 max-sm:hidden" bar="h-2.5 w-28" />
              </>
            }
          >
            <Line box="h-8" bar="h-3.5 w-20" />
          </Field>
        </Section>
        <Section title="w-32">
          {serviceRows.map((name) => (
            <div key={name} className="flex items-center gap-4 py-5">
              <Skeleton className="size-8 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <Line box="h-3.5" bar={cn('h-3', name)} />
                <Line box="mt-1.5 h-4" bar="h-2.5 w-44" />
              </div>
              <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}
