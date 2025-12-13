import React from "react";
import type { Metadata, Viewport } from "next";
import { Providers } from "@/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tank.io: Next Gen",
  description: "High-performance modular tank shooter.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050508"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full w-full overflow-hidden">
      <body className="h-full w-full overflow-hidden bg-[#1a1a1a]">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}