import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { logActivity } from "@/lib/activity";

type Supabase = SupabaseClient<Database>;

async function countMatchesForGame(
  supabase: Supabase,
  sessionIds: string[],
  gameId: string | undefined,
  onlyMatches: boolean
) {
  if (sessionIds.length === 0 || !gameId) return 0;
  let query = supabase
    .from("game_results")
    .select("session_id, is_match, game_sessions!inner(game_id)", { count: "exact", head: true })
    .in("session_id", sessionIds)
    .eq("game_sessions.game_id", gameId);
  if (onlyMatches) query = query.eq("is_match", true);
  const { count } = await query;
  return count ?? 0;
}

async function countCompletedSessions(supabase: Supabase, sessionIds: string[]) {
  if (sessionIds.length === 0) return 0;
  const { count } = await supabase
    .from("game_sessions")
    .select("*", { count: "exact", head: true })
    .in("id", sessionIds)
    .eq("status", "completed");
  return count ?? 0;
}

async function countMyWins(supabase: Supabase, userId: string) {
  const { count } = await supabase
    .from("game_results")
    .select("*", { count: "exact", head: true })
    .eq("winner_id", userId);
  return count ?? 0;
}

async function countMyDaresCompleted(supabase: Supabase, userId: string) {
  const { count } = await supabase
    .from("truth_dare_rounds")
    .select("*", { count: "exact", head: true })
    .eq("player_turn", userId)
    .eq("type", "dare")
    .eq("status", "completed");
  return count ?? 0;
}

async function countMyDrawings(supabase: Supabase, userId: string) {
  const { count } = await supabase
    .from("drawings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

/** Computes each achievement's criteria for a user against real activity and
 * inserts any newly-earned unlocks. Safe to call repeatedly (idempotent).
 *
 * Fetches the shared lookups (games, my session ids) once up front so the
 * per-criterion counts below can all run as one parallel batch instead of
 * each independently re-fetching the same rows. */
export async function syncAchievementsForUser(supabase: Supabase, userId: string, displayName: string) {
  const [{ data: achievements }, { data: alreadyUnlocked }, { data: games }, { data: mySessions }] =
    await Promise.all([
      supabase.from("achievements").select("*"),
      supabase.from("user_achievements").select("achievement_id").eq("user_id", userId),
      supabase.from("games").select("id, slug"),
      supabase.from("game_players").select("session_id").eq("user_id", userId),
    ]);
  if (!achievements) return;

  const unlockedIds = new Set((alreadyUnlocked ?? []).map((u) => u.achievement_id));
  const sessionIds = (mySessions ?? []).map((s) => s.session_id);
  const guessMeId = games?.find((g) => g.slug === "guess_me")?.id;
  const thisOrThatId = games?.find((g) => g.slug === "this_or_that")?.id;

  const [wins, gamesPlayed, dares, drawings, mindReaderMatches, perfectMatchMatches] = await Promise.all([
    countMyWins(supabase, userId),
    countCompletedSessions(supabase, sessionIds),
    countMyDaresCompleted(supabase, userId),
    countMyDrawings(supabase, userId),
    countMatchesForGame(supabase, sessionIds, guessMeId, true),
    countMatchesForGame(supabase, sessionIds, thisOrThatId, true),
  ]);

  const checks: Record<string, boolean> = {
    first_win: wins >= 1,
    win_streak: wins >= 3,
    mind_reader: mindReaderMatches >= 5,
    professional_menace: dares >= 10,
    drawing_disaster: drawings >= 1,
    perfect_match: perfectMatchMatches >= 10,
    ten_games: gamesPlayed >= 10,
    twentyfive_games: gamesPlayed >= 25,
  };

  const newlyEarned = achievements.filter((a) => !unlockedIds.has(a.id) && checks[a.slug]);
  await Promise.all(
    newlyEarned.map(async (achievement) => {
      const { error } = await supabase.from("user_achievements").insert({ user_id: userId, achievement_id: achievement.id });
      if (!error) {
        await logActivity(supabase, {
          actionType: "achievement_unlocked",
          description: `${displayName} unlocked "${achievement.name}".`,
          targetType: "achievement",
          targetId: achievement.id,
        });
      }
    })
  );
}
