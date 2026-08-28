"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/database.types";

const PresenceContext = createContext<{ profile: Profile; partner: Profile } | null>(null);

/** Single source of truth for online/offline state, provided once from
 * AppShell. Avoids every page opening its own duplicate realtime
 * subscription for the same two profile rows.
 *
 * Note: Supabase's query/RPC builders are lazy — a call is only sent once
 * it's awaited or `.then()`'d, so every fire-and-forget call here is
 * deliberately chained with `.then()`. */
export function PresenceProvider({
  profile,
  partner: initialPartner,
  children,
}: {
  profile: Profile;
  partner: Profile;
  children: ReactNode;
}) {
  const [partner, setPartner] = useState(initialPartner);
  const [selfOnline, setSelfOnline] = useState(profile.is_online);

  useEffect(() => {
    const supabase = createClient();

    const setOnline = (online: boolean) => {
      setSelfOnline(online);
      return supabase.rpc("touch_presence", { p_online: online }).then();
    };

    setOnline(true);

    const onVisibility = () => setOnline(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") setOnline(true);
    }, 45000);

    const handleUnload = () => setOnline(false);
    window.addEventListener("beforeunload", handleUnload);

    const channel = supabase
      .channel(`presence-${initialPartner.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${initialPartner.id}` },
        (payload) => setPartner(payload.new as Profile)
      )
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", handleUnload);
      clearInterval(interval);
      setOnline(false);
      supabase.removeChannel(channel);
    };
  }, [initialPartner.id]);

  const liveProfile: Profile = { ...profile, is_online: selfOnline };

  return <PresenceContext.Provider value={{ profile: liveProfile, partner }}>{children}</PresenceContext.Provider>;
}

export function usePresenceContext() {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error("usePresenceContext must be used within PresenceProvider");
  return ctx;
}
