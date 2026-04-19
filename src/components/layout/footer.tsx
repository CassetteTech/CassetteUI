'use client';

import Link from 'next/link';
import Image from 'next/image';

const linkColumns: { label: string; links: { href: string; label: string }[] }[] = [
  {
    label: 'Navigate',
    links: [
      { href: '/', label: 'Home' },
      { href: '/explore', label: 'Explore' },
      { href: '/release-notes', label: 'Release Notes' },
    ],
  },
  {
    label: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/team', label: 'Team' },
    ],
  },
  {
    label: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t-2 border-foreground bg-background">
      <div className="editorial-rule-thick" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand block */}
          <div className="md:col-span-6">
            <Link href="/" className="inline-flex items-center gap-2 -rotate-[1deg]">
              <Image
                src="/images/cassette_logo.png"
                alt="Cassette"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="font-teko text-4xl uppercase font-bold tracking-tight leading-none">
                Cassette
              </span>
            </Link>
            <p className="font-roboto text-sm text-muted-foreground mt-4 max-w-xs italic border-l-2 border-foreground/30 pl-3">
              Share music across every streaming platform. One link, no friction.
            </p>
          </div>

          {/* Link columns */}
          {linkColumns.map((col) => (
            <div key={col.label} className="md:col-span-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">
                {col.label}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <FooterLink key={link.href} href={link.href}>
                    {link.label}
                  </FooterLink>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-5 border-t-2 border-dashed border-foreground/25 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            © 2026 Cassette — All rights reserved
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Made for music lovers
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="group inline-flex items-center gap-1.5 font-roboto text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="inline-block w-0 group-hover:w-3 overflow-hidden transition-[width] duration-150 font-mono text-primary text-xs">
          →
        </span>
        <span>{children}</span>
      </Link>
    </li>
  );
}
