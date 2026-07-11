import Image from "next/image";
import Link from "next/link";
import { DITHER_BAND_MASK_TOP } from "./dither-edge";
import { SOCIAL_LINKS } from "@/lib/social-links";
import footerEngraving from "@/assets/images/footer-engraving.webp";

/**
 * Print-sheet footer for the /about and /team story pages. The cassette
 * engraving is the background of the whole footer — link columns sit on its
 * blank paper (top ~38% of the art is clear) behind a paper-colored scrim
 * that fades out below the content, so type and art share one sheet with no
 * hard seam. The band is dither-masked at the top (with `-mt-6`) so the
 * paper dissolves into the preceding CTA band's color, same as the other
 * seams on these pages.
 *
 * Paper (#F8F5F0) and ink (#2B2A24) are literals sampled from the art —
 * the engraving can't re-theme, so the footer keeps its printed colors in
 * both modes and dims under an overlay in dark mode like the pixel hero.
 */

const LINK_COLUMNS: Array<{
  label: string;
  links: Array<{ href: string; label: string; external?: boolean }>;
}> = [
  {
    label: "Navigate",
    links: [
      { href: "/", label: "Home" },
      { href: "/explore", label: "Explore" },
      { href: "/release-notes", label: "Release Notes" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/team", label: "Team" },
      { href: "mailto:team@cassette.tech", label: "Contact", external: true },
    ],
  },
  {
    label: "Connect",
    links: SOCIAL_LINKS.map((s) => ({
      href: s.href,
      label: s.name,
      external: true,
    })),
  },
];

export function MarketingFooter() {
  return (
    <footer
      aria-label="Site footer"
      className="relative -mt-6 overflow-hidden bg-[#F8F5F0] text-[#2B2A24]"
      style={DITHER_BAND_MASK_TOP}
    >
      {/* The sheet itself (md+): engraving pinned to the footer's bottom
          edge. On mobile the cover-crop would show a zoomed slice of the
          cassette, so the art renders as a natural-aspect block instead. */}
      <div aria-hidden className="hidden md:block absolute inset-0 select-none">
        <Image
          src={footerEngraving}
          alt=""
          fill
          sizes="100vw"
          placeholder="blur"
          className="object-cover object-bottom pointer-events-none"
        />
      </div>

      {/* Content zone. The scrim tracks the content's own height: solid
          paper behind all of it, fading out in the 6rem below so the art
          emerges with no seam at any breakpoint. Transparent stop uses the
          paper color so Safari doesn't fade through gray. */}
      <div className="relative z-10">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[calc(100%+6rem)] bg-[linear-gradient(to_bottom,#F8F5F0_calc(100%-6rem),rgba(248,245,240,0))]"
        />

        {/* Extra 24px of top padding clears the masked seam */}
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-[4.5rem] md:pt-[5rem]">
          <div className="grid grid-cols-1 md:grid-cols-4 border-t border-dashed border-[#2B2A24]/25 pt-8 md:pt-10">
            {/* Brand cell */}
            <div className="flex flex-col items-center gap-4 px-6 pb-8 md:pb-10 text-center">
              <Link href="/" className="inline-flex items-center gap-2">
                <Image
                  src="/images/cassette_logo.png"
                  alt="Cassette"
                  width={28}
                  height={28}
                  className="h-7 w-7"
                />
                <span className="font-teko text-3xl uppercase font-bold tracking-tight leading-none">
                  Cassette
                </span>
              </Link>
              <p className="font-roboto text-sm italic leading-relaxed opacity-70 max-w-[15rem]">
                Share music across every streaming platform. One link, no
                friction.
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-60">
                © 2026 Cassette
              </p>
              <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.2em]">
                <Link
                  href="/privacy"
                  className="opacity-60 hover:opacity-100 hover:text-primary transition-[color,opacity]"
                >
                  Privacy
                </Link>
                <span aria-hidden className="opacity-30">
                  ·
                </span>
                <Link
                  href="/terms"
                  className="opacity-60 hover:opacity-100 hover:text-primary transition-[color,opacity]"
                >
                  Terms
                </Link>
              </div>
            </div>

            {/* Link columns between dashed fold lines */}
            {LINK_COLUMNS.map((col) => (
              <div
                key={col.label}
                className="flex flex-col items-center gap-3 px-6 pt-8 pb-8 md:pt-0 md:pb-10 border-t md:border-t-0 md:border-l border-dashed border-[#2B2A24]/25 text-center"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60 mb-1">
                  {col.label}
                </p>
                {col.links.map((link) =>
                  link.external ? (
                    <a
                      key={link.label}
                      href={link.href}
                      {...(link.href.startsWith("http")
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="font-roboto text-sm opacity-75 hover:opacity-100 hover:text-primary transition-[color,opacity]"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="font-roboto text-sm opacity-75 hover:opacity-100 hover:text-primary transition-[color,opacity]"
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Reveal zone (md+) — the cassette rises here from the same sheet */}
      <div aria-hidden className="hidden md:block h-[52vw] min-h-[13rem] max-h-[36rem]" />

      {/* Mobile: the whole engraving, uncropped. Its blank top paper tucks
          64px under the scrim fade (art ink starts ~39% down), and negative
          z keeps it behind the content wrapper. */}
      <div aria-hidden className="relative -z-10 -mt-16 md:hidden select-none">
        <Image
          src={footerEngraving}
          alt=""
          sizes="100vw"
          placeholder="blur"
          className="w-full h-auto pointer-events-none"
        />
      </div>

      {/* Dark mode: dim the printed sheet so it doesn't glare (hero pattern) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 dark:bg-black/25"
      />
    </footer>
  );
}
