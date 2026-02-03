/**
 * Formats a date string into a user-friendly relative or absolute format
 *
 * Examples:
 * - "Just now" (< 1 minute)
 * - "5 minutes ago" (< 1 hour)
 * - "3 hours ago" (< 24 hours)
 * - "Yesterday" (1 day ago)
 * - "3 days ago" (< 7 days)
 * - "Jan 5" (same year, > 7 days)
 * - "Jan 5, 2024" (different year)
 */
export function formatRelativeTime(dateString: string | undefined | null): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();

  // Handle invalid dates
  if (isNaN(date.getTime())) return '';

  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Less than 1 minute
  if (diffSeconds < 60) {
    return 'Just now';
  }

  // Less than 1 hour
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }

  // Less than 24 hours
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  // Yesterday
  if (diffDays === 1) {
    return 'Yesterday';
  }

  // Less than 7 days
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Format as date
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const currentYear = now.getFullYear();

  // Same year - omit year
  if (year === currentYear) {
    return `${month} ${day}`;
  }

  // Different year - include year
  return `${month} ${day}, ${year}`;
}
