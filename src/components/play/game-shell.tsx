import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getIcon } from "@/lib/icon-map";
import type { Game } from "@/lib/database.types";

export function GameShell({ game, children }: { game: Game; children: React.ReactNode }) {
  const Icon = getIcon(game.icon);
  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      <Link
        href="/play"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Play
      </Link>
      <div className="mb-8 flex items-center gap-3 border-b border-border pb-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10">
          <Icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="font-serif-display text-3xl font-medium">{game.name}</h1>
          <p className="text-sm italic text-muted-foreground">{game.description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
