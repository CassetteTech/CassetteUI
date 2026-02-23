"use client";

import { motion } from "framer-motion";
import { milestones } from "../_data";

export function JourneyTimeline() {
  return (
    <section className="py-16 md:py-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        {/* Section label */}
        <p className="section-label text-muted-foreground mb-4">
          Our Journey
        </p>

        <h2 className="font-teko text-4xl sm:text-5xl font-bold text-foreground mb-4 leading-tight">
          From Idea to Reality
        </h2>

        <p className="font-roboto text-lg text-muted-foreground max-w-2xl leading-relaxed">
          The story of how we&apos;re breaking down barriers in music sharing
        </p>
      </motion.div>

      {/* Editorial rule before grid */}
      <div className="editorial-rule mb-12" />

      {/* Milestone cards grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {milestones.map((milestone, index) => {
          const MilestoneIcon = milestone.icon;
          return (
            <motion.div
              key={milestone.year}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: index * 0.08,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              <div className={`surface-top border border-foreground/15 dark:border-border border-t-4 ${milestone.borderTop} rounded-lg p-8 h-full relative overflow-hidden hover:-translate-y-1 hover:shadow-[6px_6px_0_hsl(var(--border))] transition-all duration-150 ease-linear`}>
                {/* Watermark year */}
                <span className="font-teko text-6xl sm:text-8xl font-bold text-foreground/[0.04] absolute -top-2 right-3 leading-none pointer-events-none select-none">
                  {milestone.year}
                </span>

                <MilestoneIcon
                  className={`${milestone.iconColor} mb-4`}
                  size={28}
                />

                <p className="font-teko text-3xl font-bold text-foreground mb-1">
                  {milestone.year}
                </p>

                <h3 className="font-teko text-2xl text-foreground mb-3">
                  {milestone.title}
                </h3>

                <p className="font-roboto text-muted-foreground text-sm leading-relaxed">
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
