"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { showcaseLinks } from "../_data";

const TAPE_COLORS = [
  "bg-primary/70",
  "bg-accentRoyal/60",
  "bg-warning/70",
  "bg-info/60",
];

// Deterministic pseudo-random from a seed string so SSR/CSR stay in sync.
function hashRand(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return () => {
    h = (h * 1664525 + 1013904223) | 0;
    return (h >>> 0) / 0xffffffff;
  };
}

export function ShowcaseStrip() {
  return (
    <section className="py-16 md:py-20">
      <div className="editorial-rule-thick mb-16 md:mb-20" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"
      >
        <div className="-rotate-[1.5deg] inline-block">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
            Try It Now
          </p>
          <h2 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold uppercase tracking-tight leading-none text-foreground">
            Smart Links
            <span
              aria-hidden
              className="ml-1 inline-block h-6 sm:h-8 lg:h-10 w-1.5 bg-primary align-baseline animate-pulse"
            />
          </h2>
          <p className="font-roboto text-base text-muted-foreground italic mt-4 max-w-md">
            Tap a track—we&apos;ll hand it off to your player.
          </p>
        </div>

        <Link
          href="/auth/signup"
          className="hidden sm:inline-flex shrink-0 rotate-[2deg] items-center gap-2 bg-background border-2 border-foreground px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors shadow-[3px_3px_0_hsl(var(--foreground))]"
        >
          Start Free
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-x-6 gap-y-12">
        {showcaseLinks.map((link, index) => {
          const rand = hashRand(link.title);
          const rot = (rand() - 0.5) * 5;
          const tapeColor = TAPE_COLORS[index % TAPE_COLORS.length];
          const tapeSide = index % 2 === 0 ? "left" : "right";

          return (
            <motion.div
              key={link.title}
              initial={{ opacity: 0, y: 20, rotate: 0 }}
              whileInView={{ opacity: 1, y: 0, rotate: rot }}
              whileHover={{ rotate: 0, y: -4, scale: 1.02 }}
              viewport={{ once: true, margin: "-5%" }}
              transition={{
                duration: 0.4,
                delay: Math.min(index * 0.04, 0.2),
                ease: [0.23, 1, 0.32, 1],
              }}
              className="relative"
              style={{ transformOrigin: "center" }}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute -top-2 z-10 h-5 w-16 rotate-[-6deg] opacity-80 border border-foreground/10",
                  tapeColor,
                  tapeSide === "left" ? "left-3" : "right-3"
                )}
              />

              <Link
                href={link.href}
                className="group block bg-primary-foreground force-light-surface text-foreground border-2 border-foreground p-4 pb-5 shadow-[4px_4px_0_hsl(var(--foreground))] dark:shadow-[4px_4px_0_hsl(var(--cassette-white))] hover:shadow-[6px_6px_0_hsl(var(--primary))] dark:hover:shadow-[6px_6px_0_hsl(var(--primary))] transition-shadow"
              >
                <span className="inline-block font-mono text-[9px] uppercase tracking-[0.2em] bg-foreground text-background px-1.5 py-0.5 mb-3">
                  {link.meta}
                </span>

                <h3 className="font-teko text-2xl sm:text-3xl uppercase leading-[0.95] tracking-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {link.title}
                </h3>

                <p className="mt-1 text-xs text-muted-foreground line-clamp-1 italic">
                  {link.artist}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <span className="h-px flex-1 bg-foreground/20" />
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-10 sm:hidden text-center">
        <Link
          href="/auth/signup"
          className="inline-flex items-center gap-2 bg-background border-2 border-foreground px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground shadow-[3px_3px_0_hsl(var(--foreground))]"
        >
          Start Free
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
