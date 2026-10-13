'use client';

/** List tabs choose which part of one list shows, such as a type of music or the members-only
    posts. They are the second tab level: text on the list's own rule, with the ink underline under
    the active label. Page tabs, the first level, sit on a rule that runs the width of the page and
    underline the padded tab. Studio Music's type links share the look through the class names
    below. A narrow list scrolls the row sideways, so the underline stays on one line. */

import { useEffect, useId, useRef } from 'react';
import { TabUnderline } from '@/components/ui/tab-underline';
import { cn } from '@/lib/utils';

/** -mx-1 sets the first label on the list's edge; the underline measures the label, not the padded tab.
    Tabs are controls, so a drag across the row selects no text. */
export const listTabsRowClassName = 'no-scrollbar relative -mx-1 flex select-none gap-4 overflow-x-auto';

export const listTabClassName = (active: boolean) => cn(
  'inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-sm px-1 text-sm text-muted-foreground transition-colors hover:text-foreground',
  active && 'font-medium text-foreground',
);

/** One choice at a time. Native radios give the group its arrow keys and its checked state. */
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
  // A deep link can open a tab past the edge of a narrow row. Only the row scrolls; the page stays put.
  useEffect(() => {
    const list = row.current;
    const tab = list?.querySelector(':checked')?.parentElement;
    if (!list || !tab) return;
    const right = tab.offsetLeft + tab.offsetWidth;
    if (tab.offsetLeft < list.scrollLeft) list.scrollLeft = tab.offsetLeft;
    else if (right > list.scrollLeft + list.clientWidth) list.scrollLeft = right - list.clientWidth;
  }, [value]);
  return (
    <div className={cn('border-b border-border/70', className)}>
      {/* -mb-px lays the row's bottom on the rule, so the active underline covers it. */}
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
              {/* A transparent layer over the whole tab, so a press anywhere on it lands on the radio. */}
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
