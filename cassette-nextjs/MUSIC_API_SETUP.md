# Music API Setup Guide

This guide explains how to set up the music API credentials for the Cassette Next.js application.

## Overview

The app uses direct API calls to Apple Music and Spotify for searching music and fetching top charts. The link conversion is handled by your backend API.

## Required Environment Variables

Copy `.env.local.example` to `.env.local` and fill in these values:

### Spotify API

1. Go to https://developer.spotify.com/dashboard
2. Create a new app or use an existing one
3. Get your Client ID and Client Secret
4. Add to `.env.local`:
```
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

### Apple Music API

1. Go to https://developer.apple.com/
2. Create a MusicKit identifier and private key
3. Get your Key ID, Team ID, and download the private key
4. Add to `.env.local`:
```
APPLE_MUSIC_KEY_ID=your-key-id
APPLE_MUSIC_TEAM_ID=your-team-id
APPLE_MUSIC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**Note**: For the private key, replace actual newlines with `\n` in the string.

## Architecture

- **Search & Charts**: Direct API calls from Next.js API routes to Apple Music/Spotify
- **Link Conversion**: Handled by your backend API
- **Security**: API keys are kept server-side in Next.js API routes

## Simplified State Management

The search functionality now uses simplified state management:
- `isSearchActive`: Controls whether search UI is shown
- `isLinkConversion`: Tracks link conversion state
- Focus/blur logic is streamlined for better UX