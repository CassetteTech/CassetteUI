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

export function TeamCard({ member, onClick }: TeamCardProps) {
  const typeConfig = getTypeConfig(member.type);
  const TypeIcon = typeConfig.icon;
  const socialLinks = [
    { href: member.social.github, icon: Github, label: "GitHub" },
    { href: member.social.linkedin, icon: Linkedin, label: "LinkedIn" },
    { href: member.social.twitter, icon: Twitter, label: "Twitter" },
    { href: member.social.website, icon: Link2, label: member.social.websiteLabel ?? "Website" },
    { href: member.social.email, icon: Mail, label: "Email" },
  ].filter(({ href }) => href && href !== "#");

  return (
    <div
      className={`surface-top border-l-4 ${typeConfig.borderLeft} border border-foreground/10 dark:border-border rounded-lg cursor-pointer h-full flex flex-col relative overflow-hidden
        hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-lg transition-all duration-200 ease-out`}
      onClick={onClick}
    >
      <div className="p-6 sm:p-7 flex-1 flex flex-col">
        {/* Photo + Name/Role + type icon chip */}
        <div className="flex items-start gap-4 mb-5">
          <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-muted ring-2 ring-foreground/5">
            <Image
              src={member.image}
              alt={member.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-teko text-2xl text-foreground font-bold leading-tight tracking-tight">
              {member.name}
            </h3>
            <p className="font-roboto text-sm text-muted-foreground mt-1 leading-snug">
              {member.role}
            </p>
            <span className={`mt-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium uppercase tracking-wide ${typeConfig.iconBg} ${typeConfig.iconColor}`}>
              <TypeIcon size={11} strokeWidth={2.5} />
              {typeConfig.label}
            </span>
          </div>
        </div>

        {/* Short bio */}
        <p className="font-roboto text-muted-foreground leading-relaxed text-sm line-clamp-3 flex-1">
          {member.shortBio}
        </p>

        {/* Social links footer */}
        {socialLinks.length > 0 && (
          <div className="mt-5 pt-4 border-t border-foreground/10 flex items-center gap-4">
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
        )}
      </div>
    </div>
  );
}
