import type { Page, Route } from '@playwright/test';
import {
  FIXTURE_TIMESTAMP,
  FixturePost,
  FixtureSearchResults,
  FixtureUser,
  fixtureConvertTemplates,
  fixtureSearchResultsByQuery,
  fixtureTopCharts,
  fixtureUsernameAvailability,
  fixtureUsers,
} from './cassette-fixtures';

type MockCassetteOptions = {
  currentUser?: FixtureUser | null;
  googleAuthUser?: FixtureUser | null;
  users?: FixtureUser[];
  posts?: FixturePost[];
  notifications?: MockNotification[];
  convertTemplates?: FixturePost[];
  topCharts?: FixtureSearchResults;
  searchResultsByQuery?: Record<string, FixtureSearchResults>;
  usernameAvailability?: Record<string, boolean>;
  musicConnectionsByUserId?: Record<string, string[]>;
  platformPreferencesByUserId?: Record<string, string[]>;
};

type MockNotification = {
  id: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  actor: {
    userId?: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
  postId?: string;
  targetUrl?: string;
  message?: string;
};

type MockState = {
  currentUser: FixtureUser | null;
  googleAuthUser: FixtureUser | null;
  usersById: Map<string, FixtureUser>;
  usernamesToIds: Map<string, string>;
  postsById: Map<string, FixturePost>;
  notificationsById: Map<string, MockNotification>;
  convertTemplatesByUrl: Map<string, FixturePost>;
  topCharts: FixtureSearchResults;
  searchResultsByQuery: Record<string, FixtureSearchResults>;
  usernameAvailability: Record<string, boolean>;
  musicConnectionsByUserId: Map<string, string[]>;
  platformPreferencesByUserId: Map<string, string[]>;
};

const DEFAULT_USERS = Object.values(fixtureUsers);

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const normalizeUsername = (value: string) => value.trim().toLowerCase();

const normalizeServiceName = (value: string) => {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized === 'spotify') return 'Spotify';
  if (normalized === 'applemusic' || normalized === 'apple') return 'AppleMusic';
  if (normalized === 'deezer') return 'Deezer';
  return value;
};

const buildConnectedServices = (services: string[] = []) =>
  services.map((serviceType) => ({
    serviceType,
    connectedAt: FIXTURE_TIMESTAMP,
  }));

const toSessionUser = (user: FixtureUser) => ({
  userId: user.id,
  email: user.email,
  username: user.username,
  displayName: user.displayName,
  bio: user.bio || '',
  likedPostsPrivacy: user.likedPostsPrivacy || 'public',
  profilePicture: user.avatarUrl || '',
  isOnboarded: user.isOnboarded,
  accountType: user.accountType ?? null,
  joinDate: FIXTURE_TIMESTAMP,
  connectedServices: buildConnectedServices(user.musicConnections),
});

const toProfileBio = (user: FixtureUser, state: MockState) => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  bio: user.bio || '',
  avatarUrl: user.avatarUrl || '',
  isOwnProfile: state.currentUser?.id === user.id,
  likedPostsPrivacy: user.likedPostsPrivacy || 'public',
  likedPostsVisibility: user.likedPostsPrivacy || 'public',
  showLikedPosts: (user.likedPostsPrivacy || 'public') === 'public',
  totalLikesReceived: Array.from(state.postsById.values())
    .filter((post) => post.ownerId === user.id)
    .reduce((sum, post) => sum + (post.likeCount || 0), 0),
  connectedServices: buildConnectedServices(user.musicConnections),
  platformPreferences: (state.platformPreferencesByUserId.get(user.id) || []).map((platform) => ({
    platform,
    addedAt: FIXTURE_TIMESTAMP,
  })),
  accountType: user.accountType ?? null,
});

