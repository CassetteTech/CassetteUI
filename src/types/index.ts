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
  conversionJobId?: string;
  correlationId?: string;
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
  /** Coarse live progress stage while status is "processing" (ConvertStage on Bridge). */
  stage?: string;
  postId?: string;
  jobId?: string;
  retryAfterMs?: number;
  errorCode?: string;
  message?: string;
  correlationId?: string;
}

export type PaidPromotionPromoterKind =
  | 'artist'
  | 'manager'
  | 'label'
  | 'agency'
  | 'other';

export type PaidPromotionAttestedRelationship =
  | 'self_artist'
  | 'manager'
  | 'label'
  | 'agency'
  | 'other';

export type PaidPromotionCampaignStatus =
  | 'draft'
  | 'pending_payment'
  | 'in_review'
  | 'scheduled'
  | 'fulfilling'
  | 'delivered'
  | 'completed'
  | 'expired'
  | 'canceled'
  | 'rejected'
  | 'refunded_closed'
  | 'on_hold';

export type PaidPromotionPaymentStatus =
  | 'created'
  | 'pending'
  | 'processing'
  | 'paid'
  | 'expired'
  | 'failed'
  | 'refund_pending'
  | 'partially_refunded'
  | 'refunded'
  | 'disputed'
  | 'charged_back';

export interface PaidPromotionRateCard {
  id: string;
  packageKey: string;
  version: number;
  displayName: string;
  description: string;
  amountMinor: number;
  currency: string;
}

export interface PaidPromotionAttestation {
  version: string;
  text: string;
}

export interface PaidPromotionRateCardsResponse {
  rateCards: PaidPromotionRateCard[];
  attestation: PaidPromotionAttestation;
}

export interface CreatePaidPromotionCampaignRequest {
  trackId: string;
  submittedUrl: string;
  rateCardId: string;
  brief: string;
  requestedWindowStart?: string;
  requestedWindowEnd?: string;
  promoterKind: PaidPromotionPromoterKind;
  orgName?: string;
  website?: string;
  attestationAccepted: boolean;
  attestedRelationship: PaidPromotionAttestedRelationship;
}

