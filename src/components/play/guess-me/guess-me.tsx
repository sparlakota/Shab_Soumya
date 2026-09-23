"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Trophy, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { GameShell } from "@/components/play/game-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Game, GameQuestion, GameSession, GuessMeEntry, Profile } from "@/lib/database.types";

const CATEGORIES = [
  { value: "travel", label: "Travel" },
  { value: "relationship", label: "Relationship" },
  { value: "intimacy", label: "Intimacy" },
  { value: "deep", label: "Deep & Philosophy" },
  { value: "food", label: "Food" },
];

const ROUND_SIZE = 10;

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function GuessMe({ game, profile, partner }: { game: Game; profile: Profile; partner: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [allQuestions, setAllQuestions] = useState<GameQuestion[]>([]);
  const [session, setSession] = useState<GameSession | null>(null);
  const [roundQuestions, setRoundQuestions] = useState<GameQuestion[]>([]);
  const [entries, setEntries] = useState<GuessMeEntry[]>([]);
  const [starting, setStarting] = useState(false);
  // A completed round stays visible (for the reveal) through any late realtime
  // events that arrive after status flips to "completed" — otherwise the next
  // refetch stops matching status=active and the reveal gets yanked back to
  // the category picker mid-read. Play again explicitly dismisses it instead.
  const dismissedSessionId = useRef<string | null>(null);

  const load = useCallback(async () => {
    const { data: openSession } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("game_id", game.id)
      .in("status", ["active", "completed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const current = openSession && openSession.id !== dismissedSessionId.current ? openSession : null;
    setSession(current);

    if (current?.question_ids) {
      const [{ data: qs }, { data: es }] = await Promise.all([
        supabase.from("game_questions").select("*").in("id", current.question_ids),
        supabase.from("guess_me_entries").select("*").eq("session_id", current.id),
      ]);
      const byId = new Map((qs ?? []).map((q) => [q.id, q]));
      setRoundQuestions(current.question_ids.map((id) => byId.get(id)).filter(Boolean) as GameQuestion[]);
      setEntries(es ?? []);
    } else {
      setRoundQuestions([]);
      setEntries([]);
    }
    setLoading(false);
  }, [supabase, game.id]);

  useEffect(() => {
    supabase
      .from("game_questions")
      .select("*")
      .eq("game_id", game.id)
      .then(({ data }) => setAllQuestions(data ?? []));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`guess-me-lobby-${game.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_sessions", filter: `game_id=eq.${game.id}` }, load)
      .subscribe();
    // Safety net alongside the subscription — see the note in use-simultaneous-round.ts.
    const poll = setInterval(load, 4000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [supabase, game.id, load]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`guess-me-session-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guess_me_entries", filter: `session_id=eq.${session.id}` },
        load
      )
      .subscribe();
    const poll = setInterval(load, 4000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [session, supabase, load]);

  const categoriesWithCounts = CATEGORIES.map((c) => ({
    ...c,
    count: allQuestions.filter((q) => q.category === c.value).length,
  }));

  async function startCategory(cat: string) {
    const pool = allQuestions.filter((q) => q.category === cat);
    if (pool.length === 0) return;
    setStarting(true);
    try {
      const picked = shuffled(pool).slice(0, ROUND_SIZE);
      const { data: newSession, error } = await supabase
        .from("game_sessions")
        .insert({
          game_id: game.id,
          status: "active",
          category: cat,
          created_by: profile.id,
          question_ids: picked.map((q) => q.id),
        })
        .select()
        .single();
      if (error || !newSession) throw error;
      setSession(newSession);
      setRoundQuestions(picked);
      setEntries([]);
      await logActivity(supabase, {
        actionType: "game_started",
        description: `${profile.display_name} started a round of Guess Me.`,
        targetType: "game_session",
      });
    } finally {
      setStarting(false);
    }
  }

  async function answer(phase: "self" | "guess", questionId: string, choice: string) {
    if (!session) return;
    await supabase.from("guess_me_entries").insert({ session_id: session.id, question_id: questionId, user_id: profile.id, phase, choice });
    const { data } = await supabase.from("guess_me_entries").select("*").eq("session_id", session.id);
    setEntries(data ?? []);
  }

  function reset() {
    if (session) dismissedSessionId.current = session.id;
    setSession(null);
    setRoundQuestions([]);
    setEntries([]);
  }

  if (loading) {
    return (
      <GameShell game={game}>
        <Skeleton className="h-56 w-full" />
      </GameShell>
    );
  }

  if (!session) {
    return (
      <GameShell game={game}>
        <Card className="p-6">
          <p className="mb-1 font-serif-display text-lg">Pick a category</p>
          <p className="mb-5 text-sm text-muted-foreground">
            You&apos;ll each answer {ROUND_SIZE} questions about yourself, then try to guess what the other picked.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {categoriesWithCounts.map((c) => (
              <button
                key={c.value}
                onClick={() => startCategory(c.value)}
                disabled={starting || c.count === 0}
                className="rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <p className="font-serif-display text-xl">{c.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.count} questions</p>
              </button>
            ))}
          </div>
        </Card>
      </GameShell>
    );
  }

  const mySelf = entries.filter((e) => e.user_id === profile.id && e.phase === "self");
  const partnerSelf = entries.filter((e) => e.user_id === partner.id && e.phase === "self");
  const myGuess = entries.filter((e) => e.user_id === profile.id && e.phase === "guess");
  const partnerGuess = entries.filter((e) => e.user_id === partner.id && e.phase === "guess");

  const mySelfDone = mySelf.length >= roundQuestions.length;
  const partnerSelfDone = partnerSelf.length >= roundQuestions.length;
  const myGuessDone = myGuess.length >= roundQuestions.length;
  const partnerGuessDone = partnerGuess.length >= roundQuestions.length;

  const categoryLabel = CATEGORIES.find((c) => c.value === session.category)?.label ?? session.category;

  // Phase 1: answering about yourself.
  if (!mySelfDone) {
    const q = roundQuestions[mySelf.length];
    if (!q) return null;
    return (
      <GameShell game={game}>
        <QuestionCard
          categoryLabel={categoryLabel ?? ""}
          index={mySelf.length}
          total={roundQuestions.length}
          badge="Answer for yourself"
          question={q}
          onPick={(choice) => answer("self", q.id, choice)}
        />
      </GameShell>
    );
  }

  if (!partnerSelfDone) {
    return (
      <GameShell game={game}>
        <WaitCard text={`Waiting for ${partner.display_name} to finish answering about themselves…`} />
      </GameShell>
    );
  }

  // Phase 2: guessing what the partner picked.
  if (!myGuessDone) {
    const q = roundQuestions[myGuess.length];
    if (!q) return null;
    return (
      <GameShell game={game}>
        <QuestionCard
          categoryLabel={categoryLabel ?? ""}
          index={myGuess.length}
          total={roundQuestions.length}
          badge={`Guess ${partner.display_name}'s answer`}
          question={q}
          onPick={(choice) => answer("guess", q.id, choice)}
        />
      </GameShell>
    );
  }

  if (!partnerGuessDone) {
    return (
      <GameShell game={game}>
        <WaitCard text={`Waiting for ${partner.display_name} to finish guessing…`} />
      </GameShell>
    );
  }

  // Both done — reveal.
  const rows = roundQuestions.map((q) => {
    const mySelfA = mySelf.find((e) => e.question_id === q.id)?.choice ?? "";
    const partnerSelfA = partnerSelf.find((e) => e.question_id === q.id)?.choice ?? "";
    const myGuessA = myGuess.find((e) => e.question_id === q.id)?.choice ?? "";
    const partnerGuessA = partnerGuess.find((e) => e.question_id === q.id)?.choice ?? "";
    const iGuessedRight = myGuessA === partnerSelfA;
    const partnerGuessedRight = partnerGuessA === mySelfA;
    return { q, mySelfA, partnerSelfA, myGuessA, partnerGuessA, iGuessedRight, partnerGuessedRight };
  });
  const myScore = rows.filter((r) => r.iGuessedRight).length;
  const partnerScore = rows.filter((r) => r.partnerGuessedRight).length;

  return (
    <GuessMeReveal
      game={game}
      profile={profile}
      partner={partner}
      session={session}
      rows={rows}
      myScore={myScore}
      partnerScore={partnerScore}
      onPlayAgain={reset}
    />
  );
}

function QuestionCard({
  categoryLabel,
  index,
  total,
  badge,
  question,
  onPick,
}: {
  categoryLabel: string;
  index: number;
  total: number;
  badge: string;
  question: GameQuestion;
  onPick: (choice: string) => void;
}) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between text-xs">
        <span className="rounded-full bg-accent/10 px-2.5 py-1 font-medium uppercase tracking-wide text-accent">{badge}</span>
        <span className="text-muted-foreground">
          {categoryLabel} · {index + 1} / {total}
        </span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id + badge}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
        >
          <p className="mb-5 text-center font-serif-display text-2xl leading-snug">{question.prompt}</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {(question.options ?? []).map((opt) => (
              <button
                key={opt}
                onClick={() => onPick(opt)}
                className="rounded-xl border border-border bg-background p-4 text-center text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent/5"
              >
                {opt}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}

function WaitCard({ text }: { text: string }) {
  return (
    <Card className="flex flex-col items-center gap-4 p-10 text-center">
      <div className="h-8 w-8 animate-pulse rounded-full bg-accent/20" />
      <p className="font-serif-display text-lg">{text}</p>
    </Card>
  );
}

function GuessMeReveal({
  game,
  profile,
  partner,
  session,
  rows,
  myScore,
  partnerScore,
  onPlayAgain,
}: {
  game: Game;
  profile: Profile;
  partner: Profile;
  session: GameSession;
  rows: { q: GameQuestion; mySelfA: string; partnerSelfA: string; myGuessA: string; partnerGuessA: string; iGuessedRight: boolean; partnerGuessedRight: boolean }[];
  myScore: number;
  partnerScore: number;
  onPlayAgain: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [finalized, setFinalized] = useState(false);

  useEffect(() => {
    if (finalized || session.status !== "active") return;
    setFinalized(true);
    const winnerId = myScore === partnerScore ? null : myScore > partnerScore ? profile.id : partner.id;
    supabase
      .from("game_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", session.id)
      .then(() =>
        supabase.from("game_results").upsert(
          { session_id: session.id, is_match: myScore === partnerScore, winner_id: winnerId, summary: { myScore, partnerScore } },
          { onConflict: "session_id" }
        )
      )
      .then(() =>
        logActivity(supabase, {
          actionType: "game_completed",
          description: `${profile.display_name} and ${partner.display_name} played a round of Guess Me.`,
          targetType: "game_session",
          targetId: session.id,
        })
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalized, session.id, session.status, myScore, partnerScore]);

  const headline =
    myScore === partnerScore
      ? "Dead even — you know each other equally well."
      : myScore > partnerScore
        ? `You know ${partner.display_name} a little better.`
        : `${partner.display_name} knows you a little better.`;

  return (
    <GameShell game={game}>
      <div className="animate-fade-slide-up space-y-5">
        <Card className="flex flex-col items-center gap-2 p-6 text-center">
          <Trophy className="h-6 w-6 text-accent" strokeWidth={1.5} />
          <div className="flex items-center gap-6">
            <div>
              <p className="font-serif-display text-3xl">{myScore}</p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{profile.display_name}</p>
            </div>
            <p className="text-muted-foreground">of {rows.length}</p>
            <div>
              <p className="font-serif-display text-3xl">{partnerScore}</p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{partner.display_name}</p>
            </div>
          </div>
          <p className="mt-1 flex items-center gap-1.5 font-serif-display text-lg text-accent">
            <Sparkles className="h-4 w-4" /> {headline}
          </p>
        </Card>

        <div className="space-y-2.5">
          {rows.map(({ q, mySelfA, partnerSelfA, iGuessedRight, partnerGuessedRight }) => (
            <Card key={q.id} className="p-4">
              <p className="mb-2.5 text-sm font-medium">{q.prompt}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">
                    {profile.display_name}: <span className="text-foreground">{mySelfA}</span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                    {partnerGuessedRight ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <span className="h-3 w-3 text-center leading-3">✕</span>
                    )}
                    {partner.display_name} guessed {partnerGuessedRight ? "right" : "wrong"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {partner.display_name}: <span className="text-foreground">{partnerSelfA}</span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                    {iGuessedRight ? <Check className="h-3 w-3 text-success" /> : <span className="h-3 w-3 text-center leading-3">✕</span>}
                    You guessed {iGuessedRight ? "right" : "wrong"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Button className="w-full" size="lg" onClick={onPlayAgain}>
          Play again
        </Button>
      </div>
    </GameShell>
  );
}
