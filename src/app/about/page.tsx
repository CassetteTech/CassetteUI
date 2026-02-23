"use client";

import { AboutHero } from "./_components/AboutHero";
import { ProblemSection } from "./_components/ProblemSection";
import { JourneyTimeline } from "./_components/JourneyTimeline";
import { SupportCTA } from "./_components/SupportCTA";
import { FeaturesSection } from "./_components/FeaturesSection";
import { ShowcaseStrip } from "./_components/ShowcaseStrip";
import { VisionSection } from "./_components/VisionSection";
import { SupportersShowcase } from "./_components/SupportersShowcase";
import { FinalCTA } from "./_components/FinalCTA";

export default function AboutPage() {
  return (
    <div className="min-h-screen surface-bottom relative">
      {/* Subtle grain texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />

      <div className="relative z-10">
        {/* Hero — on page background */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-32">
          <AboutHero />
        </div>

        {/* Problem — navy band */}
        <ProblemSection />

        {/* Journey & Support — on page background */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <JourneyTimeline />
          <SupportCTA />
        </div>

        {/* Features — cream band */}
        <FeaturesSection />

        {/* Showcase — on page background */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ShowcaseStrip />
        </div>

        {/* Vision — dark band */}
        <VisionSection />

        {/* Supporters — light band to blend with Ko-fi widget */}
        <SupportersShowcase />

        {/* Final CTA — wine band */}
        <FinalCTA />
      </div>
    </div>
  );
}
