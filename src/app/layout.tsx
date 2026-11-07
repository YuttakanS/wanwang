import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "🍻 วันว่าง - โหวตวันว่างหาตี้ทริป",
  description: "ช่วยกันลงวันว่างด่วนๆ หาเสาร์-อาทิตย์ที่คนพร้อมสุดแล้วล็อคคิวเปิดตี้ทริปกันเลย!",
  openGraph: {
    title: "🍻 วันว่าง - โหวตวันว่าง",
    description: "ช่วยกันลงวันว่างด่วนๆ หาเสาร์-อาทิตย์ที่คนพร้อมสุดแล้วล็อคคิวเปิดตี้!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
