"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/features/marketing/section-header";
import { EASE_OUT_QUART } from "@/lib/motion";
import { showcaseLinks } from "../_data";

const SOURCE_PLATFORMS = ["spotify", "apple_music", "deezer"] as const;

/**
 * Live smart-link demo. One flat diagram explains the whole product — any
 * link in, one Cassette link out, opens in the listener's player — then the
 * example rows just invite a tap; the conversion itself is the payoff.
 */
export function ShowcaseStrip() {
  return (
    <section className="py-16 md:py-20">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <SectionHeader
          kicker="Try It Now"
          title="Smart Links, Live"
          sub={
            <>
              Paste a link from any app. Share one that opens in all of them.
            </>
          }
        />

        <Link
          href="/auth/signup"
          className="hidden sm:inline-flex shrink-0 items-center gap-2 border-2 border-foreground px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors mb-1"
        >
          Start Free
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* How it works — flat diagram strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-12 border-y-2 border-foreground/15 py-6 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-x-6 gap-y-5"
      >
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2.5">
            Any link in
          </p>
          <div className="flex items-center gap-2.5">
            {SOURCE_PLATFORMS.map((svc) => (
              <Image
                key={svc}
                src={`/images/${svc}_logo_colored.png`}
                alt=""
                width={24}
                height={24}
                quality={80}
                className="h-6 w-6 object-contain"
              />
            ))}
            <span className="font-mono text-[10px] text-muted-foreground">
              …
            </span>
          </div>
        </div>

        <ArrowRight
          aria-hidden
          className="hidden sm:block h-4 w-4 text-muted-foreground"
        />

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2.5">
            One smart link out
          </p>
          <span className="inline-flex items-center gap-2 border-2 border-foreground bg-background px-3 py-1.5">
            <Image
              src="/images/cassette_logo.png"
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 object-contain"
            />
            <span className="font-mono text-[11px] tracking-[0.05em] text-foreground">
              cassette.tech/…
            </span>
          </span>
        </div>

        <ArrowRight
          aria-hidden
          className="hidden sm:block h-4 w-4 text-muted-foreground"
        />

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2.5">
            Opens everywhere
          </p>
          <p className="font-roboto text-sm italic text-foreground/80 leading-snug">
            Every listener lands in their own player. No dead ends.
          </p>
        </div>
      </motion.div>

      <ul className="border-y-2 border-foreground divide-y divide-foreground/25">
        {showcaseLinks.map((link, index) => (
          <motion.li
            key={link.title}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.35,
              delay: Math.min(index * 0.05, 0.25),
              ease: EASE_OUT_QUART,
            }}
          >
            <Link
              href={link.href}
              className="group flex items-center gap-4 sm:gap-6 px-3 sm:px-4 py-4 sm:py-5 hover:bg-foreground hover:text-background transition-colors duration-150"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-teko text-2xl sm:text-3xl uppercase leading-[0.95] tracking-tight truncate">
                  {link.title}
                </span>
                <span className="block font-roboto text-xs italic text-muted-foreground group-hover:text-background/70 transition-colors mt-0.5">
                  {link.artist} &middot; {link.kind}
                </span>
              </span>

              <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground group-hover:text-background/60 transition-colors whitespace-nowrap">
                Convert &amp; play
              </span>

              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-background group-hover:translate-x-1 transition-[color,transform]" />
            </Link>
          </motion.li>
        ))}
      </ul>

      <div className="mt-10 sm:hidden text-center">
        <Link
          href="/auth/signup"
          className="inline-flex items-center gap-2 border-2 border-foreground px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-foreground"
        >
          Start Free
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
