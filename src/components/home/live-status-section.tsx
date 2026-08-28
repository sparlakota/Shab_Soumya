"use client";

import { usePresenceContext } from "@/lib/presence-context";
import { StatusCard } from "@/components/home/status-card";

export function LiveStatusSection({ avatarA, avatarB }: { avatarA: string | null; avatarB: string | null }) {
  const { profile, partner } = usePresenceContext();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <StatusCard profile={profile} avatarUrl={avatarA} isYou />
      <StatusCard profile={partner} avatarUrl={avatarB} isYou={false} />
    </div>
  );
}
