import type { Metadata } from "next";
import { DM_Sans, Newsreader } from "next/font/google";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TruthLens",
  description:
    "Explainable credibility analysis for headlines, articles, and online claims.",
  icons: {
    icon: "/TruthLens.png",
    apple: "/TruthLens.png",
    shortcut: "/TruthLens.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${newsreader.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
