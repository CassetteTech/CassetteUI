'use client';

import React, { useState } from 'react';
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
  onLinkClick?: (payload: { platform: string; url: string }) => void;
}

interface CreationStatus {
  platform: PlatformKey;
  loading: boolean;
  result?: CreatePlaylistResponse;
  error?: string;
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
  onLinkClick,
}) => {
  const { isAuthenticated } = useAuthState();
  const [creationStatus, setCreationStatus] = useState<CreationStatus | null>(null);
  const [showFailedTracks, setShowFailedTracks] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingPlatform, setPendingPlatform] = useState<PlatformKey | null>(null);
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
  const sourcePlatformKey =
    normalizedFromProp ||
    normalizePlatformKey(detectedFromProvided) ||
    normalizePlatformKey(detectedFromResolved) ||
    (resolvedSourceUrl
      ? (PLATFORMS.find((platform) => links[platform] === resolvedSourceUrl || links[platform]) as PlatformKey | undefined) || null
      : null);

  const handleCreatePlaylist = async (platform: PlatformKey) => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

    // Case 1: User not logged in - show auth modal
    if (!isAuthenticated) {
      setPendingPlatform(platform);
      setAuthModalOpen(true);
      return;
    }

    // Case 2: User logged in - check if they have platform connection
    setCreationStatus({ platform, loading: true });
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
        // No connection - trigger OAuth flow
        pendingActionService.save(
          pendingActionService.createPlaylistAction(platform, playlistId, currentUrl)
        );

        if (platform === 'spotify') {
          // Spotify uses redirect-based OAuth
          await platformConnectService.connectSpotify(currentUrl);
          return; // Will redirect to Spotify
        } else if (platform === 'appleMusic') {
          // Apple Music uses modal-based auth (no redirect)
          const success = await platformConnectService.connectAppleMusic(currentUrl);
          if (success) {
            // Connected successfully, now create the playlist
            pendingActionService.clear();
            const result = await apiService.createPlaylist(playlistId, platform.toLowerCase(), postId);
            setCreationStatus({ platform, loading: false, result });
          } else {
            setCreationStatus({
              platform,
              loading: false,
              error: 'Failed to connect to Apple Music. Please try again.',
            });
          }
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
      const result = await apiService.createPlaylist(playlistId, platform.toLowerCase(), postId);
      setCreationStatus({ platform, loading: false, result });
    } catch (error) {
      // Check if this is an auth error requiring re-authentication
      if (error instanceof ApiError && error.requiresReauth && platform === 'appleMusic') {
        // Clear the old connection and trigger re-auth flow
        pendingActionService.save(
          pendingActionService.createPlaylistAction(platform, playlistId, currentUrl)
        );
        const success = await platformConnectService.connectAppleMusic(currentUrl);
        if (success) {
          // Reconnected successfully, retry the playlist creation
          pendingActionService.clear();
          try {
            const retryResult = await apiService.createPlaylist(playlistId, platform.toLowerCase(), postId);
            setCreationStatus({ platform, loading: false, result: retryResult });
          } catch (retryError) {
            setCreationStatus({
              platform,
              loading: false,
              error: retryError instanceof Error ? retryError.message : 'Failed to create playlist after reconnecting',
            });
          }
        } else {
          setCreationStatus({
            platform,
            loading: false,
            error: 'Please reconnect your Apple Music account to continue.',
          });
        }
        return;
      }

      setCreationStatus({
        platform,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create playlist',
      });
    }
  };

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
        <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Creating playlist on {serviceName}...</span>
          </div>
        </div>
      );
    }

    if (creationStatus.error) {
      return (
        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{creationStatus.error}</span>
          </div>
        </div>
      );
    }

    if (creationStatus.result) {
      const { success, playlist_url, tracks_added, tracks_failed, total_tracks, failed_tracks } = creationStatus.result;

      if (!success) {
        return (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {creationStatus.result.error_message || 'Failed to create playlist'}
              </span>
            </div>
          </div>
        );
      }

      return (
        <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex flex-col gap-3">
            {/* Success message */}
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
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
                  onLinkClick?.({ platform: creationStatus.platform, url: playlist_url });
                  openInAppOrBrowser(playlist_url);
                }}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-full',
                  'bg-green-600 hover:bg-green-700 text-white',
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
                  className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400 hover:underline"
                >
                  {showFailedTracks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>{tracks_failed} track{tracks_failed !== 1 ? 's' : ''} couldn&apos;t be added</span>
                </button>

                {showFailedTracks && (
                  <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
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
        'p-6 rounded-2xl bg-text-primary/5 border border-text-primary/10',
        'shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      {conversionLimitExceeded && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-700 dark:text-amber-300">
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
            'px-4 py-2.5 rounded-full transition-all duration-200',
            'border-2 border-foreground/60 text-foreground',
            'bg-card/80 hover:bg-card text-sm font-medium backdrop-blur-sm',
            isLoading && 'opacity-50 cursor-not-allowed',
            isCreated && 'border-green-500 bg-green-500/10',
          );

          return !shouldShowConvertButton && url ? (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onLinkClick?.({ platform, url })}
              className={commonClasses}
            >
              <div className="relative w-4 h-4 mr-2">
                <Image src={service.icon} alt={service.name} width={16} height={16} className="object-contain" />
              </div>
              <span className="whitespace-nowrap">Open in {service.name}</span>
            </a>
          ) : (
            <button
              key={platform}
              type="button"
              className={commonClasses}
              disabled={isLoading}
              onClick={() => handleCreatePlaylist(platform)}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <div className="relative w-4 h-4 mr-2">
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
