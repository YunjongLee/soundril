"use client";

import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="pt-14 lg:pt-0 lg:pl-64">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
