import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "../components/ui/toaster";
import { Providers } from "./providers";
import { MobileBottomNav } from "../components/MobileBottomNav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Juntas Seguras - Secure Community Savings Pools",
    template: "%s | Juntas Seguras",
  },
  description:
    "Create and manage secure, transparent savings pools with friends, family, and community members. Track contributions, manage payouts, and build wealth together.",
  keywords: [
    "savings pool",
    "community savings",
    "tanda",
    "rosca",
    "junta",
    "group savings",
    "financial management",
  ],
  openGraph: {
    title: "Juntas Seguras - Secure Community Savings Pools",
    description:
      "Save together, build wealth as a community. Create transparent savings pools with friends and family.",
    url: "https://juntas-seguras.vercel.app",
    siteName: "Juntas Seguras",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Juntas Seguras - Secure Community Savings Pools",
    description:
      "Save together, build wealth as a community. Create transparent savings pools with friends and family.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <Providers>
          {children}
          <MobileBottomNav />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}