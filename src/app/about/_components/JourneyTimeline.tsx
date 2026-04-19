"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { milestones } from "../_data";

const TAPE_COLORS = [
  "bg-primary/70",
  "bg-accentRoyal/60",
  "bg-warning/70",
  "bg-info/60",
];

function hashRand(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return () => {
    h = (h * 1664525 + 1013904223) | 0;
    return (h >>> 0) / 0xffffffff;
  };
}

export function JourneyTimeline() {
  return (
    <section className="py-16 md:py-20">
      <div className="editorial-rule-thick mb-16 md:mb-20" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-12 -rotate-[1.5deg] inline-block"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
          Our Journey
        </p>
        <h2 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold uppercase leading-none tracking-tight text-foreground">
          Idea To Reality
          <span
            aria-hidden
            className="ml-1 inline-block h-6 sm:h-8 lg:h-10 w-1.5 bg-primary align-baseline animate-pulse"
          />
        </h2>
        <p className="font-roboto text-base text-muted-foreground italic mt-4 max-w-md">
          How we&apos;re breaking down barriers in music sharing.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-x-6 gap-y-12">
        {milestones.map((milestone, index) => {
          const MilestoneIcon = milestone.icon;
          const rand = hashRand(milestone.year);
          const rot = (rand() - 0.5) * 4;
          const tapeColor = TAPE_COLORS[index % TAPE_COLORS.length];
          const tapeSide = index % 2 === 0 ? "left" : "right";

          return (
            <motion.div
              key={milestone.year}
              initial={{ opacity: 0, y: 20, rotate: 0 }}
              whileInView={{ opacity: 1, y: 0, rotate: rot }}
              whileHover={{ rotate: 0, y: -4 }}
              viewport={{ once: true, margin: "-5%" }}
              transition={{
                duration: 0.4,
                delay: index * 0.08,
                ease: [0.23, 1, 0.32, 1],
              }}
              className="relative"
              style={{ transformOrigin: "center" }}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute -top-2 z-10 h-5 w-20 rotate-[-6deg] opacity-80 border border-foreground/10",
                  tapeColor,
                  tapeSide === "left" ? "left-6" : "right-6"
                )}
              />

              <div className="bg-primary-foreground force-light-surface text-foreground border-2 border-foreground p-6 h-full relative overflow-hidden shadow-[5px_5px_0_hsl(var(--foreground))] dark:shadow-[5px_5px_0_hsl(var(--cassette-white))]">
                <span className="font-teko text-7xl sm:text-8xl font-bold text-foreground/[0.06] absolute -top-3 right-3 leading-none pointer-events-none select-none">
                  {milestone.year}
                </span>

                <MilestoneIcon
                  className={`${milestone.iconColor} mb-4`}
                  size={28}
                />

                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
                  {milestone.year}
                </p>

                <h3 className="font-teko text-2xl sm:text-3xl uppercase tracking-tight leading-none text-foreground mb-3">
                  {milestone.title}
                </h3>

                <p className="font-roboto text-muted-foreground text-sm leading-relaxed italic">
                  {milestone.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
