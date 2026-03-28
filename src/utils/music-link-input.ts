const SUPPORTED_DOMAINS = ['spotify.com', 'apple.com/music', 'music.apple.com', 'deezer.com'] as const;

export function normalizeMusicLinkInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Support pasted share text that includes a URL in the middle of a sentence.
  const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i);
  return (urlMatch ? urlMatch[0] : trimmed).trim();
}

export function isSupportedMusicLink(raw: string): boolean {
  const normalized = normalizeMusicLinkInput(raw).toLowerCase();
  return SUPPORTED_DOMAINS.some((domain) => normalized.includes(domain));
}

export function getMusicSourceLabel(raw: string): 'Spotify' | 'Apple Music' | 'Deezer' | 'unknown' {
  const normalized = normalizeMusicLinkInput(raw).toLowerCase();
  if (normalized.includes('spotify.com')) return 'Spotify';
  if (normalized.includes('apple.com/music') || normalized.includes('music.apple.com')) return 'Apple Music';
  if (normalized.includes('deezer.com')) return 'Deezer';
  return 'unknown';
}
