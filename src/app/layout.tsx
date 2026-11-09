import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai, Space_Mono } from "next/font/google";
import "./globals.css";
import ZoomLock from "@/components/ZoomLock";
import { I18nProvider } from "@/lib/i18n";
import { OPEN_GRAPH_BASE, SITE_DESCRIPTION, SITE_TITLE, TWITTER_BASE } from "@/lib/siteMetadata";

// next/font downloads these at build time and serves them from this origin.
const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-plex-thai",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

// A prerendered page has no per-request nonce, so the CSP in middleware would block its scripts.
export const dynamic = "force-dynamic";

// Zooming is off by request. iOS ignores these values, see ZoomLock and touch-action in globals.css.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  // When unset, Next falls back to the Vercel production URL, then localhost.
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: { default: SITE_TITLE, template: "%s | วันว่าง" },
  description: SITE_DESCRIPTION,
  openGraph: { ...OPEN_GRAPH_BASE, title: SITE_TITLE, description: SITE_DESCRIPTION },
  twitter: { ...TWITTER_BASE, title: SITE_TITLE, description: SITE_DESCRIPTION },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`scroll-smooth ${plexThai.variable} ${spaceMono.variable}`}>
      <body className="bg-white text-black min-h-screen">
        <ZoomLock />
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
