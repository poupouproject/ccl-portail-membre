"use client";

import { Authenticated, useGetIdentity, usePermissions } from "@refinedev/core";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AppHeader } from "@/components/layout/app-header";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { NotificationPrompt } from "@/components/notifications/notification-prompt";
import { Bike, Loader2 } from "lucide-react";

function AuthenticatedContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar Desktop */}
      <DesktopSidebar />

      {/* Contenu principal */}
      <div className="lg:pl-64">
        {/* Header */}
        <AppHeader />

        {/* Main content */}
        <main className="pb-20 lg:pb-6">
          {/* Mobile: Container étroit */}
          <div className="lg:hidden container mx-auto px-4 py-4 max-w-lg">
            {children}
          </div>

          {/* Desktop: Container large avec padding */}
          <div className="hidden lg:block px-8 py-6">
            {children}
          </div>
        </main>

        {/* Bottom nav mobile uniquement */}
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>

      <NotificationPrompt />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Bike className="h-12 w-12 text-club-orange animate-pulse" />
        <Loader2 className="h-8 w-8 animate-spin text-club-orange" />
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Authenticated
      key="authenticated-layout"
      redirectOnFail="/login"
      loading={<LoadingScreen />}
    >
      <AuthenticatedContent>{children}</AuthenticatedContent>
    </Authenticated>
  );
}
