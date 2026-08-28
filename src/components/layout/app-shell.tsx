"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ToastProvider } from "@/components/ui/toast";
import { PresenceProvider } from "@/lib/presence-context";
import type { Profile } from "@/lib/database.types";

export function AppShell({
  profile,
  partner,
  avatarUrl,
  children,
}: {
  profile: Profile;
  partner: Profile;
  avatarUrl: string | null;
  children: ReactNode;
}) {
  return (
    <PresenceProvider profile={profile} partner={partner}>
      <ToastProvider>
        <div className="flex min-h-screen">
          <Sidebar avatarUrl={avatarUrl} />
          <div className="flex min-h-screen flex-1 flex-col">
            <main className="flex-1 pb-24 lg:pb-0">{children}</main>
          </div>
        </div>
        <BottomNav />
      </ToastProvider>
    </PresenceProvider>
  );
}
