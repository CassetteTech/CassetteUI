"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ProblemSection() {
  return (
    <section className="bg-muted">
      {/* Thick divider */}
      <div className="h-[3px] bg-foreground/15 dark:bg-border" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Section label */}
          <p className="font-teko text-xs tracking-[0.25em] uppercase text-muted-foreground mb-4">
            The Problem
          </p>

          <h2 className="font-teko text-4xl sm:text-5xl font-bold text-foreground mb-8 leading-tight">
            The Problem We Solve
          </h2>

          {/* Quote card */}
          <div className="surface-top border border-foreground/15 dark:border-border rounded-lg p-8 max-w-3xl">
            <div className="h-[2px] w-10 bg-accentTeal mb-6" />

            <p className="font-roboto text-xl text-foreground font-medium leading-relaxed mb-4">
              You share the perfect playlist—someone replies, &ldquo;Sorry, I
              use Apple Music.&rdquo;{" "}
              <span className="text-primary font-bold">That ends today.</span>
            </p>

            <p className="font-roboto text-muted-foreground leading-relaxed mb-6">
              Music is universal. Platforms aren&apos;t. Cassette removes the
              walls so your discoveries flow to everyone, everywhere—no friction,
              no dead ends.
            </p>

            <Link
              href="/team"
              className="inline-flex items-center gap-2 text-accentTeal hover:text-foreground transition-colors duration-200 font-medium font-roboto"
            >
              <span>Meet the music lovers building Cassette</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Bottom divider */}
      <div className="h-[3px] bg-foreground/15 dark:bg-border" />
    </section>
  );
}
