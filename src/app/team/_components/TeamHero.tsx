"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { teamMembers } from "../_data";

const stats = [
  { value: String(teamMembers.length), label: "Team Members", barColor: "bg-primary" },
  { value: "65K+", label: "Users Served", barColor: "bg-info" },
  { value: "\u221E", label: "Music Connections", barColor: "bg-accentRoyal" },
];

export function TeamHero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="text-center mb-0 relative overflow-hidden"
    >
      {/* Decorative cassette logo watermark — oversized editorial background mark */}
      <div
        className="absolute top-0 -right-16 sm:-right-10 lg:-right-4 w-[28rem] h-[28rem] sm:w-[36rem] sm:h-[36rem] lg:w-[42rem] lg:h-[42rem] opacity-[0.03] pointer-events-none select-none hidden sm:block"
        style={{ transform: "rotate(-12deg)" }}
      >
        <Image src="/images/cassette_logo.png" alt="" fill className="object-contain" aria-hidden="true" />
      </div>

      <h1 className="font-teko text-6xl sm:text-7xl lg:text-8xl font-bold text-foreground mb-6 tracking-tight leading-none">
        Meet the Team Behind{" "}
        <span className="text-gradient inline-block">Cassette</span>
      </h1>

      <p className="font-roboto text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-16">
        We&apos;re music obsessives, developers, and creators united by a shared mission:{" "}
        <span className="text-foreground font-medium">making music universal again</span>.
      </p>

      {/* Stats — editorial scoreboard */}
      <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto mb-16">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="text-center"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
          >
            <div className={`h-[3px] ${stat.barColor} mb-4 mx-auto w-12`} />
            <div className="font-teko text-5xl sm:text-6xl font-bold text-foreground mb-1">
              {stat.value}
            </div>
            <div className="section-label text-muted-foreground justify-center text-[0.625rem]">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Editorial rule */}
      <div className="editorial-rule-thick" />
    </motion.section>
  );
}
