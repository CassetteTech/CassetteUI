import Image from "next/image";
import Link from "next/link";
import { DITHER_BAND_MASK_TOP } from "./dither-edge";
import { SOCIAL_LINKS } from "@/lib/social-links";
import footerEngraving from "@/assets/images/footer-engraving.webp";

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

      <div className="relative z-10">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[calc(100%+6rem)] bg-[linear-gradient(to_bottom,#F8F5F0_calc(100%-6rem),rgba(248,245,240,0))]"
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-[4.5rem] md:pt-[5rem]">
          <div className="grid grid-cols-1 md:grid-cols-4 border-t border-dashed border-[#2B2A24]/25 pt-8 md:pt-10">
            <div className="flex flex-col items-center gap-4 px-6 pb-6 md:pb-10 text-center">
              <Link href="/" className="inline-flex items-center gap-2">
                <Image
                  src="/images/cassette_logo.svg"
                  alt="Cassette"
                  width={28}
                  height={28}
                  className="h-7 w-7"
                />
                <span className="font-teko text-3xl uppercase font-bold tracking-tight leading-none">
                  Cassette
                </span>
              </Link>
              <p className="font-roboto-flex text-sm italic leading-relaxed opacity-70 max-w-[15rem]">
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

            <div className="grid grid-cols-3 border-t border-dashed border-[#2B2A24]/25 md:contents">
            {LINK_COLUMNS.map((col) => (
              <div
                key={col.label}
                className="flex flex-col items-center gap-2.5 md:gap-3 px-2 md:px-6 pt-6 md:pt-0 pb-6 md:pb-10 border-l first:border-l-0 md:first:border-l border-dashed border-[#2B2A24]/25 text-center"
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
                      className="font-roboto-flex text-sm opacity-75 hover:opacity-100 hover:text-primary transition-[color,opacity]"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="font-roboto-flex text-sm opacity-75 hover:opacity-100 hover:text-primary transition-[color,opacity]"
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
      </div>

      <div aria-hidden className="hidden md:block h-[46vw] min-h-[13rem] max-h-[32rem]" />

      <div aria-hidden className="relative -z-10 -mt-16 md:hidden select-none">
        <Image
          src={footerEngraving}
          alt=""
          sizes="100vw"
          placeholder="blur"
          className="w-full h-auto pointer-events-none"
        />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 dark:bg-black/25"
      />
    </footer>
  );
}
