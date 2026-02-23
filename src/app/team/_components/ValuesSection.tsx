"use client";

import { motion } from "framer-motion";
import { CassetteTape, Zap, Users } from "lucide-react";

const values = [
  {
    number: "01",
    icon: CassetteTape,
    title: "Music is Universal",
    description:
      "Great music transcends platforms. We believe everyone should be able to share their discoveries, regardless of which streaming service they use.",
    accentBar: "bg-primary",
    iconColor: "text-primary",
    numberColor: "text-primary/25",
  },
  {
    number: "02",
    icon: Zap,
    title: "Simplicity First",
    description:
      "Sharing music should be effortless. We obsess over making complex technology feel simple and intuitive for everyone.",
    accentBar: "bg-accentTeal",
    iconColor: "text-accentTeal",
    numberColor: "text-accentTeal/25",
  },
  {
    number: "03",
    icon: Users,
    title: "Community Driven",
    description:
      "The best music discoveries come from passionate curators. We\u2019re building a platform where taste-makers are celebrated and rewarded.",
    accentBar: "bg-accentLilac",
    iconColor: "text-accentLilac",
    numberColor: "text-accentLilac/25",
  },
];

export function ValuesSection() {
  return (
    <section className="mb-0 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Thick divider */}
      <div className="h-[3px] bg-foreground/15 dark:bg-border" />

      <div className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-muted">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <p className="font-teko text-xs tracking-[0.25em] uppercase text-muted-foreground mb-4">
            Our Values
          </p>
          <h2 className="font-teko text-4xl sm:text-5xl font-bold text-foreground mb-4 leading-tight">
            What We Believe
          </h2>
          <p className="font-roboto text-lg text-muted-foreground max-w-2xl leading-relaxed">
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
                <div className="surface-top border border-foreground/15 dark:border-border rounded-lg p-8 h-full">
                  {/* Accent bar — value color */}
                  <div className={`h-[2px] w-10 ${value.accentBar} mb-4`} />

                  {/* Editorial number — value tinted */}
                  <span className={`font-teko text-2xl font-bold ${value.numberColor} leading-none block mb-4`}>
                    {value.number}
                  </span>

                  <ValueIcon className={`${value.iconColor} mb-4`} size={28} />

                  <h3 className="font-teko text-2xl text-foreground mb-3">
                    {value.title}
                  </h3>
                  <p className="font-roboto text-muted-foreground text-sm leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
