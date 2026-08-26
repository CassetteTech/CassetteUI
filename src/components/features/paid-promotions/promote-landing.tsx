import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DitherEdge } from '@/components/features/marketing/dither-edge';
import { PaidPromotionSupportContact } from '@/components/features/paid-promotions/paid-promotion-support';
import {
  Eyebrow,
  TAPE_DECK_CTA_CLASS,
  TapeDeckBand,
} from '@/components/features/paid-promotions/promote-tape-deck';

// Package copy below is deliberately draft: final pricing, refund-policy
// language, and legal disclosure text are pending product/legal sign-off.
// Server rate cards remain the only source of real checkout pricing.
//
// Availability is per package, never per line: a package either ships whole or
// is not sold. Boost is everything Cassette can deliver today; Spotlight and
// Headline are shown to say where this is going, priced nowhere and buyable
// nowhere until their deliverables actually exist.
//
// Sold for tracks and albums. Artist and playlist campaigns resolve but have
// no rate card yet; when they do, they become server rate-card rows.
const DRAFT_PACKAGES = [
  {
    name: 'Boost',
    available: true,
    draftWeeklyPrice: '$25',
    minWeeks: 1,
    maxWeeks: 8,
    soldFor: 'Tracks and albums',
    discount: '10% off when you buy 4 weeks or more',
    summary: 'Instagram support plus clearly labeled sponsored discovery on Cassette.',
    deliverables: [
      'At least one story placement on Cassette’s Instagram every paid week',
      'A clearly labeled Sponsored placement in a separate Explore discovery surface',
      'Real listener engagement may help music travel naturally; organic ranking is never for sale',
      'Continuous management of the campaign — creative, timing, and channel choice',
    ],
  },
  {
    name: 'Spotlight',
    available: false,
    summary: 'Boost, plus original video and placement inside the app.',
    inherits: 'Everything in Boost, plus',
    deliverables: [
      'A Reel cut around what you’re promoting',
      'Your music suggested to listeners on Cassette alongside what it fits',
    ],
  },
  {
    name: 'Headline',
    available: false,
    summary: 'Spotlight, plus a route into curator playlists.',
    inherits: 'Everything in Spotlight, plus',
    deliverables: [
      'Your music put in front of Cassette curators to add to their own playlists',
    ],
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Paste the link',
    body: 'Drop a Spotify, Apple Music, or Deezer URL for a track or an album. Cassette resolves it to the canonical record it will promote, so you and we are looking at the same music.',
  },
  {
    step: '02',
    title: 'Pick your run length',
    body: 'Choose how many weeks the campaign runs, tell us about the release, and confirm you are authorized to promote it. Longer runs cost less per week.',
  },
  {
    step: '03',
    title: 'Pay through Stripe',
    body: 'Checkout is hosted by Stripe and charged once, upfront. Prices come from Cassette’s server-owned rate card, and your card details never touch Cassette.',
  },
  {
    step: '04',
    title: 'Someone listens',
    body: 'A person at Cassette plays your music and decides whether we can get behind it. You always get an answer — and if we pass, you get the reason and a full refund.',
  },
  {
    step: '05',
    title: 'We run it ourselves',
    body: 'Approved campaigns go out on Cassette’s own Instagram — our account, our audience, posts we make. Paid placements are disclosed as paid.',
  },
] as const;

// The trust position, stated as a design feature rather than fine print.
const NOT_THIS = [
  {
    label: 'No bot networks',
    body: 'Nothing is farmed, botted, or bought on your behalf. Every placement is one we made ourselves.',
  },
  {
    label: 'No playlist brokers',
    body: 'We do not pitch third-party playlists or resell placement on platforms we do not own.',
  },
  {
    label: 'No paying for silence',
    body: 'Every campaign gets a human answer. If we pass on your music, we say why and refund you in full.',
  },
] as const;

function DraftBadge() {
  return (
    <span className="inline-block rounded-sm border border-dashed border-current px-1.5 py-0.5 align-middle font-mono text-[9px] font-bold uppercase tracking-[0.2em] opacity-70">
      Draft copy
    </span>
  );
}

