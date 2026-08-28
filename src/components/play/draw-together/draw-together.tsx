"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Save, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSimultaneousRound } from "@/hooks/use-simultaneous-round";
import { logActivity } from "@/lib/activity";
import { getSignedUrl, buildStoragePath } from "@/lib/storage";
import { GameShell } from "@/components/play/game-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { DrawingCanvas, type DrawingCanvasHandle } from "@/components/play/draw-together/drawing-canvas";
import type { Game, Profile } from "@/lib/database.types";

const PROMPTS = [
  "Draw your dream house.",
  "Draw what you think the other person is doing right now.",
  "Draw our perfect vacation.",
  "Draw the two of us as animals.",
  "Draw your favorite memory of us.",
  "Draw what love smells like.",
];

export function DrawTogether({ game, profile, partner }: { game: Game; profile: Profile; partner: Profile }) {
  const supabase = createClient();
  const { push } = useToast();
  const round = useSimultaneousRound({ gameId: game.id, profile, partner });
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [customText, setCustomText] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myUrl, setMyUrl] = useState<string | null>(null);
  const [partnerUrl, setPartnerUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (round.phase !== "revealed") return;
    if (round.myAnswer) getSignedUrl(supabase, "memories", round.myAnswer.answer).then(setMyUrl);
    if (round.partnerAnswer) getSignedUrl(supabase, "memories", round.partnerAnswer.answer).then(setPartnerUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.phase, round.myAnswer, round.partnerAnswer]);

  async function handleStart() {
    const question = customMode ? customText.trim() : prompt;
    if (!question) return;
    await round.createRound(question, customMode ? "custom" : null);
    await logActivity(supabase, {
      actionType: "game_started",
      description: `${profile.display_name} started a round of Draw Together.`,
      targetType: "game_session",
    });
  }

  async function handleSubmitDrawing() {
    if (!canvasRef.current || canvasRef.current.isEmpty()) {
      push("Draw something first.", "info");
      return;
    }
    setSubmitting(true);
    try {
      const blob = await canvasRef.current.exportPng();
      if (!blob) throw new Error("export failed");
      const file = new File([blob], "drawing.png", { type: "image/png" });
      const path = buildStoragePath(profile.id, file);
      const { error } = await supabase.storage.from("memories").upload(path, file, { cacheControl: "3600" });
      if (error) throw error;
      await round.submitAnswer(path);
    } catch {
      push("Couldn't save that drawing. Try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveToMemories() {
    if (!round.myAnswer || !round.partnerAnswer) return;
    const { data: memory } = await supabase
      .from("memories")
      .insert({ caption: round.session?.custom_question, added_by: profile.id, tags: ["draw-together"] })
      .select()
      .single();
    if (!memory) return;
    await supabase.from("memory_media").insert([
      { memory_id: memory.id, storage_path: round.myAnswer.answer, media_type: "image" },
      { memory_id: memory.id, storage_path: round.partnerAnswer.answer, media_type: "image" },
    ]);
    await supabase
      .from("drawings")
      .update({ saved_to_memories: true })
      .in("storage_path", [round.myAnswer.answer, round.partnerAnswer.answer]);
    await logActivity(supabase, {
      actionType: "memory_uploaded",
      description: `${profile.display_name} saved a Draw Together round to Memories.`,
      targetType: "memory",
      targetId: memory.id,
    });
    setSaved(true);
    push("Saved to Memories.", "success");
  }

  if (round.loading) {
    return (
      <GameShell game={game}>
        <Skeleton className="h-72 w-full" />
      </GameShell>
    );
  }

  if (round.phase === "idle") {
    return (
      <GameShell game={game}>
        <Card className="p-6">
          <p className="mb-4 text-sm font-medium text-muted-foreground">Pick a prompt</p>
          <div className="mb-4 space-y-2">
            {PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPrompt(p);
                  setCustomMode(false);
                }}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  prompt === p && !customMode ? "border-accent bg-accent/10" : "border-border hover:border-accent-soft"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button onClick={() => setCustomMode(true)} className="mb-2 text-xs font-medium text-accent hover:underline">
            Write my own prompt
          </button>
          {customMode && (
            <Input value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder="Draw..." className="mb-4" />
          )}
          <Button className="w-full" size="lg" onClick={handleStart}>
            Start this round
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
              <p className="font-serif-display text-lg">A drawing round is waiting</p>
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
            <p className="font-serif-display text-lg">Drawing submitted.</p>
            <p className="text-sm text-muted-foreground">Waiting for {partner.display_name}…</p>
          </Card>
        </GameShell>
      );
    }
    return (
      <GameShell game={game}>
        <p className="mb-4 text-center font-serif-display text-xl">{round.session?.custom_question}</p>
        <DrawingCanvas ref={canvasRef} disabled={submitting} />
        <Button className="mt-4 w-full" size="lg" onClick={handleSubmitDrawing} disabled={submitting}>
          {submitting ? "Saving…" : "Submit drawing"}
        </Button>
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

  return (
    <GameShell game={game}>
      <div className="animate-fade-slide-up space-y-4">
        <p className="text-center text-sm text-muted-foreground">“{round.session?.custom_question}”</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">{profile.display_name}</p>
            {myUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={myUrl} alt="Your drawing" className="w-full rounded-2xl border border-border" />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-border bg-card">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">{partner.display_name}</p>
            {partnerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partnerUrl} alt="Partner's drawing" className="w-full rounded-2xl border border-border" />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-border bg-card">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={saveToMemories} disabled={saved}>
            <Save className="h-4 w-4" /> {saved ? "Saved" : "Save to Memories"}
          </Button>
          <Button className="flex-1" onClick={round.reset}>
            Play again
          </Button>
        </div>
      </div>
    </GameShell>
  );
}
