"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Shuffle, Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { GameShell } from "@/components/play/game-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type { CardDraw, CardItem, Game, GameSession, Profile } from "@/lib/database.types";

const CATEGORIES = ["funny", "deep", "romantic", "flirty", "intimate", "random", "challenge", "wild"];

export function CardGame({ game, profile, partner }: { game: Game; profile: Profile; partner: Profile }) {
  const supabase = createClient();
  const { push } = useToast();
  const [cards, setCards] = useState<CardItem[]>([]);
  const [session, setSession] = useState<GameSession | null>(null);
  const [history, setHistory] = useState<(CardDraw & { card: CardItem | null })[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newPrompt, setNewPrompt] = useState("");
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const { data } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("game_id", game.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSession(data && data.status === "active" ? data : null);
  }, [supabase, game.id]);

  async function loadHistory() {
    const { data } = await supabase
      .from("card_draws")
      .select("*, card:cards(*)")
      .order("completed_at", { ascending: false })
      .limit(10);
    setHistory((data as unknown as (CardDraw & { card: CardItem | null })[]) ?? []);
  }

  useEffect(() => {
    supabase
      .from("cards")
      .select("*")
      .then(({ data }) => {
        setCards(data ?? []);
        setLoading(false);
      });
    loadSession();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`card-game-${game.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_sessions", filter: `game_id=eq.${game.id}` }, loadSession)
      .subscribe();
    // Realtime UPDATE events (marking a card "done") are unreliable in practice —
    // poll as a safety net so the shared card never gets stuck for the other
    // player. INSERTs (drawing) push instantly through the subscription above.
    const poll = setInterval(loadSession, 4000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [supabase, game.id, loadSession]);

  const drawn = session ? cards.find((c) => c.id === session.custom_question) ?? null : null;

  async function draw() {
    const pool = category === "all" ? cards : cards.filter((c) => c.category === category);
    if (pool.length === 0) return;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    const { data: newSession, error } = await supabase
      .from("game_sessions")
      .insert({ game_id: game.id, status: "active", category: picked.category, custom_question: picked.id, created_by: profile.id })
      .select()
      .single();
    if (error || !newSession) return;
    setSession(newSession);
    await logActivity(supabase, {
      actionType: "game_started",
      description: `${profile.display_name} drew a card for both of you.`,
      targetType: "game_session",
    });
  }

  async function markDrawn() {
    if (!session || !drawn) return;
    await supabase.from("card_draws").insert({ card_id: drawn.id, drawn_by: profile.id });
    await supabase.from("game_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", session.id);
    push("Card saved.", "success");
    setSession(null);
    loadHistory();
  }

  async function addCustomCard() {
    if (!newPrompt.trim()) return;
    await supabase.from("cards").insert({ category: newCategory, prompt: newPrompt.trim(), is_custom: true, created_by: profile.id });
    const { data } = await supabase.from("cards").select("*");
    setCards(data ?? []);
    setNewPrompt("");
    setAddOpen(false);
    push("Custom card added to the deck.", "success");
  }

  return (
    <GameShell game={game}>
      <div className="mb-5 flex flex-wrap items-center gap-2">
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
        <button
          onClick={() => setAddOpen(true)}
          className="ml-auto flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-accent-soft"
        >
          <Plus className="h-3 w-3" /> Add card
        </button>
      </div>

      <AnimatePresence mode="wait">
        {drawn ? (
          <motion.div
            key={drawn.id}
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -90 }}
            transition={{ duration: 0.35 }}
          >
            <Card className="flex min-h-56 flex-col items-center justify-center gap-4 border-accent-soft bg-gradient-to-b from-accent/5 to-card p-8 text-center">
              <span className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-accent">
                <Users className="h-3 w-3" /> {drawn.category} · both of you are seeing this
              </span>
              <p className="font-serif-display text-2xl leading-snug">{drawn.prompt}</p>
            </Card>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={draw}>
                <Shuffle className="h-4 w-4" /> Draw another
              </Button>
              <Button className="flex-1" onClick={markDrawn}>
                Done
              </Button>
            </div>
          </motion.div>
        ) : (
          <Card className="flex min-h-56 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading the deck…" : "Draw a card — you'll both see the same one."}
            </p>
            <Button size="lg" onClick={draw} disabled={loading}>
              <Shuffle className="h-4 w-4" /> Draw a card
            </Button>
          </Card>
        )}
      </AnimatePresence>

      <div className="mt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recently drawn</p>
        {history.length === 0 ? (
          <EmptyState title="No cards played yet." description="Draw your first one above." />
        ) : (
          <Card className="divide-y divide-border">
            {history.map((h) => (
              <div key={h.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                <p className="text-sm text-foreground/90">{h.card?.prompt}</p>
                <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(h.completed_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)}>
        <p className="mb-4 font-serif-display text-lg">Add a custom card</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Prompt</Label>
            <Input value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} placeholder="What's something..." />
          </div>
          <Button className="w-full" onClick={addCustomCard} disabled={!newPrompt.trim()}>
            Add to deck
          </Button>
        </div>
      </Dialog>
    </GameShell>
  );
}
