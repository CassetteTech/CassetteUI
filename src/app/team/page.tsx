"use client";

import React from "react";
import { TeamPixelHero } from "./_components/TeamPixelHero";
import { CurtainSheet } from "@/components/features/marketing/curtain-sheet";
import { StatStrip } from "@/components/features/marketing/stat-strip";
import { KofiSupportBand } from "@/components/features/marketing/kofi-support-band";
import { TeamGrid } from "./_components/TeamGrid";
import { TeamMemberModal } from "./_components/TeamMemberModal";
import { ValuesSection } from "./_components/ValuesSection";
import { JoinCTA } from "./_components/JoinCTA";
import { MarketingFooter } from "@/components/features/marketing/marketing-footer";
import { teamMembers } from "./_data";

const teamStats = [
  { value: String(teamMembers.length), label: "Crew Members" },
  { value: "∞", label: "Music Connections" },
  { value: "2022", label: "Founded" },
];

/**
 * Mirrors /about's structure: pinned pixel hero, curtain sheet, liner-notes
 * strip, then the roster and values bands.
 */
export default function TeamPage() {
  const [expandedMember, setExpandedMember] = React.useState<string | null>(
    null
  );

  return (
    <div className="relative">
      {/* Pinned image hero — the sheet below scrolls up and over it */}
      <TeamPixelHero />

      <CurtainSheet tab="The Crew">
        {/* Liner notes — quiet stat strip. Bottom padding keeps clear of any
            following band's 24px dither edge. */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-20 pb-14">
          <StatStrip items={teamStats} />
        </section>

        {/* Roster on page background */}
        <TeamGrid onSelectMember={setExpandedMember} />

        {/* Values — dark statement band */}
        <ValuesSection />

        {/* Support — quiet ruled strip */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <KofiSupportBand
            title="Back The Team"
            copy="Love what we're building? Drop a Ko-fi so we can keep shipping new sharing tools."
          />
        </div>

        {/* Closing CTA — navy band, bookended with the hero halftone */}
        <JoinCTA />

        {/* Print-sheet footer — paper dithers up into the navy band */}
        <MarketingFooter />
      </CurtainSheet>

      <TeamMemberModal
        memberName={expandedMember}
        onClose={() => setExpandedMember(null)}
      />
    </div>
  );
}
