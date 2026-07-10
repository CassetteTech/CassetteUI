"use client";

import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight, ChevronDown, Mail } from "lucide-react";

/**
 * Pinned halftone hero for /team. Same image as /about, framed low on the
 * teal water instead of the pink sky, so the two pages read as one set.
 * Scroll behavior mirrors PixelHero exactly.
 */
export function TeamPixelHero() {
  const reduceMotion = useReducedMotion();

  const { scrollY } = useScroll();
  const imageScale = useTransform(scrollY, [0, 700], [1, 1.07]);
  const imageY = useTransform(scrollY, [0, 700], [0, 48]);
  const copyOpacity = useTransform(scrollY, [0, 360], [1, 0]);
  const copyY = useTransform(scrollY, [0, 360], [0, -28]);
  const cueOpacity = useTransform(scrollY, [0, 140], [1, 0]);

  return (
    <section
      aria-label="The Cassette team"
      className="sticky top-0 -mt-16 h-[100svh] min-h-[600px] overflow-hidden"
    >
      <motion.div
        aria-hidden
        style={reduceMotion ? undefined : { scale: imageScale, y: imageY }}
        className="absolute inset-0"
      >
        <Image
          src="/images/backgrounds/image.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[30%_78%]"
        />
      </motion.div>

      {/* Slight dim in dark mode so the warm image doesn't glare */}
      <div aria-hidden className="absolute inset-0 dark:bg-black/25" />

      {/* Top scrim dissolves the navbar edge into the image */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background via-background/50 to-transparent"
      />

      {/* Scrim melts the image into the page background and carries the copy */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[78%] bg-gradient-to-t from-background from-[6%] via-background/75 to-transparent"
      />

      <motion.div
        style={reduceMotion ? undefined : { opacity: copyOpacity, y: copyY }}
        className="relative z-10 h-full w-full px-5 sm:px-8 lg:px-14 xl:px-20 flex flex-col items-start justify-end pb-24 md:pb-28"
      >
        <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-foreground mb-4">
          <span aria-hidden className="inline-block h-[2px] w-8 bg-primary" />
          Team &middot; Cassette Technologies
        </p>

        <h1 className="font-teko text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-bold uppercase text-foreground tracking-tight leading-[0.88] mb-6">
          Meet
          <br />
          The Crew
          <span
            aria-hidden
            className="ml-2 inline-block h-8 sm:h-10 lg:h-12 w-2 bg-primary align-baseline animate-pulse"
          />
        </h1>

        <p className="font-roboto text-lg sm:text-xl lg:text-2xl text-foreground/90 max-w-2xl leading-relaxed mb-9 italic">
          Music obsessives, developers, and creators united by one mission—
          <span className="text-foreground font-medium not-italic">
            making music universal again
          </span>
          .
        </p>

        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <a
            href="mailto:team@cassette.tech"
            className="inline-flex items-center justify-center gap-3 bg-primary border-2 border-foreground text-primary-foreground font-mono text-[12px] uppercase tracking-[0.25em] px-6 py-3 shadow-flat-4 hover:-translate-y-0.5 hover:shadow-flat-6 transition-[transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Mail size={16} />
            <span>Work With Us</span>
          </a>
          <Link
            href="/about"
            className="inline-flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/80 hover:text-primary transition-colors px-2 py-3"
          >
            <span>Our Story</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </motion.div>

      <motion.div
        aria-hidden
        style={reduceMotion ? undefined : { opacity: cueOpacity }}
        className="absolute inset-x-0 bottom-16 z-10 flex justify-center"
      >
        <div className="flex flex-col items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/60">
          <span>Scroll</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </div>
      </motion.div>
    </section>
  );
}
