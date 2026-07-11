import type { Metadata } from "next";

const title = "Explore Music & Creators — Cassette Music";
const description = "Discover public mixes, MusicLinks, and the creators sharing them on Cassette Music.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description },
  twitter: { title, description },
};

export default function ExploreLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
