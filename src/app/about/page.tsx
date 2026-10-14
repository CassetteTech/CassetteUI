"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PIXEL_HERO_PRIMARY_ACTION_CLASS, PixelHero } from "@/components/features/marketing/pixel-hero";
import { useAuthState } from "@/hooks/use-auth";
import { CurtainSheet } from "@/components/features/marketing/curtain-sheet";
import { StatStrip } from "@/components/features/marketing/stat-strip";
import { DitherEdge } from "@/components/features/marketing/dither-edge";
import { ProblemSection } from "./_components/ProblemSection";
import { JourneyTimeline } from "./_components/JourneyTimeline";
import { MusicIdentitySection } from "./_components/MusicIdentitySection";
import { ShowcaseStrip } from "./_components/ShowcaseStrip";
import { VisionSection } from "./_components/VisionSection";
import { SupportersShowcase } from "./_components/SupportersShowcase";
import { FinalCTA } from "./_components/FinalCTA";
import { MarketingFooter } from "@/components/features/marketing/marketing-footer";
import { linerNotes } from "./_data";

export default function AboutPage() {
  const { isAuthenticated } = useAuthState();
  return (
    <div className="relative">
      <PixelHero
        label="About Cassette"
        eyebrow="About · Cassette Technologies"
        title={["Your Music,", "Everywhere"]}
        lead="Cassette turns any track, album, artist, or playlist into one smart link that opens in your listener's preferred app—"
        emphasis="no dead ends, no friction"
        primaryAction={
          <Link href={isAuthenticated ? "/" : "/auth/signup"} className={PIXEL_HERO_PRIMARY_ACTION_CLASS}>
            <span>Create Your Universal Link</span>
            <ArrowRight size={16} />
          </Link>
        }
        secondaryLink={{ href: "/team", label: "Meet the Team" }}
      />

      <CurtainSheet tab="The Story">
        {/* Liner notes — quiet stat strip. Bottom padding must clear the
            next band's 24px dither edge so it doesn't shadow the strip. */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-20 pb-14">
          <StatStrip items={linerNotes} />
        </section>

        <ProblemSection />

        <div className="relative">
          <DitherEdge color="hsl(var(--background))" side="top" />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <ShowcaseStrip />
          </div>
        </div>

        <MusicIdentitySection />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <JourneyTimeline />
        </div>

        <VisionSection />

        <SupportersShowcase />

        <FinalCTA />

        <MarketingFooter />
      </CurtainSheet>
    </div>
  );
}
