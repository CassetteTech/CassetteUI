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

/**
 * Roster card. Flat at rest — the offset shadow only appears on hover. On
 * hover-capable devices the portrait develops from mono to color; touch
 * devices get full color from the start. The type tag is color-only mono
 * text with a pixel square, not a filled chip.
 */
export function TeamCard({ member, onClick }: TeamCardProps) {
  const typeConfig = getTypeConfig(member.type);
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
      className="group text-left w-full h-full bg-card border-2 border-foreground p-4 flex gap-3 sm:gap-4 items-stretch hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-flat-4 dark:hover:shadow-flat-white-4 transition-[transform,box-shadow] duration-150 ease-out-quart focus-visible:outline-none focus-visible:shadow-flat-primary-6"
    >
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 border-2 border-foreground shrink-0 bg-muted overflow-hidden">
        <Image
          src={member.image}
          alt={member.name}
          fill
          className="object-cover [@media(hover:hover)]:grayscale group-hover:grayscale-0 group-focus-visible:grayscale-0 transition-[filter] duration-300"
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
              "inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.15em] truncate",
              typeConfig.iconColor
            )}
          >
            <span aria-hidden className="h-1.5 w-1.5 bg-current shrink-0" />
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
