import type { Tone } from '@/app/(sidebar)/internal/_components/kit';

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const MONEY_NUMBER_FORMATTER = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatState(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid server date';
  return (value.length > 10 ? DATE_TIME_FORMATTER : DATE_FORMATTER).format(date);
}

export function formatMoney(amountMinor: number | null, currency: string | null): string {
  if (amountMinor === null && currency === null) return 'Not quoted';
  if (amountMinor === null || currency === null) return 'Invalid server quote';

  return `${currency.toUpperCase()} ${MONEY_NUMBER_FORMATTER.format(amountMinor / 100)}`;
}

export function statusTone(status: string): Tone {
  if (['completed', 'paid', 'verified', 'resolved'].includes(status)) return 'success';
  if (['rejected', 'failed', 'expired', 'canceled', 'charged_back', 'removed'].includes(status)) {
    return 'critical';
  }
  if (['pending_payment', 'in_review', 'refund_pending', 'disputed', 'on_hold', 'open'].includes(status)) {
    return 'warning';
  }
  if (['scheduled', 'fulfilling', 'delivered', 'processing', 'published'].includes(status)) {
    return 'info';
  }
  return 'neutral';
}

export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : 'The paid-promotion operation failed.';
}
