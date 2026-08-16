import type { CuratorPage as FixtureCuratorPage } from '../../src/services/curator';
import type { MembershipStatusView } from '../../src/services/membership';

export interface FixtureSearchResults {
  tracks: Array<{
    id: string;
    title: string;
    artist: string;
    artwork?: string;
    externalUrls: {
      spotify?: string;
      appleMusic?: string;
      deezer?: string;
    };
    isExplicit?: boolean;
  }>;
  albums: Array<{
    id: string;
    title: string;
    artist: string;
    artwork?: string;
    externalUrls: {
      spotify?: string;
      appleMusic?: string;
      deezer?: string;
    };
  }>;
  artists: Array<{
    id: string;
    name: string;
    artwork?: string;
    externalUrls: {
      spotify?: string;
      appleMusic?: string;
      deezer?: string;
    };
  }>;
  playlists: Array<{
    id: string;
    title: string;
    owner: string;
    artwork?: string;
    externalUrls: {
      spotify?: string;
      appleMusic?: string;
      deezer?: string;
    };
  }>;
}

export interface FixtureUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  isOnboarded: boolean;
  bio?: string;
  likedPostsPrivacy?: 'public' | 'private';
  accountType?: string | number | null;
  avatarUrl?: string;
  platformPreferences?: string[];
  musicConnections?: string[];
}

export interface FixturePost {
  postId: string;
  paidPromotionCampaignId?: string | null;
  curatorId?: string | null;
  isMemberView?: boolean;
  musicElementId: string;
  elementType: 'Track' | 'Album' | 'Artist' | 'Playlist';
  title: string;
  artist?: string;
  description?: string;
  artworkUrl?: string;
  ownerId?: string;
  ownerUsername?: string;
  privacy?: 'public' | 'private';
  createdAt?: string;
  likeCount?: number;
  likedByCurrentUser?: boolean;
  repostedByCurrentUser?: boolean;
  commentsEnabled?: boolean;
  conversionSuccessCount?: number;
  originalUrl: string;
  convertedUrls?: {
    spotify?: string;
    appleMusic?: string;
    deezer?: string;
  };
  trackCount?: number;
  releaseDate?: string | null;
  genres?: string[];
  tracks?: Array<{
    title: string;
    trackNumber?: number;
    duration?: string;
    artists?: string[];
    previewUrl?: string;
    isrc?: string;
    spotifyTrackId?: string;
    appleMusicTrackId?: string;
  }>;
}

export type FixtureMembershipStatusView = MembershipStatusView;

export interface FixturePaidPromotionRateCard {
  id: string;
  packageKey: string;
  subjectType: 'track' | 'album' | 'artist' | 'playlist';
  version: number;
  displayName: string;
  description: string;
  // Price per week; the campaign total is weekly × weeks less any discount.
  amountMinor: number;
  currency: string;
  minWeeks: number;
  maxWeeks: number;
  weeklyDeliverableMinimum: number;
  discountMinWeeks: number | null;
  discountBps: number | null;
}

