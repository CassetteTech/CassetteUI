"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

export function ProblemSection() {
  return (
    <section className="section-dark">
      {/* Thick editorial rule */}
      <div className="editorial-rule-thick" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative overflow-hidden">
        {/* Decorative cassette logo watermark */}
        <div className="absolute bottom-4 right-4 w-40 h-40 opacity-[0.04] pointer-events-none select-none hidden sm:block rotate-12">
          <Image src="/images/cassette_logo.png" alt="" fill className="object-contain" aria-hidden="true" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Section label */}
          <p className="section-label opacity-60 mb-4">
            The Problem
          </p>

          <h2 className="font-teko text-4xl sm:text-5xl font-bold mb-8 leading-tight">
            The Problem We Solve
          </h2>

          {/* Pull-quote — explicit text-foreground to override section color on the light pullquote bg */}
          <div className="pullquote max-w-3xl text-foreground">
            <p className="font-teko text-2xl sm:text-3xl font-bold leading-snug mb-4 relative z-10">
              You share the perfect playlist—someone replies, &ldquo;Sorry, I
              use Apple Music.&rdquo;{" "}
              <span className="text-primary">That ends today.</span>
            </p>

            <p className="font-roboto text-muted-foreground leading-relaxed mb-6 relative z-10">
              Music is universal. Platforms aren&apos;t. Cassette removes the
              walls so your discoveries flow to everyone, everywhere—no friction,
              no dead ends.
            </p>

            <Link
              href="/team"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium font-roboto underline underline-offset-4 relative z-10"
            >
              <span>Meet the music lovers building Cassette</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Bottom editorial rule */}
      <div className="editorial-rule-thick" />
    </section>
  );
}
