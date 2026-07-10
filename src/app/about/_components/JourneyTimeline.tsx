"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/features/marketing/section-header";
import { EASE_OUT_QUART } from "@/lib/motion";
import { milestones } from "../_data";

/**
 * Spool line. Milestones run down a single tape edge with square pixel
 * nodes; flat rows replace the old rotated card grid.
 */
export function JourneyTimeline() {
  return (
    <section className="py-16 md:py-20">
      <SectionHeader
        kicker="Our Journey"
        title="Idea To Reality"
        sub="How we're breaking down barriers in music sharing."
        className="mb-12"
      />

      <div className="relative ml-1 sm:ml-2 border-l-2 border-foreground/20">
        {milestones.map((milestone, index) => (
          <motion.div
            key={milestone.year}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.4,
              delay: index * 0.06,
              ease: EASE_OUT_QUART,
            }}
            className="relative pl-6 sm:pl-10 pb-12 last:pb-0"
          >
            {/* Square pixel node in the milestone's accent color */}
            <span
              aria-hidden
              className={cn(
                "absolute -left-[7px] top-2 h-3 w-3",
                milestone.accentBar
              )}
            />

            <div className="grid sm:grid-cols-[7.5rem_1fr] gap-x-8 gap-y-1 items-start">
              <p className="font-teko text-3xl sm:text-4xl font-bold text-foreground leading-none">
                {milestone.year}
              </p>
              <div>
                <h3 className="font-teko text-2xl sm:text-3xl uppercase tracking-tight leading-none text-foreground mb-2">
                  {milestone.title}
                </h3>
                <p className="font-roboto text-muted-foreground text-sm leading-relaxed italic max-w-xl">
                  {milestone.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
