import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Comix API — Unofficial Manga REST API",
  description: "A lightning-fast edge API proxy for Comix.to. Search, browse, and read manga with a clean JSON REST API. Supports SFW filtering, image proxying, and full feature parity.",
  openGraph: {
    title: "Comix API — Unofficial Manga REST API",
    description: "A lightning-fast edge API proxy for Comix.to. Search, browse, and read manga with a clean JSON REST API.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
