"use client";

import PageLayout from "@/components/PageLayout";

export default function CreatePoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageLayout>{children}</PageLayout>;
}