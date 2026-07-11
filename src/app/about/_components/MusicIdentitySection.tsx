"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ListMusic, Disc3, Music2, Mic2 } from "lucide-react";
import { ProfileDemo } from "@/components/demo/profile-demo";
import { SectionHeader } from "@/components/features/marketing/section-header";
import { DitherEdge } from "@/components/features/marketing/dither-edge";
import { EASE_OUT_QUART } from "@/lib/motion";

const tabs = [
  { icon: ListMusic, label: "Playlists" },
  { icon: Music2, label: "Tracks" },
  { icon: Mic2, label: "Artists" },
  { icon: Disc3, label: "Albums" },
];

const services = ["spotify", "apple_music", "deezer"] as const;

/**
 * Cream band introducing the profile — the interactive ProfileDemo and the
 * real-profile teaser card share one section: play with the demo, then tap
 * into the real thing.
 */
export function MusicIdentitySection() {
  return (
    <section className="section-cream relative">
      <DitherEdge color="hsl(var(--section-cream))" side="top" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <SectionHeader
          kicker="The Profile"
          title="Your Music Identity"
          sub="One home for your taste that any listener can open, whatever they stream with. Try the demo, then tap into a real profile."
          className="mb-14"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Interactive demo — the toy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 max-w-md mx-auto w-full lg:max-w-none"
          >
            <div className="bg-primary-foreground force-light-surface text-foreground border-2 border-foreground p-5 shadow-flat-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
                Profile Preview
              </p>
              <ProfileDemo annotations={false} />
              <p className="font-roboto text-xs text-muted-foreground text-center mt-3 italic">
                Interactive demo — your music profile with smart linking.
              </p>
            </div>
          </motion.div>

          {/* Real profile teaser — the payoff */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-5%" }}
            transition={{ duration: 0.5, ease: EASE_OUT_QUART }}
            className="lg:col-span-7"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
              See one in the wild
            </p>
            <Link
              href="/profile/matt"
              className="group block bg-primary-foreground force-light-surface text-foreground border-2 border-foreground p-6 sm:p-8 shadow-flat-6 dark:shadow-flat-white-6 hover:-translate-y-1 hover:shadow-flat-primary-8 dark:hover:shadow-flat-primary-8 transition-[transform,box-shadow] duration-150 ease-out-quart"
            >
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 border-2 border-foreground rounded-full overflow-hidden bg-muted">
                  <Image
                    src="/images/cassette_logo.png"
                    alt="@matt avatar"
                    fill
                    className="object-contain p-2"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
                    Cassette profile
                  </p>
                  <h3 className="font-teko text-3xl sm:text-4xl uppercase leading-none tracking-tight truncate group-hover:text-primary transition-colors">
                    Matt Toppi
                  </h3>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                    @matt
                  </p>
                </div>
                <ArrowRight className="hidden sm:block h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-[color,transform] shrink-0" />
              </div>

              <p className="mt-5 text-sm text-foreground/80 italic border-l-2 border-foreground/30 pl-3">
                Music enthusiast, playlist curator, always digging.
              </p>

              <div className="mt-5 flex items-center gap-2">
                {services.map((svc) => (
                  <div key={svc} className="h-6 w-6 relative">
                    <Image
                      src={`/images/${svc}_logo_colored.png`}
                      alt={svc}
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                ))}
                <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  3 platforms linked
                </span>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-2 border-t-2 border-foreground/20 pt-4">
                {tabs.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="border border-foreground/20 bg-background px-2 py-3 text-center"
                  >
                    <Icon className="h-4 w-4 text-foreground mx-auto mb-1.5" />
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-2">
                <span className="h-px flex-1 bg-foreground/20" />
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Tap to visit the full profile
                </span>
                <span className="h-px flex-1 bg-foreground/20" />
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
