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
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <p className="section-label text-section-cream-fg/60 mb-4">
            Features
          </p>
          <h2 className="font-teko text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            Unify Your{" "}
            <span className="text-primary">Music Universe</span>
          </h2>
          <p className="font-roboto text-lg opacity-70 max-w-2xl leading-relaxed">
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
            <div className="surface-top border border-foreground/15 dark:border-border border-l-4 border-l-primary rounded-lg p-6 overflow-hidden">
              <p className="section-label text-muted-foreground mb-4">
                Profile Preview
              </p>
              <ProfileDemo annotations={false} />
              <p className="font-roboto text-xs text-muted-foreground text-center mt-4">
                Interactive demo showing your music profile with smart linking
              </p>
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
                  <div className="surface-top border border-foreground/15 dark:border-border rounded-lg p-8 relative overflow-hidden hover:-translate-y-1 hover:shadow-[6px_6px_0_hsl(var(--border))] transition-all duration-150 ease-linear">
                    {/* Watermark number */}
                    <span className={`font-teko text-6xl font-bold ${card.numberColor} absolute top-2 right-4 leading-none opacity-60 pointer-events-none select-none`}>
                      {card.number}
                    </span>

                    {/* Accent bar */}
                    <div
                      className={`h-[3px] w-12 ${card.accentBar} mb-4`}
                    />

                    <CardIcon
                      className={`${card.iconColor} mb-4`}
                      size={28}
                    />

                    <h3 className="font-teko text-2xl text-foreground mb-3">
                      {card.title}
                    </h3>

                    <p className="font-roboto text-muted-foreground text-sm leading-relaxed mb-5">
                      {card.description}
                    </p>

                    {/* Card-specific sub-content */}
                    {index === 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {heroPreviewLinks.slice(0, 2).map((link) => (
                          <Link
                            key={link.title}
                            href={link.href}
                            className="surface-top border border-foreground/15 dark:border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
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
                            className="surface-top border border-foreground/15 dark:border-border rounded-lg p-3"
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
