// Account type enum for verified/team badges
export enum AccountType {
  REGULAR = 'Regular',
  VERIFIED = 'Verified',
  CASSETTE_TEAM = 'CassetteTeam',
}

// User & Profile Types
export interface UserBio {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  isOwnProfile: boolean;
  accountType?: AccountType | number; // API returns integer, frontend uses enum
  connectedServices: ConnectedService[];
  platformPreferences?: PlatformPreferenceInfo[];
}

export interface ConnectedService {
  serviceType: string;
  connectedAt: string;
  profileUrl?: string;
}

export interface PlatformPreference {
  platform: 'Spotify' | 'AppleMusic' | 'Deezer';
  isAuthenticated: boolean;
  addedAt: string;
}

export interface PlatformPreferenceInfo {
  platform: string;
  addedAt: string;
}

export type PostPrivacy = 'public' | 'private' | 'subscriber';

export interface ActivityPost {
  postId: string;
  elementType: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  privacy?: PostPrivacy;
  conversionSuccessCount?: number;
  username: string;
  userId: string;
  createdAt: string;
}

export interface PaginatedActivityResponse {
  items: ActivityPost[];
  page: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Music Types
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  duration?: number;
  previewUrl?: string;
  isExplicit?: boolean;
  externalUrls: {
    spotify?: string;
    appleMusic?: string;
    deezer?: string;
  };
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  releaseDate: string;
  trackCount: number;
  tracks?: Track[];
  externalUrls: {
    spotify?: string;
    appleMusic?: string;
    deezer?: string;
  };
}

export interface Artist {
  id: string;
  name: string;
  artwork: string;
  bio?: string;
  genres: string[];
  externalUrls: {
    spotify?: string;
    appleMusic?: string;
    deezer?: string;
  };
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  artwork: string;
  trackCount: number;
  owner: string;
  tracks?: Track[];
  externalUrls: {
    spotify?: string;
    appleMusic?: string;
    deezer?: string;
  };
}

// Social Types - Updated to match profile service requirements
export interface SocialPost {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  elementType: ElementType;
  title: string;
  artist: string;
  artwork: string;
  description?: string;
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  externalUrls: {
    spotify?: string;
    appleMusic?: string;
    deezer?: string;
  };
}

export enum ElementType {
  TRACK = 'track',
  ALBUM = 'album',
  ARTIST = 'artist',
  PLAYLIST = 'playlist',
}

// API Types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// Music Search Types
export interface MusicSearchResult {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
}

export interface MusicLinkConversion {
  originalUrl: string;
  convertedUrls: {
    spotify?: string;
    appleMusic?: string;
    deezer?: string;
  };
  metadata: {
    type: ElementType;
    title: string;
    artist: string;
    artwork: string;
    album?: string;
    duration?: string;
  };
  // Additional fields that might be present
  previewUrl?: string;
  description?: string;
  username?: string;
  postId?: string;
  conversionSuccessCount?: number;
  tracks?: MediaListTrack[];
}

export interface MediaListTrack {
  trackNumber?: number;
  title: string;
  duration?: string;
  artists?: string[];
  previewUrl?: string;
  isrc?: string;
  // Platform-specific track IDs for fetching preview URLs directly
  spotifyTrackId?: string;
  appleMusicTrackId?: string;
  deezerTrackId?: string;
}

// API Response type for music link conversion
export interface ConversionApiResponse {
  success: boolean;
  errorMessage?: string;
  postId: string;
  conversionSuccessCount?: number;
  userId?: string | null;
  username?: string | null;
  elementType: string;
  musicElementId: string;
  details: {
    title: string;
    artist: string;
    album?: string;
    duration?: string;
    isrcs?: string[];
    artists?: Array<{ name: string; role: string; }>;
    coverArtUrl: string;
    genres?: string[];
    previewUrl?: string;
    releaseDate?: string | null;
    trackCount?: number;
    tracks?: unknown[];
  };
  platforms: {
    [key: string]: {
      platformName: string;
      elementType: string;
      name: string;
      url: string;
      platformSpecificId: string;
      artworkUrl?: string;
      isrc?: string | null;
      artistName: string;
      albumName?: string | null;
      previewUrl?: string;
    };
  };
  caption?: string;
  description?: string;
}

