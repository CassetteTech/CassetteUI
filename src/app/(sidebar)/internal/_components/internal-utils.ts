export const PAGE_SIZE = 25;

export function normalizeAccountType(
  value: string | number | undefined | null
): 'Regular' | 'Verified' | 'CassetteTeam' | 'Unknown' {
  if (value == null) return 'Unknown';
  if (typeof value === 'number') {
    if (value === 0) return 'Regular';
    if (value === 1) return 'Verified';
    if (value === 2) return 'CassetteTeam';
    return 'Unknown';
  }

  const normalized = value.toLowerCase();
  if (normalized === 'regular') return 'Regular';
  if (normalized === 'verified') return 'Verified';
  if (normalized === 'cassetteteam' || normalized === 'cassette_team') return 'CassetteTeam';
  return 'Unknown';
}

export function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function accountTypeBadgeVariant(
  type: ReturnType<typeof normalizeAccountType>
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (type) {
    case 'CassetteTeam':
      return 'default'; // bg-primary = brand red
    case 'Verified':
      return 'default'; // color overridden via accountTypeBadgeClassName
    default:
      return 'outline';
  }
}

/** Extra classes for account-type badges (e.g. Verified → info blue). */
export function accountTypeBadgeClassName(
  type: ReturnType<typeof normalizeAccountType>
): string {
  if (type === 'Verified') return 'bg-[hsl(var(--info))] text-white';
  return '';
}
