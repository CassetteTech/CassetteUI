'use client';

/** Ink pills for a filter that narrows a list. Section tabs change the page and use the
    underline (`TabUnderline`); a filter keeps the page and narrows what it lists. Pills wrap
    rather than scroll, so a narrow list never hides one. */

import { useId } from 'react';
import { cn } from '@/lib/utils';

const pillBase = 'inline-flex h-8 shrink-0 items-center rounded-full px-3.5 text-sm transition-colors';
const pillOn = 'bg-foreground font-medium text-background';
const pillOff = 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground';

/** One pill. Shared by filters that are links, such as Studio Music's types. */
export function filterPillClassName(active: boolean) {
  return cn(
    pillBase,
    'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    active ? pillOn : pillOff,
  );
}

/** One choice at a time. Native radios give the group its arrow keys and its checked state. */
export function FilterPills<T extends string>({
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
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              pillBase,
              'relative cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
              checked ? pillOn : pillOff,
            )}
          >
            {/* A transparent layer over the whole pill, so a press anywhere on it lands on the radio. */}
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onValueChange(option.value)}
              className="absolute inset-0 cursor-pointer appearance-none rounded-full opacity-0"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
