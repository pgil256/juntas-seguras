"use client";

import PageLayout from "@/components/PageLayout";

export default function ProfileSecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageLayout>{children}</PageLayout>;
}