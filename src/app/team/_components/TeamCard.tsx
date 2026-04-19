"use client";

import Image from "next/image";
import { Github, Linkedin, Link2, Mail, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTypeConfig } from "../_data";
import type { TeamMember } from "../_data";

interface TeamCardProps {
  member: TeamMember;
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
    <button
      onClick={onClick}
      className="group text-left w-full h-full bg-background border-2 border-foreground p-4 flex gap-3 sm:gap-4 items-stretch shadow-[4px_4px_0_hsl(var(--foreground))] dark:shadow-[4px_4px_0_hsl(var(--cassette-white))] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_hsl(var(--primary))] transition-all duration-150 ease-linear focus-visible:outline-none focus-visible:shadow-[6px_6px_0_hsl(var(--primary))]"
    >
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 border-2 border-foreground shrink-0 bg-muted overflow-hidden">
        <Image
          src={member.image}
          alt={member.name}
          fill
          className="object-cover"
          sizes="96px"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <h3 className="font-teko text-[1.15rem] sm:text-xl uppercase leading-[0.95] tracking-tight text-foreground group-hover:text-primary transition-colors break-words hyphens-auto">
          {member.name}
        </h3>

        <p className="font-roboto text-xs text-muted-foreground mt-1 line-clamp-2">
          {member.role}
        </p>

        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 border border-foreground/20 font-mono text-[9px] uppercase tracking-[0.15em] truncate",
              typeConfig.iconBg,
              typeConfig.iconColor
            )}
          >
            <TypeIcon size={10} strokeWidth={2.5} className="shrink-0" />
            <span className="truncate">{typeConfig.label}</span>
          </span>
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-3 shrink-0">
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={label}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
