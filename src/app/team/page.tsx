"use client";

import React from "react";
import { TeamHero } from "./_components/TeamHero";
import { TeamGrid } from "./_components/TeamGrid";
import { TeamMemberModal } from "./_components/TeamMemberModal";
import { ValuesSection } from "./_components/ValuesSection";
import { SupportCTA } from "./_components/SupportCTA";
import { JoinCTA } from "./_components/JoinCTA";

export default function TeamPage() {
  const [expandedMember, setExpandedMember] = React.useState<string | null>(null);

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
          <TeamHero />
        </div>

        {/* Team Grid — cream band */}
        <TeamGrid onSelectMember={setExpandedMember} />

        {/* Values — dark band */}
        <ValuesSection />

        {/* Support — on page background */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <SupportCTA />
        </div>

        {/* Join CTA — wine band */}
        <JoinCTA />
      </div>

      <TeamMemberModal
        memberName={expandedMember}
        onClose={() => setExpandedMember(null)}
      />
    </div>
  );
}
