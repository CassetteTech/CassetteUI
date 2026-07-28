'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Music2, RotateCcw, Search, ShieldCheck, X } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { UrlBar } from '@/components/ui/url-bar';
import { PaidPromotionSupportContact } from '@/components/features/paid-promotions/paid-promotion-support';
import { ConversionBeam } from '@/components/features/conversion/conversion-beam';
import { ConversionHeading } from '@/components/features/conversion/conversion-heading';
import { ConversionStageLabel } from '@/components/features/conversion/conversion-stage-label';
import { SearchResults } from '@/components/features/search-results';
import { PLATFORM_LABELS, pickConvertingHeadline } from '@/components/features/conversion/conversion-copy';
import { useAuthState } from '@/hooks/use-auth';
import { useConversionStage } from '@/hooks/use-conversion-stage';
import { useDebounce } from '@/hooks/use-debounce';
import { useMusicLinkConversion, useMusicSearch } from '@/hooks/use-music';
import { captureClientEvent } from '@/lib/analytics/client';
import { sanitizeDomain } from '@/lib/analytics/sanitize';
import { playErrorTone, playLinkRecognized } from '@/lib/sounds';
import { apiService } from '@/services/api';
import {
  computePaidPromotionPricing,
  formatPaidPromotionMinorAmount,
} from '@/services/paid-promotion-lifecycle';
import { getPaidPromotionElementTypeLabel } from '@/services/paid-promotion-status-presentation';
import type {
  PaidPromotionAttestation,
  PaidPromotionAttestedRelationship,
  PaidPromotionElementType,
  PaidPromotionPromoterKind,
  PaidPromotionRateCard,
} from '@/types';
import { detectContentType } from '@/utils/content-type-detection';
import {
  isSupportedMusicLink,
  normalizeMusicLinkInput,
  validateMusicLink,
} from '@/utils/music-link-input';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

type ResolvedSubject = {
  elementId: string;
  elementType: PaidPromotionElementType;
  submittedUrl: string;
  title: string;
  subtitle: string;
  artwork?: string;
  sourcePlatform: string;
};

// Canonical element-id prefixes owned by the Bridge id generator. The server
// derives the campaign's element type the same way, so this map is the only
// type gate the client needs.
const ELEMENT_TYPE_BY_PREFIX: Record<string, PaidPromotionElementType> = {
  t_: 'track',
  a_: 'album',
  r_: 'artist',
  l_: 'playlist',
};

function elementTypeFor(musicElementId: string): PaidPromotionElementType | null {
  return ELEMENT_TYPE_BY_PREFIX[musicElementId.slice(0, 2)] ?? null;
}

const PROMOTER_KINDS: Array<{ value: PaidPromotionPromoterKind; label: string }> = [
  { value: 'artist', label: 'Artist' },
  { value: 'manager', label: 'Manager' },
  { value: 'label', label: 'Label' },
  { value: 'agency', label: 'Agency' },
  { value: 'other', label: 'Other' },
];

const RELATIONSHIPS: Array<{ value: PaidPromotionAttestedRelationship; label: string }> = [
  { value: 'self_artist', label: 'I am the artist' },
  { value: 'manager', label: 'I represent the artist as a manager' },
  { value: 'label', label: 'I represent the artist through a label' },
  { value: 'agency', label: 'I represent the artist through an agency' },
  { value: 'other', label: 'Other authorized relationship' },
];

function createIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `key-${Date.now()}-${Math.random()}`;
}

/**
 * Numbered rule between steps. The flow used to be four stacked offset-shadow
 * cards, which gave every step the same visual weight as the thing being
 * bought; a hairline rule and a numbered kicker keep the sequence legible
 * without four competing focal elements.
 */
