'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Music2, RotateCcw, ShieldCheck } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { UrlBar } from '@/components/ui/url-bar';
import { ConversionBeam } from '@/components/features/conversion/conversion-beam';
import { ConversionHeading } from '@/components/features/conversion/conversion-heading';
import { ConversionStageLabel } from '@/components/features/conversion/conversion-stage-label';
import { PLATFORM_LABELS, pickConvertingHeadline } from '@/components/features/conversion/conversion-copy';
import { useAuthState } from '@/hooks/use-auth';
import { useConversionStage } from '@/hooks/use-conversion-stage';
import { useMusicLinkConversion } from '@/hooks/use-music';
import { captureClientEvent } from '@/lib/analytics/client';
import { playErrorTone, playLinkRecognized } from '@/lib/sounds';
import { apiService } from '@/services/api';
import type {
  PaidPromotionAttestation,
  PaidPromotionAttestedRelationship,
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

type ResolvedTrack = {
  trackId: string;
  submittedUrl: string;
  title: string;
  artist: string;
  artwork?: string;
  sourcePlatform: string;
};

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

function formatRateCardAmount(rateCard: PaidPromotionRateCard): string {
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: rateCard.currency,
  });
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits;
  if (fractionDigits === undefined) {
    throw new Error('The server-owned rate-card currency has no minor-unit definition.');
  }
  return formatter.format(rateCard.amountMinor / (10 ** fractionDigits));
}