export function PromoteLanding({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <div className="relative bg-background pb-16" data-testid="promote-landing">
      <TapeDeckBand variant="hero">
        <div className="max-w-2xl lg:max-w-xl xl:max-w-2xl">
          <Eyebrow>Direct paid promotion</Eyebrow>
          <h1 className="mt-5 font-atkinson text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            We put your music on. Ourselves.
          </h1>
          <p className="mt-5 text-base leading-7 opacity-90 sm:text-lg sm:leading-8">
            Cassette itself is the promoter. You buy a campaign by the week, a real person listens
            to your track or album and decides, and if we can get behind it we run it on
            Cassette&apos;s own Instagram. If we pass, you hear why and you are refunded in full. No
            middlemen.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7">
            <Link
              href="/promote/new"
              data-testid="promote-landing-cta"
              className={`${TAPE_DECK_CTA_CLASS} w-full sm:w-auto`}
            >
              {signedIn ? 'Continue — start a campaign' : 'Start a campaign'}{' '}
              <ArrowRight aria-hidden="true" />
            </Link>
            <p className="max-w-sm text-sm leading-6 opacity-90">
              {signedIn
                ? 'Campaigns you start show up here on your promotion home.'
                : 'You will be asked to sign in or create a free account first.'}
            </p>
          </div>
        </div>
      </TapeDeckBand>

      {/* What this is not — the trust position, stated up front. */}
      <section aria-labelledby="promote-not-this-heading" className="pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-10">
          <h2 id="promote-not-this-heading" className="sr-only">
            What Cassette paid promotion is not
          </h2>
          <ul className="grid gap-px overflow-hidden border-y-2 border-foreground bg-border sm:grid-cols-3">
            {NOT_THIS.map((item) => (
              <li key={item.label} className="bg-background px-5 py-6 sm:px-6">
                <p className="font-atkinson text-xl font-bold tracking-tight text-foreground">
                  <span aria-hidden="true" className="mr-2 text-primary">
                    ✕
                  </span>
                  {item.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The review promise — the differentiator against submission tools,
          where paying buys a queue position and silence is a common outcome. */}
      <section aria-labelledby="promote-review-heading" className="pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-10">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
            <div>
              <Eyebrow className="text-foreground">The review</Eyebrow>
              <h2
                id="promote-review-heading"
                className="mt-4 font-atkinson text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl"
              >
                Someone actually listens.
              </h2>
            </div>
            <div className="space-y-4 text-base leading-7 text-muted-foreground md:pt-12">
              <p>
                Every campaign is played and judged by a person at Cassette before anything runs.
                Not a queue, not a form, not a bot deciding whether your music is worth a slot.
              </p>
              <p className="text-foreground">
                You always get an answer. If we can get behind it, we run it. If we cannot,
                we tell you why and refund you in full — you are never left paying for silence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — a numbered signal chain, not a feature grid. */}
      <section aria-labelledby="promote-how-heading" className="pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-10">
          <Eyebrow className="text-foreground">The tape path</Eyebrow>
          <h2
            id="promote-how-heading"
            className="mt-4 font-atkinson text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            How it works
          </h2>
          <ol className="mt-8 border-t border-border">
            {HOW_IT_WORKS.map((item) => (
              <li
                key={item.step}
                className="grid gap-2 border-b border-border py-6 sm:grid-cols-[4rem_minmax(0,14rem)_minmax(0,1fr)] sm:gap-6 sm:py-7"
              >
                <p className="font-mono text-sm font-bold text-primary">{item.step}</p>
                <h3 className="font-atkinson text-lg font-bold text-foreground">{item.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Packages — J-card style rate cards. */}
      <section aria-labelledby="promote-packages-heading" className="pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-10">
          <Eyebrow className="text-foreground">Rate card</Eyebrow>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h2
              id="promote-packages-heading"
              className="font-atkinson text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              Packages
            </h2>
            <DraftBadge />
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Shown for orientation while pricing is finalized. Final prices and taxes are confirmed
            inside checkout, and every price comes from Cassette&apos;s server-owned rate card —
            never from this page.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Only Boost is buyable. Spotlight and Headline are what we are building next — they have
            no price, and nothing in them is part of what you pay for today.
          </p>

          <ul className="mt-8 grid items-start gap-5 md:grid-cols-3">
            {DRAFT_PACKAGES.map((pkg) => (
              <li key={pkg.name} className="flex">
                <article
                  data-testid={`promote-package-${pkg.name.toLowerCase()}`}
                  className={
                    pkg.available
                      ? 'flex w-full flex-col border-2 border-foreground bg-card shadow-flat-4'
                      : 'flex w-full flex-col border border-dashed border-border bg-transparent'
                  }
                >
                  <header
                    className={
                      pkg.available
                        ? 'flex items-baseline justify-between gap-2 border-b-2 border-foreground bg-foreground px-4 py-2.5 text-background'
                        : 'flex items-baseline justify-between gap-2 border-b border-dashed border-border px-4 py-2.5 text-muted-foreground'
                    }
                  >
                    <h3 className="font-mono text-xs font-bold uppercase tracking-[0.22em]">
                      {pkg.name}
                    </h3>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] opacity-70">
                      {pkg.available ? 'Draft' : 'Not live yet'}
                    </p>
                  </header>

                  <div className="flex flex-1 flex-col px-4 py-5">
                    {pkg.available ? (
                      <>
                        <p className="flex items-baseline gap-2">
                          <span className="font-atkinson text-4xl font-bold leading-none tracking-tight text-foreground">
                            {pkg.draftWeeklyPrice}
                          </span>
                          <span className="font-mono text-sm text-muted-foreground">/ week</span>
                        </p>
                        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground">
                          {pkg.minWeeks}–{pkg.maxWeeks} weeks · {pkg.soldFor}
                        </p>
                        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
                          {pkg.discount}
                        </p>
                      </>
                    ) : (
                      <p className="font-atkinson text-2xl font-bold leading-none tracking-tight text-muted-foreground">
                        Not sold yet
                      </p>
                    )}

                    <p
                      className={`mt-3 text-sm leading-6 ${
                        pkg.available ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {pkg.summary}
                    </p>

                    <ul
                      className={`mt-5 space-y-2.5 pt-5 ${
                        pkg.available ? 'border-t border-border' : 'border-t border-dashed border-border'
                      }`}
                    >
                      {!pkg.available && (
                        <li className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          {pkg.inherits}
                        </li>
                      )}
                      {pkg.deliverables.map((deliverable) => (
                        <li
                          key={deliverable}
                          className={`flex gap-2.5 text-sm leading-6 ${
                            pkg.available ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`mt-[0.55rem] size-1.5 shrink-0 ${
                              pkg.available ? 'bg-primary' : 'bg-muted-foreground/50'
                            }`}
                          />
                          <span>{deliverable}</span>
                        </li>
                      ))}
                    </ul>

                    <p
                      className={`mt-auto pt-5 font-mono text-[11px] leading-5 text-muted-foreground ${
                        pkg.available ? '' : 'border-t border-dashed border-border mt-5'
                      }`}
                    >
                      {pkg.available ? (
                        <>
                          Charged once, upfront. What a paid week buys is spelled out under{' '}
                          <a
                            href="#refund-policy"
                            className="text-foreground underline underline-offset-4 hover:text-primary"
                          >
                            refunds
                          </a>
                          .
                        </>
                      ) : (
                        'Not available to buy. No date promised.'
                      )}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* No guaranteed outcomes — a statement band, echoing the hero so the
          trust position carries the same weight as the pitch. */}
      <section aria-labelledby="promote-terms-heading" className="relative mt-16 sm:mt-20">
        <h2 id="promote-terms-heading" className="sr-only">
          What paid promotion does and does not include
        </h2>
        <DitherEdge color="hsl(var(--section-dark))" side="top" />
        <div className="bg-section-dark px-4 py-14 text-section-dark-fg sm:px-6 sm:py-16 lg:px-10">
          <div className="mx-auto w-full max-w-5xl">
            <Eyebrow>Read this part</Eyebrow>
            <h3 className="mt-5 max-w-3xl font-atkinson text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              No guaranteed outcomes
            </h3>
            <p className="mt-5 max-w-3xl text-base leading-7 opacity-90 sm:text-lg sm:leading-8">
              What you buy is a real listen and real promotion work through Cassette-owned channels
              — never outcomes. We do not promise or sell streams, saves, followers, chart
              positions, or placements on Spotify, Apple Music, Deezer, or any other third-party
              platform, and we never will. Anyone who does is selling you numbers, not an audience.
              Results vary by release and by audience.
            </p>
          </div>
        </div>
        <DitherEdge color="hsl(var(--section-dark))" side="bottom" />
      </section>

      {/* What a week buys, then refunds — the two halves of the same promise:
          a week is refundable only because it is countable. Supporting policy,
          deliberately quiet chrome. */}
      {/* Linked from checkout as /promote#refund-policy — scroll margin keeps
          the heading clear of the sticky navbar. */}
      <section
        id="refund-policy"
        aria-labelledby="promote-refunds-heading"
        className="scroll-mt-24 pt-16 sm:pt-20"
      >
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-10">
          <div className="space-y-8 border-l-2 border-foreground pl-5 sm:pl-6">
            <div>
              <h3
                id="promote-refunds-heading"
                className="flex flex-wrap items-center gap-2 font-atkinson text-2xl font-bold tracking-tight text-foreground"
              >
                What a paid week buys <DraftBadge />
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Each paid week buys at least one story placement on Cassette&apos;s active channels
                — Instagram today — published and recorded, plus continuous management of your
                campaign: creative, timing, and which channel it runs on, at Cassette&apos;s
                editorial discretion. Placements are spread across your campaign&apos;s run. They
                are not tied to fixed days or a fixed schedule, and we never promise streams,
                saves, followers, or placement by anyone but us.
              </p>
            </div>

            <div>
              <h3 className="font-atkinson text-2xl font-bold tracking-tight text-foreground">
                Refunds
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Every campaign is reviewed by Cassette before delivery. If we reject your campaign,
                you are refunded in full. If your campaign stops early, every week we did not
                deliver is refunded in full — a week counts as delivered only once its placements
                are published, so a half-finished week refunds as an undelivered one. Final
                refund-policy language is confirmed at checkout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-6 border-t-2 border-foreground pt-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-md">
              <h2 className="font-atkinson text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Ready when you are.
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                A person listens to every campaign before any money is kept. If we pass, you get the
                reason and a full refund.
              </p>
            </div>
            <Button asChild variant="brutalist" size="lg" className="w-full sm:w-auto">
              <Link href="/promote/new">
                Start a campaign <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <PaidPromotionSupportContact className="mt-10" />
        </div>
      </section>
    </div>
  );
}
