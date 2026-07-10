"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/features/marketing/section-header";
import { DitherEdge } from "@/components/features/marketing/dither-edge";
import { PixelSun } from "@/components/features/marketing/pixel-sun";

/**
 * Flat statement band. The quote IS the layout: no card, no tape, just
 * display type on charcoal with the hero's sun dithered behind it.
 */
export function ProblemSection() {
  return (
    <section className="section-dark relative">
      <DitherEdge color="hsl(var(--section-dark))" side="top" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative overflow-hidden">
        <PixelSun className="absolute -top-12 -right-6 w-44 sm:w-60 text-primary opacity-[0.14] pointer-events-none select-none" />

        <SectionHeader
          kicker="The Problem"
          title={<>Platforms Don&apos;t Talk</>}
          className="mb-10"
        />

        <motion.blockquote
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative max-w-3xl"
        >
          <p className="font-teko text-4xl sm:text-5xl lg:text-6xl uppercase leading-[0.95] tracking-tight">
            &ldquo;Sorry, I use Apple&nbsp;Music.&rdquo;{" "}
            <span className="text-primary">That ends today.</span>
          </p>
        </motion.blockquote>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 max-w-xl border-l-2 border-primary/70 pl-4"
        >
          <p className="font-roboto text-sm sm:text-base leading-relaxed italic opacity-80">
            Music is universal. Platforms aren&apos;t. Cassette removes the
            walls so your discoveries flow to everyone, everywhere—no friction,
            no dead ends.
          </p>
          <Link
            href="/team"
            className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] hover:text-primary transition-colors"
          >
            <span>Meet the team</span>
            <ArrowRight size={14} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
