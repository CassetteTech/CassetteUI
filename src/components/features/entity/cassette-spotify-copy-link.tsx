'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiService } from '@/services/api';
import { captureClientEvent } from '@/lib/analytics/client';
import { buildPostPlatformConversionClickedProps } from '@/lib/analytics/post-platform-conversion';
import { ConversionBeam } from '@/components/features/conversion/conversion-beam';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';
import { StreamingLinks, streamingServices } from './streaming-links';

/** The caption of the Spotify row that opens Cassette's shared copy of a playlist. */
export const CASSETTE_SPOTIFY_COPY_CAPTION = 'Copy made by Cassette';

interface CassetteSpotifyCopyLinkProps {
  playlistId: string;
  postId?: string;
  sourcePlatform?: string;
  isAuthenticated?: boolean;
  paidPromotionCampaignId?: string | null;
  curatorId?: string | null;
  isMemberView?: boolean;
  className?: string;
}

/**
 * The Spotify listen row of a playlist that has no Cassette copy on Spotify yet. The first tap makes
 * Cassette's one shared copy, with no sign-in, and the row then opens it like any other listen link.
 * A browser blocks a new tab opened after the wait, so opening it takes a second tap.
 */
export function CassetteSpotifyCopyLink({
  playlistId,
  postId,
  sourcePlatform,
  isAuthenticated,
  paidPromotionCampaignId,
  curatorId,
  isMemberView,
  className,
}: CassetteSpotifyCopyLinkProps) {
  const [copyUrl, setCopyUrl] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const service = streamingServices.spotify;

  // The button that had focus is replaced by the link, so focus follows it there.
  useEffect(() => {
    const container = containerRef.current;
    const active = document.activeElement;
    if (copyUrl && container && (!active || active === document.body || container.contains(active))) {
      container.querySelector('a')?.focus();
    }
  }, [copyUrl]);

  const makeCopy = async () => {
    const clickProps = buildPostPlatformConversionClickedProps({
      sourceContext: 'playlist_convert_button',
      route: window.location.pathname,
      postId,
      elementType: 'playlist',
      targetPlatform: 'spotify',
      sourcePlatform,
      isAuthenticated,
      paidPromotionCampaignId,
      linkOrigin: 'cassette',
    });
    if (clickProps) {
      void captureClientEvent('post_platform_conversion_clicked', clickProps);
    }

    setBuilding(true);
    setError(null);
    try {
      const result = await apiService.createPlaylist(playlistId, 'spotify', postId);
      if (!result.success || !result.playlist_url) {
        throw new Error(result.error_message || 'Spotify returned no playlist link.');
      }
      setCopyUrl(result.playlist_url);
    } catch (caught) {
      setError(getUserFacingApiErrorMessage(caught, 'Cassette could not make the Spotify copy. Try again.'));
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div ref={containerRef} className={className}>
      {copyUrl ? (
        <StreamingLinks
          links={{ spotify: copyUrl }}
          captions={{ spotify: 'Ready to open' }}
          linkOrigins={{ spotify: 'cassette' }}
          postId={postId}
          elementType="playlist"
          sourcePlatform={sourcePlatform}
          isAuthenticated={isAuthenticated}
          paidPromotionCampaignId={paidPromotionCampaignId}
          curatorId={curatorId}
          isMemberView={isMemberView}
        />
      ) : (
        <ConversionBeam active={building}>
          <button
            type="button"
            data-testid="cassette-spotify-copy"
            disabled={building}
            onClick={() => void makeCopy()}
            className={cn(
              'group relative flex w-full items-stretch overflow-hidden rounded-md text-left',
              'border border-border bg-card text-foreground elev-1',
              'transition-colors duration-150',
              'hover:border-foreground/40 hover:bg-muted/40',
              'active:bg-muted/60',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            )}
          >
            <span aria-hidden className="w-1.5 shrink-0" style={{ background: service.color }} />
            <span className="flex flex-1 items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4">
              <span className="relative h-4 w-4 shrink-0 sm:h-5 sm:w-5">
                <Image src={service.icon} alt="" width={20} height={20} loading="eager" decoding="sync" className="object-contain" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.2em] sm:text-xs">
                  {service.name}
                </span>
                <span className="truncate font-roboto-flex text-xs text-muted-foreground">
                  {building ? 'Making the copy…' : CASSETTE_SPOTIFY_COPY_CAPTION}
                </span>
              </span>
              <ArrowUpRight
                aria-hidden
                className={cn(
                  'ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground',
                  building && 'motion-safe:animate-pulse',
                )}
              />
            </span>
          </button>
        </ConversionBeam>
      )}
      {error && (
        <p role="alert" className="mt-2 px-1 font-roboto-flex text-xs text-destructive">
          {error}
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {copyUrl ? "Cassette's Spotify copy is ready." : ''}
      </p>
    </div>
  );
}
