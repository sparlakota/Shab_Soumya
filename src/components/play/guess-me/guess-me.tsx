"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Check, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSimultaneousRound } from "@/hooks/use-simultaneous-round";
import { logActivity } from "@/lib/activity";
import { GameShell } from "@/components/play/game-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Game, GameQuestion, Profile } from "@/lib/database.types";

const CATEGORIES = ["funny", "personality", "preferences", "relationship", "deep", "random"];

export function GuessMe({ game, profile, partner }: { game: Game; profile: Profile; partner: Profile }) {
  const round = useSimultaneousRound({ gameId: game.id, profile, partner });
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");
  const [starting, setStarting] = useState(false);
  const [answerDraft, setAnswerDraft] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("game_questions")
      .select("*")
      .eq("game_id", game.id)
      .then(({ data }) => setQuestions(data ?? []));
  }, [game.id]);

  function pickRandom(cat: string | null) {
    const pool = cat ? questions.filter((q) => q.category === cat) : questions;
    if (pool.length === 0) return;
    setPreview(pool[Math.floor(Math.random() * pool.length)].prompt);
  }

  async function handleStart() {
    const question = customMode ? customText.trim() : preview;
    if (!question) return;
    setStarting(true);
    try {
      await round.createRound(question, customMode ? "custom" : category);
      const supabase = createClient();
      await logActivity(supabase, {
        actionType: "game_started",
        description: `${profile.display_name} started a round of Guess Me.`,
        targetType: "game_session",
      });
    } finally {
      setStarting(false);
    }
  }

  if (round.loading) {
    return (
      <GameShell game={game}>
        <Skeleton className="h-48 w-full" />
      </GameShell>
    );
  }

  if (round.phase === "idle") {
    return (
      <GameShell game={game}>
        <Card className="p-6">
          <p className="mb-4 text-sm font-medium text-muted-foreground">Pick a category</p>
          <div className="mb-6 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCategory(c);
                  setCustomMode(false);
                  pickRandom(c);
                }}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                  category === c && !customMode
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:border-accent-soft"
                }`}
              >
                {c}
              </button>
            ))}
            <button
              onClick={() => setCustomMode(true)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                customMode ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent-soft"
              }`}
            >
              Write my own
            </button>
          </div>

          {customMode ? (
            <Input
              placeholder="What do you think Soumya would choose as a superpower?"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
            />
          ) : preview ? (
            <div className="rounded-xl border border-border bg-background p-5 text-center">
              <p className="font-serif-display text-xl">{preview}</p>
              <button onClick={() => pickRandom(category)} className="mt-3 text-xs font-medium text-accent hover:underline">
                Shuffle another
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Choose a category to get a question.</p>
          )}

          <Button
            className="mt-6 w-full"
            size="lg"
            disabled={(!customMode && !preview) || (customMode && !customText.trim()) || starting}
            onClick={handleStart}
          >
            {starting ? "Starting…" : "Start this round"}
          </Button>
        </Card>
      </GameShell>
    );
  }

  if (round.phase === "waiting") {
    return (
      <GameShell game={game}>
        <Card className="flex flex-col items-center gap-4 p-8 text-center">
          <Users className="h-8 w-8 text-accent" strokeWidth={1.5} />
          {round.isCreator ? (
            <>
              <p className="font-serif-display text-lg">Waiting for {partner.display_name} to join…</p>
              <p className="text-sm text-muted-foreground">“{round.session?.custom_question}”</p>
              <Button variant="outline" onClick={round.abandonRound}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <p className="font-serif-display text-lg">A round is waiting</p>
              <p className="text-sm text-muted-foreground">“{round.session?.custom_question}”</p>
              <Button onClick={round.joinRound}>Join round</Button>
            </>
          )}
        </Card>
      </GameShell>
    );
  }

  if (round.phase === "active") {
    if (round.myAnswer) {
      return (
        <GameShell game={game}>
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <Check className="h-8 w-8 text-success" strokeWidth={1.5} />
            <p className="font-serif-display text-lg">Answer locked.</p>
            <p className="text-sm text-muted-foreground">Waiting for {partner.display_name}…</p>
          </Card>
        </GameShell>
      );
    }
    return (
      <GameShell game={game}>
        <Card className="p-6">
          <p className="mb-5 text-center font-serif-display text-xl">{round.session?.custom_question}</p>
          <div className="flex gap-2">
            <Input
              value={answerDraft}
              onChange={(e) => setAnswerDraft(e.target.value)}
              placeholder="Your answer"
              autoFocus
            />
            <Button disabled={!answerDraft.trim()} onClick={() => round.submitAnswer(answerDraft.trim())}>
              Lock in
            </Button>
          </div>
        </Card>
      </GameShell>
    );
  }

  if (round.phase === "revealing") {
    return (
      <GameShell game={game}>
        <div className="flex flex-col items-center justify-center gap-3 p-16">
          <AnimatePresence mode="wait">
            <motion.p
              key={round.revealCountdown}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.4 }}
              transition={{ duration: 0.3 }}
              className="font-serif-display text-7xl text-accent"
            >
              {round.revealCountdown}
            </motion.p>
          </AnimatePresence>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Revealing</p>
        </div>
      </GameShell>
    );
  }

  const isMatch =
    round.myAnswer && round.partnerAnswer
      ? round.myAnswer.answer.trim().toLowerCase() === round.partnerAnswer.answer.trim().toLowerCase()
      : false;

  return (
    <GameShell game={game}>
      <div className="animate-fade-slide-up space-y-4">
        <p className="text-center text-sm text-muted-foreground">“{round.session?.custom_question}”</p>
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-5 text-center">
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{profile.display_name}</p>
            <p className="font-serif-display text-lg">{round.myAnswer?.answer}</p>
          </Card>
          <Card className="p-5 text-center">
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{partner.display_name}</p>
            <p className="font-serif-display text-lg">{round.partnerAnswer?.answer}</p>
          </Card>
        </div>
        {isMatch ? (
          <div className="flex items-center justify-center gap-2 font-serif-display text-xl text-accent">
            <Sparkles className="h-5 w-5" /> +1 — Mind readers.
          </div>
        ) : (
          <p className="text-center font-serif-display text-xl text-muted-foreground">Not quite this time.</p>
        )}
        <Button className="w-full" size="lg" onClick={round.reset}>
          Play again
        </Button>
      </div>
    </GameShell>
  );
}
