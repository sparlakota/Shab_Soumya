"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy } from "lucide-react";

export function UnlockToast({ names }: { names: string[] }) {
  const [visible, setVisible] = useState(names.length > 0);

  useEffect(() => {
    if (names.length === 0) return;
    const timer = setTimeout(() => setVisible(false), 3800);
    return () => clearTimeout(timer);
  }, [names]);

  return (
    <AnimatePresence>
      {visible && names.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-24 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:bottom-8"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-accent-soft bg-card px-5 py-4 shadow-xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
              <Trophy className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Achievement unlocked</p>
              <p className="font-serif-display text-base">{names.join(", ")}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
