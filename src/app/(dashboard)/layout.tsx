"use client";
import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/shell/sidebar";
import { Header } from "@/components/shell/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <AuthGuard>
      <div className="flex min-h-dvh w-full bg-[var(--background)]">
        <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header onMobileToggle={() => setMobileOpen((v) => !v)} />
          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
