"use client";

import PageLayout from "@/components/PageLayout";

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageLayout>{children}</PageLayout>;
}