export interface PaidPromotionCampaign {
  id: string;
  trackId: string;
  sourcePlatform: 'spotify' | 'applemusic' | 'deezer';
  rateCardId: string | null;
  amountMinor: number;
  currency: string;
  status: PaidPromotionCampaignStatus;
  paymentStatus: PaidPromotionPaymentStatus | null;
  requestedWindowStart: string | null;
  requestedWindowEnd: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface PaidPromotionCheckoutSessionResponse {
  campaignId: string;
  paymentId: string;
  checkoutUrl: string;
  paymentStatus: PaidPromotionPaymentStatus;
}

export type PaidPromotionPricingMode = 'rate_card' | 'manual_quote';

export type PaidPromotionDeliverableChannel =
  | 'instagram'
  | 'tiktok'
  | 'x'
  | 'reddit'
  | 'other';

export type PaidPromotionDeliverableStatus =
  | 'planned'
  | 'scheduled'
  | 'published'
  | 'verified'
  | 'failed'
  | 'removed';

export type PaidPromotionExceptionKind =
  | 'webhook_error'
  | 'reconciliation_mismatch'
  | 'refund_failed'
  | 'dispute_opened'
  | 'stuck_pending'
  | 'orphan_session';

export type PaidPromotionExceptionStatus = 'open' | 'resolved';

export interface InternalPaidPromotionCampaignSummary {
  id: string;
  trackId: string;
  trackTitle: string;
  sourcePlatform: 'spotify' | 'applemusic' | 'deezer';
  pricingMode: PaidPromotionPricingMode;
  amountMinor: number | null;
  currency: string | null;
  status: PaidPromotionCampaignStatus;
  paymentStatus: PaidPromotionPaymentStatus | null;
  openExceptionCount: number;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface InternalPaidPromotionTrack {
  id: string;
  title: string;
  coverArtUrl: string | null;
  artists: string[];
}

export interface InternalPaidPromotionPayment {
  id: string;
  amountMinor: number;
  currency: string;
  amountRefundedMinor: number;
  status: PaidPromotionPaymentStatus;
  statusChangedAtUtc: string;
  paidAtUtc: string | null;
  updatedAtUtc: string;
}

export interface InternalPaidPromotionDeliverable {
  id: string;
  campaignId: string;
  channel: PaidPromotionDeliverableChannel;
  plannedAtUtc: string | null;
  publishedAtUtc: string | null;
  evidenceUrl: string | null;
  status: PaidPromotionDeliverableStatus;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface InternalPaidPromotionException {
  id: string;
  kind: PaidPromotionExceptionKind;
  paymentId: string | null;
  campaignId: string | null;
  status: PaidPromotionExceptionStatus;
  createdAtUtc: string;
  resolvedAtUtc: string | null;
}

export interface InternalPaidPromotionPricingSnapshot {
  id: string;
  sourceRateCardId: string;
  amountMinor: number;
  currency: string;
  createdAtUtc: string;
}

export interface InternalPaidPromotionCampaignDetail {
  id: string;
  track: InternalPaidPromotionTrack;
  sourcePlatform: 'spotify' | 'applemusic' | 'deezer';
  brief: string;
  pricingMode: PaidPromotionPricingMode;
  rateCardId: string | null;
  amountMinor: number | null;
  currency: string | null;
  status: PaidPromotionCampaignStatus;
  statusChangedAtUtc: string;
  requestedWindowStart: string | null;
  requestedWindowEnd: string | null;
  attestedAtUtc: string | null;
  attestationVersion: string | null;
  attestedRelationship: PaidPromotionAttestedRelationship | null;
  payment: InternalPaidPromotionPayment | null;
  pricingSnapshots: InternalPaidPromotionPricingSnapshot[];
  deliverables: InternalPaidPromotionDeliverable[];
  exceptions: InternalPaidPromotionException[];
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface InternalPaidPromotionActionResponse {
  campaignId: string;
  status: PaidPromotionCampaignStatus;
  paymentStatus: PaidPromotionPaymentStatus | null;
  amountMinor: number | null;
  currency: string | null;
  updatedAtUtc: string;
}

export interface InternalPaidPromotionRefundResponse {
  campaignId: string;
  paymentId: string;
  paymentStatus: PaidPromotionPaymentStatus;
  amountRefundedMinor: number;
  updatedAtUtc: string;
}

export interface InternalPaidPromotionDeliverableInput {
  channel: PaidPromotionDeliverableChannel;
  plannedAtUtc?: string;
  publishedAtUtc?: string;
  evidenceUrl?: string;
  status: PaidPromotionDeliverableStatus;
  notes?: string;
}

// API Response type for playlist creation (snake_case to match backend JSON)
export interface CreatePlaylistResponse {
  success: boolean;
  playlist_id?: string;
  playlist_url?: string;
  tracks_added: number;
  tracks_failed: number;
  total_tracks: number;
  correlationId?: string;
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

// API Response type for fetchPostViewerState — viewer-specific state only,
// used to reconcile a server-rendered post without refetching the full payload.
export interface PostViewerStateResponse {
  success: boolean;
  postId: string;
  likeCount: number;
  likedByCurrentUser: boolean;
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
  trafficSource?: string;
  trafficMedium?: string;
  trafficCampaign?: string;
  trafficContent?: string;
  redditSubreddit?: string;
  redditPostId?: string;
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
  pageUrl?: string | null;
  sourceLink?: string | null;
  correlationId?: string | null;
  conversionJobId?: string | null;
  sourceLinkHash?: string | null;
  sourceDomain?: string | null;
  routeContext?: string | null;
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

export interface InternalSentinelFinding {
  fingerprint: string;
  invariantId: string;
  severity: string;
  entityType: string;
  entityId: string;
  summary: string;
  evidence: Record<string, string>;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
  lastObservedAtUtc: string;
  lastRunId: string;
  occurrenceCount: number;
  status: string;
  recurrenceCount: number;
  resolvedAtUtc?: string | null;
  resolvedByRunId?: string | null;
  lastReactivatedAtUtc?: string | null;
  lastReactivatedRunId?: string | null;
}

export interface InternalSentinelRescanResponse {
  invariantId?: string | null;
  requestedBy: string;
  messageId: string;
  requestedAtUtc: string;
}

/* Result of a synchronous conversion-issue revalidation sweep: unlike the
   fire-and-forget Sentinel rescan, the Bridge endpoint runs inline and returns
   the counts directly, so the caller can surface them immediately. Mirrors
   CassetteBridge's ConversionIssueRevalidationSummary. */
export interface ConversionIssueRevalidationSummary {
  checked: number;
  resolved: number;
  resolvedByType: Record<string, number>;
  resolvedByResolution: Record<string, number>;
  stillHolding: number;
  stillHoldingByType: Record<string, number>;
  skippedUnknown: number;
  skippedUnknownByType: Record<string, number>;
}

/* Mirrors CassetteBridge's StubDuplicateAdjudicationSummary. Dry runs execute
   the full merge inside a transaction and roll back, so every count below is
   real even when dryRun is true. */
export interface StubDuplicateAdjudicationPairOutcome {
  entityType: string;
  survivorId: string;
  loserId: string;
  survivorReason: string;
  action: string; // merged | skipped
  skipReason?: string | null;
  repointedByTable: Record<string, number>;
  deletedByTable: Record<string, number>;
}

export interface StubDuplicateAdjudicationSummary {
  dryRun: boolean;
  pairsConsidered: number;
  merged: number;
  skipped: number;
  outcomes: StubDuplicateAdjudicationPairOutcome[];
}

export interface InternalSentinelInvariantNote {
  invariantId: string;
  rootCauseSummary?: string | null;
  fixedInReference?: string | null;
  regressionTestReference?: string | null;
  residueNote?: string | null;
  updatedBy: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface InternalSentinelInvariantNotesResponse {
  items: InternalSentinelInvariantNote[];
}

export interface InternalSentinelInvariantNoteInput {
  rootCauseSummary?: string | null;
  fixedInReference?: string | null;
  regressionTestReference?: string | null;
  residueNote?: string | null;
}

export interface InternalSentinelFindingsResponse {
  items: InternalSentinelFinding[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  statusCounts: Record<string, number>;
}

export interface InternalSentinelInvariantResult {
  invariantId: string;
  invariantName: string;
  invariantDescription: string;
  scope: string;
  status: string;
  findingCount: number;
  maxSeverity?: string | null;
  evaluatedAtUtc: string;
}

export interface InternalSentinelInvariantRegistryItem {
  invariantId: string;
  invariantName: string;
  invariantDescription: string;
  scope: string;
  latestStatus: string;
  latestFindingCount: number;
  latestMaxSeverity?: string | null;
  latestEvaluatedAtUtc: string;
}

export interface InternalSentinelInvariantRegistryResponse {
  items: InternalSentinelInvariantRegistryItem[];
}

export interface InternalSentinelAuditRun {
  runId: string;
  environmentName: string;
  invariantCount: number;
  findingCount: number;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  runScope: string;
  runMetadata: Record<string, string>;
  startedAtUtc: string;
  completedAtUtc: string;
  invariantResults: InternalSentinelInvariantResult[];
}

export interface InternalSentinelAuditRunsResponse {
  items: InternalSentinelAuditRun[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
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
  | 'content'
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
  signupContent?: string | null;
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
  destinationPath?: string | null;
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
  destinationPath?: string;
  isActive?: boolean;
}

export interface UpdateInternalSignupLinkTemplateRequest {
  name?: string;
  description?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  destinationPath?: string;
  isActive?: boolean;
}

// ─── Explore snapshot inspection (internal debugging) ───────────────────
export interface InternalExploreSnapshotSummary {
  snapshotId: string;
  algorithmVersion: string;
  status: string;
  seed: string;
  generatedAtUtc: string;
  createdAtUtc: string;
  completedAtUtc?: string | null;
  candidateCount: number;
  itemCount: number;
  storedItemCount: number;
  failureReason?: string | null;
  isLatestSuccessful: boolean;
  validationFatalErrors: string[];
  validationWarnings: string[];
  // Raw metrics object from ValidationJson (e.g. content_type_distribution); shape is intentionally open.
  validationMetrics?: Record<string, unknown> | null;
}

export interface InternalExploreSnapshotsResponse {
  days: number;
  items: InternalExploreSnapshotSummary[];
}

export interface InternalExploreSnapshotItem {
  rank: number;
  postId: string;
  userId?: string | null;
  elementType: string;
  musicElementId: string;
  createdAtUtc: string;
  rawScore: number;
  finalScore: number;
  rankReason: string;
  title?: string | null;
  subtitle?: string | null;
  creatorUsername?: string | null;
  creatorAccountType?: string | null;
  isAvailable: boolean;
  availability: string;
  currentPrivacy?: string | null;
  scoreComponents: Record<string, number>;
  penalties: Record<string, number>;
  boosts: Record<string, number>;
  constraintNotes?: Record<string, unknown> | null;
  candidateSources?: Record<string, unknown> | null;
  playlistTitleNormalized?: string | null;
  playlistFamilyKey?: string | null;
  playlistFamilyConfidence?: number | null;
  playlistFamilyReason?: string | null;
  isGenericPlaylistFamily?: boolean | null;
}

export interface InternalExploreSnapshotItemsResponse {
  snapshotId: string;
  algorithmVersion: string;
  status: string;
  generatedAtUtc: string;
  isLatestSuccessful: boolean;
  totalItemCount: number;
  returnedItemCount: number;
  limit: number;
  items: InternalExploreSnapshotItem[];
}
