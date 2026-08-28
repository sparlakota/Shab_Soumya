"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { usePresenceContext } from "@/lib/presence-context";

export function Sidebar({ avatarUrl }: { avatarUrl: string | null }) {
  const pathname = usePathname();
  const { profile, partner } = usePresenceContext();

  return (
    <>
      {/* Reserves layout space so the overlay-expanding aside never shifts page content. */}
      <div className="hidden w-20 shrink-0 lg:block" aria-hidden="true" />

      <aside
        className="dark-section group fixed left-0 top-0 z-30 hidden h-screen w-20 flex-col items-start overflow-hidden border-r border-border bg-background py-6 transition-[width] duration-300 ease-out hover:w-64 hover:shadow-2xl lg:flex"
      >
        <Link href="/" className="mb-2 flex w-full items-center gap-3 px-[27px]">
          <span className="shrink-0 font-serif-display text-lg italic text-accent">S&amp;S</span>
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-300 group-hover:max-w-[140px] group-hover:opacity-100">
            Between Us
          </span>
        </Link>
        <div className="mb-8 ml-[27px] h-px w-8 bg-border" />

        <nav className="flex w-full flex-1 flex-col gap-1.5 px-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex h-11 w-full items-center gap-3 rounded-full pl-[13px] transition-colors",
                  active ? "bg-accent/15 text-accent" : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute -left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
                )}
                <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
                <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-300 group-hover:max-w-[160px] group-hover:opacity-100">
                  <span className="mr-1.5 text-xs text-muted-foreground">{item.number}</span>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mb-4 ml-[27px] h-px w-8 bg-border" />
        <Link
          href="/settings"
          className="flex w-full items-center gap-3 rounded-full px-3 py-2 transition-colors hover:bg-foreground/5"
        >
          <Avatar src={avatarUrl} name={profile.display_name} size={38} online={profile.is_online} className="shrink-0" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:max-w-[160px] group-hover:opacity-100">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              {profile.display_name} <Settings className="h-3 w-3 text-muted-foreground" />
            </span>
            <span className="block text-xs text-muted-foreground">
              {partner.display_name} is {partner.is_online ? "online" : "offline"}
            </span>
          </span>
        </Link>
      </aside>
    </>
  );
}
