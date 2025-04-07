"use client";

import PageLayout from "@/components/PageLayout";

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageLayout>{children}</PageLayout>;
}