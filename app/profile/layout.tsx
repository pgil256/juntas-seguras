"use client";

import PageLayout from "../../components/PageLayout";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageLayout>{children}</PageLayout>;
}