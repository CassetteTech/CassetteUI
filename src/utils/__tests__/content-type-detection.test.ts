import { detectContentType } from '../content-type-detection';

describe('Content Type Detection', () => {
  describe('Spotify URLs', () => {
    test('detects track correctly', () => {
      const result = detectContentType('https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh');
      expect(result.type).toBe('track');
      expect(result.platform).toBe('spotify');
      expect(result.id).toBe('4iV5W9uYEdYUVa79Axb7Rh');
    });

    test('detects album correctly', () => {
      const result = detectContentType('https://open.spotify.com/album/1A2GTWGtFfWp7KSQTwWOyo');
      expect(result.type).toBe('album');
      expect(result.platform).toBe('spotify');
      expect(result.id).toBe('1A2GTWGtFfWp7KSQTwWOyo');
    });

    test('detects artist correctly', () => {
      const result = detectContentType('https://open.spotify.com/artist/4tZwfgrHOc3mvqYlEYSvVi');
      expect(result.type).toBe('artist');
      expect(result.platform).toBe('spotify');
      expect(result.id).toBe('4tZwfgrHOc3mvqYlEYSvVi');
    });

    test('detects playlist correctly', () => {
      const result = detectContentType('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
      expect(result.type).toBe('playlist');
      expect(result.platform).toBe('spotify');
      expect(result.id).toBe('37i9dQZF1DXcBWIGoYBM5M');
    });
  });

  describe('Apple Music URLs', () => {
    test('detects track from song URL correctly', () => {
      const result = detectContentType('https://music.apple.com/us/song/as-it-was/1615585803');
      expect(result.type).toBe('track');
      expect(result.platform).toBe('apple');
      expect(result.id).toBe('1615585803');
    });

    test('detects track from album URL with ?i= correctly', () => {
      const result = detectContentType('https://music.apple.com/us/album/harrys-house/1615584999?i=1615585803');
      expect(result.type).toBe('track');
      expect(result.platform).toBe('apple');
      expect(result.id).toBe('1615585803');
    });

    test('detects album correctly (without ?i=)', () => {
      const result = detectContentType('https://music.apple.com/us/album/harrys-house/1615584999');
      expect(result.type).toBe('album');
      expect(result.platform).toBe('apple');
      expect(result.id).toBe('1615584999');
    });

    test('detects artist correctly', () => {
      const result = detectContentType('https://music.apple.com/us/artist/harry-styles/1252689966');
      expect(result.type).toBe('artist');
      expect(result.platform).toBe('apple');
      expect(result.id).toBe('1252689966');
    });

    test('detects playlist correctly', () => {
      const result = detectContentType('https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb');
      expect(result.type).toBe('playlist');
      expect(result.platform).toBe('apple');
      expect(result.id).toBe('pl.f4d106fed2bd41149aaacabb233eb5eb');
    });
  });

  describe('Deezer URLs', () => {
    test('detects track correctly', () => {
      const result = detectContentType('https://www.deezer.com/track/1677006422');
      expect(result.type).toBe('track');
      expect(result.platform).toBe('deezer');
      expect(result.id).toBe('1677006422');
    });

    test('detects album correctly', () => {
      const result = detectContentType('https://www.deezer.com/album/287842312');
      expect(result.type).toBe('album');
      expect(result.platform).toBe('deezer');
      expect(result.id).toBe('287842312');
    });

    test('detects artist correctly', () => {
      const result = detectContentType('https://www.deezer.com/artist/4050205');
      expect(result.type).toBe('artist');
      expect(result.platform).toBe('deezer');
      expect(result.id).toBe('4050205');
    });

    test('detects playlist correctly', () => {
      const result = detectContentType('https://www.deezer.com/playlist/1362917922');
      expect(result.type).toBe('playlist');
      expect(result.platform).toBe('deezer');
      expect(result.id).toBe('1362917922');
    });
  });

  describe('Edge cases', () => {
    test('handles URLs with query parameters', () => {
      const result = detectContentType('https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh?si=abc123');
      expect(result.type).toBe('track');
      expect(result.platform).toBe('spotify');
      expect(result.id).toBe('4iV5W9uYEdYUVa79Axb7Rh');
    });

    test('is case insensitive', () => {
      const result = detectContentType('HTTPS://OPEN.SPOTIFY.COM/TRACK/4iV5W9uYEdYUVa79Axb7Rh');
      expect(result.type).toBe('track');
      expect(result.platform).toBe('spotify');
      expect(result.id).toBe('4iV5W9uYEdYUVa79Axb7Rh');
    });

    test('defaults to track for unknown URLs', () => {
      const result = detectContentType('https://example.com/some/path');
      expect(result.type).toBe('track');
      expect(result.platform).toBe('unknown');
      expect(result.id).toBe('');
    });
  });
});