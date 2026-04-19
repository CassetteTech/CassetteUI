"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Music2 } from "lucide-react";
import { ProfileDemo } from "@/components/demo/profile-demo";
import { featureCards, identityTiles, heroPreviewLinks } from "../_data";

export function FeaturesSection() {
  return (
    <section className="section-cream">
      {/* Editorial rule */}
      <div className="editorial-rule" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 -rotate-[1.5deg] inline-block"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-60 mb-3">
            Features
          </p>
          <h2 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold uppercase leading-none tracking-tight">
            One Link.
            <br />
            Every Platform.
            <span
              aria-hidden
              className="ml-1 inline-block h-6 sm:h-8 lg:h-10 w-1.5 bg-primary align-baseline animate-pulse"
            />
          </h2>
          <p className="font-roboto text-base opacity-70 italic mt-4 max-w-md">
            Links that work everywhere, profiles that express your taste.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* ProfileDemo — left column */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5"
          >
            <div className="relative">
              <span
                aria-hidden
                className="absolute -top-2 left-6 z-10 h-5 w-20 rotate-[-6deg] opacity-80 border border-foreground/10 bg-primary/70"
              />
              <div className="bg-primary-foreground force-light-surface text-foreground border-2 border-foreground p-5 shadow-[5px_5px_0_hsl(var(--foreground))] dark:shadow-[5px_5px_0_hsl(var(--cassette-white))]">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
                  Profile Preview
                </p>
                <ProfileDemo annotations={false} />
                <p className="font-roboto text-xs text-muted-foreground text-center mt-3 italic">
                  Interactive demo — your music profile with smart linking.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Feature cards — right column */}
          <div className="lg:col-span-7 space-y-6">
            {featureCards.map((card, index) => {
              const CardIcon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.08,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                >
                  <div className="bg-primary-foreground force-light-surface text-foreground border-2 border-foreground p-6 relative overflow-hidden shadow-[5px_5px_0_hsl(var(--foreground))] dark:shadow-[5px_5px_0_hsl(var(--cassette-white))] hover:-translate-y-1 hover:shadow-[7px_7px_0_hsl(var(--primary))] transition-all duration-150 ease-linear">
                    {/* Accent bar */}
                    <div
                      className={`h-[3px] w-12 ${card.accentBar} mb-4`}
                    />

                    <CardIcon
                      className={`${card.iconColor} mb-4`}
                      size={28}
                    />

                    <h3 className="font-teko text-2xl sm:text-3xl uppercase tracking-tight leading-none text-foreground mb-3">
                      {card.title}
                    </h3>

                    <p className="font-roboto text-muted-foreground text-sm leading-relaxed italic mb-5">
                      {card.description}
                    </p>

                    {/* Card-specific sub-content */}
                    {index === 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {heroPreviewLinks.slice(0, 2).map((link) => (
                          <Link
                            key={link.title}
                            href={link.href}
                            className="bg-background border-2 border-foreground p-3 shadow-[3px_3px_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_hsl(var(--primary))] transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
                                <Music2
                                  className="h-4 w-4 text-info-text"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {link.title} — {link.artist}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Smart link opens in preferred app
                                </p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {index === 1 && (
                      <div className="grid grid-cols-2 gap-3">
                        {identityTiles.map((tile) => (
                          <div
                            key={tile.title}
                            className="bg-background border-2 border-foreground p-3 shadow-[3px_3px_0_hsl(var(--foreground))]"
                          >
                            <p className="text-xs font-medium text-foreground">
                              {tile.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tile.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom editorial rule */}
      <div className="editorial-rule" />
    </section>
  );
}
