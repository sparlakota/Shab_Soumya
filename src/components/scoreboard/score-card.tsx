import { Avatar } from "@/components/ui/avatar";
import type { Profile } from "@/lib/database.types";

type Stats = { wins: number; gamesPlayed: number; challengesCompleted: number };

export function VersusScoreboard({
  profileA,
  profileB,
  avatarA,
  avatarB,
  statsA,
  statsB,
}: {
  profileA: Profile;
  profileB: Profile;
  avatarA: string | null;
  avatarB: string | null;
  statsA: Stats;
  statsB: Stats;
}) {
  return (
    <div className="border border-border">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-10 sm:px-10">
        <PlayerSide profile={profileA} avatarUrl={avatarA} wins={statsA.wins} />
        <span className="font-serif-display text-lg italic text-muted-foreground">vs</span>
        <PlayerSide profile={profileB} avatarUrl={avatarB} wins={statsB.wins} align="right" />
      </div>
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        <SecondaryStats stats={statsA} />
        <SecondaryStats stats={statsB} />
      </div>
    </div>
  );
}

function PlayerSide({
  profile,
  avatarUrl,
  wins,
  align = "left",
}: {
  profile: Profile;
  avatarUrl: string | null;
  wins: number;
  align?: "left" | "right";
}) {
  return (
    <div className={`flex flex-col items-center gap-3 ${align === "right" ? "sm:items-end" : "sm:items-start"}`}>
      <div className={`flex items-center gap-3 ${align === "right" ? "sm:flex-row-reverse" : ""}`}>
        <Avatar src={avatarUrl} name={profile.display_name} size={40} />
        <p className="label-eyebrow">{profile.display_name}</p>
      </div>
      <p className="font-serif-display text-6xl leading-none text-accent sm:text-7xl">{wins}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Wins</p>
    </div>
  );
}

function SecondaryStats({ stats }: { stats: Stats }) {
  return (
    <div className="flex justify-center gap-8 py-5 text-center">
      <div>
        <p className="font-serif-display text-xl">{stats.gamesPlayed}</p>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Played</p>
      </div>
      <div>
        <p className="font-serif-display text-xl">{stats.challengesCompleted}</p>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Challenges</p>
      </div>
    </div>
  );
}
