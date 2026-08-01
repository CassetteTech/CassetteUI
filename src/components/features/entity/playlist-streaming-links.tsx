'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { streamingServices } from './streaming-links';
import { apiService, ApiError } from '@/services/api';
import { detectContentType } from '@/utils/content-type-detection';
import { CreatePlaylistResponse, FailedTrack } from '@/types';
import { ArrowUpRight, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth';
import { pendingActionService } from '@/utils/pending-action';
import { platformConnectService } from '@/services/platform-connect';
import { AuthPromptModal } from '@/components/features/auth-prompt-modal';
import { ConversionBeam } from '@/components/features/conversion/conversion-beam';
import { openInAppOrBrowser, isAppleMusicLibraryUrl, handleStreamingLinkClick } from '@/utils/deep-link';
import { clientConfig } from '@/lib/config-client';
import { captureClientEvent } from '@/lib/analytics/client';
import { normalizePlatform, sanitizeDomain } from '@/lib/analytics/sanitize';
import { buildPostPlatformConversionClickedProps } from '@/lib/analytics/post-platform-conversion';
import type { AnalyticsBaseProps, PlatformDimension } from '@/lib/analytics/events';
import { appLogger } from '@/lib/observability/logger';
import {
  PLAYLIST_CREATION_PLATFORM_UI_KEYS,
  type PlatformUiKey,
  getPlatformDefinition,
  normalizePlatformUiKey,
} from '@/lib/platforms';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';
import { useReportIssue } from '@/providers/report-issue-provider';

type PlatformKey = PlatformUiKey;
type RedirectPlatformKey = Extract<PlatformKey, 'spotify' | 'deezer'>;

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

const PLATFORMS: ReadonlyArray<PlatformKey> = PLAYLIST_CREATION_PLATFORM_UI_KEYS;
const PLAYLIST_CONVERSION_LIMIT = 200;

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
  const { openReportModal } = useReportIssue();
  const [creationStatus, setCreationStatus] = useState<CreationStatus | null>(null);
  const [showFailedTracks, setShowFailedTracks] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingPlatform, setPendingPlatform] = useState<PlatformKey | null>(null);
  const autoResumeAttemptedRef = useRef(false);
  const conversionLimitExceeded =
    typeof playlistTrackCount === 'number' && playlistTrackCount > PLAYLIST_CONVERSION_LIMIT;

  const providedSourceUrl = sourceUrl?.trim();
  const detectedFromProvided = providedSourceUrl ? detectContentType(providedSourceUrl).platform : null;
  const normalizedFromProp = normalizePlatformUiKey(sourcePlatform);
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
    normalizePlatformUiKey(detectedFromProvided) ||
    normalizePlatformUiKey(detectedFromResolved) ||
    (resolvedSourceUrl
      ? (PLATFORMS.find((platform) => links[platform] === resolvedSourceUrl || links[platform]) as PlatformKey | undefined) || null
      : null);

  const buildPlaylistAnalyticsProps = React.useCallback((platform: PlatformKey): AnalyticsBaseProps => {
    const route = typeof window !== 'undefined' ? window.location.pathname : '/post';
    const targetDefinition = getPlatformDefinition(platform);
    const sourceDefinition = getPlatformDefinition(sourcePlatformKey);
    const normalizedTargetPlatform: PlatformDimension = normalizePlatform(
      targetDefinition?.analyticsKey,
    ) ?? 'unknown';
    const normalizedSourcePlatform: PlatformDimension = normalizePlatform(
      sourceDefinition?.analyticsKey,
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

  const connectRedirectPlatform = React.useCallback(async (
    platform: RedirectPlatformKey,
    reconnect = false,
  ) => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const serviceName = streamingServices[platform]?.name || platform;

    pendingActionService.save(
      pendingActionService.createPlaylistAction(platform, playlistId, currentUrl)
    );
    setCreationStatus({
      platform,
      loading: true,
      loadingMessage: `${reconnect ? 'Reconnecting' : 'Connecting'} to ${serviceName}...`,
    });

    try {
      if (platform === 'spotify') {
        await platformConnectService.connectSpotify(currentUrl);
      } else {
        await platformConnectService.connectDeezer(currentUrl);
      }
    } catch (error) {
      pendingActionService.clear();
      platformConnectService.clearReturnUrl(platform);
      setCreationStatus({
        platform,
        loading: false,
        error: getUserFacingApiErrorMessage(
          error,
          `Failed to ${reconnect ? 'reconnect' : 'connect'} ${serviceName}. Please try again.`,
        ),
      });
    }
  }, [playlistId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    const match = /^(spotify|deezer)-(auth-denied|invalid-callback|callback-failed)$/.exec(
      oauthError ?? '',
    );
    if (!match) {
      return;
    }

    const platform = match[1] as RedirectPlatformKey;
    const serviceName = streamingServices[platform]?.name || platform;
    const wasDenied = match[2] === 'auth-denied';
    setCreationStatus({
      platform,
      loading: false,
      error: wasDenied
        ? `${serviceName} connection was canceled. Try again to create this playlist.`
        : `Could not connect ${serviceName}. Please try again.`,
      requiresReconnect: true,
      actionLabel: `Try ${serviceName} again`,
    });

    params.delete('error');
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
    );
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

    void captureClientEvent('playlist_created_on_platform', {
      ...buildPlaylistAnalyticsProps(platform),
      tracks_added: result.tracks_added,
      tracks_failed: result.tracks_failed,
      total_tracks: result.total_tracks,
    });
  }, [buildPlaylistAnalyticsProps, playlistId, postId]);

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
        pendingActionService.clear();
        setAppleMusicReconnectState('Failed to connect to Apple Music. Please try again.', actionLabel);
        return;
      }
    } catch (error) {
      pendingActionService.clear();
      if (error instanceof ApiError && error.requiresReauth) {
        setAppleMusicReconnectState('Your Apple Music connection expired. Reconnect to continue.', 'Reconnect Apple Music');
        return;
      }

      setCreationStatus({
        platform: 'appleMusic',
        loading: false,
        error: getUserFacingApiErrorMessage(error, 'Failed to connect to Apple Music. Please try again.'),
        requiresReconnect: true,
        actionLabel,
      });
      return;
    } finally {
      platformConnectService.clearReturnUrl('appleMusic');
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
        error: getUserFacingApiErrorMessage(error, 'Failed to create playlist. Please try again.'),
      });
    }
  }, [createPlaylistOnPlatform, playlistId, setAppleMusicReconnectState]);

  const openCreatedPlaylist = React.useCallback((platform: PlatformKey, playlistUrl: string) => {
    const route = typeof window !== 'undefined' ? window.location.pathname : '/post';
    const normalizedTarget = getPlatformDefinition(platform)?.analyticsKey ?? platform;
    const normalizedOpenedTargetPlatform: PlatformDimension = normalizePlatform(normalizedTarget) ?? 'unknown';
    const openClickProps = buildPostPlatformConversionClickedProps({
      sourceContext: 'playlist_open_button',
      route,
      postId,
      elementType: 'playlist',
      targetPlatform: normalizedTarget,
      sourcePlatform: sourcePlatformKey ?? undefined,
      sourceDomain: playlistUrl,
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
      source_domain: sanitizeDomain(playlistUrl),
      is_authenticated: isAuthenticated,
    });
    openInAppOrBrowser(playlistUrl);
  }, [isAuthenticated, playlistId, postId, sourcePlatformKey]);

  const handleCreatePlaylist = React.useCallback(async (platform: PlatformKey) => {
    const normalizedTarget = getPlatformDefinition(platform)?.analyticsKey ?? platform;
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

        // No connection - trigger the platform's existing auth flow.
        if (platform === 'appleMusic') {
          await connectAppleMusicAndCreatePlaylist('Connect Apple Music');
        } else {
          await connectRedirectPlatform(platform);
        }
        return;
      }

      // Case 3: Has connection - create playlist directly
      await createPlaylistOnPlatform(platform);
    } catch (error) {
      if (error instanceof ApiError && error.requiresReauth) {
        if (platform === 'appleMusic') {
          setAppleMusicReconnectState('Your Apple Music connection expired. Reconnect to continue.', 'Reconnect Apple Music');
        } else {
          await connectRedirectPlatform(platform, true);
        }
        return;
      }

      setCreationStatus({
        platform,
        loading: false,
        error: getUserFacingApiErrorMessage(error, 'Failed to create playlist. Please try again.'),
      });
    }
  }, [
    buildPlaylistAnalyticsProps,
    connectAppleMusicAndCreatePlaylist,
    connectRedirectPlatform,
    createPlaylistOnPlatform,
    isAuthenticated,
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
      appLogger.warn('apple_music_preload_failed', { error, route: '/post/[id]' });
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
      // The beam on the active row carries the loading state; this line just
      // narrates the stage (connecting vs creating) without a second spinner.
      return (
        <p
          aria-live="polite"
          className="mt-3 truncate px-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
        >
          {creationStatus.loadingMessage || `Creating playlist on ${serviceName}...`}
        </p>
      );
    }

    if (creationStatus.error) {
      return (
        <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{creationStatus.error}</span>
          </div>
          {creationStatus.requiresReconnect && (
            <button
              type="button"
              onClick={() => {
                if (creationStatus.platform === 'appleMusic') {
                  void connectAppleMusicAndCreatePlaylist(
                    creationStatus.actionLabel || 'Reconnect Apple Music',
                  );
                } else {
                  void connectRedirectPlatform(creationStatus.platform, true);
                }
              }}
              className={cn(
                'mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full',
                'bg-foreground text-background hover:opacity-90',
                'text-sm font-medium transition-opacity w-fit cursor-pointer'
              )}
            >
              <Image
                src={service.icon}
                alt={serviceName}
                width={16}
                height={16}
                className="object-contain"
              />
              <span>{creationStatus.actionLabel || `Reconnect ${serviceName}`}</span>
            </button>
          )}
        </div>
      );
    }

    if (creationStatus.result) {
      const { success, tracks_added, tracks_failed, total_tracks, failed_tracks } = creationStatus.result;

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

      // The converted row itself is the open action now; this just confirms
      // the outcome and surfaces any tracks that didn't make it over.
      return (
        <div className="mt-3 px-1">
          <p
            aria-live="polite"
            className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-success-text"
          >
            <CheckCircle aria-hidden className="h-3.5 w-3.5 shrink-0" />
            <span>Playlist created! {tracks_added}/{total_tracks} tracks added</span>
          </p>

          {tracks_failed > 0 && failed_tracks && failed_tracks.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowFailedTracks(!showFailedTracks)}
                className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-warning-text hover:underline"
              >
                {showFailedTracks ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                <span>{tracks_failed} track{tracks_failed !== 1 ? 's' : ''} couldn&apos;t be added</span>
              </button>

              {showFailedTracks && (
                <div className="mt-2 border-l-2 border-warning/40 pl-3">
                  <ul className="space-y-1 text-sm text-warning-text">
                    {failed_tracks.map((track: FailedTrack, idx: number) => (
                      <li key={idx} className="flex justify-between">
                        <span className="truncate">
                          {track.position}. {track.track_name || 'Unknown'} - {track.artist_name || 'Unknown'}
                        </span>
                        {(track.reason_code || track.error_reason) && (
                          <span className="ml-2 text-xs opacity-70">{track.reason_code || track.error_reason}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => openReportModal({
                      sourceContext: 'playlist_creation',
                      sourceLink: resolvedSourceUrl ?? undefined,
                      conversionData: {
                        elementType: 'playlist',
                        postId,
                        correlationId: creationStatus.result?.correlationId,
                        sourcePlatform: sourcePlatformKey ?? undefined,
                        targetPlatform: creationStatus.platform,
                        failedTracks: failed_tracks,
                      },
                    })}
                    className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-warning-text hover:underline"
                  >
                    Report these failures
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className={cn('w-full', className)}>
      {conversionLimitExceeded && (
        <div className="mb-4 p-3 rounded-xl bg-warning/10 border border-warning/20">
          <p className="text-sm text-warning-text">
            This playlist has {playlistTrackCount} tracks. We&apos;ll convert the first {PLAYLIST_CONVERSION_LIMIT} tracks.
          </p>
        </div>
      )}
      <div className="grid gap-2.5">
        {PLATFORMS.map((platform) => {
          const isSourcePlatform = sourcePlatformKey === platform;
          const url = links[platform];
          const service = streamingServices[platform];
          if (!service) return null;

          const anyLoading = !!creationStatus?.loading;
          const isLoading = creationStatus?.platform === platform && anyLoading;
          const isCreated = creationStatus?.platform === platform && creationStatus.result?.success;
          const createdUrl = isCreated ? creationStatus?.result?.playlist_url : undefined;
          const shouldShowConvertButton = isSourcePlatform || !url;

          const commonClasses = cn(
            'group relative flex w-full items-stretch overflow-hidden rounded-md',
            'border border-border bg-card text-foreground elev-1',
            'transition-[color,background-color,border-color,opacity] duration-150',
            'hover:border-foreground/40 hover:bg-muted/40',
            'active:bg-muted/60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            // The beam highlights the converting row; the others step back.
            anyLoading && !isLoading && 'opacity-40 pointer-events-none',
            isCreated && 'border-success bg-success/5 hover:border-success hover:bg-success/10',
          );

          return !shouldShowConvertButton && url ? (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                const route = typeof window !== 'undefined' ? window.location.pathname : '/post';
                const targetPlatform = getPlatformDefinition(platform)?.analyticsKey ?? platform;
                const openClickProps = buildPostPlatformConversionClickedProps({
                  sourceContext: 'playlist_open_button',
                  route,
                  postId,
                  elementType: 'playlist',
                  targetPlatform,
                  sourcePlatform: sourcePlatformKey ?? undefined,
                  sourceDomain: url,
                  isAuthenticated,
                });
                if (openClickProps) {
                  void captureClientEvent('post_platform_conversion_clicked', openClickProps);
                }
                handleStreamingLinkClick(event, url);
              }}
              className={commonClasses}
            >
              <span aria-hidden className="w-1.5 shrink-0" style={{ background: service.color }} />
              <span className="flex flex-1 items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4">
                <span className="relative h-4 w-4 shrink-0 sm:h-5 sm:w-5">
                  <Image src={service.icon} alt="" width={20} height={20} className="object-contain" />
                </span>
                <span className="whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.2em] sm:text-xs">
                  {service.name}
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                />
              </span>
            </a>
          ) : (
            <ConversionBeam key={platform} active={isLoading}>
              <button
                type="button"
                data-testid={`playlist-convert-${platform}`}
                className={commonClasses}
                disabled={anyLoading}
                aria-label={createdUrl
                  ? (isAppleMusicLibraryUrl(createdUrl) ? 'View in Browser' : `Open in ${service.name}`)
                  : undefined}
                onClick={() => {
                  if (createdUrl) {
                    openCreatedPlaylist(platform, createdUrl);
                  } else {
                    void handleCreatePlaylist(platform);
                  }
                }}
              >
                <span aria-hidden className="w-1.5 shrink-0" style={{ background: service.color }} />
                <span className="flex flex-1 items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4">
                  <span className="relative h-4 w-4 shrink-0 sm:h-5 sm:w-5">
                    <Image src={service.icon} alt="" width={20} height={20} className="object-contain" />
                  </span>
                  <span className="whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.2em] sm:text-xs">
                    {service.name}
                  </span>
                  {createdUrl ? (
                    <span
                      aria-hidden
                      className={cn(
                        'ml-auto flex items-center gap-1 rounded-sm px-2.5 py-1',
                        'bg-success text-success-foreground',
                        'font-mono text-[9px] font-bold uppercase tracking-[0.2em]',
                        'transition-colors duration-150 group-hover:bg-success/90',
                      )}
                    >
                      {isAppleMusicLibraryUrl(createdUrl) ? 'View' : 'Open'}
                      <ArrowUpRight className="h-3 w-3 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className={cn(
                        'ml-auto font-mono text-[9px] uppercase tracking-[0.2em] transition-colors',
                        isLoading
                          ? 'animate-pulse text-primary'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    >
                      {isLoading ? 'Converting…' : 'Convert'}
                    </span>
                  )}
                </span>
              </button>
            </ConversionBeam>
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