const toActivityItem = (post: FixturePost) => ({
  postId: post.postId,
  redirectPostId: post.postId,
  isRepost: false,
  elementType: post.elementType,
  title: post.title,
  description: post.description || '',
  username: post.ownerUsername || '',
  userId: post.ownerId || '',
  createdAt: post.createdAt || FIXTURE_TIMESTAMP,
  likeCount: post.likeCount || 0,
  likedByCurrentUser: post.likedByCurrentUser || false,
  commentsEnabled: post.commentsEnabled ?? true,
  privacy: post.privacy || 'public',
  conversionSuccessCount: post.conversionSuccessCount || 0,
});

const toPostByIdResponse = (post: FixturePost) => ({
  success: true,
  postId: post.postId,
  redirectPostId: post.postId,
  repostedByCurrentUser: post.repostedByCurrentUser || false,
  elementType: post.elementType,
  musicElementId: post.musicElementId,
  userId: post.ownerId || null,
  username: post.ownerUsername,
  createdAt: post.createdAt || FIXTURE_TIMESTAMP,
  privacy: post.privacy || 'public',
  conversionSuccessCount: post.conversionSuccessCount || 0,
  likeCount: post.likeCount || 0,
  likedByCurrentUser: post.likedByCurrentUser || false,
  commentsEnabled: post.commentsEnabled ?? true,
  description: post.description || '',
  originalLink: post.originalUrl,
  details: {
    title: post.title,
    artist: post.artist || '',
    coverArtUrl: '',
    genres: post.genres || [],
    releaseDate: post.releaseDate || null,
    trackCount: post.trackCount,
    artists: post.artist ? [{ name: post.artist, role: 'Primary' }] : [],
  },
  metadata: {
    albumName: '',
    releaseDate: post.releaseDate || null,
  },
  platforms: {
    spotify: post.convertedUrls?.spotify ? { url: post.convertedUrls.spotify } : undefined,
    applemusic: post.convertedUrls?.appleMusic ? { url: post.convertedUrls.appleMusic } : undefined,
    deezer: post.convertedUrls?.deezer ? { url: post.convertedUrls.deezer } : undefined,
  },
});

const toNotificationsListResponse = (state: MockState, page: number, pageSize: number) => {
  const items = Array.from(state.notificationsById.values()).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const totalItems = items.length;
  const unreadCount = items.filter((item) => !item.isRead).length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
  const offset = (page - 1) * pageSize;

  return {
    items: items.slice(offset, offset + pageSize),
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNext: totalPages > 0 && page < totalPages,
    hasPrevious: totalPages > 0 && page > 1,
    unreadCount,
  };
};

const getMultipartField = (body: string | null, fieldName: string) => {
  if (!body) return undefined;
  const marker = `name="${fieldName}"`;
  const fieldIndex = body.indexOf(marker);
  if (fieldIndex === -1) return undefined;

  const valueStart = body.indexOf('\r\n\r\n', fieldIndex);
  if (valueStart === -1) return undefined;

  const boundaryStart = body.indexOf('\r\n--', valueStart + 4);
  if (boundaryStart === -1) return undefined;

  return body.slice(valueStart + 4, boundaryStart).trim();
};

const hasMultipartField = (body: string | null, fieldName: string) =>
  body?.includes(`name="${fieldName}"`) || false;

const ensureUser = (state: MockState, user: FixtureUser) => {
  const cloned = clone(user);
  state.usersById.set(cloned.id, cloned);
  if (cloned.username) {
    state.usernamesToIds.set(normalizeUsername(cloned.username), cloned.id);
  }
  if (!state.platformPreferencesByUserId.has(cloned.id)) {
    state.platformPreferencesByUserId.set(cloned.id, clone(cloned.platformPreferences || []));
  }
  if (!state.musicConnectionsByUserId.has(cloned.id)) {
    state.musicConnectionsByUserId.set(cloned.id, clone(cloned.musicConnections || []));
  }
  return cloned;
};

