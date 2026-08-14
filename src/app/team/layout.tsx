import type { Metadata } from "next";
import { DEFAULT_SOCIAL_PREVIEW } from "@/lib/seo";

const title = "Meet the Cassette Music Team";
const description = "Meet the people building Cassette Music and universal MusicLinks.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/team' },
  openGraph: { ...DEFAULT_SOCIAL_PREVIEW, title, description },
  twitter: { ...DEFAULT_SOCIAL_PREVIEW, title, description },
};

export default function TeamLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
