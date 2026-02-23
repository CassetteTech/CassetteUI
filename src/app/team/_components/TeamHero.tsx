"use client";

import { motion } from "framer-motion";
import { teamMembers } from "../_data";

const stats = [
  { value: String(teamMembers.length), label: "Team Members" },
  { value: "65K+", label: "Users Served" },
  { value: "\u221E", label: "Music Connections" },
];

export function TeamHero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="text-center mb-0"
    >
      {/* Editorial section label */}
      <p className="font-teko text-xs tracking-[0.25em] uppercase text-muted-foreground mb-8">
        The Roster &middot; Cassette Technologies
      </p>

      <h1 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 tracking-tight leading-none">
        Meet the Team Behind{" "}
        <span className="text-gradient inline-block">Cassette</span>
      </h1>

      <p className="font-roboto text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-16">
        We&apos;re music obsessives, developers, and creators united by a shared mission:{" "}
        <span className="text-foreground font-medium">making music universal again</span>.
      </p>

      {/* Stats */}
      <div className="flex items-center justify-center mb-16">
        <div className="flex items-center divide-x divide-border">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="px-8 sm:px-12 text-center"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
            >
              <div className="font-teko text-4xl sm:text-5xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="font-roboto text-xs text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Thick divider */}
      <div className="h-[3px] bg-foreground/15 dark:bg-border" />
    </motion.section>
  );
}