const updateUser = (
  state: MockState,
  userId: string,
  updates: Partial<FixtureUser>,
) => {
  const existing = state.usersById.get(userId);
  if (!existing) {
    throw new Error(`Unknown fixture user: ${userId}`);
  }

  if (existing.username) {
    state.usernamesToIds.delete(normalizeUsername(existing.username));
  }

  const nextUser = {
    ...existing,
    ...updates,
  };
  ensureUser(state, nextUser);

  if (state.currentUser?.id === userId) {
    state.currentUser = clone(nextUser);
  }
  if (state.googleAuthUser?.id === userId) {
    state.googleAuthUser = clone(nextUser);
  }

  for (const [postId, post] of state.postsById.entries()) {
    if (post.ownerId === userId) {
      state.postsById.set(postId, {
        ...post,
        ownerUsername: nextUser.username,
      });
    }
  }
};

const getUserByIdentifier = (state: MockState, userIdentifier: string) => {
  const normalized = normalizeUsername(userIdentifier);
  const byUsername = state.usernamesToIds.get(normalized);
  if (byUsername) {
    return state.usersById.get(byUsername);
  }

  return state.usersById.get(userIdentifier);
};

const upsertPost = (state: MockState, post: FixturePost) => {
  state.postsById.set(post.postId, clone(post));
};

const getCurrentUserOrThrow = (state: MockState) => {
  if (!state.currentUser) {
    throw new Error('Expected an authenticated fixture user');
  }
  return state.currentUser;
};

const createOwnedPostFromTemplate = (
  state: MockState,
  template: FixturePost,
  overrides: Partial<FixturePost> = {},
) => {
  const currentUser = state.currentUser;
  const ownerFields = currentUser
    ? {
        ownerId: currentUser.id,
        ownerUsername: currentUser.username,
      }
    : {};

  const nextPost = {
    ...clone(template),
    ...ownerFields,
    ...overrides,
  };
  upsertPost(state, nextPost);
  return nextPost;
};

