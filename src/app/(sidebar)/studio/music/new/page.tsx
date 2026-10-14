'use client';

/** Creates a music post from search or a provider link, including its caption and visibility. */

import { useState, useEffect, useEffectEvent, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UrlBar } from '@/components/ui/url-bar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StudioChip } from '@/components/features/curator/studio-shell';
import { ChevronDown, Music2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTopCharts, useMusicSearch, useMusicLinkConversion } from '@/hooks/use-music';
import { useAuthState } from '@/hooks/use-auth';
import { useDebounce } from '@/hooks/use-debounce';
import { useConversionStage } from '@/hooks/use-conversion-stage';
import { useSheetViewportPin } from '@/hooks/use-sheet-viewport-pin';
import { PLATFORM_LABELS, pickConvertingHeadline } from '@/components/features/conversion/conversion-copy';
import { ConversionBeam } from '@/components/features/conversion/conversion-beam';
import { ConversionHeading } from '@/components/features/conversion/conversion-heading';
import { ConversionStageLabel } from '@/components/features/conversion/conversion-stage-label';
import { SearchResults } from '@/components/features/search-results';
import { MusicSearchResult } from '@/types';
import { PageLoader } from '@/components/ui/page-loader';
import { Skeleton } from '@/components/ui/skeleton';
import { ArtworkImage } from '@/components/ui/artwork-image';
import { BackButton } from '@/components/ui/back-button';
import { captureClientEvent } from '@/lib/analytics/client';
import { apiService } from '@/services/api';
import { savePrefetchedPost } from '@/lib/post-prefetch';
import { HANDOFF_BEAT_MS, handOffConversion } from '@/lib/conversion-handoff';
import { clearReturnedAddMusicDraft, holdAddMusicDraft, readReturnedAddMusicDraft } from '@/lib/add-music-draft';
import { playErrorTone, playLinkRecognized } from '@/lib/sounds';
import { detectContentType } from '@/utils/content-type-detection';
import { sanitizeDomain } from '@/lib/analytics/sanitize';
import {
  normalizeMusicLinkInput,
  isSupportedMusicLink,
  getMusicSourceLabel,
  isPasteLikeInputEvent,
  validateMusicLink,
} from '@/utils/music-link-input';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';
import { normalizeAuthRedirect } from '@/utils/auth-redirect';
import { PostVisibilityControl } from '@/components/features/post/post-visibility-control';
import { PlaylistLinkFields } from '@/components/features/post/playlist-link-fields';
import { getPlatformDefinition, type PlatformUiKey } from '@/lib/platforms';
import { curatorLinkPlatforms, playlistLinkErrors, toBridgePlatformLinks, type ByService } from '@/lib/playlist-copy-placement';
import { studioLabels, studioViewOfPath } from '@/components/features/curator/studio-routes';
import type { MusicLinkConversion, PostPrivacy } from '@/types';
import { cn } from '@/lib/utils';

// Analytics keep the route name this page had before it moved into Curator Studio, so funnels stay continuous.
const ANALYTICS_ROUTE = '/add-music';

type SelectedItem = {
  id: string;
  title: string;
  artist: string;
  type: string;
  url: string;
  coverArtUrl: string;
};

type ConvertingMeta = {
  title?: string;
  artist?: string;
  artwork?: string;
  kicker: string;
  fallbackLabel: string;
  headline: string;
};

/** Shared props for the picker (bar, pending music, results) and the details form. */
type PickerProps = {
  isSearchActive: boolean;
  selectedItem: SelectedItem | null;
  pastedLinkSource: string | null;
  musicUrl: string;
  debouncedSearchTerm: string;
  handleUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSearchFocus: () => void;
  handlePaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  clearSelection: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  displayData: MusicSearchResult | undefined;
  isLoadingCharts: boolean;
  isSearchingMusic: boolean;
  handleSelectItem: (url: string, title: string, type: string) => void;
  closeSearch: () => void;
  isConverting: boolean;
  convertingMeta: ConvertingMeta | null;
  conversionStageLabel: string;
  /** Desktop right rail: results stay open under the bar, like the homepage. */
  rail?: boolean;
};

/** The music picker: the homepage bar, the pending music card, and the
    results. On phones the region becomes a full-screen sheet while searching
    so the input never re-parents (the iOS keyboard stays up). In the desktop
    rail the results stay expanded under the bar. */
