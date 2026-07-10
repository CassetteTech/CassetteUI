import type { ReactNode } from "react";

interface CurtainSheetProps {
  /** Label on the cassette tab marking the seam, e.g. "The Story". */
  tab: string;
  children: ReactNode;
}

/**
 * Opaque content sheet that scrolls up and over a pinned pixel hero.
 * z-10 + solid background fully cover the hero as the sheet slides; the
 * negative top margin pulls the rounded edge into the first viewport as a
 * scroll affordance. Shared by /about and /team.
 */
export function CurtainSheet({ tab, children }: CurtainSheetProps) {
  return (
    <div className="relative z-10 -mt-10">
      <div className="relative surface-bottom rounded-t-[2rem] md:rounded-t-[2.5rem] border-t-2 border-foreground">
        {/* Cassette label tab marking the seam */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-background px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-foreground whitespace-nowrap">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
            />
            {tab}
          </span>
        </div>

        {/* Subtle grain texture over the sheet */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.03] rounded-t-[2rem] md:rounded-t-[2.5rem] overflow-hidden"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />

        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
