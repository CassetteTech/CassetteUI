'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Music2,
  Sparkles,
  Share2,
  Compass,
  Link as LinkIcon,
  Users2,
  Wand2,
  LibraryBig,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AboutPageReimagined() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background via-background to-muted/30 selection:bg-primary/20 selection:text-primary">
      {/* Ambient background accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-20 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-32 h-[28rem] w-[28rem] rounded-full bg-secondary/20 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-12 lg:py-20">
        {/* HERO: Split with device demo */}
        <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-4 w-4 text-primary" />
              Music, finally portable across platforms
            </div>

            <h1 className="font-teko text-5xl leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-7xl">
              Your music taste,
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {' '}
                perfectly translated
              </span>
              .
            </h1>

            <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
              Cassette turns any track, album, or playlist into a beautiful
              universal link that opens in your friends&apos; preferred app —
              Spotify, Apple Music, YouTube Music, and more.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                asChild
                size="lg"
                className="group bg-gradient-to-r from-primary to-secondary text-foreground shadow-lg shadow-primary/10 transition-all hover:shadow-xl hover:shadow-secondary/20"
              >
                <Link href="/auth/signup">
                  Create your first smart link
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-border/70 bg-background/60 backdrop-blur"
              >
                <Link href="/profile">Explore profiles</Link>
              </Button>
            </div>

            {/* Quick value props */}
            <div className="grid gap-4 sm:grid-cols-3">
              <FeaturePill icon={<LinkIcon className="h-4 w-4" />}>
                One link for every service
              </FeaturePill>
              <FeaturePill icon={<Users2 className="h-4 w-4" />}>
                Built for sharing
              </FeaturePill>
              <FeaturePill icon={<Wand2 className="h-4 w-4" />}>
                Auto-detects user&apos;s app
              </FeaturePill>
            </div>
          </div>

          {/* DEMO PANEL: Intentionally tall; give breathing room */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2.25rem] bg-gradient-to-tr from-primary/25 via-transparent to-secondary/25 blur-2xl" />
            <div className="rounded-[2.25rem] border border-border/60 bg-card/60 p-3 backdrop-blur">
              <div className="rounded-[1.85rem] border border-border/60 bg-background">
                {/* Provide vertical spacing to account for the demo’s height */}
                <div className="px-2 pb-10 pt-8 sm:px-3 md:px-4 lg:px-6">
                  <div className="flex w-full justify-center">
                    {/* Profile demo content would go here */}
                  </div>
                </div>
              </div>
            </div>
            {/* shadow halo */}
            <div className="pointer-events-none absolute inset-x-8 -bottom-10 h-24 rounded-full bg-black/10 blur-2xl dark:bg-black/40" />
          </div>
        </section>

        {/* SECTION: What makes Cassette different */}
        <section className="mt-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge>Why Cassette</Badge>
            <h2 className="mt-3 font-teko text-4xl text-foreground md:text-5xl">
              Share once. Open anywhere.
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Your links shouldn&apos;t break friendships. Cassette routes
              listeners to their default streaming app with fallbacks for every
              other platform — all inside a single elegant page.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <GradientCard
              icon={<Music2 className="h-5 w-5 text-primary" />}
              title="Universal Music Links"
              description="Drop a Spotify, Apple Music, or YouTube Music URL — we build a
              responsive landing page with all platform options and auto-open."
              items={[
                'Tracks, albums, and playlists supported',
                'Auto-detects preferred service',
                'Copy, share, and embed-ready',
              ]}
            />
            <GradientCard
              icon={<LibraryBig className="h-5 w-5 text-secondary" />}
              title="Your Music Identity"
              description="Show who you are with a profile that pulls your best playlists,
              recent tracks, and favorite artists across services."
              items={[
                'Portable profile link for bios',
                'Organize multi-platform music',
                'Curator-first design',
              ]}
            />
            <GradientCard
              icon={<Share2 className="h-5 w-5 text-accent" />}
              title="Effortless Sharing"
              description="Send one link and let Cassette do the rest. No more ‘I’m on Apple
              Music’ headaches."
              items={[
                'Optimized for DM and socials',
                'Fast, lightweight pages',
                'Analytics coming soon',
              ]}
            />
          </div>
        </section>

        {/* SECTION: Live Samples */}
        <section className="mt-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge>Live Samples</Badge>
            <h2 className="mt-3 font-teko text-4xl text-foreground md:text-5xl">
              See smart links in action
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Click any card to experience universal routing and platform
              choices — designed to look great in light and dark mode.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SampleCard
              href="/post?url=https://open.spotify.com/track/4fzsfWzRhPawzqhX8Qt9F3"
              title="Stronger"
              subtitle="Kanye West"
              accent="from-emerald-400 to-emerald-600"
              meta="Spotify → Universal"
            />
            <SampleCard
              href="/post?url=https://music.apple.com/us/album/the-dark-side-of-the-moon/1065973699?i=1065973705"
              title="Time"
              subtitle="Pink Floyd"
              accent="from-pink-400 to-pink-600"
              meta="Apple Music → Universal"
            />
            <SampleCard
              href="/post?url=https://open.spotify.com/track/3jtvJtAA25a7d0BLOJ8Dqo"
              title="Daft Punk is Playing at My House"
              subtitle="LCD Soundsystem"
              accent="from-violet-400 to-violet-600"
              meta="Dance/Electronic"
            />
            <SampleCard
              href="/post?url=https://open.spotify.com/album/4yP0hdKOZPNshxUOjY0cZj"
              title="After Hours"
              subtitle="The Weeknd"
              accent="from-rose-400 to-rose-600"
              meta="Full Album"
            />
            <SampleCard
              href="/post?url=https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv"
              title="Currents"
              subtitle="Tame Impala"
              accent="from-amber-400 to-orange-600"
              meta="Psychedelic Rock"
            />
            <SampleCard
              href="/post?url=https://open.spotify.com/track/5UH5s7VwbSkFExIl1oqNux"
              title="Feels Like Summer"
              subtitle="Childish Gambino"
              accent="from-sky-400 to-sky-600"
              meta="Hip-Hop/R&B"
            />
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Every link detects your default streaming service and opens there,
            with alternatives available instantly.
          </p>
        </section>

        {/* SECTION: Story + Vision (re-ordered and condensed) */}
        <section className="mt-28 grid items-stretch gap-8 lg:grid-cols-2">
          <div className="group relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-8 backdrop-blur">
            <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-primary/25 blur-2xl transition-all group-hover:scale-110" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-secondary/25 blur-2xl transition-all group-hover:scale-110" />
            <h3 className="font-teko text-3xl text-foreground md:text-4xl">
              The story behind Cassette
            </h3>
            <p className="mt-4 text-muted-foreground">
              You craft the perfect playlist — immaculate flow, hidden gems. You
              share it... and hear, “Sorry, I use Apple Music.” Music should be
              universal. Discovery should spark joy, not friction.
            </p>
            <blockquote className="mt-6 border-l-2 border-primary/60 pl-4 text-foreground">
              Born from frustration by developers and music obsessives, Cassette
              exists so your taste can travel freely.
            </blockquote>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-8 backdrop-blur">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Compass className="h-4 w-4 text-accent" />
              Our vision
            </div>
            <h3 className="font-teko text-3xl text-foreground md:text-4xl">
              A home for music curators
            </h3>
            <p className="mt-4 text-muted-foreground">
              We&apos;re building a platform where modern curators — the new
              radio DJs — can thrive, build community, and be recognized for
              their taste.
            </p>
            <div className="mt-6 rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="font-medium text-foreground">
                We&apos;re creating a future where curators are rewarded for
                their influence.
              </p>
            </div>
            <div className="mt-6">
              <Button asChild variant="outline" className="border-border/70">
                <Link href="/team">Meet the team</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* SECTION: Final CTA */}
        <section className="mt-28">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-primary/15 via-background to-secondary/15 p-10 text-center backdrop-blur">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.15),transparent_60%)]" />
            <h2 className="relative z-10 font-teko text-4xl text-foreground md:text-5xl">
              Ready to unify your music?
            </h2>
            <p className="relative z-10 mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
              Join thousands breaking down streaming walls every day.
            </p>
            <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-primary to-secondary text-foreground shadow-lg shadow-primary/10 transition-all hover:shadow-xl hover:shadow-secondary/20"
              >
                <Link href="/auth/signup">
                  Start sharing free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-border/70 bg-background/60 backdrop-blur"
              >
                <Link href="/profile">See examples</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ——— UI Subcomponents ——— */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
      {children}
    </div>
  );
}

function FeaturePill({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm text-muted-foreground backdrop-blur transition-colors hover:bg-muted/50">
      <span className="grid h-6 w-6 place-items-center rounded-md bg-muted text-foreground/80">
        {icon}
      </span>
      {children}
    </div>
  );
}

function GradientCard({
  icon,
  title,
  description,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br from-primary/25 to-secondary/25 blur-2xl transition-transform group-hover:scale-110" />
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted">
          {icon}
        </div>
        <h3 className="font-teko text-2xl text-foreground">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SampleCard({
  href,
  title,
  subtitle,
  meta,
  accent = 'from-primary to-secondary',
}: {
  href: string;
  title: string;
  subtitle: string;
  meta: string;
  accent?: string;
}) {
  return (
    <Link href={href} className="group block">
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/70 p-4 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10">
        <div
          className={`mb-3 h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br ${accent} grid place-items-center`}
        >
          <Music2 className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h4 className="truncate font-teko text-xl text-foreground">{title}</h4>
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/70" />
            {meta}
          </div>
        </div>
      </div>
    </Link>
  );
}