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
        <p className="font-teko text-xs tracking-[0.25em] uppercase text-muted-foreground mb-4">
          Our Journey
        </p>

        <h2 className="font-teko text-4xl sm:text-5xl font-bold text-foreground mb-4 leading-tight">
          From Idea to Reality
        </h2>

        <p className="font-roboto text-lg text-muted-foreground max-w-2xl leading-relaxed">
          The story of how we&apos;re breaking down barriers in music sharing
        </p>
      </motion.div>

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
              <div className="surface-top border border-foreground/15 dark:border-border rounded-lg p-8 h-full hover:-translate-y-1 hover:shadow-[6px_6px_0_hsl(var(--border))] transition-all duration-150 ease-linear">
                {/* Accent bar */}
                <div className={`h-[2px] w-10 ${milestone.accentBar} mb-4`} />

                {/* Editorial number */}
                <span
                  className={`font-teko text-2xl font-bold ${milestone.numberColor} leading-none block mb-4`}
                >
                  {milestone.number}
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
