"use client";

import React from "react";
import { Mail } from "lucide-react";
import { PIXEL_HERO_PRIMARY_ACTION_CLASS, PixelHero } from "@/components/features/marketing/pixel-hero";
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

export default function TeamPage() {
  const [expandedMember, setExpandedMember] = React.useState<string | null>(
    null
  );

  return (
    <div className="relative">
      <PixelHero
        label="The Cassette team"
        imageClassName="object-cover object-[30%_78%]"
        eyebrow="Team · Cassette Technologies"
        title={["Meet", "The Crew"]}
        lead="Music obsessives, developers, and creators united by one mission—"
        emphasis="making music universal again"
        primaryAction={
          <a href="mailto:team@cassette.tech" className={PIXEL_HERO_PRIMARY_ACTION_CLASS}>
            <Mail size={16} />
            <span>Work With Us</span>
          </a>
        }
        secondaryLink={{ href: "/about", label: "Our Story" }}
      />

      <CurtainSheet tab="The Crew">
        {/* Liner notes — quiet stat strip. Bottom padding keeps clear of any
            following band's 24px dither edge. */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-20 pb-14">
          <StatStrip items={teamStats} />
        </section>

        <TeamGrid onSelectMember={setExpandedMember} />

        <ValuesSection />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <KofiSupportBand
            title="Back The Team"
            copy="Love what we're building? Drop a Ko-fi so we can keep shipping new sharing tools."
          />
        </div>

        <JoinCTA />

        <MarketingFooter />
      </CurtainSheet>

      <TeamMemberModal
        memberName={expandedMember}
        onClose={() => setExpandedMember(null)}
      />
    </div>
  );
}
