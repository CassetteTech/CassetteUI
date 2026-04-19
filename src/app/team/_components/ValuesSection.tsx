"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Zap, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const values: {
  icon?: LucideIcon;
  useLogo?: boolean;
  title: string;
  description: string;
  tape: string;
}[] = [
  {
    useLogo: true,
    title: "Music is Universal",
    description:
      "Great music transcends platforms. Everyone should share their discoveries, whatever app they use.",
    tape: "bg-primary/70",
  },
  {
    icon: Zap,
    title: "Simplicity First",
    description:
      "Sharing music should be effortless. We obsess over making complex tech feel simple and intuitive.",
    tape: "bg-warning/70",
  },
  {
    icon: Users,
    title: "Community Driven",
    description:
      "The best discoveries come from passionate curators. We\u2019re building a place where tastemakers are celebrated.",
    tape: "bg-accentRoyal/60",
  },
];

export function ValuesSection() {
  return (
    <section className="section-dark">
      <div className="editorial-rule-thick" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute -bottom-6 -right-6 w-48 h-48 opacity-[0.06] pointer-events-none select-none hidden sm:block rotate-12">
          <Image src="/images/cassette_logo.png" alt="" fill className="object-contain" aria-hidden="true" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 -rotate-[1.5deg] inline-block"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-60 mb-3">
            Our Values
          </p>
          <h2 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold uppercase leading-none tracking-tight">
            What We Believe
            <span
              aria-hidden
              className="ml-1 inline-block h-6 sm:h-8 lg:h-10 w-1.5 bg-primary align-baseline animate-pulse"
            />
          </h2>
          <p className="font-roboto text-base opacity-70 italic mt-4 max-w-md">
            The values that guide everything we build.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-x-6 gap-y-12">
          {values.map((value, index) => {
            const ValueIcon = value.icon;
            const rot = (index - 1) * 1.2;
            const tapeSide = index % 2 === 0 ? "left" : "right";
            return (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ rotate: 0, y: -4 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="relative"
                style={{ transform: `rotate(${rot}deg)`, transformOrigin: "center" }}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute -top-2 z-10 h-5 w-20 rotate-[-6deg] opacity-80 border border-foreground/10",
                    value.tape,
                    tapeSide === "left" ? "left-6" : "right-6"
                  )}
                />
                <div className="bg-primary-foreground force-light-surface text-foreground border-2 border-foreground p-6 h-full relative overflow-hidden shadow-[5px_5px_0_hsl(var(--cassette-white))]">
                  <div className="w-11 h-11 mb-5 border-2 border-foreground bg-background flex items-center justify-center">
                    {value.useLogo ? (
                      <div className="relative w-6 h-6">
                        <Image src="/images/cassette_logo.png" alt="" fill className="object-contain" aria-hidden="true" />
                      </div>
                    ) : ValueIcon ? (
                      <ValueIcon size={20} strokeWidth={2} className="text-foreground" />
                    ) : null}
                  </div>

                  <h3 className="font-teko text-2xl sm:text-3xl uppercase tracking-tight leading-none mb-3">
                    {value.title}
                  </h3>
                  <p className="font-roboto text-muted-foreground text-sm leading-relaxed italic">
                    {value.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="editorial-rule-thick" />
    </section>
  );
}
