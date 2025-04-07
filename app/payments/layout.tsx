"use client";

import PageLayout from "../../components/PageLayout";

export default function PaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageLayout>{children}</PageLayout>;
}