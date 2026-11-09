import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai, Space_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import ZoomLock from "@/components/ZoomLock";
import { I18nProvider } from "@/lib/i18n";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // middleware.ts passes its CSP on this request header, so the inline script can carry its nonce.
  const csp = (await headers()).get("content-security-policy");
  const nonce = csp?.match(/'nonce-([^']+)'/)?.[1];

  return (
    // The init script sets data-theme before React loads, which React would otherwise report.
    <html lang="th" className={`scroll-smooth ${plexThai.variable} ${spaceMono.variable}`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-surface text-ink min-h-screen">
        <ZoomLock />
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
