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
  likedPostsPrivacy?: 'public' | 'private';
  likedPostsVisibility?: 'public' | 'private';
  showLikedPosts?: boolean;
  accountType?: AccountType | number; // API returns integer, frontend uses enum
  totalLikesReceived?: number;
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

export type PostPrivacy = 'public' | 'private' | 'friends' | 'subscriber';

export interface ActivityPost {
  postId: string;
  redirectPostId?: string;
  isRepost?: boolean;
  originalPostId?: string | null;
  originalUsername?: string;
  originalPostOwnerUserId?: string | null;
  originalPostOwnerUsername?: string | null;
  originalPostOwnerAvatarUrl?: string | null;
  originalPostOwnerAccountType?: AccountType | number | string | null;
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
  likeCount?: number;
  likedByCurrentUser?: boolean;
  commentsEnabled?: boolean;
  accountType?: AccountType | number | string;
}

export interface PaginatedActivityResponse {
  items: ActivityPost[];
  page: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ExploreUser {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  accountType?: AccountType | number | string;
  latestExplorePostAt?: string;
}

export interface PaginatedExploreUsersResponse {
  users: ExploreUser[];
  page: number;
  pageSize: number;
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

export type ConvertStatus = 'ready' | 'processing' | 'failed';

// New backend contract for convert and convert job polling.
export interface ConvertLifecycleResponse {
  success: boolean;
  status: ConvertStatus;
  postId?: string;
  jobId?: string;
  retryAfterMs?: number;
  errorCode?: string;
  message?: string;
}

// Legacy API response type for music link conversion (kept for backward compatibility)
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
  redirectPostId?: string;
  isRepost?: boolean;
  originalPostId?: string | null;
  repostedByCurrentUser?: boolean;
  elementType: string;
  musicElementId: string;
  userId?: string | null;
  createdAt?: string;
  privacy?: PostPrivacy;
  conversionSuccessCount?: number | null;
  likeCount?: number;
  likedByCurrentUser?: boolean;
  commentsEnabled?: boolean;
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
      uri?: string;
      platformSpecificId?: string;
      elementType?: string;
      platformName?: string;
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

export interface PostInsightsLifetimeMetrics {
  views: number;
  uniqueViewers: number;
  destinationOpens: number;
  shares: number;
  openRate: number;
}

export interface PostInsightsPlatformBreakdownItem {
  platform: string;
  opens: number;
  shareOfOpens: number;
}

export interface PostInsightsTrendPoint {
  date: string;
  views: number;
  destinationOpens: number;
}

export interface PostInsightsResponse {
  postId: string;
  generatedAt: string;
  lifetime: PostInsightsLifetimeMetrics;
  platformBreakdown: PostInsightsPlatformBreakdownItem[];
  trend: PostInsightsTrendPoint[];
}

export interface PostComment {
  commentId: string;
  postId: string;
  parentCommentId?: string | null;
  userId: string;
  username: string;
  userAvatarUrl?: string | null;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  likeCount: number;
  likedByCurrentUser: boolean;
  isOwnedByCurrentUser: boolean;
  canDelete: boolean;
}

export interface PaginatedPostCommentsResponse {
  items: PostComment[];
  totalItems: number;
  page: number;
  pageSize: number;
  isOwnProfile?: boolean;
}

export interface CommentLikeResponse {
  success: boolean;
  commentId: string;
  liked: boolean;
  likeCount: number;
}

export type NotificationType =
  | 'like'
  | 'comment'
  | 'comment_reply'
  | 'comment_like'
  | 'repost'
  | 'follow'
  | 'system';

export interface NotificationActor {
  userId?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  actor: NotificationActor;
  postId?: string;
  targetUrl?: string;
  message?: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  unreadCount: number;
}

export interface NotificationUnreadCountResponse {
  unreadCount: number;
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

export interface SignupAttribution {
  source?: string;
  medium?: string;
  campaign?: string;
  firstReferrerDomain?: string;
  capturedAt?: string;
}

// Auth Types
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string;
  likedPostsPrivacy?: 'public' | 'private';
  profilePicture: string;
  isEmailVerified: boolean;
  isOnboarded: boolean;
  accountType?: AccountType | number; // API returns integer, frontend uses enum
  createdAt: string;
  updatedAt: string;
  connectedServices?: ConnectedService[];
  signupAttribution?: SignupAttribution;
}

// Internal dashboard types
export interface InternalUserSummary {
  userId: string;
  username: string;
  email: string;
  accountType: AccountType | number | string;
  isOnboarded: boolean;
  joinDate: string;
  lastOnlineAt?: string | null;
  connectedServicesCount: number;
  postCount: number;
  likesReceivedAllTime: number;
  likesReceived30d: number;
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

export type InternalSignupAttributionGroupBy =
  | 'source'
  | 'medium'
  | 'campaign'
  | 'referrerDomain';

export interface InternalSignupAttributionOverview {
  totalSignups: number;
  attributedSignups: number;
  unattributedSignups: number;
  uniqueSources: number;
  uniqueCampaigns: number;
  uniqueMedia: number;
}

export interface InternalSignupAttributionBreakdownRow {
  key: string;
  value?: string | null;
  isUnattributed: boolean;
  signups: number;
  percentOfFilteredTotal: number;
}

export interface InternalSignupAttributionBreakdownResponse {
  groupBy: InternalSignupAttributionGroupBy;
  items: InternalSignupAttributionBreakdownRow[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  totalFilteredSignups: number;
}

export interface InternalSignupAttributionUserRow {
  userId: string;
  username: string;
  email: string;
  joinDate: string;
  signupSource?: string | null;
  signupMedium?: string | null;
  signupCampaign?: string | null;
  firstReferrerDomain?: string | null;
  attributionCapturedAt?: string | null;
}

export interface InternalSignupAttributionUsersResponse {
  items: InternalSignupAttributionUserRow[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface InternalSignupLinkTemplate {
  id: string;
  name: string;
  description?: string | null;
  source: string;
  medium?: string | null;
  campaign?: string | null;
  isActive: boolean;
  createdByUserId: string;
  createdByUsername?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInternalSignupLinkTemplateRequest {
  name: string;
  description?: string;
  source: string;
  medium?: string;
  campaign?: string;
  isActive?: boolean;
}

export interface UpdateInternalSignupLinkTemplateRequest {
  name?: string;
  description?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  isActive?: boolean;
}
