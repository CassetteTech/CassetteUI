"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

export function ProblemSection() {
  return (
    <section className="section-dark">
      <div className="editorial-rule-thick" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute bottom-4 right-4 w-40 h-40 opacity-[0.06] pointer-events-none select-none hidden sm:block rotate-12">
          <Image src="/images/cassette_logo.png" alt="" fill className="object-contain" aria-hidden="true" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="-rotate-[1.5deg] inline-block mb-10"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-60 mb-3">
            The Problem
          </p>
          <h2 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold uppercase leading-none tracking-tight">
            Platforms Don&apos;t Talk
            <span
              aria-hidden
              className="ml-1 inline-block h-6 sm:h-8 lg:h-10 w-1.5 bg-primary align-baseline animate-pulse"
            />
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative max-w-3xl"
        >
          <span
            aria-hidden
            className="absolute -top-2 left-6 z-10 h-5 w-20 rotate-[-6deg] opacity-80 border border-foreground/10 bg-warning/70"
          />
          <div className="bg-primary-foreground force-light-surface text-foreground border-2 border-foreground p-6 sm:p-8 shadow-[6px_6px_0_hsl(var(--cassette-white))]">
            <p className="font-teko text-3xl sm:text-4xl font-bold uppercase leading-tight mb-4">
              &ldquo;Sorry, I use Apple Music.&rdquo;{" "}
              <span className="text-primary">That ends today.</span>
            </p>

            <p className="font-roboto text-muted-foreground leading-relaxed italic border-l-2 border-foreground/20 pl-3 mb-6">
              Music is universal. Platforms aren&apos;t. Cassette removes the
              walls so your discoveries flow to everyone, everywhere—no friction,
              no dead ends.
            </p>

            <Link
              href="/team"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground hover:text-primary transition-colors"
            >
              <span>Meet the team</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="editorial-rule-thick" />
    </section>
  );
}
