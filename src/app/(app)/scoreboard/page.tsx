import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/storage";
import { syncAchievementsForUser } from "@/lib/achievements";
import { PageHeader } from "@/components/layout/page-header";
import { VersusScoreboard } from "@/components/scoreboard/score-card";
import { AchievementBadge } from "@/components/scoreboard/achievement-badge";
import { UnlockToast } from "@/components/scoreboard/unlock-toast";
import type { Achievement } from "@/lib/database.types";

export default async function ScoreboardPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");
  const { profile, partner } = session;

  const supabase = await createClient();

  // Captured before sync so we can diff "newly unlocked" afterward — kept as
  // its own await so it's guaranteed to resolve before sync can insert anything.
  const { data: beforeUnlocks } = await supabase.from("user_achievements").select("id");
  const beforeIds = new Set((beforeUnlocks ?? []).map((u) => u.id));

  // Sync (both users) and both users' stats are independent of each other,
  // so they run as one parallel batch instead of three sequential waves.
  const [, statsA, statsB] = await Promise.all([
    Promise.all([
      syncAchievementsForUser(supabase, profile.id, profile.display_name),
      syncAchievementsForUser(supabase, partner.id, partner.display_name),
    ]),
    statsFor(profile.id),
    statsFor(partner.id),
  ]);

  const [{ data: achievements }, { data: unlocks }, avatarA, avatarB] = await Promise.all([
    supabase.from("achievements").select("*").order("name"),
    supabase.from("user_achievements").select("*"),
    getSignedUrl(supabase, "avatars", profile.avatar_path),
    getSignedUrl(supabase, "avatars", partner.avatar_path),
  ]);

  async function statsFor(userId: string) {
    const [{ count: wins }, { data: mySessions }, { count: challenges }] = await Promise.all([
      supabase.from("game_results").select("*", { count: "exact", head: true }).eq("winner_id", userId),
      supabase.from("game_players").select("session_id").eq("user_id", userId),
      supabase
        .from("challenge_completions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed"),
    ]);
    const sessionIds = (mySessions ?? []).map((s) => s.session_id);
    const { count: gamesPlayed } = sessionIds.length
      ? await supabase
          .from("game_sessions")
          .select("*", { count: "exact", head: true })
          .in("id", sessionIds)
          .eq("status", "completed")
      : { count: 0 };
    return { wins: wins ?? 0, gamesPlayed: gamesPlayed ?? 0, challenges: challenges ?? 0 };
  }

  const byAchievement = new Map<string, string[]>();
  const namesById: Record<string, string> = { [profile.id]: profile.display_name, [partner.id]: partner.display_name };
  const newlyUnlockedNames: string[] = [];
  for (const u of unlocks ?? []) {
    if (!byAchievement.has(u.achievement_id)) byAchievement.set(u.achievement_id, []);
    byAchievement.get(u.achievement_id)!.push(namesById[u.user_id] ?? "");
    if (!beforeIds.has(u.id)) {
      const a = (achievements ?? []).find((ac) => ac.id === u.achievement_id);
      if (a) newlyUnlockedNames.push(a.name);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
      <PageHeader title="Scoreboard" tagline="Because apparently we have to compete." number="05" />

      <div className="mb-10">
        <VersusScoreboard
          profileA={profile}
          profileB={partner}
          avatarA={avatarA}
          avatarB={avatarB}
          statsA={{ wins: statsA.wins, gamesPlayed: statsA.gamesPlayed, challengesCompleted: statsA.challenges }}
          statsB={{ wins: statsB.wins, gamesPlayed: statsB.gamesPlayed, challengesCompleted: statsB.challenges }}
        />
      </div>

      <p className="label-eyebrow mb-4">Achievements</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {(achievements ?? []).map((a: Achievement) => (
          <AchievementBadge key={a.id} achievement={a} unlocked={byAchievement.has(a.id)} unlockedBy={byAchievement.get(a.id)} />
        ))}
      </div>

      <UnlockToast names={newlyUnlockedNames} />
    </div>
  );
}