const MusicPicker = ({
  isSearchActive,
  selectedItem,
  pastedLinkSource,
  musicUrl,
  debouncedSearchTerm,
  handleUrlChange,
  handleSearchFocus,
  handlePaste,
  handleInputKeyDown,
  clearSelection,
  searchInputRef,
  displayData,
  isLoadingCharts,
  isSearchingMusic,
  handleSelectItem,
  closeSearch,
  isConverting,
  convertingMeta,
  conversionStageLabel,
  rail = false,
}: PickerProps) => {
  // Pin the open sheet to the visual viewport: the iOS keyboard pans the
  // visual viewport, which would otherwise push the bar and the top of the
  // results out of view the moment the input focuses.
  const sheetRef = useSheetViewportPin(isSearchActive);
  const showResults = musicUrl.length >= 2 && !musicUrl.includes('http');
  const pending = selectedItem || pastedLinkSource;
  const cardTitle = selectedItem ? selectedItem.title : `${pastedLinkSource} link pasted`;

  return (
    <div
      ref={sheetRef}
      data-search-region
      className={
        isSearchActive && !rail
          ? 'fixed inset-0 z-[60] flex flex-col'
          : rail
            // Pending music centers on the details card beside it; the open bar shares its top edge.
            ? cn('flex min-h-0 flex-col', pending && 'self-stretch justify-center')
            : 'mb-6'
      }
      style={{ overscrollBehavior: 'contain' }}
    >
      {/* Sheet backdrop — fades in under the gliding bar; fixed inside an
          untransformed ancestor so it always covers the real viewport */}
      <AnimatePresence>
        {isSearchActive && !rail && (
          <motion.div
            key="search-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 -z-10 bg-background"
          />
        )}
      </AnimatePresence>

      {/* Bar row — the single layout element that glides between its in-flow
          and sheet-top positions. layout="position" translates without
          scale-correcting, so the bar's contents never squish mid-flight. */}
      <motion.div
        layout="position"
        transition={{ layout: { type: 'spring', damping: 28, stiffness: 260 } }}
        className={
          isSearchActive && !rail
            ? 'w-full px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2'
            : rail ? cn('relative w-full', !pending && 'mb-4') : 'mb-4'
        }
      >
        {/* Converting: kicker + headline narrate above the beamed card. The rail keeps
            the card where it is and sets the heading above it; the page column opens
            room for the heading, so the card and the details glide down instead of jumping. */}
        <AnimatePresence>
          {isConverting && convertingMeta && (
            <motion.div
              key="conversion-heading"
              initial={rail ? false : { height: 0 }}
              animate={rail ? undefined : { height: 'auto' }}
              exit={rail ? undefined : { height: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={rail ? 'absolute inset-x-0 bottom-full mb-5' : 'overflow-hidden'}
            >
              <ConversionHeading
                kicker={convertingMeta.kicker}
                headline={convertingMeta.headline}
                className={rail ? undefined : 'pb-5'}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* The beam wraps whichever element holds the pending music — the
            bar, a picked search result, or a pasted link card — so the
            conversion lights up in place instead of jumping to an overlay.
            It must wrap each element DIRECTLY: the package reads its first
            child's computed corner radius (and clips to it), so an
            intermediate wrapper div makes it clip at the wrong radius. */}
        <AnimatePresence mode="wait" initial={false}>
          {!pending ? (
            <motion.div
              key="url-bar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <ConversionBeam active={isConverting}>
                <UrlBar variant="light" beamActive={isConverting} className="w-full" data-converting-card={isConverting || undefined}>
                  {isConverting ? (
                    <div className="flex h-full w-full flex-col items-center justify-center px-4 sm:px-6">
                      <span className="w-full truncate text-center text-sm sm:text-base font-semibold text-foreground">
                        {convertingMeta?.title ?? convertingMeta?.fallbackLabel ?? 'Music link'}
                      </span>
                      <ConversionStageLabel label={conversionStageLabel} />
                    </div>
                  ) : (
                    <input
                      ref={searchInputRef}
                      id="add-music-search-input"
                      data-testid="add-music-input"
                      value={musicUrl}
                      onChange={handleUrlChange}
                      onFocus={handleSearchFocus}
                      onPaste={handlePaste}
                      onKeyDown={handleInputKeyDown}
                      placeholder="Search or paste your music link here"
                      aria-label="Music link or search"
                      className="w-full h-full bg-transparent border-none outline-none text-center text-foreground placeholder:text-muted-foreground px-3 sm:px-4 md:px-6 text-sm sm:text-base"
                      style={{ fontSize: '16px', touchAction: 'manipulation' }}
                    />
                  )}
                </UrlBar>
              </ConversionBeam>
            </motion.div>
          ) : (
            <motion.div
              key={selectedItem ? 'selected-item' : 'pasted-link'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {/* Pending music — a tilted ticket that straightens while
                  converting so the beam's clip matches the card's corners */}
              <ConversionBeam active={isConverting}>
              <div data-converting-card={isConverting || undefined} className={`card-ink p-4 transition-[transform,box-shadow] duration-300 ${
                isConverting
                  ? 'shadow-[0_2px_6px_rgba(0,0,0,0.05),0_4px_42px_rgba(0,0,0,0.06)]'
                  : '-rotate-1 elev-soft'
              }`}>
                <div className="flex items-center gap-3">
                  {selectedItem?.coverArtUrl ? (
                    <ArtworkImage
                      src={selectedItem.coverArtUrl}
                      alt={cardTitle}
                      width={48}
                      height={48}
                      unoptimized
                      className="size-12 shrink-0 rounded-md object-cover ring-1 ring-border/40"
                      fallbackClassName="size-12 shrink-0 rounded-md"
                    />
                  ) : (
                    <div className={`flex size-12 shrink-0 items-center justify-center rounded-md ${selectedItem ? 'bg-muted' : 'rounded-full bg-success/10'}`}>
                      <Music2 className={`size-5 ${selectedItem ? 'text-muted-foreground' : 'text-success-text'}`} aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-atkinson font-bold text-foreground">{cardTitle}</p>
                    {selectedItem?.artist && <p className="truncate text-sm text-muted-foreground">{selectedItem.artist}</p>}
                    {isConverting ? (
                      <ConversionStageLabel label={conversionStageLabel} className="mt-1 block" />
                    ) : selectedItem ? (
                      <StudioChip tone="positive" className="mt-1.5 capitalize">{selectedItem.type}</StudioChip>
                    ) : (
                      <p className="truncate font-mono text-sm text-muted-foreground">{musicUrl}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={isConverting}
                    aria-label={selectedItem ? 'Clear selection' : 'Clear link'}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              </ConversionBeam>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Results: the sheet body on phones; open in the desktop rail until
          music is pending. popLayout lifts the closing list out of flow at
          once, so the bar row's layout spring glides the card to the
          column's vertical center while the list fades — the homepage move. */}
      {rail ? (
        <AnimatePresence mode="popLayout" initial={false}>
          {!pending && (
            <motion.div
              key="rail-results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="search-container min-h-0 overflow-hidden"
              style={{ overscrollBehavior: 'contain' }}
            >
              <SearchResults
                results={displayData}
                query={debouncedSearchTerm}
                isLoading={isLoadingCharts}
                isSearching={isSearchingMusic}
                showSearchResults={showResults}
                onSelectItem={handleSelectItem}
                onClose={closeSearch}
                SkeletonComponent={Skeleton}
                className="lg:mb-0 lg:max-w-none lg:px-0"
              />
            </motion.div>
          )}
        </AnimatePresence>
      ) : isSearchActive && (
        <motion.div
          key="search-results"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="search-container min-h-0 w-full flex-1 overflow-y-auto pb-4 pt-2"
          style={{ overscrollBehavior: 'contain' }}
          onPointerDown={(e) => {
            // Tapping the empty area below the list dismisses, like a sheet scrim
            if (e.target === e.currentTarget) closeSearch();
          }}
        >
          <SearchResults
            results={displayData}
            query={debouncedSearchTerm}
            isLoading={isLoadingCharts}
            isSearching={isSearchingMusic}
            showSearchResults={showResults}
            onSelectItem={handleSelectItem}
            onClose={closeSearch}
            chrome="flat"
            className="px-4 sm:px-4"
          />
        </motion.div>
      )}
    </div>
  );
};

/** The owner's own playlist links, offered only while the pending music is a playlist. */
type PlaylistLinksProps = {
  sourcePlatform: PlatformUiKey | null;
  values: ByService<string>;
  errors: ByService<string>;
  onChange: (platform: PlatformUiKey, value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

/** Post details: description and visibility, then the submit. Collapses on
    phones while the search sheet is open; on desktop it always stays put. */
const PostDetails = ({
  collapsed,
  description,
  setDescription,
  privacy,
  setPrivacy,
  playlistLinks,
  handleAddToProfile,
  errorMessage,
  isConverting,
  canSubmit,
}: {
  collapsed: boolean;
  description: string;
  setDescription: (value: string) => void;
  privacy: PostPrivacy;
  setPrivacy: (value: PostPrivacy) => void;
  playlistLinks: PlaylistLinksProps | null;
  handleAddToProfile: () => void;
  errorMessage: string;
  isConverting: boolean;
  canSubmit: boolean;
}) => {
  return (
    <motion.div
      initial={false}
      animate={{ height: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="overflow-hidden lg:!h-auto lg:!opacity-100"
    >
      <div className={`transition-opacity duration-500 ${isConverting ? 'opacity-25 pointer-events-none select-none' : ''}`}>
        <div className="card-quiet">
          <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-2">
              <Label htmlFor="add-music-description">Description</Label>
              <Textarea
                id="add-music-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us how you feel about the music"
                rows={5}
                disabled={isConverting}
                className="resize-none"
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            {/* The conversion request already carries the chosen setting, so it holds while converting. */}
            <PostVisibilityControl privacy={privacy} choose={setPrivacy} disabled={isConverting} headingAs="h2" />

            {/* Optional and closed by default: most playlists need no links of their own. */}
            {playlistLinks && (
              <details
                open={playlistLinks.open}
                onToggle={(event) => playlistLinks.setOpen(event.currentTarget.open)}
                className="group rounded-md border border-border/70"
              >
                <summary
                  data-testid="add-music-playlist-links"
                  className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
                >
                  Send fans to your own playlists
                  <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                    Optional
                    <ChevronDown aria-hidden className="size-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
                  </span>
                </summary>
                <div className="border-t border-border/70 px-4 py-4">
                  <PlaylistLinkFields
                    sourcePlatform={playlistLinks.sourcePlatform}
                    values={playlistLinks.values}
                    errors={playlistLinks.errors}
                    onChange={playlistLinks.onChange}
                    disabled={isConverting}
                  />
                </div>
              </details>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/70 px-5 py-4 sm:px-6">
            <Button
              type="button"
              size="lg"
              onClick={handleAddToProfile}
              disabled={isConverting || !canSubmit}
              data-testid="add-music-submit"
              className="w-full sm:w-auto"
            >
              {isConverting ? 'Adding to your profile…' : 'Add to profile'}
            </Button>
            {errorMessage ? (
              <p role="alert" className="text-sm text-destructive">{errorMessage}</p>
            ) : !canSubmit ? (
              <p className="text-xs text-muted-foreground">Pick your music first.</p>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function AddMusicPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledUrl = searchParams?.get('url') || '';
  // A conversion that failed after the post page took it over comes back here as it was left.
  const [returnedDraft] = useState(readReturnedAddMusicDraft);
  const returnedSelection = returnedDraft?.selection;

  const [musicUrl, setMusicUrl] = useState(returnedSelection?.title ?? returnedDraft?.link ?? prefilledUrl);
  const [description, setDescription] = useState(returnedDraft?.description ?? '');
  const [privacy, setPrivacy] = useState<PostPrivacy>(returnedDraft?.privacy ?? 'public');
  const [platformLinks, setPlatformLinks] = useState<ByService<string>>(returnedDraft?.platformLinks ?? {});
  const [platformLinkErrors, setPlatformLinkErrors] = useState<ByService<string>>({});
  const [platformLinksOpen, setPlatformLinksOpen] = useState(
    () => Object.values(returnedDraft?.platformLinks ?? {}).some(Boolean),
  );
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(() =>
    returnedSelection ? { id: `selected-${Date.now()}`, ...returnedSelection } : null,
  );
  const [pastedLinkSource, setPastedLinkSource] = useState<string | null>(() =>
    returnedDraft && !returnedSelection ? getMusicSourceLabel(returnedDraft.link) : null,
  );
  const [errorMessage, setErrorMessage] = useState(returnedDraft?.errorMessage ?? '');
  // Idempotency key of the in-flight conversion; doubles as the "converting" flag.
  const [conversionKey, setConversionKey] = useState<string | null>(null);
  // What's being converted, for the in-place beamed card copy.
  const [convertingMeta, setConvertingMeta] = useState<ConvertingMeta | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastTrackedSearchRef = useRef<string>('');
  // The conversion in flight, until it finishes here or is handed to the post page.
  const runningRef = useRef<{
    url: string;
    key: string;
    result: Promise<MusicLinkConversion>;
    platformLinks: ByService<string> | null;
  } | null>(null);
  const handedOffRef = useRef(false);
  const debouncedSearchTerm = useDebounce(musicUrl, 300); // matches the home page search feel
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
  // Back and the finished post return to the page that opened this one, else the curator's profile.
  const resolvedReturnRoute = normalizeAuthRedirect(searchParams?.get('from'))
    ?? (user?.username ? `/profile/${user.username}` : null);
  const linkConversion = useMusicLinkConversion();
  const { stage: conversionStage, label: conversionStageLabel, partialResult } = useConversionStage(conversionKey);
  const isConverting = conversionKey != null;
  // A playlist takes the owner's own link for each service but the one it came from.
  const pendingUrl = selectedItem?.url ?? (pastedLinkSource ? musicUrl : '');
  const pendingMusic = pendingUrl ? detectContentType(normalizeMusicLinkInput(pendingUrl)) : null;
  const pendingIsPlaylist = selectedItem ? selectedItem.type === 'playlist' : pendingMusic?.type === 'playlist';
  const pendingSourcePlatform = pendingMusic ? getPlatformDefinition(pendingMusic.platform)?.uiKey ?? null : null;

  // As on the home page, the post builds on its own page: after a short beat of the beam,
  // the card grows into the post skeleton, which fills in as Bridge reports the music.
  // A conversion that finishes or fails within the beat stays on the old path.
  const handOffToPost = useEffectEvent(() => {
    const running = runningRef.current;
    if (!running) return;
    handedOffRef.current = true;
    const query = searchParams?.toString();
    holdAddMusicDraft(running.key, {
      path: query ? `/studio/music/new?${query}` : '/studio/music/new',
      link: running.url,
      selection: selectedItem
        ? {
            title: selectedItem.title,
            artist: selectedItem.artist,
            type: selectedItem.type,
            url: selectedItem.url,
            coverArtUrl: selectedItem.coverArtUrl,
          }
        : null,
      description,
      privacy,
      platformLinks,
      pushed: !resolvedReturnRoute,
    });
    const card = Array.from(document.querySelectorAll<HTMLElement>('[data-converting-card]')).find(
      (element) => element.getClientRects().length > 0,
    );
    const box = card?.getBoundingClientRect();
    handOffConversion({
      url: running.url,
      anonymous: false,
      barRect: box ? { left: box.left, top: box.top, width: box.width, height: box.height } : null,
      curatorLinks: running.platformLinks ? { handle: user?.username ?? null, links: running.platformLinks } : undefined,
      running: {
        idempotencyKey: running.key,
        result: running.result,
        reported: { stageLabel: conversionStage ? conversionStageLabel : null, partialResult },
      },
    });
    const fromQuery = resolvedReturnRoute ? `&from=${encodeURIComponent(resolvedReturnRoute)}` : '';
    const target = `/post?url=${encodeURIComponent(running.url)}${fromQuery}`;
    if (resolvedReturnRoute) {
      router.replace(target);
    } else {
      router.push(target);
    }
  });
  useEffect(() => {
    if (!conversionKey) return;
    const timer = window.setTimeout(handOffToPost, HANDOFF_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [conversionKey]);
  const { data: topCharts, isLoading: isLoadingCharts } = useTopCharts();
  
  // Music search - only search if it's not a link and has sufficient length
  const { data: searchResultsData, isLoading: isSearchingMusic } = useMusicSearch(
    debouncedSearchTerm.includes('http') || 
    debouncedSearchTerm.length < 2
      ? '' 
      : debouncedSearchTerm
  );
  
  // Decide what data to display
  const displayData = debouncedSearchTerm.length >= 2 && !debouncedSearchTerm.includes('http') 
    ? searchResultsData 
    : topCharts;

  // Keep local aliases so AddMusicForm stays simple and testable.
  const normalizeUrlInput = normalizeMusicLinkInput;
  const isValidMusicUrl = isSupportedMusicLink;

  // Sign-in returns here with the same query, so a prefilled link and `from` survive it.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const query = searchParams?.toString();
      const target = query ? `/studio/music/new?${query}` : '/studio/music/new';
      router.push(`/auth/signin?redirect=${encodeURIComponent(target)}`);
    }
  }, [authLoading, isAuthenticated, router, searchParams]);

  useEffect(() => {
    if (returnedDraft) clearReturnedAddMusicDraft(returnedDraft);
  }, [returnedDraft]);

  // Handle prefilled URL on mount
  useEffect(() => {
    if (returnedDraft) return;
    if (prefilledUrl && isSupportedMusicLink(prefilledUrl)) {
      const source = getMusicSourceLabel(prefilledUrl);
      setPastedLinkSource(source);
      setSelectedItem(null);
      setIsSearchActive(false);
      setErrorMessage('');
    }
  }, [prefilledUrl, returnedDraft]);

  // Opening is just a state flip: the same input node stays mounted (so the
  // iOS keyboard stays up) while its container becomes a full-screen sheet
  // and framer's layout animation glides the bar into place. No scrollTo,
  // no timers — the page underneath keeps its scroll position because the
  // sheet is an overlay, not a reflow.
  const handleSearchFocus = () => {
    apiService.warmupLambdas();
    if (!selectedItem && !pastedLinkSource && !isConverting) {
      setIsSearchActive(true);
    }
  };

  // Desktop swaps the form for results while searching; a click outside the
  // search region swaps back. (On mobile the sheet covers the viewport, so
  // this never fires — the sheet's close button handles it.)
  useEffect(() => {
    if (!isSearchActive) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && !target.closest('[data-search-region]')) {
        setIsSearchActive(false);
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isSearchActive]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const normalizedValue = normalizeUrlInput(value);
    const validationError = validateMusicLink(normalizedValue);

    if (isPasteLikeInputEvent(e) && normalizedValue) {
      const detected = detectContentType(normalizedValue);

      if (validationError) {
        setMusicUrl(normalizedValue);
        setSelectedItem(null);
        setPastedLinkSource(null);
        setErrorMessage(validationError);
        setIsSearchActive(false);
        void captureClientEvent('unsupported_music_link_pasted', {
          route: ANALYTICS_ROUTE,
          source_surface: 'add_music',
          source_domain: sanitizeDomain(normalizedValue),
          source_platform: detected.platform,
          element_type_guess: detected.type,
          is_authenticated: true,
        });
        return;
      }

      if (isValidMusicUrl(normalizedValue)) {
        commitMusicLinkInput(normalizedValue);
        void captureClientEvent('music_link_pasted', {
          route: ANALYTICS_ROUTE,
          source_surface: 'add_music',
          source_domain: sanitizeDomain(normalizedValue),
          source_platform: detected.platform,
          element_type_guess: detected.type,
          is_authenticated: true,
        });
        return;
      }
    }

    setMusicUrl(value);

    // Clear selected item and pasted link when typing
    if (selectedItem || pastedLinkSource) {
      setSelectedItem(null);
      setPastedLinkSource(null);
    }

    // Ensure search is active when typing (but don't auto-convert URLs while typing)
    if (value.trim() && !isSearchActive) {
      setIsSearchActive(true);
    }
  };

  const commitMusicLinkInput = (rawUrl: string) => {
    const normalizedUrl = normalizeUrlInput(rawUrl);
    const source = getMusicSourceLabel(normalizedUrl);

    setMusicUrl(normalizedUrl);
    setSelectedItem(null);
    setPastedLinkSource(source);
    setErrorMessage('');
    setIsSearchActive(false);
    searchInputRef.current?.blur();
    playLinkRecognized();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    apiService.warmupLambdas();
    const pastedText = normalizeUrlInput(e.clipboardData.getData('text'));
    if (!pastedText) {
      return;
    }

    e.preventDefault();
    const detected = detectContentType(pastedText);
    const validationError = validateMusicLink(pastedText);

    if (validationError) {
      setMusicUrl(pastedText);
      setSelectedItem(null);
      setPastedLinkSource(null);
      setErrorMessage(validationError);
      setIsSearchActive(false);
      playErrorTone();

      void captureClientEvent('unsupported_music_link_pasted', {
        route: ANALYTICS_ROUTE,
        source_surface: 'add_music',
        source_domain: sanitizeDomain(pastedText),
        source_platform: detected.platform,
        element_type_guess: detected.type,
        is_authenticated: true,
      });
      return;
    }
    
    if (isValidMusicUrl(pastedText)) {
      commitMusicLinkInput(pastedText);
      void captureClientEvent('music_link_pasted', {
        route: ANALYTICS_ROUTE,
        source_surface: 'add_music',
        source_domain: sanitizeDomain(pastedText),
        source_platform: detected.platform,
        element_type_guess: detected.type,
        is_authenticated: true,
      });
    } else {
      void captureClientEvent('unsupported_music_link_pasted', {
        route: ANALYTICS_ROUTE,
        source_surface: 'add_music',
        source_domain: sanitizeDomain(pastedText),
        source_platform: detected.platform,
        element_type_guess: detected.type,
        is_authenticated: true,
      });
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      closeSearch();
      return;
    }

    if (e.key !== 'Enter' || !musicUrl.trim()) {
      return;
    }

    const normalizedUrl = normalizeUrlInput(musicUrl);
    const validationError = validateMusicLink(normalizedUrl);
    if (validationError) {
      setErrorMessage(validationError);
      playErrorTone();
      return;
    }

    if (!isValidMusicUrl(normalizedUrl)) {
      return;
    }

    commitMusicLinkInput(normalizedUrl);
  };

  const closeSearch = () => {
    setIsSearchActive(false);
    if (!selectedItem && !pastedLinkSource) {
      setMusicUrl('');
    }
    searchInputRef.current?.blur();
  };

  const handleSelectItem = (url: string, title: string, type: string) => {
    const detected = detectContentType(url);
    void captureClientEvent('search_result_selected', {
      route: ANALYTICS_ROUTE,
      source_surface: 'add_music',
      source_platform: detected.platform,
      element_type_guess: detected.type,
      source_domain: sanitizeDomain(url),
      is_authenticated: true,
    });
    
    // Find the full item data from search results to get artist and artwork
    let artist = '';
    let coverArtUrl = '';
    
    if (displayData) {
      // Search through all result types to find the matching item
      const allItems = [
        ...(displayData.tracks || []),
        ...(displayData.albums || []),
        ...(displayData.artists || []),
        ...(displayData.playlists || [])
      ];
      
      const matchingItem = allItems.find(item => {
        const itemUrl = item.externalUrls?.spotify || 
                       item.externalUrls?.appleMusic || 
                       item.externalUrls?.deezer;
        const itemTitle = 'name' in item ? item.name : item.title;
        return itemUrl === url || itemTitle === title;
      });
      
      if (matchingItem) {
        if ('name' in matchingItem) {
          // Artist type
          artist = matchingItem.name;
        } else if ('owner' in matchingItem) {
          // Playlist type
          artist = matchingItem.owner;
        } else if ('artist' in matchingItem) {
          // Track or Album type
          artist = matchingItem.artist;
        }
        coverArtUrl = matchingItem.artwork || '';
      }
    }
    
    const newSelectedItem: SelectedItem = {
      id: `selected-${Date.now()}`,
      title,
      artist,
      type: type.toLowerCase(),
      url,
      coverArtUrl
    };
    
    setSelectedItem(newSelectedItem);
    setMusicUrl(title); // Show title in search bar
    setIsSearchActive(false);
    setPastedLinkSource(null);
    setErrorMessage('');
  };

  const clearSelection = () => {
    setSelectedItem(null);
    setPastedLinkSource(null);
    setMusicUrl('');
    setErrorMessage('');
    setPlatformLinks({});
    setPlatformLinkErrors({});
  };

  const handleAddToProfile = useCallback(async () => {
    if (conversionKey) return;
    setErrorMessage('');

    let urlToConvert = '';

    if (selectedItem) {
      urlToConvert = normalizeUrlInput(selectedItem.url);
    } else if (musicUrl.trim()) {
      urlToConvert = normalizeUrlInput(musicUrl);
      const validationError = validateMusicLink(urlToConvert);
      if (validationError || !isValidMusicUrl(urlToConvert)) {
        setErrorMessage(
          validationError ||
            "This music service isn't supported yet. Please use a link from Spotify, Apple Music, or Deezer.",
        );
        return;
      }
    } else {
      setErrorMessage('Please enter a music link or search for a song');
      return;
    }
    
    // Bridge checks each link again before it starts the conversion.
    let ownLinks: ByService<string> | null = null;
    if (pendingIsPlaylist) {
      const filled: ByService<string> = {};
      for (const platform of curatorLinkPlatforms(pendingSourcePlatform)) {
        const link = platformLinks[platform]?.trim();
        if (link) filled[platform] = link;
      }
      const problems = playlistLinkErrors(filled);
      setPlatformLinkErrors(problems);
      if (Object.keys(problems).length > 0) {
        setPlatformLinksOpen(true);
        setErrorMessage('Check your playlist links.');
        return;
      }
      if (Object.keys(filled).length > 0) ownLinks = filled;
    }

    const detected = detectContentType(urlToConvert);
    void captureClientEvent('conversion_entry_started', {
      route: ANALYTICS_ROUTE,
      source_surface: 'add_music',
      source_platform: detected.platform,
      element_type_guess: detected.type,
      source_domain: sanitizeDomain(urlToConvert),
      is_authenticated: true,
    });

    // Convert in place: a centered takeover (beamed card + live Bridge
    // stages) carries the busy state, and we only navigate once the post is
    // ready, so the user lands directly on the finished post — no skeleton.
    const platformLabel = PLATFORM_LABELS[detected.platform];
    const typeLabel = selectedItem?.type?.toLowerCase() ?? (detected.id ? detected.type : null);
    setConvertingMeta({
      title: selectedItem?.title,
      artist: selectedItem?.artist || undefined,
      artwork: selectedItem?.coverArtUrl || undefined,
      // Search selections hide the platform — the catalog source behind
      // search is an implementation detail. Pasted links name the platform.
      kicker: selectedItem
        ? ['Converting', typeLabel].filter(Boolean).join(' ')
        : ['Converting', platformLabel, typeLabel].filter(Boolean).join(' '),
      fallbackLabel: platformLabel ? `${platformLabel} link` : 'Music link',
      headline: pickConvertingHeadline(),
    });

    const key =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `key-${Date.now()}-${Math.random()}`;
    setConversionKey(key);

    // The post page may take this conversion over; load its route now.
    router.prefetch('/post');
    const conversion = linkConversion.mutateAsync({
      url: urlToConvert,
      description: description.trim() || undefined,
      idempotencyKey: key,
      privacy,
      platformLinks: ownLinks ? toBridgePlatformLinks(ownLinks) : undefined,
    });
    runningRef.current = { url: urlToConvert, key, result: conversion, platformLinks: ownLinks };

    try {
      const result = await conversion;
      // Handed over: the post page follows the conversion to its end.
      if (handedOffRef.current) return;
      runningRef.current = null;

      // Warm handoff: prefetch the route and stash the post payload so
      // /post/[id] renders real content immediately — no skeleton phase.
      router.prefetch(`/post/${result.postId}`);
      if (result.postId) {
        try {
          const post = await apiService.fetchPostById(result.postId);
          if (post?.success) {
            savePrefetchedPost(result.postId, post);
          }
        } catch {
          // Post page falls back to fetching with retries.
        }
      }

      const fromQuery = resolvedReturnRoute ? `?from=${encodeURIComponent(resolvedReturnRoute)}` : '';
      const target = `/post/${result.postId}${fromQuery}`;
      if (resolvedReturnRoute) {
        router.replace(target);
      } else {
        router.push(target);
      }
    } catch (error) {
      if (handedOffRef.current) return;
      runningRef.current = null;
      setConversionKey(null);
      setConvertingMeta(null);
      playErrorTone();
      setErrorMessage(getUserFacingApiErrorMessage(
        error,
        'Something went wrong while converting your link. Please try again.',
      ));
    }
  }, [conversionKey, description, isValidMusicUrl, linkConversion, musicUrl, normalizeUrlInput, pendingIsPlaylist, pendingSourcePlatform, platformLinks, privacy, resolvedReturnRoute, router, selectedItem]);

  useEffect(() => {
    const query = debouncedSearchTerm.trim();
    if (!query || query.length < 2 || query.includes('http')) {
      return;
    }

    if (lastTrackedSearchRef.current === query.toLowerCase()) {
      return;
    }

    lastTrackedSearchRef.current = query.toLowerCase();
    const resultCount = (searchResultsData?.tracks?.length || 0) +
      (searchResultsData?.albums?.length || 0) +
      (searchResultsData?.artists?.length || 0) +
      (searchResultsData?.playlists?.length || 0);

    void captureClientEvent('search_submitted', {
      route: ANALYTICS_ROUTE,
      source_surface: 'add_music',
      result_count: resultCount,
      is_authenticated: true,
    });
  }, [debouncedSearchTerm, searchResultsData]);

  // Show loading while checking auth
  if (authLoading) {
    return <PageLoader message="Loading..." />;
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }


  const pickerProps = {
    isSearchActive,
    selectedItem,
    pastedLinkSource,
    musicUrl,
    debouncedSearchTerm,
    handleUrlChange,
    handleSearchFocus,
    handlePaste,
    handleInputKeyDown,
    clearSelection,
    searchInputRef,
    displayData,
    isLoadingCharts,
    isSearchingMusic,
    handleSelectItem,
    closeSearch,
    isConverting,
    convertingMeta,
    conversionStageLabel,
  };
  const detailsProps = {
    description,
    setDescription,
    privacy,
    setPrivacy,
    playlistLinks: pendingIsPlaylist
      ? {
          sourcePlatform: pendingSourcePlatform,
          values: platformLinks,
          errors: platformLinkErrors,
          onChange: (platform: PlatformUiKey, value: string) => {
            setPlatformLinks((current) => ({ ...current, [platform]: value }));
            setPlatformLinkErrors((current) => ({ ...current, [platform]: undefined }));
          },
          open: platformLinksOpen,
          setOpen: setPlatformLinksOpen,
        }
      : null,
    handleAddToProfile,
    errorMessage,
    isConverting,
    canSubmit: Boolean(selectedItem) || musicUrl.trim().length > 0,
  };
  const dimmed = isConverting ? 'opacity-25 pointer-events-none select-none' : '';
  const paper = (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 opacity-[0.35]"
      style={{
        backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    />
  );

  // Back names the Studio section the page opened from, so the page reads as a step inside Studio.
  const returnView = studioViewOfPath(resolvedReturnRoute?.split(/[?#]/)[0] ?? null);
  const backLabel = returnView ? studioLabels[returnView] : 'Back';

  return (
    <>
      {/* Phones and tablets: bar first, details under it; the bar opens a search sheet. */}
      <div className="lg:hidden">
        <div className="studio-surface relative min-h-svh bg-background">
          {paper}
          {/* The search sheet lives inside this wrapper, so while it's open
              the wrapper must rise above the fixed global navbar (z-50) — a
              child's z-index can't escape its ancestor's stacking context. */}
          <div className={`relative min-h-svh ${isSearchActive ? 'z-[60]' : 'z-10'}`}>
            <div className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
              <div className={`transition-opacity duration-500 ${dimmed}`}>
                <div className="flex items-center justify-between py-5">
                  <BackButton fallbackRoute={resolvedReturnRoute ?? '/'} label={backLabel} />
                </div>
                <h1 className="mb-5 font-teko text-4xl font-bold uppercase leading-none tracking-tight text-foreground">
                  Add music
                </h1>
              </div>
              <MusicPicker {...pickerProps} />
              <PostDetails collapsed={isSearchActive} {...detailsProps} />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: one Studio-width container. The header spans the page, so more ways to
          add music can sit under it later; below it, details on the left and the homepage
          bar with open results on the right share one top edge. */}
      <div className="studio-surface relative hidden min-h-full lg:block lg:px-8 lg:py-8">
        {paper}
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <header className={`transition-opacity duration-500 ${dimmed}`}>
            <BackButton fallbackRoute={resolvedReturnRoute ?? '/'} label={backLabel} />
            <h1 className="mt-5 font-teko text-5xl font-bold uppercase leading-none tracking-tight text-foreground">Add music</h1>
          </header>
          <div className="mt-8 grid grid-cols-2 items-start gap-x-8 xl:grid-cols-[minmax(0,1fr)_28rem] xl:gap-x-16">
            <div className={`transition-opacity duration-500 ${dimmed}`}>
              <PostDetails collapsed={false} {...detailsProps} />
            </div>
            <MusicPicker {...pickerProps} rail />
          </div>
        </div>
      </div>
    </>
  );
}
