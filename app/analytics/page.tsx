// app/analytics/page.tsx
"use client";

import React from "react";
import Navbar from "../../components/Navbar";
import PoolAnalyticsDashboard from "../../components/analytics/PoolAnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <PoolAnalyticsDashboard />
      </main>
    </div>
  );
}
