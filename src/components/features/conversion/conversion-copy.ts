/**
 * Shared copy for the inline conversion takeover (home + add-music).
 */

export const PLATFORM_LABELS: Record<string, string> = {
  spotify: 'Spotify',
  apple: 'Apple Music',
  deezer: 'Deezer',
};

// One is picked at random for each conversion's headline.
// Keep claims soft: no "every platform/service/app" — we support a few
// services today, so the copy sells the idea (universal link, sharing
// across apps), not exhaustive coverage.
export const CONVERTING_HEADLINES = [
  'Building your universal link',
  'Your music, universal',
  'One link does the trick',
  'Setting your music free',
  'Breaking it out of one app',
  'Crossing the streaming divide',
  'Making the platforms play nice',
  'For your friends on other apps',
  'Getting everyone on aux',
  'Music first, apps second',
  'Good music travels',
  'Winding the tape',
  'Pressing your mixtape',
  'Spooling it up',
  'Wrapping it in a cassette',
  'One tape, many decks',
  'Cutting your crossover single',
  'Dubbing it over',
];

export function pickConvertingHeadline(): string {
  return CONVERTING_HEADLINES[Math.floor(Math.random() * CONVERTING_HEADLINES.length)];
}