const buildState = (options: MockCassetteOptions): MockState => {
  const state: MockState = {
    currentUser: options.currentUser ? clone(options.currentUser) : null,
    googleAuthUser: options.googleAuthUser ? clone(options.googleAuthUser) : null,
    usersById: new Map<string, FixtureUser>(),
    usernamesToIds: new Map<string, string>(),
    postsById: new Map<string, FixturePost>(),
    notificationsById: new Map<string, MockNotification>(),
    convertTemplatesByUrl: new Map<string, FixturePost>(),
    topCharts: clone(options.topCharts || fixtureTopCharts),
    searchResultsByQuery: clone(options.searchResultsByQuery || fixtureSearchResultsByQuery),
    usernameAvailability: {
      ...fixtureUsernameAvailability,
      ...clone(options.usernameAvailability || {}),
    },
    musicConnectionsByUserId: new Map<string, string[]>(),
    platformPreferencesByUserId: new Map<string, string[]>(),
  };

  for (const user of DEFAULT_USERS) {
    ensureUser(state, user);
  }
  for (const user of options.users || []) {
    ensureUser(state, user);
  }
  if (state.currentUser) {
    ensureUser(state, state.currentUser);
  }
  if (state.googleAuthUser) {
    ensureUser(state, state.googleAuthUser);
  }

  const defaultPosts = options.posts || [];
  for (const post of defaultPosts) {
    upsertPost(state, post);
  }
  for (const notification of options.notifications || []) {
    state.notificationsById.set(notification.id, clone(notification));
  }

  const templatePosts = options.convertTemplates || Object.values(fixtureConvertTemplates);
  for (const template of templatePosts) {
    state.convertTemplatesByUrl.set(template.originalUrl, clone(template));
  }

  for (const [userId, platforms] of Object.entries(options.musicConnectionsByUserId || {})) {
    state.musicConnectionsByUserId.set(userId, clone(platforms).map(normalizeServiceName));
  }
  for (const [userId, platforms] of Object.entries(options.platformPreferencesByUserId || {})) {
    state.platformPreferencesByUserId.set(userId, clone(platforms).map(normalizeServiceName));
  }

  return state;
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

const text = (route: Route, body: string, status = 200) =>
  route.fulfill({
    status,
    contentType: 'text/plain',
    body,
  });

export async function mockCassetteApp(page: Page, options: MockCassetteOptions = {}) {
  const state = buildState(options);

  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname === '/api/ingest/capture') {
      return route.fulfill({ status: 204, body: '' });
    }

    if (pathname === '/api/auth/session') {
      const referer = request.headers()['referer'] || '';
      if (!state.currentUser && state.googleAuthUser && referer.includes('/auth/google/callback')) {
        state.currentUser = ensureUser(state, state.googleAuthUser);
      }

      if (!state.currentUser) {
        return json(route, { success: false, message: 'No authenticated session found' }, 401);
      }

      return json(route, {
        success: true,
        user: toSessionUser(getCurrentUserOrThrow(state)),
      });
    }

    if (pathname === '/api/auth/google/init' && method === 'POST') {
      if (state.googleAuthUser) {
        state.currentUser = ensureUser(state, state.googleAuthUser);
      }

      return json(route, {
        success: true,
        authUrl: '/auth/google/callback',
      });
    }

    if (pathname === '/api/music/charts') {
      return json(route, state.topCharts);
    }

    if (pathname === '/api/music/search') {
      const query = normalizeUsername(url.searchParams.get('q') || '');
      return json(route, state.searchResultsByQuery[query] || {
        tracks: [],
        albums: [],
        artists: [],
        playlists: [],
      });
    }

    if (pathname.startsWith('/api/v1/profile/check-username/')) {
      const username = normalizeUsername(pathname.split('/').pop() || '');
      return json(route, { available: state.usernameAvailability[username] ?? true });
    }

    if (pathname.startsWith('/api/v1/user/check-username/')) {
      const username = normalizeUsername(pathname.split('/').pop() || '');
      return json(route, { available: state.usernameAvailability[username] ?? true });
    }

    if (pathname === '/api/v1/profile' && method === 'PUT') {
      const body = request.postData();
      const currentUser = getCurrentUserOrThrow(state);
      const username = getMultipartField(body, 'Username') || getMultipartField(body, 'username');
      const displayName =
        getMultipartField(body, 'DisplayName') || getMultipartField(body, 'displayName');
      const bio = getMultipartField(body, 'Bio') || getMultipartField(body, 'bio');
      const likedPostsPrivacy = getMultipartField(body, 'likedPostsPrivacy') as 'public' | 'private' | undefined;
      const isOnboarded = getMultipartField(body, 'isOnboarded');
      const hasAvatarUpload = hasMultipartField(body, 'avatar') || hasMultipartField(body, 'Avatar');

      updateUser(state, currentUser.id, {
        username: username ? normalizeUsername(username) : currentUser.username,
        displayName: displayName || currentUser.displayName,
        bio: bio ?? currentUser.bio,
        avatarUrl: hasAvatarUpload ? `/images/cassette_logo.png?avatar=${currentUser.id}` : currentUser.avatarUrl,
        likedPostsPrivacy: likedPostsPrivacy || currentUser.likedPostsPrivacy || 'public',
        isOnboarded: isOnboarded === 'true' ? true : currentUser.isOnboarded,
      });

      return json(route, {
        success: true,
        user: toSessionUser(getCurrentUserOrThrow(state)),
      });
    }

    if (pathname === '/api/v1/notifications/unread-count' && method === 'GET') {
      getCurrentUserOrThrow(state);
      return json(route, {
        unreadCount: Array.from(state.notificationsById.values()).filter((item) => !item.isRead)
          .length,
      });
    }

    if (pathname === '/api/v1/notifications' && method === 'GET') {
      getCurrentUserOrThrow(state);
      const page = Math.max(1, Number(url.searchParams.get('page') || 1));
      const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') || 20));
      return json(route, toNotificationsListResponse(state, page, pageSize));
    }

    if (pathname === '/api/v1/notifications/read' && method === 'POST') {
      getCurrentUserOrThrow(state);
      const payload = request.postDataJSON() as { notificationIds?: string[] };
      const notificationIds = payload.notificationIds || [];

      notificationIds.forEach((notificationId) => {
        const notification = state.notificationsById.get(notificationId);
        if (!notification) return;

        state.notificationsById.set(notificationId, {
          ...notification,
          isRead: true,
        });
      });

      return json(route, { success: true });
    }

    if (pathname === '/api/v1/notifications/read-all' && method === 'POST') {
      getCurrentUserOrThrow(state);

      Array.from(state.notificationsById.entries()).forEach(([notificationId, notification]) => {
        state.notificationsById.set(notificationId, {
          ...notification,
          isRead: true,
        });
      });

      return json(route, { success: true });
    }

    if (pathname === '/api/v1/social/posts' && method === 'POST') {
      const payload = request.postDataJSON() as {
        musicElementId?: string;
        elementType?: string;
        description?: string;
      };
      const currentUser = getCurrentUserOrThrow(state);
      const sourcePost = Array.from(state.postsById.values()).find(
        (post) => post.musicElementId === payload.musicElementId,
      );

      const nextPost: FixturePost = {
        postId: `post-profile-${payload.musicElementId || 'new'}`,
        musicElementId: payload.musicElementId || 'new-post',
        elementType: (payload.elementType as FixturePost['elementType']) || 'Track',
        title: sourcePost?.title || 'Saved Track',
        artist: sourcePost?.artist || currentUser.displayName,
        description: payload.description || sourcePost?.description || '',
        ownerId: currentUser.id,
        ownerUsername: currentUser.username,
        privacy: 'public',
        createdAt: FIXTURE_TIMESTAMP,
        likeCount: 0,
        likedByCurrentUser: false,
        repostedByCurrentUser: false,
        commentsEnabled: true,
        conversionSuccessCount: 0,
        originalUrl: sourcePost?.originalUrl || 'https://open.spotify.com/track/saved-track',
        convertedUrls: sourcePost?.convertedUrls || {},
      };
      upsertPost(state, nextPost);

      return json(route, { postId: nextPost.postId });
    }

    if (pathname === '/api/v1/convert' && method === 'POST') {
      const payload = request.postDataJSON() as {
        sourceLink: string;
        description?: string;
      };
      const template = state.convertTemplatesByUrl.get(payload.sourceLink);
      if (!template) {
        return json(route, { message: `No conversion template for ${payload.sourceLink}` }, 404);
      }

      const createdPost = createOwnedPostFromTemplate(state, template, {
        description: payload.description || template.description || '',
      });

      return json(route, {
        status: 'ready',
        postId: createdPost.postId,
      });
    }

    if (pathname === '/api/v1/music-services/preferences') {
      const currentUser = getCurrentUserOrThrow(state);
      if (method === 'GET') {
        const preferences = (state.platformPreferencesByUserId.get(currentUser.id) || []).map((platform) => ({
          platform,
          isAuthenticated: (state.musicConnectionsByUserId.get(currentUser.id) || []).includes(platform),
          addedAt: FIXTURE_TIMESTAMP,
        }));
        return json(route, { success: true, preferences });
      }

      if (method === 'POST') {
        const payload = request.postDataJSON() as { platforms?: string[] };
        const platforms = (payload.platforms || []).map(normalizeServiceName);
        state.platformPreferencesByUserId.set(currentUser.id, platforms);
        updateUser(state, currentUser.id, {
          platformPreferences: platforms,
        });
        return json(route, {
          success: true,
          preferences: platforms.map((platform) => ({
            platform,
            isAuthenticated: (state.musicConnectionsByUserId.get(currentUser.id) || []).includes(platform),
            addedAt: FIXTURE_TIMESTAMP,
          })),
        });
      }
    }

    if (pathname === '/api/v1/music-services/connected' && method === 'GET') {
      const currentUser = getCurrentUserOrThrow(state);
      return json(route, {
        services: state.musicConnectionsByUserId.get(currentUser.id) || [],
      });
    }

    if (pathname === '/api/v1/music-services/spotify/init' && method === 'POST') {
      return json(route, {
        authUrl: '/spotify_callback?code=mock-code&state=mock-state',
      });
    }

    if (pathname === '/api/v1/music-services/spotify/exchange-code' && method === 'POST') {
      const currentUser = getCurrentUserOrThrow(state);
      const connections = new Set(state.musicConnectionsByUserId.get(currentUser.id) || []);
      connections.add('Spotify');
      state.musicConnectionsByUserId.set(currentUser.id, Array.from(connections));
      updateUser(state, currentUser.id, {
        musicConnections: Array.from(connections),
      });
      return json(route, { success: true });
    }

    if (pathname === '/api/v1/music-services/apple-music/developer-token' && method === 'GET') {
      return json(route, { developerToken: 'test-apple-music-token' });
    }

    if (pathname === '/api/v1/music-services/apple-music/user-token' && method === 'POST') {
      const currentUser = getCurrentUserOrThrow(state);
      const connections = new Set(state.musicConnectionsByUserId.get(currentUser.id) || []);
      connections.add('AppleMusic');
      state.musicConnectionsByUserId.set(currentUser.id, Array.from(connections));
      updateUser(state, currentUser.id, {
        musicConnections: Array.from(connections),
      });
      return json(route, { success: true });
    }

    if (pathname === '/api/v1/convert/createPlaylist' && method === 'POST') {
      const payload = request.postDataJSON() as {
        PlaylistId?: string;
        TargetPlatform?: string;
      };
      const playlistPost = Array.from(state.postsById.values()).find(
        (post) => post.musicElementId === payload.PlaylistId,
      );
      const totalTracks = playlistPost?.trackCount || 3;
      const platformName = normalizeServiceName(payload.TargetPlatform || 'Spotify');

      return json(route, {
        success: true,
        playlist_id: `${payload.PlaylistId || 'playlist'}-${platformName.toLowerCase()}`,
        playlist_url:
          platformName === 'AppleMusic'
            ? 'https://music.apple.com/us/playlist/test-playlist/505050'
            : 'https://open.spotify.com/playlist/test-playlist-505050',
        tracks_added: totalTracks,
        tracks_failed: 0,
        total_tracks: totalTracks,
      });
    }

    if (pathname === '/api/v1/profile/edit/bio' && method === 'GET') {
      const currentUser = getCurrentUserOrThrow(state);
      return json(route, toProfileBio(currentUser, state));
    }

    if (pathname === '/api/v1/profile/edit/activity' && method === 'GET') {
      const currentUser = getCurrentUserOrThrow(state);
      const items = Array.from(state.postsById.values()).filter((post) => post.ownerId === currentUser.id);
      return json(route, {
        items: items.map(toActivityItem),
        page: 1,
        pageSize: Number(url.searchParams.get('pageSize') || 20),
        totalItems: items.length,
        totalPages: items.length > 0 ? 1 : 0,
      });
    }

    if (pathname.startsWith('/api/v1/profile/') && pathname.endsWith('/bio') && method === 'GET') {
      const userIdentifier = pathname.split('/')[4] || '';
      const user = getUserByIdentifier(state, userIdentifier);
      if (!user) {
        return json(route, { message: 'User not found' }, 404);
      }
      return json(route, toProfileBio(user, state));
    }

    if (pathname.startsWith('/api/v1/profile/') && pathname.endsWith('/activity') && method === 'GET') {
      const userIdentifier = pathname.split('/')[4] || '';
      const user = getUserByIdentifier(state, userIdentifier);
      if (!user) {
        return json(route, { message: 'User not found' }, 404);
      }

      const requestedElementType = normalizeUsername(url.searchParams.get('elementType') || '');
      const pageSize = Number(url.searchParams.get('pageSize') || 20);
      const items = Array.from(state.postsById.values()).filter((post) => {
        if (post.ownerId !== user.id) return false;
        if (!requestedElementType) return true;
        return normalizeUsername(post.elementType) === normalizeUsername(requestedElementType);
      });

      return json(route, {
        items: items.slice(0, pageSize).map(toActivityItem),
        page: Number(url.searchParams.get('page') || 1),
        pageSize,
        totalItems: items.length,
        totalPages: items.length > 0 ? 1 : 0,
      });
    }

    if (/^\/api\/v1\/social\/users\/[^/]+\/liked-posts$/.test(pathname) && method === 'GET') {
      return json(route, {
        items: [],
        page: Number(url.searchParams.get('page') || 1),
        pageSize: Number(url.searchParams.get('pageSize') || 20),
        totalItems: 0,
        totalPages: 0,
      });
    }

    if (/^\/api\/v1\/social\/posts\/[^/]+\/comments$/.test(pathname) && method === 'GET') {
      return json(route, {
        items: [],
        totalItems: 0,
        page: Number(url.searchParams.get('page') || 1),
        pageSize: Number(url.searchParams.get('pageSize') || 50),
      });
    }

    if (/^\/api\/v1\/social\/posts\/[^/]+\/like$/.test(pathname)) {
      const postId = pathname.split('/')[5];
      const post = state.postsById.get(postId);
      if (!post) {
        return json(route, { message: 'Post not found' }, 404);
      }

      const liked = method === 'POST';
      const nextLikeCount = Math.max(0, (post.likeCount || 0) + (liked ? 1 : -1));
      upsertPost(state, {
        ...post,
        likedByCurrentUser: liked,
        likeCount: nextLikeCount,
      });

      return json(route, {
        success: true,
        postId,
        liked,
        likeCount: nextLikeCount,
      });
    }

    if (/^\/api\/v1\/social\/posts\/[^/]+\/repost$/.test(pathname)) {
      const postId = pathname.split('/')[5];
      const post = state.postsById.get(postId);
      if (!post) {
        return json(route, { message: 'Post not found' }, 404);
      }

      const reposted = method === 'POST';
      upsertPost(state, {
        ...post,
        repostedByCurrentUser: reposted,
      });

      if (method === 'DELETE') {
        return route.fulfill({ status: 204, body: '' });
      }

      return json(route, {
        postId,
        redirectPostId: postId,
        originalPostId: null,
      });
    }

    if (/^\/api\/v1\/social\/posts\/[^/]+$/.test(pathname)) {
      const postId = pathname.split('/')[5];
      const post = state.postsById.get(postId);
      if (!post) {
        return json(route, { message: 'Post not found' }, 404);
      }

      if (method === 'GET') {
        return json(route, toPostByIdResponse(post));
      }

      if (method === 'PATCH') {
        const payload = request.postDataJSON() as {
          description?: string;
          privacy?: 'public' | 'private';
          commentsEnabled?: boolean;
        };
        const updatedPost = {
          ...post,
          description: payload.description ?? post.description,
          privacy: payload.privacy ?? post.privacy,
          commentsEnabled: payload.commentsEnabled ?? post.commentsEnabled,
        };
        upsertPost(state, updatedPost);
        return json(route, {
          postId,
          description: updatedPost.description,
          privacy: updatedPost.privacy,
          commentsEnabled: updatedPost.commentsEnabled,
        });
      }

      if (method === 'DELETE') {
        state.postsById.delete(postId);
        return route.fulfill({ status: 204, body: '' });
      }
    }

    return text(route, `Unhandled mocked request: ${method} ${pathname}`, 404);
  });

  return { state };
}
