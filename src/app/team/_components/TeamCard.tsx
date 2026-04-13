"use client";

import Image from "next/image";
import { Github, Linkedin, Link2, Mail, Twitter } from "lucide-react";
import { getTypeConfig } from "../_data";
import type { TeamMember } from "../_data";

interface TeamCardProps {
  member: TeamMember;
  index: number;
  onClick: () => void;
}

export function TeamCard({ member, index, onClick }: TeamCardProps) {
  const typeConfig = getTypeConfig(member.type);
  const number = String(index + 1).padStart(2, "0");
  const socialLinks = [
    { href: member.social.github, icon: Github, label: "GitHub" },
    { href: member.social.linkedin, icon: Linkedin, label: "LinkedIn" },
    { href: member.social.twitter, icon: Twitter, label: "Twitter" },
    { href: member.social.website, icon: Link2, label: member.social.websiteLabel ?? "Website" },
    { href: member.social.email, icon: Mail, label: "Email" },
  ].filter(({ href }) => href && href !== "#");

  return (
    <div
      className={`surface-top border-l-4 ${typeConfig.borderLeft} border border-foreground/15 dark:border-border rounded-lg cursor-pointer h-full flex flex-col relative overflow-hidden
        hover:-translate-y-1 hover:shadow-[6px_6px_0_hsl(var(--border))] transition-all duration-150 ease-linear`}
      onClick={onClick}
    >
      {/* Watermark number */}
      <span className={`font-teko text-6xl font-bold ${typeConfig.numberColor} absolute top-2 right-4 leading-none opacity-60 pointer-events-none select-none`}>
        {number}
      </span>

      <div className="p-6 sm:p-7 flex-1 flex flex-col">
        {/* Photo + Name/Role */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-muted">
            <Image
              src={member.image}
              alt={member.name}
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-teko text-2xl text-foreground font-bold leading-tight">
              {member.name}
            </h3>
            <p className="font-roboto text-sm text-muted-foreground mt-0.5">
              {member.role}
            </p>
          </div>
        </div>

        {/* Role badge */}
        <div className="mb-4">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${typeConfig.iconBg} ${typeConfig.iconColor}`}>
            {typeConfig.label}
          </span>
        </div>

        {/* Short bio */}
        <p className="font-roboto text-muted-foreground leading-relaxed text-sm line-clamp-3 flex-1">
          {member.shortBio}
        </p>

        {/* Social links footer */}
        <div className="mt-5 pt-4 flex items-center gap-3">
          <div className="editorial-rule-dashed flex-1 mr-3" />
          {socialLinks.map(({ href, icon: Icon, label }) => (
            <a
              key={label}
              href={href}
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
              aria-label={label}
            >
              <Icon size={16} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
