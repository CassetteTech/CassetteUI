import type { Metadata } from "next";

const title = "About Cassette Music — Our Story";
const description = "Meet the independent team building universal music links and social music profiles.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description },
  twitter: { title, description },
};

export default function AboutLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
