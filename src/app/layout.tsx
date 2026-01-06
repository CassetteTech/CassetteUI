import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Flex, Atkinson_Hyperlegible, Teko } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/providers/providers";
import { Layout } from "@/components/layout/layout";
import { Toaster } from "@/components/ui/sonner";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoFlex.variable} ${atkinsonHyperlegible.variable} ${teko.variable}`} suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
        <Script 
          src="https://js-cdn.music.apple.com/musickit/v3/musickit.js" 
          strategy="beforeInteractive"
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>
          <Layout>
            {children}
          </Layout>
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