export function PaidPromotionIntake() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthState();
  const linkConversion = useMusicLinkConversion();
  const intakeTrackedRef = useRef(false);
  const resolvedTrackRef = useRef<HTMLDivElement>(null);

  const [musicUrl, setMusicUrl] = useState('');
  const [resolvedTrack, setResolvedTrack] = useState<ResolvedTrack | null>(null);
  const [conversionKey, setConversionKey] = useState<string | null>(null);
  const [convertingHeadline, setConvertingHeadline] = useState('');
  const { label: conversionStageLabel } = useConversionStage(conversionKey);

  const [rateCards, setRateCards] = useState<PaidPromotionRateCard[]>([]);
  const [attestation, setAttestation] = useState<PaidPromotionAttestation | null>(null);
  const [isLoadingRateCards, setIsLoadingRateCards] = useState(true);
  const [rateCardsError, setRateCardsError] = useState('');
  const [rateCardsRefreshKey, setRateCardsRefreshKey] = useState(0);
  const [selectedRateCardId, setSelectedRateCardId] = useState('');

  const [brief, setBrief] = useState('');
  const [promoterKind, setPromoterKind] = useState<PaidPromotionPromoterKind | ''>('');
  const [orgName, setOrgName] = useState('');
  const [website, setWebsite] = useState('');
  const [attestedRelationship, setAttestedRelationship] =
    useState<PaidPromotionAttestedRelationship | ''>('');
  const [attestationAccepted, setAttestationAccepted] = useState(false);

  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isConverting = conversionKey !== null;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/signin?redirect=/promote');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || intakeTrackedRef.current) return;

    intakeTrackedRef.current = true;
    void captureClientEvent('paid_promotion_intake_started', {
      route: '/promote',
      source_surface: 'paid_promotion',
      is_authenticated: true,
    });
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (resolvedTrack) {
      resolvedTrackRef.current?.focus();
    }
  }, [resolvedTrack]);

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

  const resolveTrack = useCallback(async () => {
    if (isConverting) return;

    const normalizedUrl = normalizeMusicLinkInput(musicUrl);
    const validationError = validateMusicLink(normalizedUrl);
    const detected = detectContentType(normalizedUrl);

    if (validationError || !isSupportedMusicLink(normalizedUrl)) {
      setErrorMessage(
        validationError ||
          "This music service isn't supported yet. Use a Spotify, Apple Music, or Deezer track link.",
      );
      playErrorTone();
      return;
    }

    if (detected.type !== 'track') {
      setErrorMessage('Paid promotion currently supports individual track links only.');
      playErrorTone();
      return;
    }

    const key = createIdempotencyKey();
    setConversionKey(key);
    setConvertingHeadline(pickConvertingHeadline());
    setResolvedTrack(null);
    setCreatedCampaignId(null);
    setErrorMessage('');

    try {
      const conversion = await linkConversion.mutateAsync({
        url: normalizedUrl,
        idempotencyKey: key,
      });
      if (!conversion.postId) {
        throw new Error('Track conversion completed without a post id.');
      }

      const post = await apiService.fetchPostById(conversion.postId);
      if (
        !post.success ||
        post.elementType.toLowerCase() !== 'track' ||
        !/^t_[0-9A-Za-z]+$/.test(post.musicElementId)
      ) {
        throw new Error('Cassette could not resolve this link to a canonical track.');
      }

      setMusicUrl(normalizedUrl);
      setResolvedTrack({
        trackId: post.musicElementId,
        submittedUrl: normalizedUrl,
        title: post.details.title || post.details.name || post.musicElementId,
        artist: post.details.artist || post.details.artists?.[0]?.name || '',
        artwork: post.details.coverArtUrl || post.details.imageUrl,
        sourcePlatform: PLATFORM_LABELS[detected.platform],
      });
      playLinkRecognized();
    } catch (error) {
      playErrorTone();
      setErrorMessage(getUserFacingApiErrorMessage(
        error,
        'We could not resolve that track. Check the link and try again.',
      ));
    } finally {
      setConversionKey(null);
    }
  }, [isConverting, linkConversion, musicUrl]);

  const handleMusicUrlChange = (value: string) => {
    setMusicUrl(value);
    if (resolvedTrack && value !== resolvedTrack.submittedUrl) {
      setResolvedTrack(null);
      setCreatedCampaignId(null);
    }
    setErrorMessage('');
  };

  const canSubmit = Boolean(
    resolvedTrack &&
    selectedRateCardId &&
    brief.trim() &&
    promoterKind &&
    attestedRelationship &&
    attestationAccepted &&
    attestation
  );

  const handleCampaignCheckout = async () => {
    if (!resolvedTrack || !canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let campaignId = createdCampaignId;
      if (!campaignId) {
        const campaign = await apiService.createPaidPromotionCampaign({
          trackId: resolvedTrack.trackId,
          submittedUrl: resolvedTrack.submittedUrl,
          rateCardId: selectedRateCardId,
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
          route: '/promote',
          source_surface: 'paid_promotion',
          paid_promotion_campaign_id: campaign.id,
          is_authenticated: true,
        });
      }

      const checkout = await apiService.createPaidPromotionCheckoutSession(campaignId);
      void captureClientEvent('paid_promotion_checkout_started', {
        route: '/promote',
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
        className="relative mx-auto w-full max-w-4xl"
      >
        <BackButton label="Back" className="mb-6" />

        <header className="mb-8 max-w-2xl">
          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-foreground">
            Direct paid promotion
          </p>
          <h1
            id="paid-promotion-intake-heading"
            className="font-atkinson text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Put your track in front of Cassette&apos;s audience.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Resolve one canonical track, choose a package, and tell us what matters about the release.
            Checkout is securely hosted by Stripe.
          </p>
        </header>

        <div className="space-y-6">
          <Card className="border-2 border-foreground shadow-flat-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-atkinson text-xl">
                <span className="font-mono text-xs text-foreground">01</span>
                Resolve your track
              </CardTitle>
              <CardDescription>
                Paste a Spotify, Apple Music, or Deezer track link. Cassette will resolve its canonical record first.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConverting && (
                <ConversionHeading
                  kicker="Resolving track"
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
                    <input
                      data-testid="paid-promotion-track-input"
                      value={musicUrl}
                      onChange={(event) => handleMusicUrlChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void resolveTrack();
                      }}
                      placeholder="Paste your track link"
                      aria-label="Track link"
                      disabled={Boolean(createdCampaignId)}
                      className="h-full w-full border-none bg-transparent px-4 text-center text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:opacity-60"
                    />
                  )}
                </UrlBar>
              </ConversionBeam>

              {resolvedTrack ? (
                <div
                  ref={resolvedTrackRef}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  tabIndex={-1}
                  data-testid="paid-promotion-resolved-track"
                  className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-3 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2"
                >
                  {resolvedTrack.artwork ? (
                    <Image
                      src={resolvedTrack.artwork}
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
                    <p className="truncate font-atkinson font-bold text-foreground">{resolvedTrack.title}</p>
                    {resolvedTrack.artist && (
                      <p className="truncate text-sm text-muted-foreground">{resolvedTrack.artist}</p>
                    )}
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-success-text">
                      Canonical track · {resolvedTrack.sourcePlatform}
                    </p>
                  </div>
                  <CheckCircle2 className="size-5 shrink-0 text-success-text" aria-hidden />
                </div>
              ) : (
                <Button
                  type="button"
                  variant="brutalist"
                  onClick={() => void resolveTrack()}
                  disabled={!musicUrl.trim() || isConverting || Boolean(createdCampaignId)}
                  data-testid="paid-promotion-resolve-track"
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  {isConverting ? <Spinner size="sm" /> : <Music2 />}
                  Resolve track
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-foreground shadow-flat-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-atkinson text-xl">
                <span className="font-mono text-xs text-foreground">02</span>
                Choose a package
              </CardTitle>
              <CardDescription>Prices come directly from Cassette&apos;s active rate card.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRateCards ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner size="sm" /> Loading packages…
                </div>
              ) : rateCardsError ? (
                <div className="space-y-3">
                  <p role="alert" className="text-sm text-destructive">{rateCardsError}</p>
                  <Button
                    type="button"
                    variant="brutalist-outline"
                    onClick={() => setRateCardsRefreshKey((current) => current + 1)}
                  >
                    <RotateCcw /> Retry packages
                  </Button>
                </div>
              ) : rateCards.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {rateCards.map((rateCard) => {
                    const selected = selectedRateCardId === rateCard.id;
                    return (
                      <button
                        key={rateCard.id}
                        type="button"
                        onClick={() => setSelectedRateCardId(rateCard.id)}
                        disabled={!resolvedTrack || Boolean(createdCampaignId)}
                        aria-pressed={selected}
                        data-testid={`paid-promotion-rate-card-${rateCard.id}`}
                        className={`rounded-lg border-2 p-4 text-left transition-[border-color,background-color,box-shadow,transform] disabled:cursor-not-allowed disabled:opacity-50 ${
                          selected
                            ? 'border-primary bg-primary/5 shadow-flat-primary-3'
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
                          {formatRateCardAmount(rateCard)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-destructive">No paid-promotion packages are currently available.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-foreground shadow-flat-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-atkinson text-xl">
                <span className="font-mono text-xs text-foreground">03</span>
                Brief and authority
              </CardTitle>
              <CardDescription>
                Tell us about the release and confirm your relationship to the artist.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="paid-promotion-brief">Campaign brief</Label>
                <Textarea
                  id="paid-promotion-brief"
                  data-testid="paid-promotion-brief"
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  maxLength={5000}
                  rows={6}
                  disabled={!resolvedTrack || Boolean(createdCampaignId)}
                  placeholder="What should Cassette know about this track, release, and campaign?"
                  className="min-h-36 resize-y bg-field"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="paid-promotion-promoter-kind">You are acting as</Label>
                  <Select
                    value={promoterKind}
                    onValueChange={(value) => setPromoterKind(value as PaidPromotionPromoterKind)}
                    disabled={!resolvedTrack || Boolean(createdCampaignId)}
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
                    disabled={!resolvedTrack || Boolean(createdCampaignId)}
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
                  <Label htmlFor="paid-promotion-org-name">Organization name (optional)</Label>
                  <Input
                    id="paid-promotion-org-name"
                    value={orgName}
                    onChange={(event) => setOrgName(event.target.value)}
                    maxLength={200}
                    disabled={!resolvedTrack || Boolean(createdCampaignId)}
                    className="bg-field"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paid-promotion-website">Website (optional)</Label>
                  <Input
                    id="paid-promotion-website"
                    type="url"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    maxLength={2048}
                    disabled={!resolvedTrack || Boolean(createdCampaignId)}
                    placeholder="https://"
                    className="bg-field"
                  />
                </div>
              </div>

              {attestation && (
                <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
                  <input
                    id="paid-promotion-attestation"
                    type="checkbox"
                    checked={attestationAccepted}
                    onChange={(event) => setAttestationAccepted(event.target.checked)}
                    disabled={!resolvedTrack || Boolean(createdCampaignId)}
                    data-testid="paid-promotion-attestation"
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <Label htmlFor="paid-promotion-attestation" className="block cursor-pointer font-normal">
                    <span className="block text-sm leading-6 text-foreground">{attestation.text}</span>
                    <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                      Attestation {attestation.version}
                    </span>
                  </Label>
                </div>
              )}

              <div className="rounded-lg border border-info/30 bg-info/5 p-4 text-sm leading-6 text-foreground">
                <ShieldCheck className="mr-2 inline size-4 text-info-text" aria-hidden />
                Pricing is server-owned. Card details stay on Stripe&apos;s hosted checkout page, and payment status changes only after Stripe webhook confirmation.
              </div>

              {errorMessage && (
                <p role="alert" className="text-sm text-destructive">{errorMessage}</p>
              )}

              {createdCampaignId ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Your campaign is saved. Retry the secure checkout handoff without creating another campaign.
                  </p>
                  <Button
                    type="button"
                    variant="brutalist"
                    onClick={() => void handleCampaignCheckout()}
                    disabled={isSubmitting}
                    data-testid="paid-promotion-retry-checkout"
                    className="bg-foreground text-background hover:bg-foreground/90"
                  >
                    {isSubmitting ? <Spinner size="sm" /> : <RotateCcw />}
                    Try checkout again
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="brutalist"
                  onClick={() => void handleCampaignCheckout()}
                  disabled={!canSubmit || isSubmitting}
                  data-testid="paid-promotion-submit"
                  className="w-full bg-foreground text-background hover:bg-foreground/90 sm:w-auto"
                >
                  {isSubmitting ? <Spinner size="sm" /> : <ArrowRight />}
                  Continue to secure checkout
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
