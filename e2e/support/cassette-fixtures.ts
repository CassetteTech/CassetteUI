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

export interface FixturePaidPromotionRateCard {
  id: string;
  packageKey: string;
  version: number;
  displayName: string;
  description: string;
  amountMinor: number;
  currency: string;
}

export interface FixturePaidPromotionCampaign {
  id: string;
  trackId: string;
  sourcePlatform: 'spotify' | 'applemusic' | 'deezer';
  rateCardId: string;
  amountMinor: number;
  currency: string;
  status: string;
  paymentStatus: string | null;
  discountAmountMinor: number | null;
  taxAmountMinor: number | null;
  finalTotalMinor: number | null;
  amountRefundedMinor: number | null;
  refundableRemainderMinor: number | null;
  requestedWindowStart: string | null;
  requestedWindowEnd: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface FixtureInternalPaidPromotionDeliverable {
  id: string;
  campaignId: string;
  postId: string | null;
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

export interface FixtureInternalPaidPromotionCampaign {
  id: string;
  track: {
    id: string;
    title: string;
    coverArtUrl: string | null;
    artists: string[];
  };
  sourcePlatform: string;
  brief: string;
  pricingMode: string;
  rateCardId: string | null;
  amountMinor: number | null;
  currency: string | null;
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
  trackId: string;
  trackTitle: string;
  coverArtUrl: string | null;
  artists: string[];
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
} satisfies Record<string, FixturePost>;

export const fixturePaidPromotionRateCards: FixturePaidPromotionRateCard[] = [
  {
    id: 'prc_LocalLaunch1',
    packageKey: 'launch',
    version: 1,
    displayName: 'Launch package',
    description: 'A focused paid-placement package for one canonical track.',
    amountMinor: 25000,
    currency: 'USD',
  },
];

export const fixturePaidPromotionCampaign: FixturePaidPromotionCampaign = {
  id: 'pmc_FixtureCampaign01',
  trackId: fixtureConvertTemplates.paidPromotionTrack.musicElementId,
  sourcePlatform: 'spotify',
  rateCardId: fixturePaidPromotionRateCards[0].id,
  amountMinor: fixturePaidPromotionRateCards[0].amountMinor,
  currency: fixturePaidPromotionRateCards[0].currency,
  status: 'pending_payment',
  paymentStatus: 'pending',
  discountAmountMinor: null,
  taxAmountMinor: null,
  finalTotalMinor: null,
  amountRefundedMinor: 0,
  refundableRemainderMinor: null,
  requestedWindowStart: null,
  requestedWindowEnd: null,
  createdAtUtc: FIXTURE_TIMESTAMP,
  updatedAtUtc: FIXTURE_TIMESTAMP,
};

export const fixtureInternalPaidPromotionCampaign: FixtureInternalPaidPromotionCampaign = {
  id: fixturePaidPromotionCampaign.id,
  track: {
    id: fixtureConvertTemplates.paidPromotionTrack.musicElementId,
    title: fixtureConvertTemplates.paidPromotionTrack.title,
    coverArtUrl: null,
    artists: [fixtureConvertTemplates.paidPromotionTrack.artist],
  },
  sourcePlatform: 'spotify',
  brief: 'Focus on the release story and live arrangement.',
  pricingMode: 'rate_card',
  rateCardId: fixturePaidPromotionRateCards[0].id,
  amountMinor: fixturePaidPromotionRateCards[0].amountMinor,
  currency: fixturePaidPromotionRateCards[0].currency,
  status: 'in_review',
  statusChangedAtUtc: FIXTURE_TIMESTAMP,
  requestedWindowStart: null,
  requestedWindowEnd: null,
  attestedAtUtc: FIXTURE_TIMESTAMP,
  attestationVersion: 'paid-promotion-authority-v1',
  attestedRelationship: 'self_artist',
  payment: {
    id: 'pmp_FixturePayment01',
    amountMinor: fixturePaidPromotionRateCards[0].amountMinor,
    currency: fixturePaidPromotionRateCards[0].currency,
    discountAmountMinor: 5000,
    taxAmountMinor: 1500,
    finalTotalMinor: 21500,
    amountRefundedMinor: 0,
    refundableRemainderMinor: 21500,
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
    trackId: fixtureConvertTemplates.paidPromotionTrack.musicElementId,
    trackTitle: fixtureConvertTemplates.paidPromotionTrack.title,
    coverArtUrl: null,
    artists: [fixtureConvertTemplates.paidPromotionTrack.artist],
    campaignCount: 2,
    campaignStatusCounts: {
      in_review: 1,
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

export const fixtureUsernameAvailability: Record<string, boolean> = {
  freshhandle: true,
  miagroove: true,
  recordsmith: true,
};
