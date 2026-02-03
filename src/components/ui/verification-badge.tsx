'use client';

import Image from 'next/image';
import { AccountType } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface VerificationBadgeProps {
  accountType?: AccountType | number | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const sizeMap = {
  sm: { width: 16, height: 16, className: 'w-4 h-4' },
  md: { width: 20, height: 20, className: 'w-5 h-5' },
  lg: { width: 28, height: 28, className: 'w-7 h-7' },
};

// Normalize account type from various formats (int, string) to our enum
function normalizeAccountType(value: AccountType | number | string | undefined): AccountType | null {
  if (value === undefined || value === null) return null;

  // Handle integer values from API
  if (typeof value === 'number') {
    switch (value) {
      case 0: return AccountType.REGULAR;
      case 1: return AccountType.VERIFIED;
      case 2: return AccountType.CASSETTE_TEAM;
      default: return null;
    }
  }

  // Handle string values (enum or raw string)
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'regular' || value === AccountType.REGULAR) return AccountType.REGULAR;
    if (lower === 'verified' || value === AccountType.VERIFIED) return AccountType.VERIFIED;
    if (lower === 'cassetteteam' || lower === 'cassette_team' || value === AccountType.CASSETTE_TEAM) return AccountType.CASSETTE_TEAM;
  }

  return null;
}

// Checkmark SVG for verified users - uses currentColor to adapt to theme
function VerifiedCheckmark({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const { width, height } = sizeMap[size];
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 text-foreground"
    >
      <path
        d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"
        fill="currentColor"
      />
    </svg>
  );
}

export function VerificationBadge({
  accountType: rawAccountType,
  size = 'md',
  className,
  showTooltip = true,
}: VerificationBadgeProps) {
  // Normalize the account type to handle int/string from API
  const accountType = normalizeAccountType(rawAccountType);

  // Don't render anything for regular accounts or undefined
  if (!accountType || accountType === AccountType.REGULAR) {
    return null;
  }

  const { width, height, className: sizeClassName } = sizeMap[size];

  const badgeConfig = {
    [AccountType.VERIFIED]: {
      component: <VerifiedCheckmark size={size} />,
      alt: 'Verified',
      tooltip: 'Verified Account',
    },
    [AccountType.CASSETTE_TEAM]: {
      component: (
        <Image
          src="/images/cassette_logo.png"
          alt="Cassette Team"
          width={width}
          height={height}
          className={cn(sizeClassName, 'object-contain')}
        />
      ),
      alt: 'Cassette Team',
      tooltip: 'Cassette Team Member',
    },
  };

  const config = badgeConfig[accountType];
  if (!config) return null;

  const badge = (
    <span className={cn('inline-flex items-center flex-shrink-0', className)}>
      {config.component}
    </span>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {config.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
