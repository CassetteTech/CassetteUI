"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { showcaseLinks } from "../_data";

export function ShowcaseStrip() {
  return (
    <section className="py-16 md:py-20">
      {/* Editorial rule */}
      <div className="editorial-rule-thick mb-16 md:mb-20" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        {/* Section label */}
        <p className="section-label text-muted-foreground mb-4">
          Try It Now
        </p>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="font-teko text-4xl sm:text-5xl font-bold text-foreground leading-tight">
              See Smart Links in Action
            </h2>
            <p className="font-roboto text-lg text-muted-foreground mt-2">
              Click to test real links—Cassette routes them instantly.
            </p>
          </div>
          <Link
            href="/auth/signup"
            className="hidden sm:inline-flex items-center gap-2 bg-primary text-primary-foreground font-teko text-lg px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors duration-200 whitespace-nowrap flex-shrink-0 elev-2"
          >
            Start Free
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {showcaseLinks.map((link, index) => {
          const isAlternate = index % 2 === 1;
          return (
            <motion.div
              key={link.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: index * 0.08,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              <Link
                href={link.href}
                className={`rounded-lg p-5 block hover:-translate-y-1 hover:shadow-[6px_6px_0_hsl(var(--border))] transition-all duration-150 ease-linear ${
                  isAlternate
                    ? "bg-pullquote-bg border-l-4 border-l-warning border border-foreground/10 dark:border-border"
                    : "surface-top border border-foreground/15 dark:border-border"
                }`}
              >
                {!isAlternate && (
                  <div className="h-[2px] w-10 bg-warning mb-3" />
                )}
                <p className="font-teko text-xl text-foreground truncate">
                  {link.title}
                </p>
                <p className="font-roboto text-sm text-muted-foreground truncate">
                  {link.artist}
                </p>
                <span className="mt-2 inline-block text-xs px-2.5 py-1 rounded-sm bg-muted text-muted-foreground font-medium">
                  {link.meta}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Mobile CTA */}
      <div className="mt-8 sm:hidden text-center">
        <Link
          href="/auth/signup"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-teko text-lg px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors duration-200 elev-2"
        >
          Start Free
        </Link>
      </div>
    </section>
  );
}
