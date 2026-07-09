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
  metadataBase: new URL("https://juntas-seguras.vercel.app"),
  applicationName: "Juntas Seguras",
  title: {
    default: "Juntas Seguras — Transparent Community Savings",
    template: "%s | Juntas Seguras",
  },
  description:
    "A full-stack platform for secure, transparent community savings pools, with MFA, audit logging, contribution tracking, and coordinated payouts.",
  authors: [{ name: "Patrick Gilhooley", url: "https://github.com/pgil256" }],
  creator: "Patrick Gilhooley",
  category: "technology",
  alternates: { canonical: "/" },
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
    title: "Juntas Seguras — Transparent Community Savings",
    description:
      "A full-stack fintech case study for secure, auditable community savings pools.",
    url: "https://juntas-seguras.vercel.app",
    siteName: "Juntas Seguras",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Juntas Seguras — Transparent Community Savings",
    description:
      "A full-stack fintech case study for secure, auditable community savings pools.",
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
