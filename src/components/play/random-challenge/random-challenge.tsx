"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Shuffle, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { GameShell } from "@/components/play/game-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type { Challenge, ChallengeCompletion, Game, Profile } from "@/lib/database.types";

const CATEGORIES = ["funny", "creative", "romantic", "random", "competitive", "flirty"];

export function RandomChallenge({ game, profile }: { game: Game; profile: Profile; partner: Profile }) {
  const supabase = createClient();
  const { push } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [current, setCurrent] = useState<Challenge | null>(null);
  const [history, setHistory] = useState<(ChallengeCompletion & { challenge: Challenge | null })[]>([]);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  async function loadHistory() {
    const { data } = await supabase
      .from("challenge_completions")
      .select("*, challenge:challenges(*)")
      .order("completed_at", { ascending: false })
      .limit(10);
    setHistory((data as unknown as (ChallengeCompletion & { challenge: Challenge | null })[]) ?? []);
  }

  useEffect(() => {
    supabase
      .from("challenges")
      .select("*")
      .then(({ data }) => {
        setChallenges(data ?? []);
        setLoading(false);
      });
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function generate() {
    const pool = category === "all" ? challenges : challenges.filter((c) => c.category === category);
    if (pool.length === 0) return;
    setCurrent(pool[Math.floor(Math.random() * pool.length)]);
  }

  async function respond(status: "completed" | "skipped") {
    if (!current) return;
    await supabase.from("challenge_completions").insert({ challenge_id: current.id, user_id: profile.id, status });
    if (status === "completed") {
      await logActivity(supabase, {
        actionType: "challenge_completed",
        description: `${profile.display_name} completed a random challenge.`,
        targetType: "game_session",
      });
      push("Challenge completed.", "success");
    }
    setCurrent(null);
    loadHistory();
  }

  return (
    <GameShell game={game}>
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory("all")}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
            category === "all" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent-soft"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
              category === c ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent-soft"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {current ? (
          <motion.div key={current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card className="flex min-h-56 flex-col items-center justify-center gap-4 p-8 text-center">
              <Badge tone="accent">{current.category}</Badge>
              <p className="font-serif-display text-2xl leading-snug">{current.prompt}</p>
            </Card>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => respond("skipped")}>
                <X className="h-4 w-4" /> Skip
              </Button>
              <Button className="flex-1" onClick={() => respond("completed")}>
                <Check className="h-4 w-4" /> Completed
              </Button>
            </div>
          </motion.div>
        ) : (
          <Card className="flex min-h-56 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading challenges…" : "Get a small dare for right now."}
            </p>
            <Button size="lg" onClick={generate} disabled={loading}>
              <Shuffle className="h-4 w-4" /> Get a challenge
            </Button>
          </Card>
        )}
      </AnimatePresence>

      <div className="mt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</p>
        {history.length === 0 ? (
          <EmptyState title="No challenges yet." description="Generate your first one above." />
        ) : (
          <Card className="divide-y divide-border">
            {history.map((h) => (
              <div key={h.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  {h.status === "completed" ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                  ) : (
                    <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <p className="text-sm text-foreground/90">{h.challenge?.prompt}</p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(h.completed_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </GameShell>
  );
}
