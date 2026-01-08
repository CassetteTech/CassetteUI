// Apple Music API types
export interface AppleMusicSearchResponse {
  results: {
    songs?: {
      data: AppleMusicSong[];
    };
    artists?: {
      data: AppleMusicArtist[];
    };
    albums?: {
      data: AppleMusicAlbum[];
    };
  };
}

export interface AppleMusicChartsResponse {
  results: {
    songs?: Array<{
      data: AppleMusicSong[];
    }>;
  };
}

export interface AppleMusicSong {
  id: string;
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    artwork: {
      url: string;
    };
    url: string;
    durationInMillis?: number;
    contentRating?: 'explicit' | 'clean';
    previews?: Array<{
      url: string;
    }>;
  };
}

export interface AppleMusicArtist {
  id: string;
  attributes: {
    name: string;
    url: string;
    artwork?: {
      url: string;
    };
    genreNames?: string[];
  };
}

export interface AppleMusicAlbum {
  id: string;
  attributes: {
    name: string;
    artistName: string;
    artwork: {
      url: string;
    };
    url: string;
    releaseDate: string;
    trackCount: number;
  };
}

// Spotify API types
export interface SpotifySearchResponse {
  tracks?: {
    items: SpotifyTrack[];
  };
  artists?: {
    items: SpotifyArtist[];
  };
  albums?: {
    items: SpotifyAlbum[];
  };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  explicit: boolean;
  artists: Array<{
    name: string;
  }>;
  album: {
    name: string;
    images: Array<{
      url: string;
    }>;
  };
  external_urls: {
    spotify: string;
  };
  duration_ms: number;
  preview_url?: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: Array<{
    url: string;
  }>;
  genres: string[];
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: Array<{
    name: string;
  }>;
  images: Array<{
    url: string;
  }>;
  external_urls: {
    spotify: string;
  };
  release_date: string;
  total_tracks: number;
}