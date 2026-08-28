"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Settings, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

const PRIMARY = NAV_ITEMS.slice(0, 4);
const OVERFLOW = NAV_ITEMS.slice(4);

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const overflowActive = OVERFLOW.some((i) => i.href === pathname);

  return (
    <>
      <nav className="dark-section fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/97 backdrop-blur-sm lg:hidden">
        <div className="flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)]">
          {PRIMARY.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
              >
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" />}
                <item.icon
                  className={cn("h-5 w-5", active ? "text-accent" : "text-muted-foreground")}
                  strokeWidth={active ? 2 : 1.5}
                />
                <span className={cn("text-[10px] font-medium", active ? "text-accent" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
          >
            {overflowActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" />}
            <Menu className={cn("h-5 w-5", overflowActive ? "text-accent" : "text-muted-foreground")} strokeWidth={overflowActive ? 2 : 1.5} />
            <span className={cn("text-[10px] font-medium", overflowActive ? "text-accent" : "text-muted-foreground")}>
              More
            </span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[#241e1b]/50 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="dark-section fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border bg-background p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] lg:hidden"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="font-serif-display text-xl italic">More</span>
                <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-foreground/5">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[...OVERFLOW, { href: "/settings", label: "Settings", icon: Settings, number: "•" }].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-none border-b-2 px-3 py-4 text-center transition-colors",
                      pathname === item.href ? "border-accent" : "border-border/60"
                    )}
                  >
                    <item.icon
                      className={cn("h-5 w-5", pathname === item.href ? "text-accent" : "text-foreground/70")}
                      strokeWidth={1.6}
                    />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
