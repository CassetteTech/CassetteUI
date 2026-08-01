import { cn } from "@/lib/utils";
import { ICON_PATHS, SOCIAL_LINKS } from "@/lib/social-links";


interface SocialLinksProps {
  className?: string;
  iconClassName?: string;
}

export function SocialLinks({ className, iconClassName }: SocialLinksProps) {
  return (
    <ul className={cn("flex items-center gap-4", className)}>
      {SOCIAL_LINKS.map((link) => (
        <li key={link.name}>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Cassette on ${link.name}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              className={cn("h-[18px] w-[18px]", iconClassName)}
            >
              <path d={ICON_PATHS[link.name]} />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
