"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Zap, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const values: {
  number: string;
  icon?: LucideIcon;
  useLogo?: boolean;
  title: string;
  description: string;
  accentBar: string;
}[] = [
  {
    number: "01",
    useLogo: true,
    title: "Music is Universal",
    description:
      "Great music transcends platforms. We believe everyone should be able to share their discoveries, regardless of which streaming service they use.",
    accentBar: "bg-primary",
  },
  {
    number: "02",
    icon: Zap,
    title: "Simplicity First",
    description:
      "Sharing music should be effortless. We obsess over making complex technology feel simple and intuitive for everyone.",
    accentBar: "bg-info",
  },
  {
    number: "03",
    icon: Users,
    title: "Community Driven",
    description:
      "The best music discoveries come from passionate curators. We\u2019re building a platform where taste-makers are celebrated and rewarded.",
    accentBar: "bg-accentRoyal",
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
                <div className="glass rounded-lg p-8 h-full relative overflow-hidden">
                  {/* Watermark number */}
                  <span className="font-teko text-7xl font-bold opacity-[0.06] absolute top-0 right-4 leading-none pointer-events-none select-none">
                    {value.number}
                  </span>

                  {/* Accent bar — value color */}
                  <div className={`h-[3px] w-12 ${value.accentBar} mb-6`} />

                  {value.useLogo ? (
                    <div className="relative w-7 h-7 mb-4 opacity-80">
                      <Image src="/images/cassette_logo.png" alt="" fill className="object-contain" aria-hidden="true" />
                    </div>
                  ) : ValueIcon ? (
                    <ValueIcon className="mb-4 opacity-80" size={28} />
                  ) : null}

                  <h3 className="font-teko text-2xl mb-3">
                    {value.title}
                  </h3>
                  <p className="font-roboto opacity-70 text-sm leading-relaxed">
                    {value.description}
                  </p>
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
