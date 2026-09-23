import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Gamepad2, Map, ListChecks, Images, Trophy, MessageCircleHeart, ScrollText } from "lucide-react";

export function SectionGrid({
  memoryPreviewUrl,
  placesVisited,
  placesWaiting,
}: {
  memoryPreviewUrl: string | null;
  placesVisited: number;
  placesWaiting: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* PLAY — large */}
      <Link href="/play" className="group relative overflow-hidden rounded-none border border-border p-7 sm:col-span-2 sm:row-span-2 sm:p-10">
        <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full border border-accent/20 transition-transform duration-500 group-hover:scale-110" />
        <div className="pointer-events-none absolute right-10 top-16 h-2 w-2 rounded-full bg-accent/40" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="editorial-number text-2xl">01</span>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-accent" />
          </div>
          <div>
            <Gamepad2 className="mb-4 h-6 w-6 text-accent" strokeWidth={1.5} />
            <h3 className="font-serif-display text-4xl leading-[0.95] sm:text-5xl">
              PLAY
            </h3>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Seven small games. Guess Me, This or That, Truth or Dare, and more — things we can do together.
            </p>
          </div>
        </div>
      </Link>

      {/* OUR WORLD */}
      <Link href="/world" className="group relative overflow-hidden rounded-none border border-border p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: "radial-gradient(circle, var(--color-accent-soft) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="editorial-number text-lg">02</span>
            <Map className="h-4 w-4 text-accent" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-serif-display text-2xl leading-tight">Our World</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">Places we&apos;ve been. Places we&apos;ll go.</p>
            {(placesVisited > 0 || placesWaiting > 0) && (
              <p className="mt-3 text-xs text-accent">
                {placesVisited} visited · {placesWaiting} waiting
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* WISHLIST */}
      <Link href="/wishlist" className="group relative overflow-hidden rounded-none border border-border p-6">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="editorial-number text-lg">03</span>
            <ListChecks className="h-4 w-4 text-accent" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-serif-display text-2xl leading-tight">Wishlist</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">All the things we want to do.</p>
          </div>
        </div>
      </Link>

      {/* MEMORIES — photo preview */}
      <Link href="/memories" className="group relative col-span-1 overflow-hidden rounded-none border border-border p-6 sm:col-span-2">
        {memoryPreviewUrl && (
          <Image
            src={memoryPreviewUrl}
            alt=""
            fill
            sizes="400px"
            className="object-cover opacity-25 transition-opacity duration-500 group-hover:opacity-35"
          />
        )}
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="editorial-number text-lg">04</span>
            <Images className="h-4 w-4 text-accent" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-serif-display text-2xl leading-tight">Memories</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">Moments we never want to forget.</p>
          </div>
        </div>
      </Link>

      {/* SCOREBOARD */}
      <Link href="/scoreboard" className="group relative overflow-hidden rounded-none border border-border p-6">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="editorial-number text-lg">05</span>
            <Trophy className="h-4 w-4 text-accent" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-serif-display text-2xl leading-tight">Scoreboard</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">Let the games begin.</p>
          </div>
        </div>
      </Link>

      {/* OUR FIGHTS — quiet, typographic only */}
      <Link href="/fights" className="group relative overflow-hidden border-t border-border p-6 sm:col-span-1">
        <div className="flex h-full flex-col justify-between">
          <span className="editorial-number text-lg">06</span>
          <div>
            <h3 className="font-serif-display text-2xl leading-tight">Our Fights</h3>
            <p className="mt-1.5 text-xs italic text-muted-foreground">Understand. Repair. Move forward.</p>
          </div>
        </div>
      </Link>

      {/* LITTLE THINGS — paper note motif */}
      <Link href="/little-things" className="group relative overflow-hidden rounded-none border border-border p-6">
        <div className="pointer-events-none absolute -right-3 -top-3 h-14 w-14 rotate-6 border border-accent-soft/50 bg-card shadow-sm transition-transform duration-300 group-hover:rotate-12" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="editorial-number text-lg">07</span>
            <MessageCircleHeart className="h-4 w-4 text-accent" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-serif-display text-2xl leading-tight">Little Things</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">Notes for your heart.</p>
          </div>
        </div>
      </Link>

      {/* OUR RULES — maroon full-bleed banner */}
      <Link
        href="/rules"
        className="group relative col-span-1 overflow-hidden rounded-none bg-accent p-8 text-accent-foreground sm:col-span-2 lg:col-span-4"
      >
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="editorial-number text-lg text-accent-foreground/85">08</span>
            <ScrollText className="h-5 w-5 text-accent-foreground" strokeWidth={1.5} />
            <div>
              <h3 className="font-serif-display text-3xl leading-tight text-accent-foreground">Our Rules</h3>
              <p className="mt-1 text-xs text-accent-foreground/70">The way we choose us. Every day.</p>
            </div>
          </div>
          <ArrowUpRight className="h-5 w-5 text-accent-foreground/70 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
        </div>
      </Link>
    </div>
  );
}
