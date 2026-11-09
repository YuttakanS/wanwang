import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Space_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

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

export const metadata: Metadata = {
  title: "วันว่าง // WanWang",
  description: "ระบบหาเวลานัดตรงกันง่ายๆ ในไม่กี่วินาที ไม่ต้องสมัครสมาชิก",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`scroll-smooth ${plexThai.variable} ${spaceMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="bg-white text-black min-h-screen">
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
