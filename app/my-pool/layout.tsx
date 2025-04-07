"use client";

import PageLayout from "@/components/PageLayout";

export default function MyPoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageLayout>{children}</PageLayout>;
}