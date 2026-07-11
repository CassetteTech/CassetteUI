"use client";

import { PixelHero } from "./_components/PixelHero";
import { CurtainSheet } from "@/components/features/marketing/curtain-sheet";
import { StatStrip } from "@/components/features/marketing/stat-strip";
import { KofiSupportBand } from "@/components/features/marketing/kofi-support-band";
import { ProblemSection } from "./_components/ProblemSection";
import { JourneyTimeline } from "./_components/JourneyTimeline";
import { MusicIdentitySection } from "./_components/MusicIdentitySection";
import { ShowcaseStrip } from "./_components/ShowcaseStrip";
import { ExampleProfileSection } from "./_components/ExampleProfileSection";
import { VisionSection } from "./_components/VisionSection";
import { SupportersShowcase } from "./_components/SupportersShowcase";
import { FinalCTA } from "./_components/FinalCTA";
import { MarketingFooter } from "@/components/features/marketing/marketing-footer";
import { linerNotes } from "./_data";

/**
 * A pinned pixel hero, then a curtain content sheet that scrolls up over it.
 */
export default function AboutPage() {
  return (
    <div className="relative">
      {/* Pinned image hero — the sheet below scrolls up and over it */}
      <PixelHero />

      <CurtainSheet tab="The Story">
        {/* Liner notes — quiet stat strip. Bottom padding must clear the
            next band's 24px dither edge so it doesn't shadow the strip. */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-20 pb-14">
          <StatStrip items={linerNotes} />
        </section>

        {/* The Problem — charcoal statement band */}
        <ProblemSection />

        {/* The Profile — cream band with the interactive demo */}
        <MusicIdentitySection />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Focal profile card — a real one in the wild */}
          <ExampleProfileSection />
          {/* Live smart-link demo */}
          <ShowcaseStrip />
          {/* Spool-line timeline */}
          <JourneyTimeline />
          {/* Support — quiet ruled strip */}
          <KofiSupportBand
            title="Fuel The Mission"
            copy="Indie team, indie budget. If our story resonates, drop a Ko-fi."
          />
        </div>

        {/* Vision — dark statement band */}
        <VisionSection />

        {/* Supporters — light band to blend with the Ko-fi widget */}
        <SupportersShowcase />

        {/* Closing CTA — wine band, bookended with the hero halftone */}
        <FinalCTA />

        {/* Print-sheet footer — paper dithers up into the wine band */}
        <MarketingFooter />
      </CurtainSheet>
    </div>
  );
}
