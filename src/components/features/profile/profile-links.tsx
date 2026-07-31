import { Globe } from 'lucide-react';
import { parseProfileLink, type ParsedProfileLink } from '@/lib/profile-links';
import { cn } from '@/lib/utils';

export function ProfileLinkIcon({ link, className }: { link: ParsedProfileLink; className?: string }) {
  if (!link.iconPath) {
    return <Globe className={cn('h-[14px] w-[14px]', className)} aria-hidden />;
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={cn('h-[14px] w-[14px]', className)}>
      <path d={link.iconPath} />
    </svg>
  );
}

/** Quiet icon+handle chips for the profile header. */
export function ProfileLinksRow({ links, className }: { links?: string[]; className?: string }) {
  const parsed = (links ?? []).map(parseProfileLink).filter((l): l is ParsedProfileLink => l !== null);
  if (parsed.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {parsed.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          aria-label={`${link.platform}: ${link.label}`}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          <ProfileLinkIcon link={link} className="h-3 w-3" />
          <span className="max-w-[10rem] truncate normal-case">{link.label}</span>
        </a>
      ))}
    </div>
  );
}
