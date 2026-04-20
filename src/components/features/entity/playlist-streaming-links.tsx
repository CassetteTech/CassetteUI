'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { streamingServices } from './streaming-links';
import { apiService, ApiError } from '@/services/api';
import { detectContentType } from '@/utils/content-type-detection';
import { CreatePlaylistResponse, FailedTrack } from '@/types';
import { ChevronDown, ChevronUp, ExternalLink, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth';
import { pendingActionService } from '@/utils/pending-action';
import { platformConnectService } from '@/services/platform-connect';
import { AuthPromptModal } from '@/components/features/auth-prompt-modal';
import { openInAppOrBrowser, isAppleMusicLibraryUrl } from '@/utils/deep-link';
import { clientConfig } from '@/lib/config-client';
import { captureClientEvent } from '@/lib/analytics/client';
import { normalizePlatform, sanitizeDomain } from '@/lib/analytics/sanitize';
import { buildPostPlatformConversionClickedProps } from '@/lib/analytics/post-platform-conversion';
import type { AnalyticsBaseProps, PlatformDimension } from '@/lib/analytics/events';

type PlatformKey = 'spotify' | 'appleMusic' | 'deezer';

interface PlaylistStreamingLinksProps {
  links: {
    spotify?: string;
    appleMusic?: string;
    deezer?: string;
  };
  className?: string;
  playlistId: string;
  postId?: string;
  playlistTrackCount?: number;
  sourceUrl?: string;
  sourcePlatform?: string;
}

interface CreationStatus {
  platform: PlatformKey;
  loading: boolean;
  loadingMessage?: string;
  result?: CreatePlaylistResponse;
  error?: string;
  requiresReconnect?: boolean;
  actionLabel?: string;
}

const PLATFORMS: Array<PlatformKey> = ['spotify', 'appleMusic'];
const PLAYLIST_CONVERSION_LIMIT = 200;

const normalizePlatformKey = (platform?: string | null): PlatformKey | null => {
  if (!platform) return null;
  const lowered = platform.toLowerCase();
  if (lowered === 'spotify') return 'spotify';
  if (lowered === 'deezer') return 'deezer';
  if (lowered === 'applemusic' || lowered === 'apple') return 'appleMusic';
  return null;
};

export const PlaylistStreamingLinks: React.FC<PlaylistStreamingLinksProps> = ({
  links,
  className,
  playlistId,
  postId,
  playlistTrackCount,
  sourceUrl,
  sourcePlatform,
}) => {
  const { isAuthenticated } = useAuthState();
  const [creationStatus, setCreationStatus] = useState<CreationStatus | null>(null);
  const [showFailedTracks, setShowFailedTracks] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingPlatform, setPendingPlatform] = useState<PlatformKey | null>(null);
  const autoResumeAttemptedRef = useRef(false);
  const conversionLimitExceeded =
    typeof playlistTrackCount === 'number' && playlistTrackCount > PLAYLIST_CONVERSION_LIMIT;

  const providedSourceUrl = sourceUrl?.trim();
  const detectedFromProvided = providedSourceUrl ? detectContentType(providedSourceUrl).platform : null;
  const normalizedFromProp = normalizePlatformKey(sourcePlatform);
  const fallbackSourceUrl =
    (normalizedFromProp ? links[normalizedFromProp] : undefined) ||
    links.spotify ||
    links.appleMusic ||
    links.deezer;
  const resolvedSourceUrl = providedSourceUrl || fallbackSourceUrl || null;
  const detectedFromResolved = resolvedSourceUrl ? detectContentType(resolvedSourceUrl).platform : null;
  // Keep source platform detection resilient across mixed URL/platform inputs.
  const sourcePlatformKey =
    normalizedFromProp ||
    normalizePlatformKey(detectedFromProvided) ||
    normalizePlatformKey(detectedFromResolved) ||
    (resolvedSourceUrl
      ? (PLATFORMS.find((platform) => links[platform] === resolvedSourceUrl || links[platform]) as PlatformKey | undefined) || null
      : null);

  const buildPlaylistAnalyticsProps = React.useCallback((platform: PlatformKey): AnalyticsBaseProps => {
    const route = typeof window !== 'undefined' ? window.location.pathname : '/post';
    const normalizedTargetPlatform: PlatformDimension = normalizePlatform(
      platform === 'appleMusic' ? 'apple' : platform,
    ) ?? 'unknown';
    const normalizedSourcePlatform: PlatformDimension = normalizePlatform(
      sourcePlatformKey === 'appleMusic' ? 'apple' : sourcePlatformKey,
    ) ?? 'unknown';

    return {
      route,
      source_surface: 'post' as const,
      element_type: 'playlist' as const,
      music_element_id: playlistId,
      post_id: postId,
      source_platform: normalizedSourcePlatform,
      target_platform: normalizedTargetPlatform,
      source_domain: sanitizeDomain(resolvedSourceUrl || undefined),
      is_authenticated: isAuthenticated,
      playlist_track_count: playlistTrackCount,
    };
  }, [isAuthenticated, playlistId, playlistTrackCount, postId, resolvedSourceUrl, sourcePlatformKey]);

  const setAppleMusicReconnectState = React.useCallback((message: string, actionLabel: string) => {
    setCreationStatus({
      platform: 'appleMusic',
      loading: false,
      error: message,
      requiresReconnect: true,
      actionLabel,
    });
  }, []);

  const createPlaylistOnPlatform = React.useCallback(async (platform: PlatformKey) => {
    const serviceName = streamingServices[platform]?.name || platform;
    setCreationStatus({
      platform,
      loading: true,
      loadingMessage: `Creating playlist on ${serviceName}...`,
    });

    const result = await apiService.createPlaylist(playlistId, platform.toLowerCase(), postId);
    pendingActionService.clear();
    setCreationStatus({ platform, loading: false, result });
  }, [playlistId, postId]);

  const connectAppleMusicAndCreatePlaylist = React.useCallback(async (actionLabel = 'Reconnect Apple Music') => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

    pendingActionService.save(
      pendingActionService.createPlaylistAction('appleMusic', playlistId, currentUrl)
    );
    setCreationStatus({
      platform: 'appleMusic',
      loading: true,
      loadingMessage: 'Connecting to Apple Music...',
    });

    try {
      const success = await platformConnectService.connectAppleMusic(currentUrl);
      if (!success) {
        setAppleMusicReconnectState('Failed to connect to Apple Music. Please try again.', actionLabel);
        return;
      }
    } catch (error) {
      if (error instanceof ApiError && error.requiresReauth) {
        setAppleMusicReconnectState('Your Apple Music connection expired. Reconnect to continue.', 'Reconnect Apple Music');
        return;
      }

      setCreationStatus({
        platform: 'appleMusic',
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to connect to Apple Music. Please try again.',
        requiresReconnect: true,
        actionLabel,
      });
      return;
    }

    pendingActionService.clear();

    try {
      await createPlaylistOnPlatform('appleMusic');
    } catch (error) {
      if (error instanceof ApiError && error.requiresReauth) {
        setAppleMusicReconnectState('Your Apple Music connection expired. Reconnect to continue.', 'Reconnect Apple Music');
        return;
      }

      setCreationStatus({
        platform: 'appleMusic',
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create playlist',
      });
    }
  }, [createPlaylistOnPlatform, playlistId, setAppleMusicReconnectState]);

  const handleCreatePlaylist = React.useCallback(async (platform: PlatformKey) => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const normalizedTarget = platform === 'appleMusic' ? 'apple' : platform;
    const analyticsProps = buildPlaylistAnalyticsProps(platform);
    const route = analyticsProps.route;

    const convertClickProps = buildPostPlatformConversionClickedProps({
      sourceContext: 'playlist_convert_button',
      route,
      postId,
      elementType: 'playlist',
      targetPlatform: normalizedTarget,
      sourcePlatform: sourcePlatformKey ?? undefined,
      sourceDomain: resolvedSourceUrl || undefined,
      isAuthenticated,
    });
    if (convertClickProps) {
      void captureClientEvent('post_platform_conversion_clicked', convertClickProps);
    }

    void captureClientEvent('playlist_creation_submitted', {
      ...analyticsProps,
      status: 'submitted',
      success: false,
    });

    // Case 1: User not logged in - show auth modal
    if (!isAuthenticated) {
      void captureClientEvent('playlist_creation_blocked', {
        ...analyticsProps,
        reason_code: 'auth_required',
        connection_state: 'unauthenticated',
      });
      setPendingPlatform(platform);
      setAuthModalOpen(true);
      return;
    }

    // Case 2: User logged in - check if they have platform connection
    setCreationStatus({
      platform,
      loading: true,
      loadingMessage: `Creating playlist on ${streamingServices[platform]?.name || platform}...`,
    });
    setShowFailedTracks(false);

    try {
      // Skip connection check for Spotify if using Cassette's account
      const skipConnectionCheck = platform === 'spotify' && clientConfig.features.useCassetteSpotifyAccount;

      let hasConnection = skipConnectionCheck;
      if (!skipConnectionCheck) {
        const connections = await apiService.getMusicConnections();
        const normalize = (value: string) => value.toLowerCase().replace(/[\s_-]/g, '');
        hasConnection = connections.services?.some(
          (service: string) => normalize(service) === normalize(platform)
        );
      }

      if (!hasConnection) {
        void captureClientEvent('playlist_creation_blocked', {
          ...analyticsProps,
          reason_code: 'connection_required',
          connection_state: 'connection_required',
        });

        // No connection - trigger OAuth flow
        pendingActionService.save(
          pendingActionService.createPlaylistAction(platform, playlistId, currentUrl)
        );

        if (platform === 'spotify') {
          // Spotify uses redirect-based OAuth
          await platformConnectService.connectSpotify(currentUrl);
          return; // Will redirect to Spotify
        } else if (platform === 'appleMusic') {
          await connectAppleMusicAndCreatePlaylist('Connect Apple Music');
          return;
        } else if (platform === 'deezer') {
          setCreationStatus({
            platform,
            loading: false,
            error: 'Please connect Deezer in your profile settings first.',
          });
          return;
        }
      }

      // Case 3: Has connection - create playlist directly
      await createPlaylistOnPlatform(platform);
    } catch (error) {
      if (error instanceof ApiError && error.requiresReauth && platform === 'appleMusic') {
        setAppleMusicReconnectState('Your Apple Music connection expired. Reconnect to continue.', 'Reconnect Apple Music');
        return;
      }

      setCreationStatus({
        platform,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create playlist',
      });
    }
  }, [
    buildPlaylistAnalyticsProps,
    connectAppleMusicAndCreatePlaylist,
    createPlaylistOnPlatform,
    isAuthenticated,
    playlistId,
    postId,
    resolvedSourceUrl,
    setAppleMusicReconnectState,
    sourcePlatformKey,
  ]);

  useEffect(() => {
    if (!isAuthenticated || creationStatus || autoResumeAttemptedRef.current) {
      return;
    }

    const pendingAction = pendingActionService.get();
    if (!pendingAction || pendingAction.type !== 'create_playlist' || pendingAction.playlistId !== playlistId) {
      return;
    }

    try {
      const currentPath = window.location.pathname;
      const pendingPath = new URL(pendingAction.returnUrl, window.location.origin).pathname;
      if (currentPath !== pendingPath) {
        return;
      }
    } catch {
      return;
    }

    autoResumeAttemptedRef.current = true;

    if (pendingAction.platform === 'appleMusic') {
      setAppleMusicReconnectState('Connect Apple Music to continue converting this playlist.', 'Connect Apple Music');
      return;
    }

    void handleCreatePlaylist(pendingAction.platform);
  }, [creationStatus, handleCreatePlaylist, isAuthenticated, playlistId, setAppleMusicReconnectState]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void platformConnectService.preloadAppleMusic().catch((error) => {
      console.warn('Apple Music preload failed:', error);
    });
  }, [isAuthenticated]);

  // Save pending action before navigating to auth pages
  const handleAuthNavigate = () => {
    if (pendingPlatform) {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      pendingActionService.save(
        pendingActionService.createPlaylistAction(pendingPlatform, playlistId, currentUrl)
      );
    }
  };

  const renderCreationResult = () => {
    if (!creationStatus) return null;

    const service = streamingServices[creationStatus.platform];
    const serviceName = service?.name || creationStatus.platform;

    if (creationStatus.loading) {
      return (
        <div className="mt-4 p-4 rounded-xl bg-info/10 border border-info/20">
          <div className="flex items-center gap-2 text-info-text">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">
              {creationStatus.loadingMessage || `Creating playlist on ${serviceName}...`}
            </span>
          </div>
        </div>
      );
    }

    if (creationStatus.error) {
      return (
        <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{creationStatus.error}</span>
          </div>
          {creationStatus.requiresReconnect && creationStatus.platform === 'appleMusic' && (
            <button
              type="button"
              onClick={() => void connectAppleMusicAndCreatePlaylist(creationStatus.actionLabel || 'Reconnect Apple Music')}
              className={cn(
                'mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full',
                'bg-foreground text-background hover:opacity-90',
                'text-sm font-medium transition-opacity w-fit cursor-pointer'
              )}
            >
              <Image
                src={streamingServices.appleMusic.icon}
                alt={streamingServices.appleMusic.name}
                width={16}
                height={16}
                className="object-contain"
              />
              <span>{creationStatus.actionLabel || 'Reconnect Apple Music'}</span>
            </button>
          )}
        </div>
      );
    }

    if (creationStatus.result) {
      const { success, playlist_url, tracks_added, tracks_failed, total_tracks, failed_tracks } = creationStatus.result;

      if (!success) {
        return (
          <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {creationStatus.result.error_message || 'Failed to create playlist'}
              </span>
            </div>
          </div>
        );
      }

      return (
        <div className="mt-4 p-4 rounded-xl bg-success/10 border border-success/20">
          <div className="flex flex-col gap-3">
            {/* Success message */}
            <div className="flex items-center gap-2 text-success-text">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Playlist created! {tracks_added}/{total_tracks} tracks added
              </span>
            </div>

            {/* Playlist link */}
            {playlist_url && (
              <button
                type="button"
                onClick={() => {
                  const route = typeof window !== 'undefined' ? window.location.pathname : '/post';
                  const normalizedOpenedTargetPlatform: PlatformDimension = normalizePlatform(
                    creationStatus.platform === 'appleMusic' ? 'apple' : creationStatus.platform,
                  ) ?? 'unknown';
                  const openClickProps = buildPostPlatformConversionClickedProps({
                    sourceContext: 'playlist_open_button',
                    route,
                    postId,
                    elementType: 'playlist',
                    targetPlatform: creationStatus.platform === 'appleMusic'
                      ? 'apple'
                      : creationStatus.platform,
                    sourcePlatform: sourcePlatformKey ?? undefined,
                    sourceDomain: playlist_url,
                    isAuthenticated,
                  });
                  if (openClickProps) {
                    void captureClientEvent('post_platform_conversion_clicked', openClickProps);
                  }
                  void captureClientEvent('playlist_opened_on_platform', {
                    route,
                    source_surface: 'post',
                    element_type: 'playlist',
                    music_element_id: playlistId,
                    post_id: postId,
                    target_platform: normalizedOpenedTargetPlatform,
                    source_domain: sanitizeDomain(playlist_url),
                    is_authenticated: isAuthenticated,
                  });
                  openInAppOrBrowser(playlist_url);
                }}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-full',
                  'bg-success hover:bg-success/90 text-success-foreground',
                  'text-sm font-medium transition-colors w-fit cursor-pointer'
                )}
              >
                {service && (
                  <Image src={service.icon} alt={serviceName} width={16} height={16} className="object-contain" />
                )}
                <span>
                  {isAppleMusicLibraryUrl(playlist_url) ? 'View in Browser' : `Open in ${serviceName}`}
                </span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}

            {/* Failed tracks section */}
            {tracks_failed > 0 && failed_tracks && failed_tracks.length > 0 && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowFailedTracks(!showFailedTracks)}
                  className="flex items-center gap-1 text-sm text-warning-text hover:underline"
                >
                  {showFailedTracks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>{tracks_failed} track{tracks_failed !== 1 ? 's' : ''} couldn&apos;t be added</span>
                </button>

                {showFailedTracks && (
                  <div className="mt-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <ul className="space-y-1 text-sm text-warning-text">
                      {failed_tracks.map((track: FailedTrack, idx: number) => (
                        <li key={idx} className="flex justify-between">
                          <span className="truncate">
                            {track.position}. {track.track_name || 'Unknown'} - {track.artist_name || 'Unknown'}
                          </span>
                          {track.error_reason && (
                            <span className="text-xs opacity-70 ml-2">{track.error_reason}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className={cn(
        'p-3 sm:p-4 md:p-6 rounded-2xl bg-card border border-border',
        'shadow-sm',
        className,
      )}
    >
      {conversionLimitExceeded && (
        <div className="mb-4 p-3 rounded-xl bg-warning/10 border border-warning/20">
          <p className="text-sm text-warning-text">
            This playlist has {playlistTrackCount} tracks. We&apos;ll convert the first {PLAYLIST_CONVERSION_LIMIT} tracks.
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 justify-center">
        {PLATFORMS.map((platform) => {
          const isSourcePlatform = sourcePlatformKey === platform;
          const url = links[platform];
          const service = streamingServices[platform];
          if (!service) return null;

          const isLoading = creationStatus?.platform === platform && creationStatus.loading;
          const isCreated = creationStatus?.platform === platform && creationStatus.result?.success;
          const shouldShowConvertButton = isSourcePlatform || !url;

          const commonClasses = cn(
            'group relative flex items-center justify-center',
            'px-2.5 py-1.5 text-xs sm:px-4 sm:py-2.5 sm:text-sm rounded-full transition-all duration-200',
            'border-2 border-border text-foreground',
            'bg-muted hover:bg-muted/80 font-medium',
            isLoading && 'opacity-50 cursor-not-allowed',
            isCreated && 'border-success bg-success/10',
          );

          return !shouldShowConvertButton && url ? (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                const route = typeof window !== 'undefined' ? window.location.pathname : '/post';
                const openClickProps = buildPostPlatformConversionClickedProps({
                  sourceContext: 'playlist_open_button',
                  route,
                  postId,
                  elementType: 'playlist',
                  targetPlatform: platform === 'appleMusic' ? 'apple' : platform,
                  sourcePlatform: sourcePlatformKey ?? undefined,
                  sourceDomain: url,
                  isAuthenticated,
                });
                if (openClickProps) {
                  void captureClientEvent('post_platform_conversion_clicked', openClickProps);
                }
              }}
              className={commonClasses}
            >
              <div className="relative mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4">
                <Image src={service.icon} alt={service.name} width={16} height={16} className="object-contain" />
              </div>
              <span className="whitespace-nowrap">Open in {service.name}</span>
            </a>
          ) : (
            <button
              key={platform}
              type="button"
              data-testid={`playlist-convert-${platform}`}
              className={commonClasses}
              disabled={isLoading}
              onClick={() => handleCreatePlaylist(platform)}
            >
              {isLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
              ) : (
                <div className="relative mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4">
                  <Image src={service.icon} alt={service.name} width={16} height={16} className="object-contain" />
                </div>
              )}
              <span className="whitespace-nowrap">
                {isLoading ? 'Creating...' : `Convert to ${service.name}`}
              </span>
            </button>
          );
        })}
      </div>

      {renderCreationResult()}

      <AuthPromptModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        platform={pendingPlatform || undefined}
        onBeforeNavigate={handleAuthNavigate}
      />
    </div>
  );
};
