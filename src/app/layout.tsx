import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai, Space_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import WebAnalytics from "@/components/WebAnalytics";
import { I18nProvider } from "@/lib/i18n";
import { MY_EVENTS_SPACE_SCRIPT } from "@/lib/myEventsSpace";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { OPEN_GRAPH_BASE, SITE_DESCRIPTION, SITE_TITLE, TWITTER_BASE } from "@/lib/siteMetadata";

// next/font downloads these at build time and serves them from this origin.
const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-plex-thai",
  display: "swap",
  // next/font's own size-adjusted fallback is Arial, which has no Thai, so until Plex arrives Thai
  // comes from a system font and lines wrap differently. These faces in globals.css scale that font.
  fallback: ["Thai Fallback Tahoma", "Thai Fallback Noto"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

// A prerendered page has no per-request nonce, so the CSP in middleware would block its scripts.
export const dynamic = "force-dynamic";

// No maximum-scale or user-scalable=no: people must be able to zoom (WCAG 1.4.4).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
    // The init script sets data-theme and the space for "My events" before React loads, which React would otherwise report.
    <html lang="th" className={`scroll-smooth ${plexThai.variable} ${spaceMono.variable}`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT + MY_EVENTS_SPACE_SCRIPT }} />
      </head>
      <body className="bg-surface text-ink min-h-screen">
        <I18nProvider>
          {children}
        </I18nProvider>
        {/* The script is served by Vercel itself, so it exists only there. */}
        {process.env.VERCEL ? <WebAnalytics /> : null}
      </body>
    </html>
  );
}
