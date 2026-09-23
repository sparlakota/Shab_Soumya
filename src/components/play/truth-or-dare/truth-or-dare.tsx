"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Check, X, MessageCircleQuestion, Flame as DareIcon, Shuffle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { GameShell } from "@/components/play/game-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type { Game, Profile, TruthDarePrompt, TruthDareRound, TruthDareType, TruthDareLevel } from "@/lib/database.types";

const LEVELS: TruthDareLevel[] = ["cute", "flirty", "bold"];

export function TruthOrDare({ game, profile, partner }: { game: Game; profile: Profile; partner: Profile }) {
  const supabase = createClient();
  const { push } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<TruthDarePrompt[]>([]);
  const [rounds, setRounds] = useState<TruthDareRound[]>([]);
  const [level, setLevel] = useState<TruthDareLevel>("cute");
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newType, setNewType] = useState<TruthDareType>("truth");
  const [newLevel, setNewLevel] = useState<TruthDareLevel>("cute");
  const [newText, setNewText] = useState("");

  const loadRounds = useCallback(
    async (sid: string) => {
      const { data } = await supabase
        .from("truth_dare_rounds")
        .select("*")
        .eq("session_id", sid)
        .order("created_at", { ascending: false })
        .limit(15);
      setRounds(data ?? []);
    },
    [supabase]
  );

  useEffect(() => {
    (async () => {
      const { data: prompts } = await supabase.from("truth_dare_prompts").select("*");
      setPrompts(prompts ?? []);

      let { data: existing } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("game_id", game.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existing) {
        const { data: created } = await supabase
          .from("game_sessions")
          .insert({ game_id: game.id, status: "active", created_by: profile.id })
          .select()
          .single();
        existing = created;
      }
      if (existing) {
        setSessionId(existing.id);
        await loadRounds(existing.id);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`td-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "truth_dare_rounds", filter: `session_id=eq.${sessionId}` },
        () => loadRounds(sessionId)
      )
      .subscribe();
    // Realtime UPDATE events (marking a round completed/skipped) are unreliable
    // in practice — poll as a safety net so a resolved round never looks stuck
    // pending on the other player's screen.
    const poll = setInterval(() => loadRounds(sessionId), 4000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [sessionId, supabase, loadRounds]);

  const lastRound = rounds[0];
  const pending = rounds.find((r) => r.status === "pending");
  const nextTurn = lastRound && lastRound.player_turn === profile.id ? partner : profile;
  const isMyTurn = !pending && nextTurn.id === profile.id;

  async function draw(type: TruthDareType) {
    if (!sessionId) return;
    const pool = prompts.filter((p) => p.type === type && p.level === level);
    if (pool.length === 0) {
      push("No prompts saved at that level yet — add one below.", "info");
      return;
    }
    const prompt = pool[Math.floor(Math.random() * pool.length)];
    await supabase.from("truth_dare_rounds").insert({
      session_id: sessionId,
      player_turn: profile.id,
      prompt_id: prompt.id,
      type,
      status: "pending",
    });
  }

  async function respond(status: "completed" | "skipped") {
    if (!pending) return;
    await supabase.from("truth_dare_rounds").update({ status, completed_at: new Date().toISOString() }).eq("id", pending.id);
    if (status === "completed") {
      await logActivity(supabase, {
        actionType: "truth_or_dare_completed",
        description: `${profile.display_name} completed a ${pending.type} in Truth or Dare.`,
        targetType: "game_session",
      });
    }
  }

  async function addCustomPrompt() {
    if (!newText.trim()) return;
    await supabase.from("truth_dare_prompts").insert({ type: newType, level: newLevel, prompt: newText.trim(), is_custom: true, created_by: profile.id });
    const { data } = await supabase.from("truth_dare_prompts").select("*");
    setPrompts(data ?? []);
    setNewText("");
    setAddOpen(false);
    push("Added to the deck.", "success");
  }

  const pendingPrompt = pending ? prompts.find((p) => p.id === pending.prompt_id) : null;

  if (loading) {
    return (
      <GameShell game={game}>
        <div className="h-48 animate-pulse rounded-2xl bg-border/50" />
      </GameShell>
    );
  }

  return (
    <GameShell game={game}>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pending ? "Round in progress" : `${isMyTurn ? "Your" : partner.display_name + "'s"} turn`}
        </p>
        <button onClick={() => setAddOpen(true)} className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
          <Plus className="h-3 w-3" /> Add custom
        </button>
      </div>

      <AnimatePresence mode="wait">
        {pending && pendingPrompt ? (
          <motion.div key={pending.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card className="flex min-h-56 flex-col items-center justify-center gap-4 p-8 text-center">
              <Badge tone={pending.type === "truth" ? "accent" : "warning"}>
                {pending.type} · {pendingPrompt.level}
              </Badge>
              <p className="font-serif-display text-2xl leading-snug">{pendingPrompt.prompt}</p>
            </Card>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => respond("skipped")}>
                <X className="h-4 w-4" /> Skip
              </Button>
              <Button className="flex-1" onClick={() => respond("completed")}>
                <Check className="h-4 w-4" /> Done
              </Button>
            </div>
          </motion.div>
        ) : (
          <Card className="p-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Level</p>
            <div className="mb-6 flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                    level === l ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent-soft"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => draw("truth")}>
                <MessageCircleQuestion className="h-4 w-4" /> Truth
              </Button>
              <Button variant="outline" className="h-16 flex-col gap-1" onClick={() => draw("dare")}>
                <DareIcon className="h-4 w-4" /> Dare
              </Button>
              <Button className="h-16 flex-col gap-1" onClick={() => draw(Math.random() < 0.5 ? "truth" : "dare")}>
                <Shuffle className="h-4 w-4" /> Random
              </Button>
            </div>
          </Card>
        )}
      </AnimatePresence>

      <div className="mt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</p>
        {rounds.filter((r) => r.status !== "pending").length === 0 ? (
          <EmptyState title="No rounds yet." description="Draw a truth or dare above." />
        ) : (
          <Card className="divide-y divide-border">
            {rounds
              .filter((r) => r.status !== "pending")
              .map((r) => {
                const p = prompts.find((pp) => pp.id === r.prompt_id);
                return (
                  <div key={r.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {r.status === "completed" ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                      ) : (
                        <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <p className="text-sm text-foreground/90">{p?.prompt ?? r.custom_text}</p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.completed_at ?? r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
          </Card>
        )}
      </div>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)}>
        <p className="mb-4 font-serif-display text-lg">Add a custom truth or dare</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={newType} onChange={(e) => setNewType(e.target.value as TruthDareType)}>
                <option value="truth">Truth</option>
                <option value="dare">Dare</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={newLevel} onChange={(e) => setNewLevel(e.target.value as TruthDareLevel)}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Prompt</Label>
            <Input value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="What's..." />
          </div>
          <Button className="w-full" onClick={addCustomPrompt} disabled={!newText.trim()}>
            Add to deck
          </Button>
        </div>
      </Dialog>
    </GameShell>
  );
}
