import { getIcon } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import type { Achievement } from "@/lib/database.types";

export function AchievementBadge({
  achievement,
  unlocked,
  unlockedBy,
}: {
  achievement: Achievement;
  unlocked: boolean;
  unlockedBy?: string[];
}) {
  const Icon = getIcon(achievement.icon);
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-opacity",
        unlocked ? "border-accent-soft bg-card" : "border-border bg-card/50 opacity-40"
      )}
    >
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", unlocked ? "bg-accent/10" : "bg-border/40")}>
        <Icon className={cn("h-5 w-5", unlocked ? "text-accent" : "text-muted-foreground")} strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium">{achievement.name}</p>
      <p className="text-xs text-muted-foreground">{achievement.description}</p>
      {unlocked && unlockedBy && unlockedBy.length > 0 && (
        <p className="text-[10px] uppercase tracking-wide text-accent">{unlockedBy.join(" & ")}</p>
      )}
    </div>
  );
}
