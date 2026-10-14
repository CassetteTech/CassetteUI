"use client";

import { PixelHero } from "./_components/PixelHero";
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
  return (
    <div className="relative">
      <PixelHero />

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
