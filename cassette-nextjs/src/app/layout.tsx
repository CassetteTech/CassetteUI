import type { Metadata } from "next";
import { Inter, Roboto_Flex, Atkinson_Hyperlegible, Teko } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/providers";
import { Layout } from "@/components/layout/layout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const robotoFlex = Roboto_Flex({
  subsets: ["latin"],
  variable: "--font-roboto-flex",
});

const atkinsonHyperlegible = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
});

const teko = Teko({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-teko",
});

export const metadata: Metadata = {
  title: "Cassette - Share Your Music",
  description: "Share your favorite music across all platforms. Connect with friends and discover new tunes.",
  keywords: ["music", "social", "spotify", "apple music", "deezer", "sharing"],
  authors: [{ name: "Cassette Team" }],
  openGraph: {
    title: "Cassette - Share Your Music",
    description: "Share your favorite music across all platforms. Connect with friends and discover new tunes.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cassette - Share Your Music",
    description: "Share your favorite music across all platforms. Connect with friends and discover new tunes.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoFlex.variable} ${atkinsonHyperlegible.variable} ${teko.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>
          <Layout>
            {children}
          </Layout>
        </Providers>
      </body>
    </html>
  );
}
