"use client";

import PageLayout from "@/components/PageLayout";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageLayout>{children}</PageLayout>;
}