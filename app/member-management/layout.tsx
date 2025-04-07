"use client";

import PageLayout from "../../components/PageLayout";

export default function MemberManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageLayout>{children}</PageLayout>;
}