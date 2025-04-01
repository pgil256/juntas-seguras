// app/layout.tsx
"use client";

import { useEffect, useState } from "react";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Use a state to track if we're rendering on the client
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // This only runs on the client, after hydration
    setIsMounted(true);
    document.documentElement.className = `${geistSans.variable} ${geistMono.variable} antialiased`;
  }, []);

  // Render a simple loading state or nothing on server-side render
  if (!isMounted) {
    return (
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <div className="min-h-screen flex items-center justify-center">
            Loading...
          </div>
        </body>
      </html>
    );
  }

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
