import type { Metadata } from "next";
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
      {/* Timeline connector dot */}
      <div className="absolute -left-[29px] top-[1.625rem] hidden h-3 w-3 rounded-full border-2 border-primary bg-background lg:block" />

      <div className="rounded-xl border border-border bg-card elev-1 transition-shadow duration-200 hover:elev-2">
        {/* Header bar */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border/60 px-5 py-3 sm:px-6">
          <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-primary">
            {release.tagName}
          </span>

          {release.prerelease && (
            <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Pre-release
            </span>
          )}

          {isLatest && !release.prerelease && (
            <span className="inline-flex items-center rounded-md bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
              Latest
            </span>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            {formatDate(release.publishedAt)}
          </span>
        </div>

        {/* Body */}
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            <a
              href={release.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-primary"
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
    <div className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      {/* Page header */}
      <header className="mb-10 sm:mb-14">
        <p className="section-label text-muted-foreground mb-3">
          Product Updates
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Release Notes
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">
          A running log of what&apos;s new, improved, and fixed in Cassette.
        </p>
        <div className="editorial-rule mt-6" />
      </header>

      {releases.length === 0 ? (
        <div className="inset-panel flex flex-col items-center py-16 text-center">
          <div className="mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <svg
              className="h-6 w-6 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">
            No releases yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check back soon — new versions are published here automatically.
          </p>
        </div>
      ) : (
        <div className="relative lg:pl-8">
          {/* Timeline line */}
          <div className="absolute left-[5px] top-0 bottom-0 hidden w-px bg-border lg:block" />

          <div className="space-y-8">
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
  );
}
