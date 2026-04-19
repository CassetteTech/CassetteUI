import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { Markdown } from "@/components/markdown";
import {
  getPublishedGitHubReleases,
  type PublishedGitHubRelease,
} from "@/lib/github-releases";

export const metadata: Metadata = {
  title: "Release Notes | Cassette",
  description:
    "Published release notes for Cassette, sourced from GitHub Releases.",
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function ReleaseEntry({
  release,
  isLatest,
}: {
  release: PublishedGitHubRelease;
  isLatest: boolean;
}) {
  return (
    <article className="group relative">
      {/* Timeline dot */}
      <div className="absolute -left-[32px] top-7 hidden h-3 w-3 border-2 border-foreground bg-primary lg:block" />

      <div className="bg-primary-foreground force-light-surface text-foreground border-2 border-foreground shadow-[5px_5px_0_hsl(var(--foreground))] dark:shadow-[5px_5px_0_hsl(var(--cassette-white))] hover:shadow-[7px_7px_0_hsl(var(--primary))] dark:hover:shadow-[7px_7px_0_hsl(var(--primary))] transition-shadow">
        {/* Header bar — catalog stamp */}
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-foreground px-5 py-3">
          <span className="inline-flex items-center bg-foreground text-background font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-0.5">
            {release.tagName}
          </span>

          {release.prerelease && (
            <span className="inline-flex items-center border border-foreground/40 bg-background font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 text-muted-foreground">
              Pre-release
            </span>
          )}

          {isLatest && !release.prerelease && (
            <span className="inline-flex items-center bg-primary text-primary-foreground border border-foreground font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 font-bold">
              Latest
            </span>
          )}

          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDate(release.publishedAt)}
          </span>
        </div>

        {/* Body */}
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <h2 className="font-teko text-3xl sm:text-4xl uppercase tracking-tight leading-none">
            <a
              href={release.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary transition-colors"
            >
              {release.name ?? release.tagName}
            </a>
          </h2>

          <div className="mt-4 max-w-none text-[0.9375rem] leading-relaxed">
            <Markdown
              content={release.body.trim() || "No release notes provided."}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function ReleaseNotesPage() {
  const releases = await getPublishedGitHubReleases();

  return (
    <div className="min-h-screen surface-bottom relative">
      {/* Subtle grain texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-28 pb-20">
        <header className="mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
            Product Updates
          </p>
          <h1 className="font-teko text-5xl sm:text-6xl lg:text-7xl font-bold uppercase text-foreground tracking-tight leading-none">
            Release Notes
          </h1>
          <p className="font-roboto italic text-base text-muted-foreground mt-4 max-w-md">
            A running log of what&apos;s new, improved, and fixed in Cassette.
          </p>
        </header>

        <div className="editorial-rule-thick mb-12" />

        {releases.length === 0 ? (
          <div className="bg-primary-foreground force-light-surface text-foreground border-2 border-foreground p-10 text-center shadow-[5px_5px_0_hsl(var(--foreground))] dark:shadow-[5px_5px_0_hsl(var(--cassette-white))]">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
            <p className="font-teko text-2xl uppercase tracking-tight text-foreground">
              No Releases Yet
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-2">
              Check back soon — auto-published on every cut.
            </p>
          </div>
        ) : (
          <div className="relative lg:pl-8">
            {/* Timeline line — dashed zine style */}
            <div className="absolute left-[5px] top-0 bottom-0 hidden w-0.5 bg-[repeating-linear-gradient(to_bottom,hsl(var(--foreground))_0_6px,transparent_6px_12px)] lg:block" />

            <div className="space-y-10">
              {releases.map((release, index) => (
                <ReleaseEntry
                  key={release.id}
                  release={release}
                  isLatest={index === 0}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
