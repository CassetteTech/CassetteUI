"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Zap, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const values: {
  icon?: LucideIcon;
  useLogo?: boolean;
  title: string;
  description: string;
  accent: string;
  accentTint: string;
  accentText: string;
}[] = [
  {
    useLogo: true,
    title: "Music is Universal",
    description:
      "Great music transcends platforms. We believe everyone should be able to share their discoveries, regardless of which streaming service they use.",
    accent: "bg-primary",
    accentTint: "bg-primary/15",
    accentText: "text-primary",
  },
  {
    icon: Zap,
    title: "Simplicity First",
    description:
      "Sharing music should be effortless. We obsess over making complex technology feel simple and intuitive for everyone.",
    accent: "bg-info",
    accentTint: "bg-info/15",
    accentText: "text-info-text",
  },
  {
    icon: Users,
    title: "Community Driven",
    description:
      "The best music discoveries come from passionate curators. We\u2019re building a platform where taste-makers are celebrated and rewarded.",
    accent: "bg-accentRoyal",
    accentTint: "bg-accentRoyal/15",
    accentText: "text-accentRoyal",
  },
];

export function ValuesSection() {
  return (
    <section className="section-dark">
      {/* Thick editorial rule */}
      <div className="editorial-rule-thick" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative overflow-hidden">
        {/* Decorative cassette logo watermark */}
        <div className="absolute -bottom-6 -right-6 w-48 h-48 opacity-[0.04] pointer-events-none select-none hidden sm:block rotate-12">
          <Image src="/images/cassette_logo.png" alt="" fill className="object-contain" aria-hidden="true" />
        </div>

        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <p className="section-label opacity-60 mb-4">
            Our Values
          </p>
          <h2 className="font-teko text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            What We Believe
          </h2>
          <p className="font-roboto text-lg opacity-70 max-w-2xl leading-relaxed">
            The values that guide everything we build at Cassette
          </p>
        </motion.div>

        {/* Values grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {values.map((value, index) => {
            const ValueIcon = value.icon;
            return (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
              >
                <div className="glass rounded-lg p-8 h-full relative overflow-hidden group transition-all duration-300 hover:-translate-y-0.5">
                  {/* Icon tile — accent-tinted square */}
                  <div className={`w-12 h-12 rounded-lg ${value.accentTint} ${value.accentText} flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-105`}>
                    {value.useLogo ? (
                      <div className="relative w-6 h-6">
                        <Image src="/images/cassette_logo.png" alt="" fill className="object-contain" aria-hidden="true" />
                      </div>
                    ) : ValueIcon ? (
                      <ValueIcon size={22} strokeWidth={2} />
                    ) : null}
                  </div>

                  <h3 className="font-teko text-2xl mb-3 tracking-tight">
                    {value.title}
                  </h3>
                  <p className="font-roboto opacity-75 text-sm leading-relaxed">
                    {value.description}
                  </p>

                  {/* Bottom accent bar — subtle brand signature */}
                  <div className={`absolute bottom-0 left-0 h-0.5 w-0 ${value.accent} transition-all duration-500 group-hover:w-full`} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom editorial rule */}
      <div className="editorial-rule-thick" />
    </section>
  );
}
