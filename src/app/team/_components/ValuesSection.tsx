"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "@/components/features/marketing/section-header";
import { DitherEdge } from "@/components/features/marketing/dither-edge";
import { PixelSun } from "@/components/features/marketing/pixel-sun";

const values = [
  {
    title: "Music is Universal",
    description:
      "Great music transcends platforms. Everyone should share their discoveries, whatever app they use.",
  },
  {
    title: "Simplicity First",
    description:
      "Sharing music should be effortless. We obsess over making complex tech feel simple and intuitive.",
  },
  {
    title: "Community Driven",
    description:
      "The best discoveries come from passionate curators. We’re building a place where tastemakers are celebrated.",
  },
];

/**
 * Dark statement band. Three flat ruled credo columns; no cards, no tape,
 * no icon chips.
 */
export function ValuesSection() {
  return (
    <section className="section-dark relative">
      <DitherEdge color="hsl(var(--section-dark))" side="top" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative overflow-hidden">
        <PixelSun className="absolute -top-14 -right-8 w-48 sm:w-64 text-primary opacity-[0.12] pointer-events-none select-none" />

        <SectionHeader
          kicker="Our Values"
          title="What We Believe"
          sub="The values that guide everything we build."
          className="mb-12"
        />

        <div className="grid md:grid-cols-3 gap-10 md:gap-8">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="border-t-2 border-[hsl(var(--section-dark-fg)/0.2)] pt-5"
            >
              <h3 className="font-teko text-2xl sm:text-3xl uppercase tracking-tight leading-none mb-3">
                {value.title}
              </h3>
              <p className="font-roboto text-sm leading-relaxed italic opacity-75">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
