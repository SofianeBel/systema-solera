import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { preload } from "react-dom";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Systema Solera",
  description: "A cinematic celestial model system for Sol, Terra, and Luna.",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "oklch(0.025 0 0)",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  preload("/textures/solera/2k_sun.jpg", { as: "image", crossOrigin: "anonymous" });
  preload("/textures/solera/2k_earth_daymap.jpg", { as: "image", crossOrigin: "anonymous" });
  preload("/textures/solera/2k_moon.jpg", { as: "image", crossOrigin: "anonymous" });

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
