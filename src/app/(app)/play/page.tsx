import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { GameCard } from "@/components/play/game-card";

export default async function PlayPage() {
  const supabase = await createClient();

  const [{ data: games }, { data: sessions }] = await Promise.all([
    supabase.from("games").select("*"),
    supabase
      .from("game_sessions")
      .select("game_id, status, completed_at, created_at")
      .eq("status", "completed"),
  ]);

  const statsByGame = new Map<string, { count: number; last: string | null }>();
  for (const s of sessions ?? []) {
    const existing = statsByGame.get(s.game_id) ?? { count: 0, last: null };
    existing.count += 1;
    const when = s.completed_at ?? s.created_at;
    if (!existing.last || when > existing.last) existing.last = when;
    statsByGame.set(s.game_id, existing);
  }

  const order = [
    "truth_or_dare",
    "guess_me",
    "this_or_that",
    "two_truths",
    "draw_together",
    "card_game",
    "random_challenge",
  ];
  const sortedGames = [...(games ?? [])].sort(
    (a, b) => order.indexOf(a.slug) - order.indexOf(b.slug)
  );

  return (
    <div className="dark-section min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <PageHeader title="Play" tagline="Things we can do together." number="01" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedGames.map((game, i) => {
            const stats = statsByGame.get(game.id) ?? { count: 0, last: null };
            const featured = i === 0;
            return (
              <div key={game.id} className={featured ? "sm:col-span-2 lg:col-span-3" : ""}>
                <GameCard game={game} playCount={stats.count} lastPlayed={stats.last} index={i} featured={featured} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
