"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { GameShell } from "@/components/play/game-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Game, GameSession, Profile, TtalStatement, TtalGuess } from "@/lib/database.types";

export function TwoTruths({ game, profile, partner }: { game: Game; profile: Profile; partner: Profile }) {
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [statements, setStatements] = useState<TtalStatement[]>([]);
  const [guess, setGuess] = useState<TtalGuess | null>(null);
  const [lastCreator, setLastCreator] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState(["", "", ""]);
  const [lieIndex, setLieIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const { data: openSession } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("game_id", game.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openSession) {
      const [{ data: st }, { data: gs }] = await Promise.all([
        supabase.from("ttal_statements").select("*").eq("session_id", openSession.id).order("statement_order"),
        supabase.from("ttal_guesses").select("*").eq("session_id", openSession.id),
      ]);
      setSession(openSession);
      setStatements(st ?? []);
      setGuess(gs?.[0] ?? null);
    } else {
      setSession(null);
      setStatements([]);
      setGuess(null);
      const { data: lastCompleted } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("game_id", game.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLastCreator(lastCompleted?.created_by ?? null);
    }
    setLoading(false);
  }, [supabase, game.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`ttal-${game.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_sessions", filter: `game_id=eq.${game.id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, game.id, load]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`ttal-session-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ttal_guesses", filter: `session_id=eq.${session.id}` },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, supabase, load]);

  async function submitRound() {
    if (drafts.some((d) => !d.trim())) return;
    setSubmitting(true);
    try {
      const { data: newSession } = await supabase
        .from("game_sessions")
        .insert({ game_id: game.id, status: "active", created_by: profile.id })
        .select()
        .single();
      if (!newSession) return;
      await supabase.from("ttal_statements").insert(
        drafts.map((text, i) => ({
          session_id: newSession.id,
          statement_order: i,
          statement: text.trim(),
          is_lie: i === lieIndex,
          created_by: profile.id,
        }))
      );
      await logActivity(supabase, {
        actionType: "game_started",
        description: `${profile.display_name} started a round of Two Truths & a Lie.`,
        targetType: "game_session",
      });
      setDrafts(["", "", ""]);
      setLieIndex(0);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function submitGuess(statementId: string) {
    if (!session) return;
    const statement = statements.find((s) => s.id === statementId);
    if (!statement) return;
    await supabase.from("ttal_guesses").insert({
      session_id: session.id,
      guesser_id: profile.id,
      guessed_statement_id: statementId,
      is_correct: statement.is_lie,
    });
    await supabase.from("game_results").upsert(
      {
        session_id: session.id,
        is_match: statement.is_lie,
        winner_id: statement.is_lie ? profile.id : session.created_by,
      },
      { onConflict: "session_id" }
    );
    await supabase
      .from("game_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", session.id);
    load();
  }

  if (loading) {
    return (
      <GameShell game={game}>
        <Skeleton className="h-56 w-full" />
      </GameShell>
    );
  }

  // No active round.
  if (!session) {
    const myTurn = !lastCreator || lastCreator === partner.id;
    if (!myTurn) {
      return (
        <GameShell game={game}>
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="font-serif-display text-lg">It&apos;s {partner.display_name}&apos;s turn to write the statements.</p>
            <p className="text-sm text-muted-foreground">Check back once they&apos;ve started a round.</p>
          </Card>
        </GameShell>
      );
    }
    return (
      <GameShell game={game}>
        <Card className="p-6">
          <p className="mb-1 font-serif-display text-lg">Your turn</p>
          <p className="mb-5 text-sm text-muted-foreground">
            Write three statements. Mark which one is the lie — {partner.display_name} will try to catch it.
          </p>
          <div className="space-y-3">
            {drafts.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <button
                  onClick={() => setLieIndex(i)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors ${
                    lieIndex === i ? "border-accent bg-accent text-accent-foreground" : "border-border text-muted-foreground"
                  }`}
                  title="Mark as the lie"
                >
                  {i + 1}
                </button>
                <Input
                  value={d}
                  onChange={(e) => {
                    const next = [...drafts];
                    next[i] = e.target.value;
                    setDrafts(next);
                  }}
                  placeholder={`Statement ${i + 1}${lieIndex === i ? " (the lie)" : ""}`}
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Tap a number to mark that statement as the lie.</p>
          <Button className="mt-5 w-full" size="lg" onClick={submitRound} disabled={submitting || drafts.some((d) => !d.trim())}>
            {submitting ? "Starting…" : "Submit"}
          </Button>
        </Card>
      </GameShell>
    );
  }

  const iAmCreator = session.created_by === profile.id;

  // Active round, no guess yet.
  if (!guess) {
    if (iAmCreator) {
      return (
        <GameShell game={game}>
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="font-serif-display text-lg">Waiting for {partner.display_name} to guess…</p>
            <div className="w-full space-y-2 pt-2 text-left">
              {statements.map((s) => (
                <div key={s.id} className="rounded-xl border border-border bg-background p-3 text-sm">
                  {s.statement}
                </div>
              ))}
            </div>
          </Card>
        </GameShell>
      );
    }
    return (
      <GameShell game={game}>
        <p className="mb-4 text-center text-sm text-muted-foreground">Which one is the lie?</p>
        <div className="space-y-3">
          {statements.map((s) => (
            <button
              key={s.id}
              onClick={() => submitGuess(s.id)}
              className="w-full rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent/5"
            >
              {s.statement}
            </button>
          ))}
        </div>
      </GameShell>
    );
  }

  // Revealed.
  return (
    <GameShell game={game}>
      <div className="animate-fade-slide-up space-y-3">
        {statements.map((s) => {
          const wasGuessed = guess.guessed_statement_id === s.id;
          return (
            <div
              key={s.id}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${
                s.is_lie ? "border-accent bg-accent/5" : "border-border bg-card"
              }`}
            >
              <span className="text-sm">{s.statement}</span>
              <div className="flex shrink-0 items-center gap-2">
                {s.is_lie && <Badge>The lie</Badge>}
                {wasGuessed && (guess.is_correct ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-danger" />)}
              </div>
            </div>
          );
        })}
        <p className="flex items-center justify-center gap-2 pt-2 text-center font-serif-display text-xl text-accent">
          {guess.is_correct ? (
            <>
              <Sparkles className="h-5 w-5" /> Caught it.
            </>
          ) : (
            "Fooled you."
          )}
        </p>
        <Button className="w-full" size="lg" onClick={load}>
          Continue
        </Button>
      </div>
    </GameShell>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-foreground">
      {children}
    </span>
  );
}
