import type { Metadata } from "next";

const title = "Meet the Cassette Music Team";
const description = "Meet the people building Cassette Music and universal MusicLinks.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description },
  twitter: { title, description },
};

export default function TeamLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
