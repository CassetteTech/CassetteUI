import { Stars, Zap, Radio, Music2, Link as LinkIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// --- Timeline Milestones ---

export interface Milestone {
  year: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accentBar: string;
  borderTop: string;
  iconColor: string;
  numberColor: string;
}

export const milestones: Milestone[] = [
  {
    year: "2022",
    title: "The Spark",
    description:
      "Frustrated by the inability to share music across platforms, the co-founders started sketching a fix. The idea for Cassette was born.",
    icon: Stars,
    accentBar: "bg-primary",
    borderTop: "border-t-primary",
    iconColor: "text-primary",
    numberColor: "text-primary/25",
  },
  {
    year: "2023",
    title: "Building the Foundation",
    description:
      "Pitched into American University\u2019s accelerator program. Built initial prototype and assembled our founding team of engineers and marketers.",
    icon: Zap,
    accentBar: "bg-info",
    borderTop: "border-t-info",
    iconColor: "text-info-text",
    numberColor: "text-info-text/25",
  },
  {
    year: "2024",
    title: "Launch & Growth",
    description:
      "Successfully completed crowdfunding campaign. Launched platform publicly and began scaling to thousands of users.",
    icon: Radio,
    accentBar: "bg-accentRoyal",
    borderTop: "border-t-accentRoyal",
    iconColor: "text-accentRoyal",
    numberColor: "text-accentRoyal/25",
  },
  {
    year: "2025",
    title: "Scaling Up",
    description:
      "Secured seed funding, scaled the REST API to support platform growth, established international partnerships, and continued innovation.",
    icon: Music2,
    accentBar: "bg-warning",
    borderTop: "border-t-warning",
    iconColor: "text-warning",
    numberColor: "text-warning/25",
  },
  {
    year: "2026",
    title: "The Platform",
    description:
      "Launched our flagship platform\u2014the one you\u2019re using right now\u2014giving listeners a better way to share music and build a home for their taste.",
    icon: LinkIcon,
    accentBar: "bg-primary",
    borderTop: "border-t-primary",
    iconColor: "text-primary",
    numberColor: "text-primary/25",
  },
];

// --- Showcase Links (live smart-link demo rows) ---

export const showcaseLinks: {
  title: string;
  artist: string;
  href: string;
  kind: "Track" | "Album";
}[] = [
  {
    title: "Stronger",
    artist: "Kanye West",
    href: "/?url=https://open.spotify.com/track/4fzsfWzRhPawzqhX8Qt9F3",
    kind: "Track",
  },
  {
    title: "Time",
    artist: "Pink Floyd",
    href: "/?url=https://music.apple.com/us/album/the-dark-side-of-the-moon/1065973699?i=1065973705",
    kind: "Track",
  },
  {
    title: "Daft Punk is Playing at My House",
    artist: "LCD Soundsystem",
    href: "/?url=https://open.spotify.com/track/3jtvJtAA25a7d0BLOJ8Dqo",
    kind: "Track",
  },
  {
    title: "After Hours",
    artist: "The Weeknd",
    href: "/?url=https://open.spotify.com/album/4yP0hdKOZPNshxUOjY0cZj",
    kind: "Album",
  },
  {
    title: "Currents",
    artist: "Tame Impala",
    href: "/?url=https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv",
    kind: "Album",
  },
  {
    title: "Feels Like Summer",
    artist: "Childish Gambino",
    href: "/?url=https://open.spotify.com/track/5UH5s7VwbSkFExIl1oqNux",
    kind: "Track",
  },
];

// --- Identity Tiles (used in the Music Identity section) ---

export const identityTiles = [
  { title: "Playlists", desc: "Summer Vibes, Chill Study" },
  { title: "Top Artists", desc: "The Weeknd, Tame Impala" },
  { title: "Recent Tracks", desc: "LCD Soundsystem, Flipturn" },
  { title: "Albums", desc: "After Hours, Currents" },
];

// --- Liner Notes (stat strip at the top of the content sheet) ---

export const linerNotes = [
  { value: "\u221E", label: "Music Connections" },
  { value: "100%", label: "Free to Start" },
  { value: "2022", label: "Founded" },
];
