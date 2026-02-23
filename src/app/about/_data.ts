import {
  Stars,
  Zap,
  Radio,
  Music2,
  Link as LinkIcon,
  UserSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// --- Section Color Config (mirrors team _data.ts TypeConfig pattern) ---

export interface SectionColorConfig {
  accentBar: string;
  numberColor: string;
  iconColor: string;
  iconBg: string;
}

export const sectionColors: Record<string, SectionColorConfig> = {
  hero: {
    accentBar: "bg-primary",
    numberColor: "text-primary/25",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  problem: {
    accentBar: "bg-accentTeal",
    numberColor: "text-accentTeal/25",
    iconColor: "text-accentTeal",
    iconBg: "bg-accentTeal/10",
  },
  support: {
    accentBar: "bg-primary",
    numberColor: "text-primary/25",
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
  },
  showcase: {
    accentBar: "bg-warning",
    numberColor: "text-warning/25",
    iconColor: "text-warning",
    iconBg: "bg-warning/10",
  },
  vision: {
    accentBar: "bg-accentTeal",
    numberColor: "text-accentTeal/25",
    iconColor: "text-accentTeal",
    iconBg: "bg-accentTeal/10",
  },
  supporters: {
    accentBar: "bg-warning",
    numberColor: "text-warning/25",
    iconColor: "text-warning",
    iconBg: "bg-warning/10",
  },
};

// --- Hero Preview Links ---

export const heroPreviewLinks = [
  {
    title: "Stronger",
    artist: "Kanye West",
    href: "/post?url=https://open.spotify.com/track/4fzsfWzRhPawzqhX8Qt9F3",
    badge: "Spotify \u2192 Universal",
  },
  {
    title: "Time",
    artist: "Pink Floyd",
    href: "/post?url=https://music.apple.com/us/album/the-dark-side-of-the-moon/1065973699?i=1065973705",
    badge: "Apple Music \u2192 Universal",
  },
  {
    title: "Daft Punk is Playing at My House",
    artist: "LCD Soundsystem",
    href: "/post?url=https://open.spotify.com/track/3jtvJtAA25a7d0BLOJ8Dqo",
    badge: "Dance / Electronic",
  },
  {
    title: "After Hours",
    artist: "The Weeknd",
    href: "/post?url=https://open.spotify.com/album/4yP0hdKOZPNshxUOjY0cZj",
    badge: "Full Album",
  },
];

// --- Timeline Milestones ---

export interface Milestone {
  number: string;
  year: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accentBar: string;
  iconColor: string;
  numberColor: string;
}

export const milestones: Milestone[] = [
  {
    number: "01",
    year: "2020",
    title: "The Spark",
    description:
      "Co-founders met at American University, frustrated by the inability to share music across platforms. The idea for Cassette was born.",
    icon: Stars,
    accentBar: "bg-primary",
    iconColor: "text-primary",
    numberColor: "text-primary/25",
  },
  {
    number: "02",
    year: "2021",
    title: "Building the Foundation",
    description:
      "Pitched into American University\u2019s accelerator program. Built initial prototype and assembled our founding team of engineers and marketers.",
    icon: Zap,
    accentBar: "bg-accentTeal",
    iconColor: "text-accentTeal",
    numberColor: "text-accentTeal/25",
  },
  {
    number: "03",
    year: "2022",
    title: "Launch & Growth",
    description:
      "Successfully completed crowdfunding campaign. Launched platform publicly and began scaling to thousands of users.",
    icon: Radio,
    accentBar: "bg-accentLilac",
    iconColor: "text-accentLilac",
    numberColor: "text-accentLilac/25",
  },
  {
    number: "04",
    year: "2023\u20132024",
    title: "Scaling Up",
    description:
      "Secured seed funding, scaled REST API to support 65,000+ users, established international partnerships, and continued innovation.",
    icon: Music2,
    accentBar: "bg-warning",
    iconColor: "text-warning",
    numberColor: "text-warning/25",
  },
];

// --- Feature Cards ---

export interface FeatureCard {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
  accentBar: string;
  iconColor: string;
  numberColor: string;
}

export const featureCards: FeatureCard[] = [
  {
    number: "01",
    icon: LinkIcon,
    title: "Universal Music Links",
    description:
      "Drop any URL\u2014Spotify, Apple, YouTube\u2014and get one elegant Cassette link that adapts to every listener.",
    accentBar: "bg-accentTeal",
    iconColor: "text-accentTeal",
    numberColor: "text-accentTeal/25",
  },
  {
    number: "02",
    icon: UserSquare,
    title: "Your Music Identity",
    description:
      "Your profile becomes a home for your taste\u2014playlists, recent finds, top artists\u2014beautifully organized in one place.",
    accentBar: "bg-accentLilac",
    iconColor: "text-accentLilac",
    numberColor: "text-accentLilac/25",
  },
];

// --- Showcase Links ---

export const showcaseLinks = [
  {
    title: "Stronger",
    artist: "Kanye West",
    href: "/post?url=https://open.spotify.com/track/4fzsfWzRhPawzqhX8Qt9F3",
    meta: "Spotify \u2192 Universal",
  },
  {
    title: "Time",
    artist: "Pink Floyd",
    href: "/post?url=https://music.apple.com/us/album/the-dark-side-of-the-moon/1065973699?i=1065973705",
    meta: "Apple \u2192 Universal",
  },
  {
    title: "Daft Punk is Playing at My House",
    artist: "LCD Soundsystem",
    href: "/post?url=https://open.spotify.com/track/3jtvJtAA25a7d0BLOJ8Dqo",
    meta: "Electronic",
  },
  {
    title: "After Hours",
    artist: "The Weeknd",
    href: "/post?url=https://open.spotify.com/album/4yP0hdKOZPNshxUOjY0cZj",
    meta: "Full Album",
  },
  {
    title: "Currents",
    artist: "Tame Impala",
    href: "/post?url=https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv",
    meta: "Psychedelic",
  },
  {
    title: "Feels Like Summer",
    artist: "Childish Gambino",
    href: "/post?url=https://open.spotify.com/track/5UH5s7VwbSkFExIl1oqNux",
    meta: "Hip-Hop/R&B",
  },
];

// --- Identity Tiles (used in Features section) ---

export const identityTiles = [
  { title: "Playlists", desc: "Summer Vibes, Chill Study" },
  { title: "Top Artists", desc: "The Weeknd, Tame Impala" },
  { title: "Recent Tracks", desc: "LCD Soundsystem, Flipturn" },
  { title: "Albums", desc: "After Hours, Currents" },
];

// --- Hero Stats ---

export const heroStats = [
  { value: "65K+", label: "Users Served" },
  { value: "\u221E", label: "Music Connections" },
  { value: "100%", label: "Free to Start" },
];