function Step({
  index,
  title,
  description,
  children,
}: {
  index: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-6 first:border-t-0 first:pt-0">
      <div className="mb-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-muted-foreground">
            {index}
          </span>
          <h2 className="font-atkinson text-xl font-bold tracking-tight text-foreground">{title}</h2>
        </div>
        <p className="mt-1.5 pl-[calc(1.5rem+0.75rem)] text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export function PaidPromotionIntake() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthState();
  const linkConversion = useMusicLinkConversion();
  const intakeTrackedRef = useRef(false);
  const resolvedSubjectRef = useRef<HTMLDivElement>(null);

  const [musicUrl, setMusicUrl] = useState('');
  const [resolvedSubject, setResolvedSubject] = useState<ResolvedSubject | null>(null);
  const [conversionKey, setConversionKey] = useState<string | null>(null);
  const [convertingHeadline, setConvertingHeadline] = useState('');
  const { label: conversionStageLabel } = useConversionStage(conversionKey);

  const [rateCards, setRateCards] = useState<PaidPromotionRateCard[]>([]);
  const [attestation, setAttestation] = useState<PaidPromotionAttestation | null>(null);
  const [isLoadingRateCards, setIsLoadingRateCards] = useState(true);
  const [rateCardsError, setRateCardsError] = useState('');
  const [rateCardsRefreshKey, setRateCardsRefreshKey] = useState(0);
  const [selectedRateCardId, setSelectedRateCardId] = useState('');
  const [rawWeeks, setWeeks] = useState(1);

  const [brief, setBrief] = useState('');
  const [promoterKind, setPromoterKind] = useState<PaidPromotionPromoterKind | ''>('');
  const [orgName, setOrgName] = useState('');
  const [website, setWebsite] = useState('');
  const [attestedRelationship, setAttestedRelationship] =
    useState<PaidPromotionAttestedRelationship | ''>('');
  const [attestationAccepted, setAttestationAccepted] = useState(false);

  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [isReviewingOrder, setIsReviewingOrder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isConverting = conversionKey !== null;
  const isLocked = Boolean(createdCampaignId);

  // The one input accepts either a link or a search phrase. Anything that looks
  // like a URL goes down the existing resolve path; anything else queries the
  // catalog, so a buyer who does not have a link to hand is not stuck.
  const debouncedQuery = useDebounce(musicUrl, 300);
  const trimmedQuery = debouncedQuery.trim();
  const queryIsLink = trimmedQuery.includes('http') || trimmedQuery.startsWith('www.');
  const searchQuery =
    !resolvedSubject && !isConverting && !isLocked && !queryIsLink && trimmedQuery.length >= 2
      ? trimmedQuery
      : '';
  const { data: searchResultsData, isLoading: isSearchingMusic } = useMusicSearch(searchQuery);
  const showSearchResults = searchQuery.length > 0;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/signin?redirect=/promote/new');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || intakeTrackedRef.current) return;

    intakeTrackedRef.current = true;
    void captureClientEvent('paid_promotion_intake_started', {
      route: '/promote/new',
      source_surface: 'paid_promotion',
      is_authenticated: true,
    });
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (resolvedSubject) {
      resolvedSubjectRef.current?.focus();
    }
  }, [resolvedSubject]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    let cancelled = false;
    setIsLoadingRateCards(true);
    setRateCardsError('');

    apiService.getPaidPromotionRateCards()
      .then((response) => {
        if (cancelled) return;
        setRateCards(response.rateCards);
        setAttestation(response.attestation);
      })
      .catch((error) => {
        if (cancelled) return;
        setRateCardsError(getUserFacingApiErrorMessage(
          error,
          'We could not load paid-promotion packages. Please try again.',
        ));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRateCards(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, rateCardsRefreshKey]);

  const resolveSubject = useCallback(async (explicitUrl?: string) => {
    if (isConverting) return;

    // A search pick passes its URL explicitly: the input's state update has not
    // committed yet at call time, so reading it back here would resolve stale.
    const normalizedUrl = normalizeMusicLinkInput(explicitUrl ?? musicUrl);
    const validationError = validateMusicLink(normalizedUrl);
    const detected = detectContentType(normalizedUrl);

    if (validationError || !isSupportedMusicLink(normalizedUrl)) {
      setErrorMessage(
        validationError ||
          "This music service isn't supported yet. Use a Spotify, Apple Music, or Deezer link.",
      );
      playErrorTone();
      return;
    }

    const key = createIdempotencyKey();
    setConversionKey(key);
    setConvertingHeadline(pickConvertingHeadline());
    setResolvedSubject(null);
    setCreatedCampaignId(null);
    setErrorMessage('');

    try {
      const conversion = await linkConversion.mutateAsync({
        url: normalizedUrl,
        idempotencyKey: key,
      });
      if (!conversion.postId) {
        throw new Error('Conversion completed without a post id.');
      }

      const post = await apiService.fetchPostById(conversion.postId);
      const elementType = elementTypeFor(post.musicElementId);
      if (!post.success || !elementType || post.elementType.toLowerCase() !== elementType) {
        throw new Error('Cassette could not resolve this link to a canonical record.');
      }

      setMusicUrl(normalizedUrl);
      setResolvedSubject({
        elementId: post.musicElementId,
        elementType,
        submittedUrl: normalizedUrl,
        title: post.details.title || post.details.name || post.musicElementId,
        // Artists are the secondary line for tracks and albums; artist and
        // playlist pages are their own name, so they carry no subtitle.
        subtitle: elementType === 'track' || elementType === 'album'
          ? post.details.artist || post.details.artists?.[0]?.name || ''
          : '',
        artwork: post.details.coverArtUrl || post.details.imageUrl,
        sourcePlatform: PLATFORM_LABELS[detected.platform],
      });
      playLinkRecognized();
    } catch (error) {
      playErrorTone();
      setErrorMessage(getUserFacingApiErrorMessage(
        error,
        'We could not resolve that link. Check it and try again.',
      ));
    } finally {
      setConversionKey(null);
    }
  }, [isConverting, linkConversion, musicUrl]);

  const handleMusicUrlChange = (value: string) => {
    setMusicUrl(value);
    if (resolvedSubject && value !== resolvedSubject.submittedUrl) {
      setResolvedSubject(null);
      setSelectedRateCardId('');
      setCreatedCampaignId(null);
      setIsReviewingOrder(false);
    }
    setErrorMessage('');
  };

  const handleSelectSearchResult = (url: string) => {
    const detected = detectContentType(url);
    void captureClientEvent('search_result_selected', {
      route: '/promote/new',
      source_surface: 'paid_promotion',
      element_type_guess: detected.type,
      source_platform: detected.platform,
      source_domain: sanitizeDomain(url),
      is_authenticated: true,
    });

    setMusicUrl(url);
    setErrorMessage('');
    void resolveSubject(url);
  };

  const clearSubject = () => {
    setMusicUrl('');
    setResolvedSubject(null);
    setSelectedRateCardId('');
    setCreatedCampaignId(null);
    setIsReviewingOrder(false);
    setErrorMessage('');
  };

  // Packages are sold per element type: a resolved subject whose type has no
  // active rate card is a catalog state, not a failure.
  const availableRateCards = resolvedSubject
    ? rateCards.filter((rateCard) => rateCard.subjectType === resolvedSubject.elementType)
    : [];
  const selectedRateCard =
    availableRateCards.find((rateCard) => rateCard.id === selectedRateCardId) ?? null;
  // A stored pick can fall outside a newly selected package's range; clamping
  // at render keeps the selector, pricing, and submit in agreement.
  const weeks = selectedRateCard
    ? Math.min(Math.max(rawWeeks, selectedRateCard.minWeeks), selectedRateCard.maxWeeks)
    : rawWeeks;
  const pricing = selectedRateCard ? computePaidPromotionPricing(selectedRateCard, weeks) : null;

  const canSubmit = Boolean(
    resolvedSubject &&
    selectedRateCard &&
    brief.trim() &&
    promoterKind &&
    attestedRelationship &&
    attestationAccepted &&
    attestation
  );

  const promoterKindLabel = PROMOTER_KINDS.find((option) => option.value === promoterKind)?.label;
  const relationshipLabel = RELATIONSHIPS.find(
    (option) => option.value === attestedRelationship,
  )?.label;

  const handleCampaignCheckout = async () => {
    if (!resolvedSubject || !canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let campaignId = createdCampaignId;
      if (!campaignId) {
        const campaign = await apiService.createPaidPromotionCampaign({
          elementId: resolvedSubject.elementId,
          submittedUrl: resolvedSubject.submittedUrl,
          rateCardId: selectedRateCardId,
          weeks,
          brief: brief.trim(),
          promoterKind: promoterKind as PaidPromotionPromoterKind,
          orgName: orgName.trim() || undefined,
          website: website.trim() || undefined,
          attestationAccepted: true,
          attestedRelationship: attestedRelationship as PaidPromotionAttestedRelationship,
        });
        campaignId = campaign.id;
        setCreatedCampaignId(campaign.id);
        void captureClientEvent('paid_promotion_campaign_submitted', {
          route: '/promote/new',
          source_surface: 'paid_promotion',
          paid_promotion_campaign_id: campaign.id,
          is_authenticated: true,
        });
      }

      const checkout = await apiService.createPaidPromotionCheckoutSession(campaignId);
      void captureClientEvent('paid_promotion_checkout_started', {
        route: '/promote/new',
        source_surface: 'paid_promotion',
        paid_promotion_campaign_id: campaignId,
        is_authenticated: true,
      });
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      playErrorTone();
      setErrorMessage(getUserFacingApiErrorMessage(
        error,
        createdCampaignId
          ? 'We could not reopen checkout. Please try again.'
          : 'We could not start checkout. Your information is still here—please try again.',
      ));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return <PageLoader message="Loading paid promotion…" />;
  }

  if (!isAuthenticated) {
    return null;
  }

  const subjectTypeLabel = resolvedSubject
    ? getPaidPromotionElementTypeLabel(resolvedSubject.elementType).toLowerCase()
    : null;

  return (
    <div className="relative min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.3]"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      <section
        aria-labelledby="paid-promotion-intake-heading"
        className="relative mx-auto w-full max-w-6xl"
      >
        <BackButton route="/promote" label="Promotion home" className="mb-6" />

        <header className="mb-10 max-w-2xl">
          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-foreground">
            Direct paid promotion
          </p>
          <h1
            id="paid-promotion-intake-heading"
            className="font-atkinson text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Put your music in front of Cassette&apos;s audience.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Search for the release or paste its link, pick how long it runs, and tell us what
            matters about it. Checkout is securely hosted by Stripe.
          </p>
        </header>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-12">
          {/* Flow */}
          <div className="min-w-0 space-y-8">
            <Step
              index="01"
              title="What are you promoting?"
              description="Search Cassette's catalog, or paste a Spotify, Apple Music, or Deezer link. We resolve it to a canonical record first."
            >
              <div className="space-y-4">
                {isConverting && (
                  <ConversionHeading
                    kicker="Resolving"
                    headline={convertingHeadline}
                    className="mb-4"
                  />
                )}

                <ConversionBeam active={isConverting}>
                  <UrlBar variant="light" beamActive={isConverting} className="w-full">
                    {isConverting ? (
                      <div className="flex h-full w-full flex-col items-center justify-center px-4">
                        <span className="max-w-full truncate text-sm font-semibold text-foreground">
                          {musicUrl}
                        </span>
                        <ConversionStageLabel label={conversionStageLabel} />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center gap-2 px-4">
                        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <input
                          data-testid="paid-promotion-subject-input"
                          value={musicUrl}
                          onChange={(event) => handleMusicUrlChange(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') void resolveSubject();
                          }}
                          placeholder="Search a song or album, or paste a link"
                          aria-label="Search for music or paste a music link"
                          disabled={isLocked}
                          className="h-full w-full border-none bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:opacity-60"
                        />
                        {musicUrl && !isLocked && (
                          <button
                            type="button"
                            onClick={clearSubject}
                            aria-label="Clear"
                            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <X className="size-4" aria-hidden />
                          </button>
                        )}
                      </div>
                    )}
                  </UrlBar>
                </ConversionBeam>

                {/* Results are capped and scroll internally: an unbounded list
                    shoves the rest of the form down the page while you type. */}
                {showSearchResults && (
                  <div className="max-h-[24rem] overflow-y-auto overscroll-contain rounded-lg">
                  <SearchResults
                    results={searchResultsData}
                    query={searchQuery}
                    // This page has no top-charts fallback, so the only
                    // in-flight state is the search request itself.
                    isLoading={false}
                    isSearching={isSearchingMusic}
                    showSearchResults
                    onSelectItem={handleSelectSearchResult}
                    onClose={() => setMusicUrl('')}
                    SkeletonComponent={Skeleton}
                    chrome="flat"
                  />
                  </div>
                )}

                {resolvedSubject ? (
                  <div
                    ref={resolvedSubjectRef}
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    tabIndex={-1}
                    data-testid="paid-promotion-resolved-subject"
                    className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-3 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2"
                  >
                    {resolvedSubject.artwork ? (
                      <Image
                        src={resolvedSubject.artwork}
                        alt=""
                        width={56}
                        height={56}
                        className="size-14 rounded-md border border-border object-cover"
                      />
                    ) : (
                      <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Music2 className="size-5 text-muted-foreground" aria-hidden />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-atkinson font-bold text-foreground">
                        {resolvedSubject.title}
                      </p>
                      {resolvedSubject.subtitle && (
                        <p className="truncate text-sm text-muted-foreground">
                          {resolvedSubject.subtitle}
                        </p>
                      )}
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-success-text">
                        Canonical {subjectTypeLabel} · {resolvedSubject.sourcePlatform}
                      </p>
                    </div>
                    <CheckCircle2 className="size-5 shrink-0 text-success-text" aria-hidden />
                  </div>
                ) : (
                  !showSearchResults && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void resolveSubject()}
                      disabled={!musicUrl.trim() || isConverting || isLocked}
                      data-testid="paid-promotion-resolve-subject"
                    >
                      {isConverting ? <Spinner size="sm" /> : <Music2 />}
                      Resolve link
                    </Button>
                  )
                )}
              </div>
            </Step>

            <Step
              index="02"
              title="Package and run length"
              description="Prices come from Cassette's active rate card and are charged per week."
            >
              {isLoadingRateCards ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner size="sm" /> Loading packages…
                </div>
              ) : rateCardsError ? (
                <div className="space-y-3">
                  <p role="alert" className="text-sm text-destructive">{rateCardsError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRateCardsRefreshKey((current) => current + 1)}
                  >
                    <RotateCcw /> Retry packages
                  </Button>
                </div>
              ) : rateCards.length === 0 ? (
                <div className="space-y-3">
                  <p data-testid="paid-promotion-empty-catalog" className="text-sm text-foreground">
                    Cassette&apos;s paid-promotion packages are still being finalized, so there is
                    nothing to book here yet. Tell us what you want to promote and we will come
                    back to you the moment they open.
                  </p>
                  <PaidPromotionSupportContact className="justify-start" />
                </div>
              ) : !resolvedSubject ? (
                <p className="text-sm text-muted-foreground">
                  Pick something above to see the packages Cassette sells for it.
                </p>
              ) : availableRateCards.length === 0 ? (
                <div className="space-y-3">
                  <p data-testid="paid-promotion-no-packages" className="text-sm text-foreground">
                    Cassette doesn&apos;t sell paid-promotion packages for {subjectTypeLabel}{' '}
                    campaigns yet. Pick a track or album, or contact us about this campaign.
                  </p>
                  <PaidPromotionSupportContact className="justify-start" />
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {availableRateCards.map((rateCard) => {
                      const selected = selectedRateCardId === rateCard.id;
                      return (
                        <button
                          key={rateCard.id}
                          type="button"
                          onClick={() => setSelectedRateCardId(rateCard.id)}
                          disabled={isLocked}
                          aria-pressed={selected}
                          data-testid={`paid-promotion-rate-card-${rateCard.id}`}
                          className={`rounded-lg border p-4 text-left transition-[border-color,background-color] disabled:cursor-not-allowed disabled:opacity-50 ${
                            selected
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-card hover:border-foreground'
                          }`}
                        >
                          <span className="block font-atkinson text-lg font-bold text-foreground">
                            {rateCard.displayName}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            {rateCard.description}
                          </span>
                          <span className="mt-4 block font-mono text-sm font-bold text-foreground">
                            {formatPaidPromotionMinorAmount(rateCard.amountMinor, rateCard.currency)}/week
                          </span>
                          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                            {rateCard.minWeeks}–{rateCard.maxWeeks} weeks · at least{' '}
                            {rateCard.weeklyDeliverableMinimum} per week
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedRateCard && (
                    <div className="space-y-2">
                      <Label htmlFor="paid-promotion-weeks">How many weeks should it run?</Label>
                      <Select
                        value={String(weeks)}
                        onValueChange={(value) => setWeeks(Number(value))}
                        disabled={isLocked}
                      >
                        <SelectTrigger
                          id="paid-promotion-weeks"
                          aria-label="Campaign weeks"
                          data-testid="paid-promotion-weeks"
                          className="w-full bg-field sm:w-56"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            { length: selectedRateCard.maxWeeks - selectedRateCard.minWeeks + 1 },
                            (_, index) => selectedRateCard.minWeeks + index,
                          ).map((option) => (
                            <SelectItem key={option} value={String(option)}>
                              {option} {option === 1 ? 'week' : 'weeks'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs leading-5 text-muted-foreground">
                        Each paid week buys at least {selectedRateCard.weeklyDeliverableMinimum}{' '}
                        published placement
                        {selectedRateCard.weeklyDeliverableMinimum === 1 ? '' : 's'} plus ongoing
                        campaign management.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Step>

            <Step
              index="03"
              title="About the release"
              description="What should Cassette know before it starts posting? Angle, story, anything time-sensitive."
            >
              <Textarea
                id="paid-promotion-brief"
                data-testid="paid-promotion-brief"
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                maxLength={5000}
                rows={6}
                disabled={!resolvedSubject || isLocked}
                placeholder="The single is the lead track from an EP out in March. We'd love the focus on the live arrangement."
                aria-label="Campaign brief"
                className="min-h-36 resize-y bg-field"
              />
              <p className="mt-2 text-right font-mono text-[10px] text-muted-foreground">
                {brief.length}/5000
              </p>
            </Step>

            <Step
              index="04"
              title="Your authority to promote it"
              description="Cassette only runs campaigns booked by someone entitled to promote the music."
            >
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="paid-promotion-promoter-kind">You are acting as</Label>
                    <Select
                      value={promoterKind}
                      onValueChange={(value) => setPromoterKind(value as PaidPromotionPromoterKind)}
                      disabled={!resolvedSubject || isLocked}
                    >
                      <SelectTrigger
                        id="paid-promotion-promoter-kind"
                        aria-label="Promoter kind"
                        className="w-full bg-field"
                      >
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROMOTER_KINDS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paid-promotion-relationship">Relationship to the artist</Label>
                    <Select
                      value={attestedRelationship}
                      onValueChange={(value) => setAttestedRelationship(
                        value as PaidPromotionAttestedRelationship,
                      )}
                      disabled={!resolvedSubject || isLocked}
                    >
                      <SelectTrigger
                        id="paid-promotion-relationship"
                        aria-label="Relationship to the artist"
                        className="w-full bg-field"
                      >
                        <SelectValue placeholder="Select your relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIPS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="paid-promotion-org-name">
                      Organization{' '}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="paid-promotion-org-name"
                      value={orgName}
                      onChange={(event) => setOrgName(event.target.value)}
                      maxLength={200}
                      disabled={!resolvedSubject || isLocked}
                      placeholder="Label, agency, or management company"
                      className="bg-field"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paid-promotion-website">
                      Website <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="paid-promotion-website"
                      type="url"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                      maxLength={2048}
                      disabled={!resolvedSubject || isLocked}
                      placeholder="https://"
                      className="bg-field"
                    />
                  </div>
                </div>

                {/* The attestation is the legally load-bearing control on this
                    page, so it keeps the one heavy border in the flow. */}
                {attestation && (
                  <div className="flex items-start gap-3 rounded-lg border-2 border-foreground bg-card p-4">
                    <input
                      id="paid-promotion-attestation"
                      type="checkbox"
                      checked={attestationAccepted}
                      onChange={(event) => setAttestationAccepted(event.target.checked)}
                      disabled={!resolvedSubject || isLocked}
                      data-testid="paid-promotion-attestation"
                      className="mt-0.5 size-4 shrink-0 accent-primary"
                    />
                    <Label htmlFor="paid-promotion-attestation" className="block cursor-pointer font-normal">
                      <span className="block text-sm leading-6 text-foreground">
                        {attestation.text}
                      </span>
                      <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                        Attestation {attestation.version}
                      </span>
                    </Label>
                  </div>
                )}
              </div>
            </Step>

            {isReviewingOrder && !createdCampaignId && resolvedSubject && selectedRateCard && pricing && (
              <div
                data-testid="paid-promotion-review-panel"
                className="space-y-4 rounded-lg border-2 border-foreground bg-card p-5 shadow-flat-4"
              >
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Final check
                  </p>
                  <h2 className="mt-1 font-atkinson text-xl font-bold text-foreground">
                    Review and confirm
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Nothing is charged until you complete Stripe&apos;s hosted checkout.
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  {resolvedSubject.artwork ? (
                    <Image
                      src={resolvedSubject.artwork}
                      alt=""
                      width={48}
                      height={48}
                      className="size-12 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Music2 className="size-5 text-muted-foreground" aria-hidden />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-atkinson font-bold text-foreground">
                      {resolvedSubject.title}
                    </p>
                    {resolvedSubject.subtitle && (
                      <p className="truncate text-sm text-muted-foreground">
                        {resolvedSubject.subtitle}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                      {getPaidPromotionElementTypeLabel(resolvedSubject.elementType)} campaign
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-atkinson font-bold text-foreground">
                      {selectedRateCard.displayName}
                    </p>
                    <p
                      data-testid="paid-promotion-review-total"
                      className="font-mono text-sm font-bold text-foreground"
                    >
                      {formatPaidPromotionMinorAmount(pricing.totalMinor, selectedRateCard.currency)}
                    </p>
                  </div>
                  <p
                    data-testid="paid-promotion-review-weeks"
                    className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-foreground"
                  >
                    {weeks} {weeks === 1 ? 'week' : 'weeks'} ×{' '}
                    {formatPaidPromotionMinorAmount(selectedRateCard.amountMinor, selectedRateCard.currency)}/week
                    {pricing.discountMinor > 0 &&
                      ` · less ${formatPaidPromotionMinorAmount(pricing.discountMinor, selectedRateCard.currency)}`}
                  </p>
                  <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
                    Any tax or promo-code discount is calculated on the Stripe checkout page, where
                    the final total is shown before you pay.
                  </p>
                </div>

                {attestation && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-6">
                    <p className="text-foreground">You confirmed: {attestation.text}</p>
                    {promoterKindLabel && relationshipLabel && (
                      <p className="mt-1 text-muted-foreground">
                        Acting as {promoterKindLabel} · {relationshipLabel}
                      </p>
                    )}
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  By continuing you agree to the{' '}
                  <Link href="/terms" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
                    Terms of Service
                  </Link>{' '}
                  and the{' '}
                  <Link href="/promote#refund-policy" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
                    refund policy
                  </Link>
                  .
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsReviewingOrder(false)}
                    disabled={isSubmitting}
                  >
                    Back to edit
                  </Button>
                  <Button
                    type="button"
                    variant="brutalist"
                    onClick={() => void handleCampaignCheckout()}
                    disabled={!canSubmit || isSubmitting}
                    data-testid="paid-promotion-confirm-checkout"
                    className="bg-foreground text-background hover:bg-foreground/90"
                  >
                    {isSubmitting ? <Spinner size="sm" /> : <ArrowRight />}
                    Confirm and continue to secure checkout
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Order rail — one element, two behaviours. On desktop it pins
              below the fixed navbar (h-16) and scrolls internally if the
              contents ever outgrow the viewport, so the action can never be
              stranded off-screen. On mobile the verbose blocks collapse and it
              pins to the bottom of the viewport as a compact checkout bar,
              rather than sitting at the end of a long form where the buyer has
              to scroll to find out what anything costs. */}
          <aside
            className="sticky bottom-0 z-30 self-start max-lg:-mx-4 max-lg:mt-2 lg:bottom-auto lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:overscroll-contain"
          >
            <div className="space-y-5 border-border bg-card p-5 max-lg:border-t max-lg:shadow-[0_-4px_16px_hsl(var(--foreground)/0.08)] lg:rounded-lg lg:border">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground max-lg:hidden">
                Your order
              </p>

              <div className="space-y-3 border-t border-border pt-4 text-sm max-lg:hidden">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    Promoting
                  </p>
                  {resolvedSubject ? (
                    <p className="mt-1 font-atkinson font-bold leading-5 text-foreground">
                      {resolvedSubject.title}
                      {resolvedSubject.subtitle && (
                        <span className="block font-sans text-xs font-normal text-muted-foreground">
                          {resolvedSubject.subtitle}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">Nothing selected yet</p>
                  )}
                </div>

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    Package
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {selectedRateCard ? selectedRateCard.displayName : 'No package chosen yet'}
                  </p>
                </div>
              </div>

              {selectedRateCard && pricing ? (
                <dl
                  data-testid="paid-promotion-weekly-total"
                  className="space-y-1.5 text-sm lg:border-t lg:border-border lg:pt-4"
                >
                  {/* The per-week breakdown is desktop-only; the pinned mobile
                      bar shows the number the buyer is committing to. */}
                  <div className="flex items-baseline justify-between gap-3 max-lg:hidden">
                    <dt className="text-muted-foreground">
                      {formatPaidPromotionMinorAmount(
                        selectedRateCard.amountMinor,
                        selectedRateCard.currency,
                      )}{' '}
                      × {weeks} {weeks === 1 ? 'week' : 'weeks'}
                    </dt>
                    <dd className="font-mono text-foreground">
                      {formatPaidPromotionMinorAmount(
                        pricing.grossMinor,
                        selectedRateCard.currency,
                      )}
                    </dd>
                  </div>
                  {pricing.discountMinor > 0 && (
                    <div className="flex items-baseline justify-between gap-3 max-lg:hidden">
                      <dt className="text-muted-foreground">
                        Longer-run discount ({(selectedRateCard.discountBps ?? 0) / 100}% at{' '}
                        {selectedRateCard.discountMinWeeks}+ weeks)
                      </dt>
                      <dd className="font-mono text-success-text">
                        −{formatPaidPromotionMinorAmount(
                          pricing.discountMinor,
                          selectedRateCard.currency,
                        )}
                      </dd>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between gap-3 lg:border-t lg:border-border lg:pt-1.5">
                    <dt className="font-atkinson font-bold text-foreground">Campaign total</dt>
                    <dd className="font-mono font-bold text-foreground">
                      {formatPaidPromotionMinorAmount(
                        pricing.totalMinor,
                        selectedRateCard.currency,
                      )}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground lg:border-t lg:border-border lg:pt-4">
                  Your total appears here once you pick a package.
                </p>
              )}

              {errorMessage && (
                <p role="alert" className="text-sm text-destructive">{errorMessage}</p>
              )}

              {createdCampaignId ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Your campaign is saved. Retry the secure checkout handoff without creating
                    another campaign.
                  </p>
                  <Button
                    type="button"
                    variant="brutalist"
                    onClick={() => void handleCampaignCheckout()}
                    disabled={isSubmitting}
                    data-testid="paid-promotion-retry-checkout"
                    className="w-full bg-foreground text-background hover:bg-foreground/90"
                  >
                    {isSubmitting ? <Spinner size="sm" /> : <RotateCcw />}
                    Try checkout again
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="brutalist"
                  onClick={() => setIsReviewingOrder(true)}
                  disabled={!canSubmit || isReviewingOrder}
                  data-testid="paid-promotion-submit"
                  className="w-full bg-foreground text-background hover:bg-foreground/90"
                >
                  <ArrowRight />
                  Review your order
                </Button>
              )}

              <p className="flex items-start gap-2 border-t border-border pt-4 text-xs leading-5 text-muted-foreground max-lg:hidden">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-info-text" aria-hidden />
                Charged once, upfront. Card details stay on Stripe&apos;s hosted checkout page, and
                Cassette&apos;s server calculates the amount — this page never sets it.
              </p>
            </div>
          </aside>
        </div>

        <PaidPromotionSupportContact className="mt-12 border-t border-border pt-6" />
      </section>
    </div>
  );
}