// API Response type for playlist creation (snake_case to match backend JSON)
export interface CreatePlaylistResponse {
  success: boolean;
  playlist_id?: string;
  playlist_url?: string;
  tracks_added: number;
  tracks_failed: number;
  total_tracks: number;
  error_message?: string;
  failed_tracks?: FailedTrack[];
}

export interface FailedTrack {
  position: number;
  track_name?: string;
  artist_name?: string;
  error_reason?: string;
}

// API Response type for fetchPostById
export interface PostByIdResponse {
  success: boolean;
  postId: string;
  elementType: string;
  musicElementId: string;
  createdAt?: string;
  privacy?: PostPrivacy;
  conversionSuccessCount?: number;
  details: {
    title?: string;
    name?: string;
    artist?: string;
    album?: string;
    duration?: string;
    coverArtUrl?: string;
    imageUrl?: string;
    genres?: string[];
    artists?: Array<{ name: string; role: string; }>;
    previewUrl?: string;
    releaseDate?: string | null;
    trackCount?: number;
    tracks?: unknown[];
  };
  metadata?: {
    duration?: string;
    albumName?: string;
    releaseDate?: string | null;
    genres?: string[];
  };
  platforms?: {
    [key: string]: {
      url: string;
      previewUrl?: string;
      artworkUrl?: string;
      genres?: string[];
    };
  };
  caption?: string;
  description?: string;
  username?: string;
  originalLink?: string;
}

// Form Types
export interface SignInForm {
  email: string;
  password: string;
}

export interface SignUpForm {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  acceptTerms: boolean;
}

export interface EditProfileForm {
  username: string;
  displayName: string;
  bio: string;
  profilePicture?: File;
}

export interface AddMusicForm {
  musicUrl: string;
  description?: string;
}

// Auth Types
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string;
  profilePicture: string;
  isEmailVerified: boolean;
  isOnboarded: boolean;
  accountType?: AccountType | number; // API returns integer, frontend uses enum
  createdAt: string;
  updatedAt: string;
  connectedServices?: ConnectedService[];
}

// Internal dashboard types
export interface InternalUserSummary {
  userId: string;
  username: string;
  email: string;
  accountType: AccountType | number | string;
  isOnboarded: boolean;
  joinDate: string;
  connectedServicesCount: number;
}

export interface InternalUsersResponse {
  items: InternalUserSummary[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  actorCanAssignVerified: boolean;
}

export interface InternalConnectedService {
  serviceType: string;
  connectedAt: string;
  isValid: boolean;
}

export interface InternalUserDetail extends InternalUserSummary {
  authUserId: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  canAssignVerified: boolean;
  connectedServices: InternalConnectedService[];
}

export interface InternalUserDetailResponse {
  user: InternalUserDetail;
  actorCanAssignVerified: boolean;
}

export interface InternalAccountTypeAuditEntry {
  id: number;
  targetUserId: string;
  actorUserId: string;
  actorUsername?: string | null;
  actorEmail?: string | null;
  beforeAccountType: AccountType | number | string;
  afterAccountType: AccountType | number | string;
  reason: string;
  createdAt: string;
}

export interface InternalIssueSummary {
  id: string;
  userId?: string | null;
  username?: string | null;
  userEmail?: string | null;
  reportType: string;
  sourceContext: string;
  pageUrl: string;
  sourceLink?: string | null;
  createdAt: string;
}

export interface InternalIssuesResponse {
  items: InternalIssueSummary[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface InternalIssueDetail extends InternalIssueSummary {
  payload: string;
}

export interface UpdateInternalAccountTypeRequest {
  accountType: 'Regular' | 'Verified' | 'CassetteTeam';
  canAssignVerified?: boolean;
  reason: string;
}
