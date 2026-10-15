'use client';

import { useEffect, useId, useRef } from 'react';
import { TabUnderline } from '@/components/ui/tab-underline';
import { cn } from '@/lib/utils';
import { scrollTabIntoRow } from '@/lib/utils/scroll-tab-into-row';

export const listTabsRowClassName = 'no-scrollbar relative -mx-1 flex select-none gap-4 overflow-x-auto';

export const listTabClassName = (active: boolean) => cn(
  'inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-sm px-1 text-sm text-muted-foreground transition-colors hover:text-foreground',
  active && 'font-medium text-foreground',
);

export function ListTabs<T extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
}) {
  const name = useId();
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = row.current;
    const tab = list?.querySelector(':checked')?.parentElement;
    if (list && tab) scrollTabIntoRow(list, tab);
  }, [value]);
  return (
    <div className={cn('border-b border-border', className)}>
      <div ref={row} role="radiogroup" aria-label={label} className={cn(listTabsRowClassName, '-mb-px')}>
        <TabUnderline value={value} />
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                listTabClassName(checked),
                'relative cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-ring',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onValueChange(option.value)}
                className="absolute inset-0 cursor-pointer appearance-none rounded-sm opacity-0"
              />
              <span className="tab-label" data-label={option.label} data-state={checked ? 'active' : 'inactive'}>
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
