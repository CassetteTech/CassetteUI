"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CassetteTape,
  HeartHandshake,
  Link as LinkIcon,
  Music2,
  Radio,
  Stars,
  UserSquare,
  Zap,
} from "lucide-react";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileDemo } from "@/components/demo/profile-demo";
import { openKoFiSupport, KOFI_ICON_SRC } from "@/lib/ko-fi";

/**
 * About Page (Revamped)
 * Ambitious redesign:
 * - Strong split hero with sticky marquee + CTA
 * - Refined 2-column feature grid and staggered motion
 * - Taller-safe InvertedProfileDemo container with clamped heights
 * - Balanced light/dark tokens and subtle glassmorphism
 * - Reduced noise, improved visual hierarchy, stronger typography rhythm
 * - Desktop-first with good mobile fallbacks
 */

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background via-muted/10 to-muted/30 overflow-hidden">
      <AnimatedBackground />

      {/* Ambient Gradient Orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <main className="relative z-10">
        {/* HERO */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 md:pt-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            {/* Left - Headline and CTA */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/70 px-3 py-1.5 backdrop-blur-md">
                <Stars className="h-4 w-4 text-primary" />
                <span className="font-teko text-sm tracking-wide text-muted-foreground">
                  MADE FOR CURATORS
                </span>
              </div>

              <h1 className="mt-6 font-teko text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                Your Music, <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Everywhere.</span>
              </h1>

              <p className="mt-4 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-xl">
                Cassette turns any track, album, or playlist into a single smart link
                that opens in your listener’s preferred app—no dead ends, no friction.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button
                  asChild
                  size="lg"
                  className="font-teko text-lg px-7 py-6 rounded-xl bg-gradient-to-r from-primary to-secondary text-foreground hover:from-primary/90 hover:to-secondary/90"
                >
                  <Link href="/auth/signup">
                    Create Your Universal Link
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="font-teko text-lg px-7 py-6 rounded-xl bg-transparent border-border hover:bg-bgSubtle/50"
                >
                  <Link href="/profile">Explore Profiles</Link>
                </Button>
              </div>

              {/* Trust / Proof */}
              <div className="mt-10 flex items-center gap-6">
                <div className="flex -space-x-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border border-border/60 bg-gradient-to-br from-muted to-muted/60"
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Trusted by curators, DJs, and music creators worldwide
                </p>
              </div>
            </motion.div>

            {/* Right - Smart Preview Card */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="lg:col-span-6"
            >
              <div className="relative">
                <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-primary/30 to-secondary/30 blur-xl opacity-40" />
                <Card className="relative rounded-3xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xl">
                  <CardHeader className="p-6 pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <CassetteTape className="h-6 w-6 text-foreground" />
                      </div>
                      <div>
                        <CardTitle className="font-teko text-2xl text-foreground">
                          Universal Music Link
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          One link that speaks every platform
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {/* Demo Links */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        {
                          title: "Stronger",
                          artist: "Kanye West",
                          href:
                            "/post?url=https://open.spotify.com/track/4fzsfWzRhPawzqhX8Qt9F3",
                          color:
                            "from-emerald-400 to-emerald-600",
                          badge: "Spotify → Universal",
                        },
                        {
                          title: "Time",
                          artist: "Pink Floyd",
                          href:
                            "/post?url=https://music.apple.com/us/album/the-dark-side-of-the-moon/1065973699?i=1065973705",
                          color: "from-pink-400 to-pink-600",
                          badge: "Apple Music → Universal",
                        },
                        {
                          title: "Daft Punk is Playing at My House",
                          artist: "LCD Soundsystem",
                          href:
                            "/post?url=https://open.spotify.com/track/3jtvJtAA25a7d0BLOJ8Dqo",
                          color: "from-violet-400 to-violet-600",
                          badge: "Dance / Electronic",
                        },
                        {
                          title: "After Hours",
                          artist: "The Weeknd",
                          href:
                            "/post?url=https://open.spotify.com/album/4yP0hdKOZPNshxUOjY0cZj",
                          color: "from-red-400 to-red-600",
                          badge: "Full Album",
                        },
                      ].map((item, idx) => (
                        <Link
                          key={idx}
                          href={item.href}
                          className="group rounded-2xl border border-border/60 bg-muted/30 hover:bg-muted/50 transition-all"
                        >
                          <div className="flex items-center gap-3 p-3">
                            <div
                              className={`h-12 w-12 flex-shrink-0 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}
                            >
                              <Music2 className="h-5 w-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {item.title}
                              </p>
                              <p className="truncate text-sm text-muted-foreground">
                                {item.artist}
                              </p>
                              <span className="mt-1 inline-flex text-[10px] px-2 py-0.5 rounded-full bg-border/60 text-muted-foreground">
                                {item.badge}
                              </span>
                            </div>
                            <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                          </div>
                        </Link>
                      ))}
                    </div>

                    <div className="pt-2 text-xs text-muted-foreground">
                      Cassette auto-detects listeners’ preferred apps and provides
                      instant alternatives.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        </section>

        {/* STORY + TEAM PREVIEW */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-20 md:mt-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-stretch">
            {/* Story Card */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-7"
            >
              <div className="relative">
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary/20 to-secondary/20 blur-2xl opacity-40" />
                <div className="relative rounded-3xl border border-border/60 bg-card/80 backdrop-blur-md p-8 md:p-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                      <Radio className="h-5 w-5 text-accent" />
                    </div>
                    <h2 className="font-teko text-3xl sm:text-4xl text-foreground">
                      Why Cassette Exists
                    </h2>
                  </div>
                  <div className="space-y-5 text-lg text-muted-foreground">
                    <p className="border-l-2 border-primary/60 pl-4 text-foreground/90">
                      You share the perfect playlist—someone replies,
                      “Sorry, I use Apple Music.” That ends today.
                    </p>
                    <p>
                      Music is universal. Platforms aren’t. Cassette removes the
                      walls so your discoveries flow to everyone, everywhere.
                    </p>
                    <p className="text-foreground font-medium">
                      Built by music lovers, for the culture: developers,
                      curators, and crate-diggers who live for great finds.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Team Preview Card */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="lg:col-span-5"
            >
              <Link href="/team" className="group block h-full">
                <div className="relative h-full">
                  <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-primary/30 to-secondary/30 blur-2xl opacity-40" />
                  <div className="relative rounded-3xl border border-border/60 bg-card/80 backdrop-blur-md p-8 h-full flex flex-col">
                    <div className="flex items-center justify-between">
                      <h3 className="font-teko text-2xl text-foreground">
                        The Cassette Crew
                      </h3>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      Music-obsessed team breaking down streaming barriers.
                    </p>
                    <div className="mt-6 grid grid-cols-4 gap-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="aspect-square rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center"
                        >
                          <UserSquare className="h-5 w-5 text-primary" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-auto pt-6 text-xs text-muted-foreground">
                      Meet the people shaping the future of music curation.
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Support CTA */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-16">
          <div className="rounded-3xl border border-primary/30 bg-primary/10 backdrop-blur-sm shadow-xl p-6 sm:p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4 text-left">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <HeartHandshake className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-teko text-2xl text-foreground mb-1">Fuel the Cassette Mission</h3>
                <p className="text-muted-foreground max-w-2xl">
                  We&apos;re an indie team building better ways to share music. If our story resonates, tap Support to send a Ko-fi.
                </p>
              </div>
            </div>
            <button
              onClick={openKoFiSupport}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-teko text-lg px-6 py-3 shadow-lg shadow-primary/20 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Support Cassette on Ko-fi"
            >
              <Image src={KOFI_ICON_SRC} alt="Ko-fi" width={20} height={20} className="rounded-full" />
              <span>Support Us</span>
            </button>
          </div>
        </section>

        {/* FEATURES: Two-Column with Tall InvertedProfileDemo */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-20 md:mt-28">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-bgSubtle/50 px-4 py-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-teko text-primary text-lg tracking-wide">
                WHAT YOU CAN DO
              </span>
            </div>
            <h2 className="mt-4 font-teko text-3xl sm:text-4xl font-bold text-foreground">
              Unify Your Music Universe
            </h2>
            <p className="mt-3 text-muted-foreground">
              Links that work everywhere, profiles that express your taste.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Tall Demo - left on desktop */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-5 flex justify-center lg:justify-end"
            >
              <div className="relative w-full max-w-[520px]">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-primary/25 to-secondary/25 blur-2xl opacity-40" />
                <div
                  className="relative rounded-3xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xl"
                  style={{
                    paddingTop: "2rem",
                    paddingBottom: "2rem",
                  }}
                >
                  {/* Ensure enough space for tall content */}
                  <div className="px-4 md:px-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                          <UserSquare className="h-5 w-5 text-foreground" />
                        </div>
                        <div>
                          <p className="font-teko text-xl text-foreground">
                            Profile Preview
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Your music identity
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] text-muted-foreground">
                        Live Demo
                      </span>
                    </div>

                    <div className="rounded-2xl border border-border/50 bg-bgElevated/80 p-3">
                      {/* Constrain width, let height breathe */}
                      <div className="mx-auto w-full">
                        <ProfileDemo />
                      </div>
                    </div>

                    <p className="mt-4 text-xs text-muted-foreground">
                      Tip: This component is taller than it looks—extra vertical
                      space included to avoid truncation.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature Cards - right on desktop */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="lg:col-span-7 space-y-8 self-center"
            >
              {/* Universal Links */}
              <Card className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-md shadow-lg overflow-hidden">
                <CardHeader className="p-6">
                  <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center">
                    <LinkIcon className="text-primary h-5 w-5" />
                  </div>
                  <CardTitle className="mt-4 font-teko text-2xl text-foreground">
                    Universal Music Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 -mt-2">
                  <p className="text-muted-foreground">
                    Drop any URL—Spotify, Apple, YouTube—and get one elegant
                    Cassette link that adapts to every listener.
                  </p>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link
                      href="/post?url=https://open.spotify.com/track/4fzsfWzRhPawzqhX8Qt9F3"
                      className="rounded-2xl border border-border/60 bg-muted/40 hover:bg-muted/60 transition-colors p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-500/90 flex items-center justify-center">
                          <Music2 className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            Stronger — Kanye West
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Smart link opens in preferred app
                          </p>
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/post?url=https://music.apple.com/us/album/the-dark-side-of-the-moon/1065973699?i=1065973705"
                      className="rounded-2xl border border-border/60 bg-muted/40 hover:bg-muted/60 transition-colors p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-pink-500/90 flex items-center justify-center">
                          <Music2 className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            Time — Pink Floyd
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Cross-platform friendly
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Music Identity */}
              <Card className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-md shadow-lg overflow-hidden">
                <CardHeader className="p-6">
                  <div className="bg-accent/10 w-12 h-12 rounded-xl flex items-center justify-center">
                    <UserSquare className="text-accent h-5 w-5" />
                  </div>
                  <CardTitle className="mt-4 font-teko text-2xl text-foreground">
                    Your Music Identity
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6 -mt-2">
                  <p className="text-muted-foreground">
                    Your profile becomes a home for your taste—playlists, recent
                    finds, top artists—beautifully organized in one place.
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {[
                      {
                        title: "Playlists",
                        desc: "Summer Vibes, Chill Study",
                      },
                      { title: "Top Artists", desc: "The Weeknd, Tame Impala" },
                      {
                        title: "Recent Tracks",
                        desc: "LCD Soundsystem, Flipturn",
                      },
                      { title: "Albums", desc: "After Hours, Currents" },
                    ].map((b, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-border/60 bg-muted/40 p-3"
                      >
                        <p className="text-xs font-medium text-foreground">
                          {b.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{b.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* SHOWCASE STRIP */}
        <section className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 mt-20 md:mt-28">
          <div className="rounded-3xl border border-border/50 bg-card/70 backdrop-blur-md p-6 md:p-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-teko text-2xl text-foreground">
                  See Smart Links in Action
                </h3>
                <p className="text-muted-foreground">
                  Click to test real links—Cassette routes them instantly.
                </p>
              </div>
              <Button
                asChild
                size="sm"
                className="font-teko bg-gradient-to-r from-primary to-secondary text-foreground"
              >
                <Link href="/auth/signup">Start Free</Link>
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                {
                  t: "Stronger",
                  a: "Kanye West",
                  href:
                    "/post?url=https://open.spotify.com/track/4fzsfWzRhPawzqhX8Qt9F3",
                  color: "from-emerald-400 to-emerald-600",
                  meta: "Spotify → Universal",
                },
                {
                  t: "Time",
                  a: "Pink Floyd",
                  href:
                    "/post?url=https://music.apple.com/us/album/the-dark-side-of-the-moon/1065973699?i=1065973705",
                  color: "from-pink-400 to-pink-600",
                  meta: "Apple → Universal",
                },
                {
                  t: "Daft Punk is Playing at My House",
                  a: "LCD Soundsystem",
                  href:
                    "/post?url=https://open.spotify.com/track/3jtvJtAA25a7d0BLOJ8Dqo",
                  color: "from-violet-400 to-violet-600",
                  meta: "Electronic",
                },
                {
                  t: "After Hours",
                  a: "The Weeknd",
                  href:
                    "/post?url=https://open.spotify.com/album/4yP0hdKOZPNshxUOjY0cZj",
                  color: "from-red-400 to-red-600",
                  meta: "Full Album",
                },
                {
                  t: "Currents",
                  a: "Tame Impala",
                  href:
                    "/post?url=https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv",
                  color: "from-orange-400 to-amber-600",
                  meta: "Psychedelic",
                },
                {
                  t: "Feels Like Summer",
                  a: "Childish Gambino",
                  href:
                    "/post?url=https://open.spotify.com/track/5UH5s7VwbSkFExIl1oqNux",
                  color: "from-sky-400 to-blue-600",
                  meta: "Hip-Hop/R&B",
                },
              ].map((x, i) => (
                <Link
                  key={i}
                  href={x.href}
                  className="group rounded-2xl border border-border/60 bg-card/80 hover:bg-card transition-all shadow-sm hover:shadow-lg"
                >
                  <div className="p-4 flex items-center gap-3">
                    <div
                      className={`h-12 w-12 flex-shrink-0 rounded-xl bg-gradient-to-br ${x.color} flex items-center justify-center`}
                    >
                      <Music2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-teko text-lg text-foreground">
                        {x.t}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {x.a}
                      </p>
                      <span className="mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full bg-border/60 text-muted-foreground">
                        {x.meta}
                      </span>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* VISION */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-20 md:mt-28">
          <div className="relative rounded-3xl border border-border/50 bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur-md p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
              <div className="md:col-span-5">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary to-secondary blur-2xl opacity-20" />
                  <div className="relative rounded-3xl border border-border/60 bg-card/80 p-8 flex flex-col items-center justify-center">
                    <Radio className="text-accent mb-4 h-12 w-12" />
                    <h3 className="font-teko text-2xl text-foreground text-center">
                      The Future of Curation
                    </h3>
                  </div>
                </div>
              </div>
              <div className="md:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-bgSubtle/50 px-4 py-2 mb-4">
                  <Music2 className="h-4 w-4 text-accent" />
                  <span className="font-teko text-accent text-lg">OUR VISION</span>
                </div>
                <h2 className="font-teko text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  A Home for Music Curators
                </h2>
                <p className="text-lg text-muted-foreground">
                  We’re building a platform where modern tastemakers thrive—
                  where sharing your taste builds community and earns recognition.
                </p>
                <p className="mt-4 border-l-2 border-secondary pl-4 py-1 text-foreground font-medium">
                  Curators deserve credit—and rewards—for their influence.
                </p>
                <p className="mt-4 text-muted-foreground">
                  Join us to shape what comes next.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Supporters Showcase */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-20 md:mt-28">
          <div className="rounded-3xl border border-border/50 bg-card/80 backdrop-blur-md shadow-xl p-0 overflow-hidden">
            <div className="px-6 pt-6 pb-4 text-left">
              <h3 className="font-teko text-2xl text-foreground">Buy the Team a Coffee</h3>
              <p className="mt-2 text-muted-foreground text-sm">
                Want a closer look? Use the embedded Ko-fi widget to pledge support without leaving the page.
              </p>
            </div>
            <div className="bg-[#f9f9f9] px-2 pb-2">
              <iframe
                id="kofiframe"
                src="https://ko-fi.com/cassettetech/?hidefeed=true&widget=true&embed=true&preview=true"
                title="cassettetech"
                className="w-full rounded-2xl"
                height={712}
                style={{ border: "none", background: "#f9f9f9" }}
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 my-20 md:my-28 text-center">
          <h2 className="font-teko text-3xl sm:text-4xl font-bold text-foreground">
            Ready to Unify Your Music?
          </h2>
          <p className="mt-3 text-lg sm:text-xl text-muted-foreground">
            Join thousands breaking down streaming barriers every day.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="font-teko text-lg bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-foreground px-8 py-6 rounded-xl"
            >
              <Link href="/auth/signup">
                Start Sharing Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="font-teko text-lg bg-transparent text-foreground border-borderDark hover:bg-bgSubtle/50 px-8 py-6 rounded-xl"
            >
              <Link href="/profile">See Examples</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
