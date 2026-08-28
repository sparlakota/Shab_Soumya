"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PEOPLE = [
  { username: "shab", label: "Shab", email: process.env.NEXT_PUBLIC_SHAB_EMAIL },
  { username: "soumya", label: "Soumya", email: process.env.NEXT_PUBLIC_SOUMYA_EMAIL },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<(typeof PEOPLE)[number] | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected?.email) {
      setError("This account isn't configured yet — set NEXT_PUBLIC_SHAB_EMAIL / NEXT_PUBLIC_SOUMYA_EMAIL in .env.local.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: selected.email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("That password doesn't look right. Try again.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="dark-section relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      {/* faint decorative coordinates / stars, purely atmospheric */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.5]">
        <span className="label-eyebrow absolute left-6 top-8 tracking-[0.3em] sm:left-12 sm:top-12">EST. 2026</span>
        <span className="label-eyebrow absolute right-6 top-8 tracking-[0.3em] sm:right-12 sm:top-12">12.87°N, 74.79°E</span>
        <span className="mark-dot absolute left-[15%] top-[22%] text-accent-soft" />
        <span className="mark-dot absolute right-[18%] top-[35%] text-accent-soft" />
        <span className="mark-dot absolute left-[22%] bottom-[28%] text-accent-soft" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-12 text-center">
          <p className="label-eyebrow mb-4">S&amp;S · Private Space · 2026</p>
          <h1 className="font-serif-display text-5xl font-medium leading-[0.95] tracking-tight sm:text-6xl">
            BETWEEN
            <br />
            <span className="italic text-accent">US</span>
          </h1>
          <p className="mt-5 text-sm italic text-muted-foreground">
            Our little corner of the internet.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {PEOPLE.map((p) => (
              <button
                type="button"
                key={p.username}
                onClick={() => {
                  setSelected(p);
                  setError(null);
                }}
                className={cn(
                  "rounded-none border-b-2 px-4 py-5 text-center transition-all duration-200",
                  selected?.username === p.username
                    ? "border-accent bg-foreground/[0.03]"
                    : "border-border/60 hover:border-accent-soft"
                )}
              >
                <span
                  className={cn(
                    "font-serif-display text-lg",
                    selected?.username === p.username ? "text-accent" : "text-foreground"
                  )}
                >
                  {p.label}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="relative pt-1">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    autoFocus
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p className="animate-fade-in text-center text-sm text-danger">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={!selected || !password || loading}
            className="w-full"
          >
            {loading ? "Entering…" : "Enter"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
