import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Playfair_Display, Noto_Serif_Devanagari } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});
const devanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-deva",
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "न्याहारी — Tea & Snacks Centre",
  description: "Nyahari Tea & Snacks Centre — Order, track, and manage.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nyahari",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#2D0A0A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${jakarta.variable} ${playfair.variable} ${devanagari.variable} h-full antialiased`}>
        {children}
      </body>
    </html>
  );
}
