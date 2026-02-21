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
import { useAuthState } from "@/hooks/use-auth";

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
  const { isAuthenticated } = useAuthState();
  const primaryCtaHref = isAuthenticated ? "/" : "/auth/signup";

  return (
    <div className="relative min-h-screen surface-bottom overflow-hidden">
      <AnimatedBackground />

      {/* Ambient Gradient Orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/8 blur-3xl" />
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
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 surface-top px-4 py-2 backdrop-blur-md elev-1">
                <Stars className="h-4 w-4 text-primary" />
                <span className="font-teko text-sm tracking-wider text-primary uppercase font-medium">
                  Made for Curators
                </span>
              </div>

              <h1 className="mt-8 font-teko text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-none">
                Your Music, <span className="text-gradient">Everywhere.</span>
              </h1>

              <p className="mt-6 text-xl sm:text-2xl text-muted-foreground leading-relaxed max-w-xl">
                Cassette turns any track, album, or playlist into a single smart link
                that opens in your listener&apos;s preferred app—<span className="text-foreground font-medium">no dead ends, no friction</span>.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-5">
                <Button
                  asChild
                  size="lg"
                  className="font-teko text-lg sm:text-xl px-6 py-4 sm:px-9 sm:py-7 rounded-xl bg-gradient-to-r from-primary to-accent text-foreground elev-2 hover:elev-3 transition-all duration-300 hover:scale-105 bordered-glow group"
                >
                  <Link href={primaryCtaHref}>
                    <span>Create Your Universal Link</span>
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
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
                <div className="absolute -inset-4 rounded-[20px] bg-gradient-to-r from-primary/20 to-secondary/20 blur-2xl opacity-30" />
                <Card className="relative gradient-border rounded-[20px] surface-top backdrop-blur-md elev-3 overflow-hidden">
                  {/* Decorative mesh */}
                  <div className="absolute inset-0 mesh-gradient opacity-30 pointer-events-none"></div>

                  <CardHeader className="p-7 pb-0 relative">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center elev-1 bordered-glow flex-shrink-0">
                        <CassetteTape className="h-7 w-7 text-foreground" />
                      </div>
                      <div>
                        <CardTitle className="font-teko text-3xl text-foreground leading-tight">
                          Universal Music Link
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
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
                          className="group rounded-xl gradient-border-hover surface-middle hover:surface-top transition-all elev-1 hover:elev-2 spotlight"
                        >
                          <div className="flex items-center gap-3 p-4">
                            <div
                              className={`h-12 w-12 flex-shrink-0 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center elev-1 group-hover:elev-2 transition-all duration-300`}
                            >
                              <Music2 className="h-5 w-5 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-foreground">
                                {item.title}
                              </p>
                              <p className="truncate text-sm text-muted-foreground">
                                {item.artist}
                              </p>
                              <span className="mt-1.5 inline-flex text-[10px] px-2.5 py-0.5 rounded-full bg-border/60 text-muted-foreground font-medium">
                                {item.badge}
                              </span>
                            </div>
                            <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
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

        {/* WHY CASSETTE */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-20 md:mt-28">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
          >
            <div className="relative">
              <div className="absolute -inset-3 rounded-[20px] bg-gradient-to-r from-primary/15 to-secondary/15 blur-2xl opacity-30" />
              <div className="relative gradient-border rounded-[20px] surface-top backdrop-blur-md p-6 sm:p-8 md:p-14 elev-2 overflow-hidden">
                {/* Mesh background */}
                <div className="absolute inset-0 mesh-gradient opacity-30"></div>

                <div className="relative max-w-4xl mx-auto">
                  <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="h-14 w-14 rounded-xl bg-primary/15 flex items-center justify-center elev-1 bordered-glow">
                      <Radio className="h-7 w-7 text-accent" />
                    </div>
                    <h2 className="font-teko text-4xl sm:text-5xl text-foreground leading-tight text-center">
                      The Problem We Solve
                    </h2>
                  </div>
                  <div className="space-y-6 text-xl text-muted-foreground text-center">
                    <p className="text-foreground font-medium text-2xl leading-relaxed">
                      You share the perfect playlist—someone replies,
                      &ldquo;Sorry, I use Apple Music.&rdquo;{" "}
                      <span className="text-gradient font-bold">That ends today.</span>
                    </p>
                    <p className="leading-relaxed">
                      Music is universal. Platforms aren&apos;t. Cassette removes the
                      walls so your discoveries flow to everyone, everywhere—no friction, no dead ends.
                    </p>
                    <div className="pt-6">
                      <Link
                        href="/team"
                        className="inline-flex items-center gap-2 text-primary hover:text-accent transition-colors duration-300 font-medium"
                      >
                        <span>Meet the music lovers building Cassette</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* COMPANY JOURNEY TIMELINE */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-20 md:mt-28">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
          >
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full surface-middle elev-1 border border-primary/20">
                <Zap size={16} className="text-primary" />
                <span className="font-teko text-sm tracking-wider text-primary uppercase">Our Journey</span>
              </div>
              <h2 className="font-teko text-4xl sm:text-5xl font-bold text-foreground mb-6 leading-tight">
                From Idea to{" "}
                <span className="text-gradient">Reality</span>
              </h2>
              <p className="font-roboto text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                The story of how we&apos;re breaking down barriers in music sharing
              </p>
            </div>

            <div className="relative">
              {/* Desktop: Horizontal Timeline */}
              <div className="hidden lg:block">
                {/* Horizontal Line */}
                <div className="absolute left-0 right-0 top-[120px] h-0.5 bg-gradient-to-r from-primary via-accent to-secondary"></div>

                <div className="grid grid-cols-4 gap-6">
                  {[
                    {
                      year: "2020",
                      title: "The Spark",
                      description: "Co-founders met at American University, frustrated by the inability to share music across platforms. The idea for Cassette was born.",
                      icon: Stars,
                      color: "from-primary to-accent"
                    },
                    {
                      year: "2021",
                      title: "Building the Foundation",
                      description: "Pitched into American University's accelerator program. Built initial prototype and assembled our founding team of engineers and marketers.",
                      icon: Zap,
                      color: "from-accent to-secondary"
                    },
                    {
                      year: "2022",
                      title: "Launch & Growth",
                      description: "Successfully completed crowdfunding campaign. Launched platform publicly and began scaling to thousands of users.",
                      icon: Radio,
                      color: "from-secondary to-primary"
                    },
                    {
                      year: "2023-2024",
                      title: "Scaling Up",
                      description: "Secured seed funding, scaled REST API to support 65,000+ users, established international partnerships, and continued innovation.",
                      icon: Music2,
                      color: "from-primary to-accent"
                    }
                  ].map((milestone, index) => {
                    const IconComponent = milestone.icon;

                    return (
                      <motion.div
                        key={milestone.year}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.6, delay: index * 0.15 }}
                        className="relative pt-40"
                      >
                        {/* Timeline Dot */}
                        <div className="absolute top-[120px] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                          <motion.div
                            className={`w-6 h-6 rounded-full bg-gradient-to-br ${milestone.color} ring-4 ring-background elev-2`}
                            whileHover={{ scale: 1.4 }}
                            transition={{ duration: 0.3 }}
                          ></motion.div>
                        </div>

                        {/* Year Badge - Above Timeline */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2">
                          <motion.div
                            className={`px-4 py-2 rounded-full bg-gradient-to-br ${milestone.color} elev-2`}
                            whileHover={{ scale: 1.05 }}
                          >
                            <span className="font-teko text-xl font-bold text-white whitespace-nowrap">{milestone.year}</span>
                          </motion.div>
                        </div>

                        {/* Content Card - Below Timeline */}
                        <div className="gradient-border-hover surface-top rounded-[16px] p-5 backdrop-blur-sm elev-2 hover:elev-3 transition-all duration-300 group spotlight">
                          <div className="flex items-center justify-center mb-4">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${milestone.color} flex items-center justify-center elev-1 group-hover:elev-2 transition-all duration-300`}>
                              <IconComponent className="text-white" size={22} />
                            </div>
                          </div>
                          <h3 className="font-teko text-xl text-foreground mb-2 leading-tight text-center">{milestone.title}</h3>
                          <p className="font-roboto text-sm text-muted-foreground leading-relaxed text-center">{milestone.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile/Tablet: Vertical Timeline */}
              <div className="lg:hidden relative">
                {/* Vertical Line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-secondary"></div>

                <div className="space-y-8">
                  {[
                    {
                      year: "2020",
                      title: "The Spark",
                      description: "Co-founders met at American University, frustrated by the inability to share music across platforms. The idea for Cassette was born.",
                      icon: Stars,
                      color: "from-primary to-accent"
                    },
                    {
                      year: "2021",
                      title: "Building the Foundation",
                      description: "Pitched into American University's accelerator program. Built initial prototype and assembled our founding team of engineers and marketers.",
                      icon: Zap,
                      color: "from-accent to-secondary"
                    },
                    {
                      year: "2022",
                      title: "Launch & Growth",
                      description: "Successfully completed crowdfunding campaign. Launched platform publicly and began scaling to thousands of users.",
                      icon: Radio,
                      color: "from-secondary to-primary"
                    },
                    {
                      year: "2023-2024",
                      title: "Scaling Up",
                      description: "Secured seed funding, scaled REST API to support 65,000+ users, established international partnerships, and continued innovation.",
                      icon: Music2,
                      color: "from-primary to-accent"
                    }
                  ].map((milestone, index) => {
                    const IconComponent = milestone.icon;

                    return (
                      <motion.div
                        key={milestone.year}
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        className="relative pl-16"
                      >
                        {/* Timeline Dot */}
                        <div className="absolute left-6 top-6 -translate-x-1/2 z-10">
                          <motion.div
                            className={`w-5 h-5 rounded-full bg-gradient-to-br ${milestone.color} ring-4 ring-background elev-2`}
                            whileHover={{ scale: 1.3 }}
                            transition={{ duration: 0.3 }}
                          ></motion.div>
                        </div>

                        {/* Content Card */}
                        <div className="gradient-border-hover surface-top rounded-[16px] p-6 backdrop-blur-sm elev-2 hover:elev-3 transition-all duration-300 group spotlight">
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${milestone.color} flex items-center justify-center elev-1 group-hover:elev-2 transition-all duration-300 flex-shrink-0`}>
                              <IconComponent className="text-white" size={22} />
                            </div>
                            <div className="font-teko text-2xl font-bold text-gradient">{milestone.year}</div>
                          </div>
                          <h3 className="font-teko text-xl text-foreground mb-2 leading-tight">{milestone.title}</h3>
                          <p className="font-roboto text-sm text-muted-foreground leading-relaxed">{milestone.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Support CTA */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-16">
          <div className="relative gradient-border rounded-[20px] surface-top backdrop-blur-sm elev-2 p-5 sm:p-8 md:p-12 overflow-hidden">
            {/* Decorative gradient orb */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="flex items-start gap-5 text-left">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-foreground elev-1 flex-shrink-0">
                  <HeartHandshake className="h-7 w-7" />
                </span>
                <div>
                  <h3 className="font-teko text-3xl sm:text-4xl text-foreground mb-2 leading-tight">Fuel the Cassette Mission</h3>
                  <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                    We&apos;re an indie team building better ways to share music. If our story resonates, tap Support to send a Ko-fi.
                  </p>
                </div>
              </div>
              <button
                onClick={openKoFiSupport}
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-primary to-accent text-foreground font-teko text-xl px-8 py-4 elev-2 hover:elev-3 shadow-primary/20 transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap"
                aria-label="Support Cassette on Ko-fi"
              >
                <Image src={KOFI_ICON_SRC} alt="Ko-fi" width={24} height={24} className="rounded-full" />
                <span>Support Us</span>
              </button>
            </div>
          </div>
        </section>

        {/* FEATURES: Two-Column with Tall InvertedProfileDemo */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-20 md:mt-28">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 surface-top px-4 py-2 elev-1">
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Tall Demo - left on desktop */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-5 flex justify-center lg:justify-end"
            >
              <div className="relative w-full max-w-[520px] min-h-[800px] sm:min-h-[1000px] lg:min-h-[1200px] flex items-center justify-center py-12 sm:py-24 lg:py-32">
                <div className="absolute -inset-4 rounded-[18px] bg-gradient-to-b from-primary/20 to-secondary/20 blur-2xl opacity-30" />
                <div className="relative rounded-[18px] border border-border/60 surface-top backdrop-blur-md elev-3 w-full overflow-visible">
                  {/* Header Section */}
                  <div className="px-4 md:px-6 pt-6 pb-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center elev-1">
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
                  </div>

                  {/* ProfileDemo Component - with proper space for callouts */}
                  <div className="px-4 md:px-10 lg:px-16 pb-6">
                    <div className="rounded-lg border-2 border-border/50 surface-middle overflow-visible">
                      <ProfileDemo />
                    </div>
                  </div>

                  {/* Footer Note */}
                  <div className="px-4 md:px-6 pb-6">
                    <p className="text-xs text-muted-foreground text-center">
                      Interactive demo showing your music profile with smart linking
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
              <Card className="gradient-border-hover rounded-[20px] surface-top backdrop-blur-md elev-2 hover:elev-3 transition-all duration-300 overflow-hidden spotlight group">
                <CardHeader className="p-7">
                  <div className="bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center elev-1 bordered-glow group-hover:elev-2 transition-all duration-300">
                    <LinkIcon className="text-primary h-6 w-6" />
                  </div>
                  <CardTitle className="mt-5 font-teko text-3xl text-foreground leading-tight">
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
                      className="rounded-xl border border-border/60 surface-middle hover:surface-top transition-all elev-1 hover:elev-2 p-3"
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
                      className="rounded-xl border border-border/60 surface-middle hover:surface-top transition-all elev-1 hover:elev-2 p-3"
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
              <Card className="gradient-border-hover rounded-[20px] surface-top backdrop-blur-md elev-2 hover:elev-3 transition-all duration-300 overflow-hidden spotlight group">
                <CardHeader className="p-7">
                  <div className="bg-accent/10 w-14 h-14 rounded-xl flex items-center justify-center elev-1 bordered-glow group-hover:elev-2 transition-all duration-300">
                    <UserSquare className="text-accent h-6 w-6" />
                  </div>
                  <CardTitle className="mt-5 font-teko text-3xl text-foreground leading-tight">
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
                        className="rounded-xl border border-border/60 surface-middle p-3 elev-1"
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
          <div className="rounded-[18px] border border-border/50 surface-top backdrop-blur-md p-6 md:p-8 elev-2">
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
                  className="group rounded-xl border border-border/60 surface-top hover:surface-middle transition-all elev-1 hover:elev-2"
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
          <div className="relative rounded-[18px] border border-border/50 surface-top backdrop-blur-md p-8 md:p-12 elev-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
              <div className="md:col-span-5">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-[18px] bg-gradient-to-r from-primary to-secondary blur-2xl opacity-15" />
                  <div className="relative rounded-[18px] border border-border/60 surface-top p-8 flex flex-col items-center justify-center elev-2">
                    <Radio className="text-accent mb-4 h-12 w-12" />
                    <h3 className="font-teko text-2xl text-foreground text-center">
                      The Future of Curation
                    </h3>
                  </div>
                </div>
              </div>
              <div className="md:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 surface-top px-4 py-2 mb-4 elev-1">
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
          <div className="rounded-[18px] border border-border/50 surface-top backdrop-blur-md elev-3 p-0 overflow-hidden">
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
                className="w-full rounded-2xl h-[400px] sm:h-[550px] md:h-[712px]"
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
              className="font-teko text-lg bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-foreground px-6 py-4 sm:px-8 sm:py-6 rounded-xl"
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
              className="font-teko text-lg bg-transparent text-foreground border-borderDark hover:bg-bgSubtle/50 px-6 py-4 sm:px-8 sm:py-6 rounded-xl"
            >
              <Link href="/profile">See Examples</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
