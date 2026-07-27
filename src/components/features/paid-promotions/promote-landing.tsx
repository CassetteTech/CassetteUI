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
// `soon: true` marks a deliverable that is not live yet. Cassette's own
// Instagram is the only delivery channel at launch; Explore boosts, curator
// playlists, and in-playlist suggestions ship later. Flip a line's `soon`
// flag when its channel goes live — nothing else on the page needs editing.
const DRAFT_PACKAGES = [
  {
    name: 'Boost',
    draftPrice: '$49',
    summary: 'A first push for a new release.',
    window: 'Runs about a week once your track clears review.',
    deliverables: [
      { text: 'A feed post on Cassette’s Instagram, built around your track' },
      { text: 'Story placements across the campaign window' },
      { text: 'A boost in the Cassette Explore feed', soon: true },
    ],
  },
  {
    name: 'Spotlight',
    draftPrice: '$149',
    summary: 'Boost, plus a Reel and a longer run.',
    window: 'Runs one to two weeks once your track clears review.',
    deliverables: [
      { text: 'Everything in Boost' },
      { text: 'A Reel cut around your track' },
      { text: 'Repeat placements across the campaign window' },
      { text: 'Considered for Cassette curator playlists', soon: true },
    ],
  },
  {
    name: 'Headline',
    draftPrice: '$349',
    summary: 'The loudest we get for a single track.',
    window: 'Scheduled with you; typically runs two weeks.',
    deliverables: [
      { text: 'Everything in Spotlight' },
      { text: 'A pinned feature across the whole campaign' },
      { text: 'A delivery recap linking every post we ran' },
      { text: 'Suggested into Cassette playlists your track fits', soon: true },
    ],
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Paste the link',
    body: 'Drop a Spotify, Apple Music, or Deezer URL. Cassette resolves it to the canonical track record it will promote, so you and we are looking at the same song.',
  },
  {
    step: '02',
    title: 'Pick a package',
    body: 'Choose what you want run, tell us about the release, and confirm you are authorized to promote the track.',
  },
  {
    step: '03',
    title: 'Pay through Stripe',
    body: 'Checkout is hosted by Stripe. Prices come from Cassette’s server-owned rate card, and your card details never touch Cassette.',
  },
  {
    step: '04',
    title: 'Someone listens',
    body: 'A person at Cassette plays your track and decides whether we can get behind it. You always get an answer — and if we pass, you get the reason and a full refund.',
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
    body: 'Every campaign gets a human answer. If we pass on your track, we say why and refund you in full.',
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
            We put your track on. Ourselves.
          </h1>
          <p className="mt-5 text-base leading-7 opacity-90 sm:text-lg sm:leading-8">
            Cassette itself is the promoter. You buy a campaign, a real person listens to the track
            and decides, and if we can get behind it we run it on Cassette&apos;s own Instagram. If
            we pass, you hear why and you are refunded in full. No middlemen.
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
                Not a queue, not a form, not a bot deciding whether your track is worth a slot.
              </p>
              <p className="text-foreground">
                You always get an answer. If we can get behind the track, we run it. If we cannot,
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
            Shown for orientation while pricing is finalized. Final packages, prices, and taxes are
            confirmed inside checkout, and every price comes from Cassette&apos;s server-owned rate
            card — never from this page.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Greyed lines are channels we are still building. They are not live and are not part of
            what you pay for today — Instagram is what runs right now.
          </p>

          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {DRAFT_PACKAGES.map((pkg) => (
              <li key={pkg.name} className="flex">
                <article className="flex w-full flex-col border-2 border-foreground bg-card shadow-flat-4">
                  <header className="flex items-baseline justify-between gap-2 border-b-2 border-foreground bg-foreground px-4 py-2.5 text-background">
                    <h3 className="font-mono text-xs font-bold uppercase tracking-[0.22em]">
                      {pkg.name}
                    </h3>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] opacity-70">
                      Draft
                    </p>
                  </header>

                  <div className="flex flex-1 flex-col px-4 py-5">
                    <p className="font-atkinson text-4xl font-bold leading-none tracking-tight text-foreground">
                      {pkg.draftPrice}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground">{pkg.summary}</p>

                    <ul className="mt-5 space-y-2.5 border-t border-border pt-5">
                      {pkg.deliverables.map((deliverable) => {
                        const soon = 'soon' in deliverable && deliverable.soon;
                        return (
                          <li
                            key={deliverable.text}
                            className={`flex gap-2.5 text-sm leading-6 ${
                              soon ? 'text-muted-foreground/70' : 'text-foreground'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`mt-[0.55rem] size-1.5 shrink-0 ${
                                soon ? 'bg-muted-foreground/50' : 'bg-primary'
                              }`}
                            />
                            <span>
                              {deliverable.text}
                              {soon && (
                                <span className="mt-1 block font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                  ◦ Not live yet
                                </span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    <p className="mt-auto pt-5 font-mono text-[11px] leading-5 text-muted-foreground">
                      {pkg.window}
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
              Results vary by track and by audience.
            </p>
          </div>
        </div>
        <DitherEdge color="hsl(var(--section-dark))" side="bottom" />
      </section>

      {/* Refunds — supporting policy, deliberately quiet chrome. */}
      {/* Linked from checkout as /promote#refund-policy — scroll margin keeps
          the heading clear of the sticky navbar. */}
      <section
        id="refund-policy"
        aria-labelledby="promote-refunds-heading"
        className="scroll-mt-24 pt-16 sm:pt-20"
      >
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-10">
          <div className="border-l-2 border-foreground pl-5 sm:pl-6">
            <h3
              id="promote-refunds-heading"
              className="flex flex-wrap items-center gap-2 font-atkinson text-2xl font-bold tracking-tight text-foreground"
            >
              Refunds <DraftBadge />
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Every campaign is reviewed by Cassette before delivery. If we reject your campaign, you
              are refunded in full. If we cannot deliver what your package promised, we refund the
              undelivered portion. Final refund-policy language is confirmed at checkout.
            </p>
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
