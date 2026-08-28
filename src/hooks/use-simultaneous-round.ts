"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GameAnswer, GamePlayer, GameSession, Profile } from "@/lib/database.types";

export type RoundPhase = "idle" | "waiting" | "active" | "revealing" | "revealed";

/**
 * Shared lifecycle for the "both players lock an answer, then reveal together"
 * games — This or That, Guess Me, Draw Together. `answer` is a free-form string
 * (a choice, a guess, or a storage path for a drawing).
 */
export function useSimultaneousRound({
  gameId,
  profile,
  partner,
}: {
  gameId: string;
  profile: Profile;
  partner: Profile;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [answers, setAnswers] = useState<GameAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealCountdown, setRevealCountdown] = useState<number | null>(null);

  const loadOpenSession = useCallback(async () => {
    const { data } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("game_id", gameId)
      .in("status", ["waiting", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSession(data ?? null);
    if (data) {
      const [{ data: p }, { data: a }] = await Promise.all([
        supabase.from("game_players").select("*").eq("session_id", data.id),
        supabase.from("game_answers").select("*").eq("session_id", data.id),
      ]);
      setPlayers(p ?? []);
      setAnswers(a ?? []);
    } else {
      setPlayers([]);
      setAnswers([]);
    }
    setLoading(false);
  }, [supabase, gameId]);

  useEffect(() => {
    loadOpenSession();
  }, [loadOpenSession]);

  // Lobby-level: watch for a brand new session on this game so the partner sees it appear.
  useEffect(() => {
    const channel = supabase
      .channel(`lobby-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_sessions", filter: `game_id=eq.${gameId}` },
        () => loadOpenSession()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, gameId, loadOpenSession]);

  // Session-level: players joining, answers locking in.
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_players", filter: `session_id=eq.${session.id}` },
        async () => {
          const { data } = await supabase.from("game_players").select("*").eq("session_id", session.id);
          setPlayers(data ?? []);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_answers", filter: `session_id=eq.${session.id}` },
        async () => {
          const { data } = await supabase.from("game_answers").select("*").eq("session_id", session.id);
          setAnswers(data ?? []);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, session]);

  // Drive the 3-2-1 reveal once both answers are in.
  useEffect(() => {
    if (!session || session.status === "completed") return;
    if (answers.length < 2) return;
    setRevealCountdown(3);
    const interval = setInterval(() => {
      setRevealCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          const [a1, a2] = answers;
          const isMatch =
            a1 && a2 ? a1.answer.trim().toLowerCase() === a2.answer.trim().toLowerCase() : null;
          supabase
            .from("game_sessions")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", session.id)
            .then(() =>
              supabase
                .from("game_results")
                .upsert({ session_id: session.id, is_match: isMatch }, { onConflict: "session_id" })
            )
            .then(() => loadOpenSession());
          return 0;
        }
        return prev - 1;
      });
    }, 700);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers.length, session?.id]);

  const partnerPlayer = players.find((p) => p.user_id === partner.id);
  const myAnswer = answers.find((a) => a.user_id === profile.id);
  const partnerAnswer = answers.find((a) => a.user_id === partner.id);

  const phase: RoundPhase = !session
    ? "idle"
    : session.status === "waiting" && !partnerPlayer
      ? "waiting"
      : revealCountdown !== null && revealCountdown > 0
        ? "revealing"
        : answers.length >= 2 || session.status === "completed"
          ? "revealed"
          : "active";

  async function createRound(question: string, category: string | null) {
    const { data: newSession, error } = await supabase
      .from("game_sessions")
      .insert({
        game_id: gameId,
        status: "waiting",
        category,
        custom_question: question,
        created_by: profile.id,
      })
      .select()
      .single();
    if (error || !newSession) throw error;
    await supabase.from("game_players").insert({ session_id: newSession.id, user_id: profile.id, is_ready: true });
    setSession(newSession);
  }

  async function joinRound() {
    if (!session) return;
    await supabase.from("game_players").insert({ session_id: session.id, user_id: profile.id, is_ready: true });
    await supabase.from("game_sessions").update({ status: "active" }).eq("id", session.id);
  }

  async function submitAnswer(answer: string) {
    if (!session) return;
    await supabase.from("game_answers").insert({ session_id: session.id, user_id: profile.id, answer });
  }

  function reset() {
    setSession(null);
    setPlayers([]);
    setAnswers([]);
    setRevealCountdown(null);
  }

  async function abandonRound() {
    if (!session) return;
    await supabase.from("game_sessions").update({ status: "abandoned" }).eq("id", session.id);
    setSession(null);
    setPlayers([]);
    setAnswers([]);
  }

  return {
    loading,
    session,
    players,
    answers,
    phase,
    revealCountdown,
    myAnswer,
    partnerAnswer,
    isCreator: session?.created_by === profile.id,
    createRound,
    joinRound,
    submitAnswer,
    abandonRound,
    reset,
    refresh: loadOpenSession,
  };
}
