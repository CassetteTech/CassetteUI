import type { Metadata } from "next";
import { DEFAULT_SOCIAL_PREVIEW } from "@/lib/seo";

const title = "About Cassette Music — Our Story";
const description = "Meet the independent team building universal music links and social music profiles.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/about' },
  openGraph: { ...DEFAULT_SOCIAL_PREVIEW, title, description },
  twitter: { ...DEFAULT_SOCIAL_PREVIEW, title, description },
};

export default function AboutLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