export interface FixturePaidPromotionCampaign {
  id: string;
  elementId: string;
  elementType: 'track' | 'album' | 'artist' | 'playlist';
  sourcePlatform: 'spotify' | 'applemusic' | 'deezer';
  rateCardId: string;
  amountMinor: number;
  currency: string;
  weeks: number;
  weeklyAmountMinor: number;
  durationDiscountBps: number | null;
  brief: string;
  status: string;
  rejectionReason?: string | null;
  holdKind?: string | null;
  paymentStatus: string | null;
  discountAmountMinor: number | null;
  taxAmountMinor: number | null;
  finalTotalMinor: number | null;
  amountRefundedMinor: number | null;
  refundableRemainderMinor: number | null;
  requestedWindowStart: string | null;
  requestedWindowEnd: string | null;
  deliverables: Array<{
    channel: string;
    publishedAtUtc: string;
    evidenceUrl: string;
    status: 'published' | 'verified';
  }>;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface FixtureInternalPaidPromotionDeliverable {
  id: string;
  campaignId: string;
  postId: string | null;
  subjectElementId: string | null;
  channel: string;
  plannedAtUtc: string | null;
  publishedAtUtc: string | null;
  evidenceUrl: string | null;
  status: string;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface FixtureInternalPaidPromotionException {
  id: string;
  kind: string;
  paymentId: string | null;
  campaignId: string | null;
  status: string;
  createdAtUtc: string;
  resolvedAtUtc: string | null;
}

export interface FixtureInternalPaidPromotionCustomer {
  userId: string;
  username: string;
  displayName: string | null;
  email: string;
  promoterKind: string | null;
  orgName: string | null;
  website: string | null;
}

export interface FixtureInternalPaidPromotionCampaign {
  id: string;
  customer: FixtureInternalPaidPromotionCustomer | null;
  subject: {
    id: string;
    elementType: 'track' | 'album' | 'artist' | 'playlist';
    title: string;
    coverArtUrl: string | null;
    subtitleNames: string[];
  };
  sourcePlatform: string;
  brief: string;
  pricingMode: string;
  rateCardId: string | null;
  amountMinor: number | null;
  currency: string | null;
  weeks: number | null;
  weeklyAmountMinor: number | null;
  durationDiscountBps: number | null;
  weeklyDeliverableMinimum: number | null;
  weeksDelivered: number | null;
  policyRefundableMinor: number | null;
  status: string;
  statusChangedAtUtc: string;
  requestedWindowStart: string | null;
  requestedWindowEnd: string | null;
  attestedAtUtc: string | null;
  attestationVersion: string | null;
  attestedRelationship: string | null;
  payment: {
    id: string;
    amountMinor: number;
    currency: string;
    discountAmountMinor: number | null;
    taxAmountMinor: number | null;
    finalTotalMinor: number | null;
    amountRefundedMinor: number;
    refundableRemainderMinor: number | null;
    status: string;
    statusChangedAtUtc: string;
    paidAtUtc: string | null;
    updatedAtUtc: string;
  } | null;
  pricingSnapshots: Array<{
    id: string;
    sourceRateCardId: string;
    amountMinor: number;
    currency: string;
    createdAtUtc: string;
  }>;
  deliverables: FixtureInternalPaidPromotionDeliverable[];
  exceptions: FixtureInternalPaidPromotionException[];
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface FixturePaidPromotionSubject {
  elementId: string;
  elementType: 'track' | 'album' | 'artist' | 'playlist';
  title: string;
  coverArtUrl: string | null;
  repeatSourceUrl: string | null;
  subtitleNames: string[];
  campaignCount: number;
  campaignStatusCounts: Record<string, number>;
  firstCampaignAtUtc: string;
  latestCampaignAtUtc: string;
}

export const FIXTURE_TIMESTAMP = '2026-04-03T15:00:00.000Z';

export const fixtureUsers = {
  newcomer: {
    id: 'user-newcomer',
    email: 'newcomer@cassette.test',
    username: '',
    displayName: 'Fresh Finds',
    isOnboarded: false,
    likedPostsPrivacy: 'public',
  },
  member: {
    id: 'user-member',
    email: 'mia@cassette.test',
    username: 'miagroove',
    displayName: 'Mia Groove',
    isOnboarded: true,
    bio: 'Sharing the songs I keep on repeat.',
    likedPostsPrivacy: 'public',
    platformPreferences: ['Spotify'],
    musicConnections: ['Spotify'],
  },
  viewer: {
    id: 'user-viewer',
    email: 'sam@cassette.test',
    username: 'samloops',
    displayName: 'Sam Loops',
    isOnboarded: true,
    bio: 'Always chasing new tracks.',
    likedPostsPrivacy: 'public',
  },
  creator: {
    id: 'user-creator',
    email: 'aurora@cassette.test',
    username: 'djaurora',
    displayName: 'DJ Aurora',
    isOnboarded: true,
    bio: 'Club cuts and late-night synths.',
    likedPostsPrivacy: 'public',
  },
  playlistCurator: {
    id: 'user-curator',
    email: 'crate@cassette.test',
    username: 'cratekeeper',
    displayName: 'Crate Keeper',
    isOnboarded: true,
    bio: 'Daily playlists for every mood.',
    likedPostsPrivacy: 'public',
  },
  owner: {
    id: 'user-owner',
    email: 'owner@cassette.test',
    username: 'recordsmith',
    displayName: 'Record Smith',
    isOnboarded: true,
    bio: 'Albums worth keeping close.',
    likedPostsPrivacy: 'public',
  },
  team: {
    id: 'user-cassette-team',
    email: 'team@cassette.test',
    username: 'cassetteteam',
    displayName: 'Cassette Team',
    isOnboarded: true,
    likedPostsPrivacy: 'private',
    accountType: 'CassetteTeam',
  },
} satisfies Record<string, FixtureUser>;

export const fixturePosts = {
  publicTrack: {
    postId: 'post-public-track',
    musicElementId: 'track-public-1',
    elementType: 'Track',
    title: 'Neon Skyline',
    artist: 'Night Drive',
    description: 'One of my forever favorites.',
    ownerId: fixtureUsers.creator.id,
    ownerUsername: fixtureUsers.creator.username,
    privacy: 'public',
    createdAt: FIXTURE_TIMESTAMP,
    likeCount: 12,
    likedByCurrentUser: false,
    repostedByCurrentUser: false,
    commentsEnabled: true,
    conversionSuccessCount: 42,
    originalUrl: 'https://open.spotify.com/track/public-track-1',
    convertedUrls: {
      spotify: 'https://open.spotify.com/track/public-track-1',
      appleMusic: 'https://music.apple.com/us/song/neon-skyline/101010',
      deezer: 'https://www.deezer.com/track/101010',
    },
    genres: ['Synthwave'],
  },
  playlistSource: {
    postId: 'post-source-playlist',
    musicElementId: 'playlist-source-1',
    elementType: 'Playlist',
    title: 'Night Shift Essentials',
    artist: 'Crate Keeper',
    description: 'For the last stretch of the workday.',
    ownerId: fixtureUsers.playlistCurator.id,
    ownerUsername: fixtureUsers.playlistCurator.username,
    privacy: 'public',
    createdAt: FIXTURE_TIMESTAMP,
    likeCount: 8,
    likedByCurrentUser: false,
    repostedByCurrentUser: false,
    commentsEnabled: true,
    conversionSuccessCount: 18,
    originalUrl: 'https://www.deezer.com/playlist/playlist-source-1',
    convertedUrls: {
      deezer: 'https://www.deezer.com/playlist/playlist-source-1',
    },
    trackCount: 3,
  },
  ownerTrack: {
    postId: 'post-owner-track',
    musicElementId: 'track-owner-1',
    elementType: 'Track',
    title: 'Paper Hearts',
    artist: 'Record Smith',
    description: 'Initial description for this post.',
    ownerId: fixtureUsers.owner.id,
    ownerUsername: fixtureUsers.owner.username,
    privacy: 'public',
    createdAt: FIXTURE_TIMESTAMP,
    likeCount: 3,
    likedByCurrentUser: false,
    repostedByCurrentUser: false,
    commentsEnabled: true,
    conversionSuccessCount: 9,
    originalUrl: 'https://open.spotify.com/track/owner-track-1',
    convertedUrls: {
      spotify: 'https://open.spotify.com/track/owner-track-1',
      appleMusic: 'https://music.apple.com/us/song/paper-hearts/202020',
    },
  },
} satisfies Record<string, FixturePost>;

export const CURATOR_SUBSCRIBER_SENTINEL = 'The members-only midnight signal';

const fixtureCuratorPublicPost = {
  kind: 'post',
  post: {
    postId: 'post-curator-public',
    redirectPostId: 'post-curator-public',
    elementType: 'Playlist',
    title: 'Sunday Morning Selects',
    subtitle: null,
    description: 'A public playlist for slow starts.',
    imageUrl: null,
    username: fixtureUsers.playlistCurator.username,
    createdAt: FIXTURE_TIMESTAMP,
    privacy: 'public',
    accountType: 'Regular',
  },
} satisfies FixtureCuratorPage['posts']['items'][number];

const fixtureCuratorSubscriberPost = {
  kind: 'post',
  post: {
    postId: 'post-curator-subscriber',
    redirectPostId: 'post-curator-subscriber',
    elementType: 'Playlist',
    title: CURATOR_SUBSCRIBER_SENTINEL,
    subtitle: null,
    description: 'Private notes for active members.',
    imageUrl: '/images/cassette_logo.png?subscriber-secret-artwork',
    username: fixtureUsers.playlistCurator.username,
    createdAt: FIXTURE_TIMESTAMP,
    privacy: 'subscriber',
    accountType: 'Regular',
  },
} satisfies FixtureCuratorPage['posts']['items'][number];

export const fixtureCuratorPage: FixtureCuratorPage = {
  curator: {
    id: 'cpr_FixtureCurator01',
    username: fixtureUsers.playlistCurator.username,
    displayName: fixtureUsers.playlistCurator.displayName,
    bio: fixtureUsers.playlistCurator.bio || '',
    avatarUrl: null,
    profileLinks: [],
    accountType: 'Regular',
    headline: 'Thoughtful playlists for unhurried listening.',
    about: 'I dig through new releases and old favorites so you do not have to.',
    declaredGenres: ['Soul', 'Jazz'],
    declaredPlatforms: ['Spotify', 'Apple Music'],
    curatorSinceUtc: FIXTURE_TIMESTAMP,
  },
  membership: {
    planId: 'mpl_FixtureMembership01',
    name: 'Crate Notes',
    description: 'Get the notes behind each weekly playlist.',
    amountMinor: 500,
    serviceFeeMinor: 50,
    annualAmountMinor: 5000,
    annualServiceFeeMinor: 500,
    currency: 'USD',
    benefits: [
      {
        featureKey: 'member_posts',
        name: 'Member posts',
        description: 'Unlock subscriber-only playlists and curator notes.',
      },
    ],
  },
  viewer: {
    isOwner: false,
    isMember: false,
    hasMemberBadge: false,
  },
  posts: {
    items: [
      fixtureCuratorPublicPost,
      {
        kind: 'locked',
        postId: fixtureCuratorSubscriberPost.post.postId,
        createdAt: FIXTURE_TIMESTAMP,
      },
    ],
    totalItems: 2,
    page: 1,
    pageSize: 20,
  },
};

export const fixtureNoMembershipStatus: FixtureMembershipStatusView = {
  curatorProfileId: fixtureCuratorPage.curator.id,
  canSubscribe: true,
  membership: null,
};

export const fixtureIncompleteMembershipStatus: FixtureMembershipStatusView = {
  curatorProfileId: fixtureCuratorPage.curator.id,
  canSubscribe: true,
  membership: {
    membershipSubscriptionId: 'msb_FixtureMembership01',
    planId: fixtureCuratorPage.membership!.planId,
    billingInterval: 'month',
    status: 'incomplete',
    canManage: false,
    cancelAtPeriodEnd: false,
    paidThroughUtc: null,
  },
};

export const fixtureActiveMembershipStatus: FixtureMembershipStatusView = {
  curatorProfileId: fixtureCuratorPage.curator.id,
  canSubscribe: false,
  membership: {
    ...fixtureIncompleteMembershipStatus.membership!,
    status: 'active',
    canManage: true,
    paidThroughUtc: '2026-09-16T12:00:00Z',
  },
};

export const fixtureCancelingMembershipStatus: FixtureMembershipStatusView = {
  ...fixtureActiveMembershipStatus,
  membership: {
    ...fixtureActiveMembershipStatus.membership!,
    cancelAtPeriodEnd: true,
  },
};

export const fixtureCanceledMembershipStatus: FixtureMembershipStatusView = {
  ...fixtureActiveMembershipStatus,
  canSubscribe: true,
  membership: {
    ...fixtureActiveMembershipStatus.membership!,
    status: 'canceled',
  },
};

export const fixtureMemberCuratorPage: FixtureCuratorPage = {
  ...fixtureCuratorPage,
  viewer: {
    isOwner: false,
    isMember: true,
    hasMemberBadge: true,
  },
  posts: {
    ...fixtureCuratorPage.posts,
    items: [fixtureCuratorPublicPost, fixtureCuratorSubscriberPost],
  },
};

export const fixtureFreeCuratorPage: FixtureCuratorPage = {
  ...fixtureCuratorPage,
  membership: null,
  posts: {
    ...fixtureCuratorPage.posts,
    items: [fixtureCuratorPublicPost],
    totalItems: 1,
  },
};

export const fixtureConvertTemplates = {
  homeTrack: {
    postId: 'post-home-converted',
    musicElementId: 'track-home-1',
    elementType: 'Track',
    title: 'Midnight City',
    artist: 'M83',
    createdAt: FIXTURE_TIMESTAMP,
    likeCount: 0,
    likedByCurrentUser: false,
    repostedByCurrentUser: false,
    commentsEnabled: true,
    conversionSuccessCount: 0,
    originalUrl: 'https://open.spotify.com/track/home-track-1',
    convertedUrls: {
      spotify: 'https://open.spotify.com/track/home-track-1',
      appleMusic: 'https://music.apple.com/us/song/midnight-city/303030',
      deezer: 'https://www.deezer.com/track/303030',
    },
  },
  addMusicTrack: {
    postId: 'post-created-track',
    musicElementId: 'track-create-1',
    elementType: 'Track',
    title: 'Blue Monday',
    artist: 'New Order',
    createdAt: FIXTURE_TIMESTAMP,
    likeCount: 0,
    likedByCurrentUser: false,
    repostedByCurrentUser: false,
    commentsEnabled: true,
    conversionSuccessCount: 0,
    originalUrl: 'https://open.spotify.com/track/add-music-track-1',
    convertedUrls: {
      spotify: 'https://open.spotify.com/track/add-music-track-1',
      appleMusic: 'https://music.apple.com/us/song/blue-monday/404040',
    },
  },
  paidPromotionTrack: {
    postId: 'post-paid-promotion-track',
    musicElementId: 't_123456789ABC',
    elementType: 'Track',
    title: 'Signal Fire',
    artist: 'Mia Groove',
    createdAt: FIXTURE_TIMESTAMP,
    likeCount: 0,
    likedByCurrentUser: false,
    repostedByCurrentUser: false,
    commentsEnabled: true,
    conversionSuccessCount: 0,
    originalUrl: 'https://open.spotify.com/track/paid-promotion-track-1',
    convertedUrls: {
      spotify: 'https://open.spotify.com/track/paid-promotion-track-1',
      appleMusic: 'https://music.apple.com/us/song/signal-fire/505050',
    },
  },
  paidPromotionAlbum: {
    postId: 'post-paid-promotion-album',
    musicElementId: 'a_123456789ABC',
    elementType: 'Album',
    title: 'Signal Fire (Deluxe)',
    artist: 'Mia Groove',
    createdAt: FIXTURE_TIMESTAMP,
    likeCount: 0,
    likedByCurrentUser: false,
    repostedByCurrentUser: false,
    commentsEnabled: true,
    conversionSuccessCount: 0,
    originalUrl: 'https://open.spotify.com/album/paid-promotion-album-1',
    convertedUrls: {
      spotify: 'https://open.spotify.com/album/paid-promotion-album-1',
    },
  },
  // Artists and playlists resolve to canonical records but have no rate card
  // at launch; the intake must say so rather than fail.
  paidPromotionArtist: {
    postId: 'post-paid-promotion-artist',
    musicElementId: 'r_123456789ABC',
    elementType: 'Artist',
    title: 'Mia Groove',
    createdAt: FIXTURE_TIMESTAMP,
    likeCount: 0,
    likedByCurrentUser: false,
    repostedByCurrentUser: false,
    commentsEnabled: true,
    conversionSuccessCount: 0,
    originalUrl: 'https://open.spotify.com/artist/paid-promotion-artist-1',
    convertedUrls: {
      spotify: 'https://open.spotify.com/artist/paid-promotion-artist-1',
    },
  },
} satisfies Record<string, FixturePost>;

export const fixturePaidPromotionRateCards: FixturePaidPromotionRateCard[] = [
  {
    id: 'prc_LocalLaunch1',
    packageKey: 'launch',
    subjectType: 'track',
    version: 1,
    displayName: 'Launch package',
    description: 'We post it on our Instagram story.',
    amountMinor: 2500,
    currency: 'USD',
    minWeeks: 1,
    maxWeeks: 8,
    weeklyDeliverableMinimum: 1,
    discountMinWeeks: 4,
    discountBps: 1000,
  },
  {
    id: 'prc_LocalLaunchAlbum1',
    packageKey: 'launch',
    subjectType: 'album',
    version: 1,
    displayName: 'Launch package',
    description: 'We post it on our Instagram story.',
    amountMinor: 2500,
    currency: 'USD',
    minWeeks: 1,
    maxWeeks: 8,
    weeklyDeliverableMinimum: 1,
    discountMinWeeks: 4,
    discountBps: 1000,
  },
];

export const fixturePaidPromotionCampaign: FixturePaidPromotionCampaign = {
  id: 'pmc_FixtureCampaign01',
  elementId: fixtureConvertTemplates.paidPromotionTrack.musicElementId,
  elementType: 'track',
  sourcePlatform: 'spotify',
  rateCardId: fixturePaidPromotionRateCards[0].id,
  amountMinor: fixturePaidPromotionRateCards[0].amountMinor,
  currency: fixturePaidPromotionRateCards[0].currency,
  weeks: 1,
  weeklyAmountMinor: fixturePaidPromotionRateCards[0].amountMinor,
  durationDiscountBps: null,
  brief: 'Share this release with listeners who follow indie soul.',
  status: 'pending_payment',
  paymentStatus: 'pending',
  discountAmountMinor: null,
  taxAmountMinor: null,
  finalTotalMinor: null,
  amountRefundedMinor: 0,
  refundableRemainderMinor: null,
  requestedWindowStart: null,
  requestedWindowEnd: null,
  deliverables: [],
  createdAtUtc: FIXTURE_TIMESTAMP,
  updatedAtUtc: FIXTURE_TIMESTAMP,
};

// A second campaign of another element type, so the type-generic promoter
// surfaces are exercised against more than tracks.
export const fixturePaidPromotionAlbumCampaign: FixturePaidPromotionCampaign = {
  ...fixturePaidPromotionCampaign,
  id: 'pmc_FixtureCampaign02',
  elementId: fixtureConvertTemplates.paidPromotionAlbum.musicElementId,
  elementType: 'album',
  rateCardId: fixturePaidPromotionRateCards[1].id,
  amountMinor: 9000,
  weeks: 4,
  weeklyAmountMinor: fixturePaidPromotionRateCards[1].amountMinor,
  durationDiscountBps: 1000,
  status: 'fulfilling',
  paymentStatus: 'paid',
  discountAmountMinor: 0,
  taxAmountMinor: 0,
  finalTotalMinor: 9000,
  amountRefundedMinor: 0,
  refundableRemainderMinor: 9000,
};

export const fixtureInternalPaidPromotionCustomer: FixtureInternalPaidPromotionCustomer = {
  userId: 'user-member-1',
  username: fixtureUsers.member.username,
  displayName: fixtureUsers.member.displayName,
  email: fixtureUsers.member.email,
  promoterKind: 'artist',
  orgName: 'Groove Collective',
  website: 'https://example.com/mia',
};

export const fixtureInternalPaidPromotionCampaign: FixtureInternalPaidPromotionCampaign = {
  id: fixturePaidPromotionCampaign.id,
  customer: fixtureInternalPaidPromotionCustomer,
  subject: {
    id: fixtureConvertTemplates.paidPromotionTrack.musicElementId,
    elementType: 'track',
    title: fixtureConvertTemplates.paidPromotionTrack.title,
    coverArtUrl: null,
    subtitleNames: [fixtureConvertTemplates.paidPromotionTrack.artist],
  },
  sourcePlatform: 'spotify',
  brief: 'Focus on the release story and live arrangement.',
  pricingMode: 'rate_card',
  rateCardId: fixturePaidPromotionRateCards[0].id,
  // A four-week campaign at the discounted weekly rate: 4 × $25 less 10%.
  amountMinor: 9000,
  currency: fixturePaidPromotionRateCards[0].currency,
  weeks: 4,
  weeklyAmountMinor: fixturePaidPromotionRateCards[0].amountMinor,
  durationDiscountBps: 1000,
  weeklyDeliverableMinimum: 1,
  weeksDelivered: 1,
  policyRefundableMinor: 6750,
  status: 'in_review',
  statusChangedAtUtc: FIXTURE_TIMESTAMP,
  requestedWindowStart: null,
  requestedWindowEnd: null,
  attestedAtUtc: FIXTURE_TIMESTAMP,
  attestationVersion: 'paid-promotion-authority-v1',
  attestedRelationship: 'self_artist',
  payment: {
    id: 'pmp_FixturePayment01',
    amountMinor: 9000,
    currency: fixturePaidPromotionRateCards[0].currency,
    discountAmountMinor: 0,
    taxAmountMinor: 0,
    finalTotalMinor: 9000,
    amountRefundedMinor: 0,
    refundableRemainderMinor: 9000,
    status: 'paid',
    statusChangedAtUtc: FIXTURE_TIMESTAMP,
    paidAtUtc: FIXTURE_TIMESTAMP,
    updatedAtUtc: FIXTURE_TIMESTAMP,
  },
  pricingSnapshots: [],
  deliverables: [
    {
      id: 'pmd_FixtureDeliverable01',
      campaignId: fixturePaidPromotionCampaign.id,
      postId: null,
      subjectElementId: null,
      channel: 'instagram',
      plannedAtUtc: FIXTURE_TIMESTAMP,
      publishedAtUtc: null,
      evidenceUrl: null,
      status: 'planned',
      notes: 'Prepare the launch placement.',
      createdAtUtc: FIXTURE_TIMESTAMP,
      updatedAtUtc: FIXTURE_TIMESTAMP,
    },
  ],
  exceptions: [
    {
      id: 'pmx_FixtureException01',
      kind: 'stuck_pending',
      paymentId: 'pmp_FixturePayment01',
      campaignId: fixturePaidPromotionCampaign.id,
      status: 'open',
      createdAtUtc: FIXTURE_TIMESTAMP,
      resolvedAtUtc: null,
    },
  ],
  createdAtUtc: FIXTURE_TIMESTAMP,
  updatedAtUtc: FIXTURE_TIMESTAMP,
};

export const fixturePaidPromotionSubjects: FixturePaidPromotionSubject[] = [
  {
    elementId: fixtureConvertTemplates.paidPromotionTrack.musicElementId,
    elementType: 'track',
    title: fixtureConvertTemplates.paidPromotionTrack.title,
    coverArtUrl: null,
    repeatSourceUrl: fixtureConvertTemplates.paidPromotionTrack.originalUrl,
    subtitleNames: [fixtureConvertTemplates.paidPromotionTrack.artist],
    campaignCount: 2,
    campaignStatusCounts: {
      in_review: 1,
      completed: 1,
    },
    firstCampaignAtUtc: FIXTURE_TIMESTAMP,
    latestCampaignAtUtc: FIXTURE_TIMESTAMP,
  },
  {
    elementId: fixtureConvertTemplates.paidPromotionAlbum.musicElementId,
    elementType: 'album',
    title: fixtureConvertTemplates.paidPromotionAlbum.title,
    coverArtUrl: null,
    repeatSourceUrl: fixtureConvertTemplates.paidPromotionAlbum.originalUrl,
    subtitleNames: [fixtureConvertTemplates.paidPromotionAlbum.artist],
    campaignCount: 1,
    campaignStatusCounts: {
      fulfilling: 1,
    },
    firstCampaignAtUtc: FIXTURE_TIMESTAMP,
    latestCampaignAtUtc: FIXTURE_TIMESTAMP,
  },
  // An artist subject carries no secondary names — the type-generic renderers
  // must not fall back to "artist unavailable" for it.
  {
    elementId: fixtureConvertTemplates.paidPromotionArtist.musicElementId,
    elementType: 'artist',
    title: fixtureConvertTemplates.paidPromotionArtist.title,
    coverArtUrl: null,
    repeatSourceUrl: fixtureConvertTemplates.paidPromotionArtist.originalUrl,
    subtitleNames: [],
    campaignCount: 1,
    campaignStatusCounts: {
      completed: 1,
    },
    firstCampaignAtUtc: FIXTURE_TIMESTAMP,
    latestCampaignAtUtc: FIXTURE_TIMESTAMP,
  },
];

export const fixtureTopCharts: FixtureSearchResults = {
  tracks: [
    {
      id: 'chart-track-1',
      title: 'Midnight City',
      artist: 'M83',
      externalUrls: {
        spotify: fixtureConvertTemplates.homeTrack.originalUrl,
      },
    },
  ],
  albums: [],
  artists: [],
  playlists: [],
};

export const fixtureSearchResultsByQuery: Record<string, FixtureSearchResults> = {
  'blue monday': {
    tracks: [
      {
        id: 'search-track-1',
        title: 'Blue Monday',
        artist: 'New Order',
        externalUrls: {
          spotify: fixtureConvertTemplates.addMusicTrack.originalUrl,
        },
      },
    ],
    albums: [],
    artists: [],
    playlists: [],
  },
};

// Search entry whose result resolves to a canonical, promotable subject, so
// the paid-promotion intake's search path can be exercised end to end. The
// `blue monday` entry above resolves to a non-canonical element id and is not
// usable for that flow.
fixtureSearchResultsByQuery['signal fire'] = {
  tracks: [
    {
      id: 'search-track-paid-promotion',
      title: fixtureConvertTemplates.paidPromotionTrack.title,
      artist: fixtureConvertTemplates.paidPromotionTrack.artist,
      externalUrls: {
        spotify: fixtureConvertTemplates.paidPromotionTrack.originalUrl,
      },
    },
  ],
  albums: [],
  artists: [],
  playlists: [],
};

export const fixtureUsernameAvailability: Record<string, boolean> = {
  freshhandle: true,
  miagroove: true,
  recordsmith: true,
};
