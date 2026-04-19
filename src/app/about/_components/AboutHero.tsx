"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useAuthState } from "@/hooks/use-auth";
import { heroStats } from "../_data";

const statColors = ["bg-primary", "bg-accentRoyal"];

export function AboutHero() {
  const { isAuthenticated } = useAuthState();
  const primaryCtaHref = isAuthenticated ? "/" : "/auth/signup";

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute top-0 -right-16 sm:-right-10 lg:-right-4 w-[28rem] h-[28rem] sm:w-[36rem] sm:h-[36rem] lg:w-[42rem] lg:h-[42rem] opacity-[0.03] pointer-events-none select-none hidden sm:block"
        style={{ transform: "rotate(-12deg)" }}
      >
        <Image src="/images/cassette_logo.png" alt="" fill className="object-contain" aria-hidden="true" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="-rotate-[1deg] inline-block"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">
          About &middot; Cassette Technologies
        </p>

        <h1 className="font-teko text-6xl sm:text-7xl lg:text-8xl font-bold uppercase text-foreground tracking-tight leading-[0.9] mb-6">
          Your Music,
          <br />
          Everywhere
          <span
            aria-hidden
            className="ml-1 inline-block h-8 sm:h-10 lg:h-12 w-2 bg-primary align-baseline animate-pulse"
          />
        </h1>

        <p className="font-roboto text-xl sm:text-2xl text-muted-foreground max-w-3xl leading-relaxed mb-10 italic border-l-4 border-foreground/30 pl-4">
          Cassette turns any track, album, artist, or playlist into one smart
          link that opens in your listener&apos;s preferred app—
          <span className="text-foreground font-medium not-italic">
            no dead ends, no friction
          </span>
          .
        </p>

        <Link
          href={primaryCtaHref}
          className="inline-flex items-center gap-3 bg-primary border-2 border-foreground text-primary-foreground font-mono text-[12px] uppercase tracking-[0.25em] px-6 py-3 shadow-[4px_4px_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_hsl(var(--foreground))] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <span>Create Your Universal Link</span>
          <ArrowRight size={16} />
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="grid grid-cols-2 gap-4 sm:gap-6 max-w-xl mt-16 mb-16"
      >
        {heroStats.map((stat, i) => (
          <div
            key={stat.label}
            className="bg-background border-2 border-foreground p-4 shadow-[3px_3px_0_hsl(var(--foreground))]"
            style={{ transform: `rotate(${i === 0 ? -1 : 1.2}deg)` }}
          >
            <div className={`h-[3px] ${statColors[i]} mb-3 w-10`} />
            <p className="font-teko text-4xl sm:text-5xl font-bold text-foreground leading-none">
              {stat.value}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-2">
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>

      <div className="editorial-rule-thick" />
    </section>
  );
}
