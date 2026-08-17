import type { Metadata } from "next";
import { DEFAULT_SOCIAL_PREVIEW } from "@/lib/seo";

const title = "Explore Music & Creators — Cassette Music";
const description = "Discover public mixes, MusicLinks, and the creators sharing them on Cassette Music.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/explore' },
  openGraph: { ...DEFAULT_SOCIAL_PREVIEW, title, description },
  twitter: { ...DEFAULT_SOCIAL_PREVIEW, title, description },
};

export default function ExploreLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
