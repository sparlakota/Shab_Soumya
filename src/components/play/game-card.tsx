import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { getIcon } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import type { Game } from "@/lib/database.types";

export function GameCard({
  game,
  playCount,
  lastPlayed,
  index,
  featured,
}: {
  game: Game;
  playCount: number;
  lastPlayed: string | null;
  index: number;
  featured?: boolean;
}) {
  const Icon = getIcon(game.icon);
  const num = String(index + 1).padStart(2, "0");

  return (
    <Link href={`/play/${game.slug}`} className="group block h-full">
      <div
        className={cn(
          "relative flex h-full flex-col justify-between overflow-hidden border p-6 transition-all duration-300 sm:p-7",
          featured
            ? "border-transparent bg-accent text-accent-foreground hover:brightness-110"
            : "border-border hover:border-accent-soft hover:bg-foreground/[0.02]"
        )}
      >
        <div className="flex items-start justify-between">
          <span
            className={cn(
              "font-serif-display text-lg italic",
              featured ? "text-accent-foreground/70" : "text-accent"
            )}
          >
            {num}
          </span>
          <Icon className={cn("h-5 w-5", featured ? "text-accent-foreground/80" : "text-muted-foreground")} strokeWidth={1.5} />
        </div>

        <div className="my-6">
          <h3 className={cn("font-serif-display text-3xl leading-[0.98]", featured && "text-accent-foreground")}>
            {game.name}
          </h3>
          <p className={cn("mt-3 text-sm italic", featured ? "text-accent-foreground/80" : "text-muted-foreground")}>
            &ldquo;{game.description}&rdquo;
          </p>
        </div>

        <div>
          <div
            className={cn(
              "mb-3 flex items-center justify-between text-xs",
              featured ? "text-accent-foreground/70" : "text-muted-foreground"
            )}
          >
            <span>
              {playCount} {playCount === 1 ? "round" : "rounds"}
            </span>
            <span>{lastPlayed ? formatDistanceToNow(new Date(lastPlayed), { addSuffix: true }) : "Never played"}</span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium",
              featured ? "text-accent-foreground" : "text-accent"
            )}
          >
            Play
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
