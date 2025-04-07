"use client";

import PageLayout from "@/components/PageLayout";

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageLayout>{children}</PageLayout>;
}