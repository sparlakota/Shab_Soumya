import { redirect } from "next/navigation";
import Link from "next/link";
import { Gamepad2, Map, ListChecks, Images, HeartHandshake, ArrowRight, CalendarHeart } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/storage";
import { LiveStatusSection } from "@/components/home/live-status-section";
import { StatCard } from "@/components/home/stat-card";
import { ActivityFeed } from "@/components/home/activity-feed";
import { HeroConnector } from "@/components/home/hero-connector";
import { SectionGrid } from "@/components/home/section-grid";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function HomePage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");
  const { profile, partner } = session;

  const supabase = await createClient();

  const [
    { data: activity },
    { count: gamesPlayed },
    { count: placesSaved },
    { count: wishlistItems },
    { count: memoriesCount },
    { count: fightsResolved },
    { count: placesVisited },
    { data: nextTripPlace },
    { data: upcomingWishlist },
    { data: recentMemoryMedia },
    profileAvatarUrl,
    partnerAvatarUrl,
  ] = await Promise.all([
    supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(8),
    supabase.from("game_sessions").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("places").select("*", { count: "exact", head: true }),
    supabase.from("wishlist_items").select("*", { count: "exact", head: true }),
    supabase.from("memories").select("*", { count: "exact", head: true }),
    supabase.from("fights").select("*", { count: "exact", head: true }).eq("status", "resolved"),
    supabase.from("places").select("*", { count: "exact", head: true }).eq("visited", true),
    supabase
      .from("places")
      .select("*")
      .eq("category", "next_trip")
      .order("place_date", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("wishlist_items")
      .select("*")
      .eq("category", "places")
      .neq("status", "done")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("memory_media")
      .select("storage_path")
      .eq("media_type", "image")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getSignedUrl(supabase, "avatars", profile.avatar_path),
    getSignedUrl(supabase, "avatars", partner.avatar_path),
  ]);

  const memoryPreviewUrl = recentMemoryMedia
    ? await getSignedUrl(supabase, "memories", recentMemoryMedia.storage_path)
    : null;

  const upcoming = nextTripPlace ?? upcomingWishlist ?? null;
  const upcomingLabel = nextTripPlace
    ? nextTripPlace.name
    : upcomingWishlist
      ? upcomingWishlist.title
      : null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      {/* ---------- Cinematic hero ---------- */}
      <div className="mb-16 flex items-center justify-between sm:mb-20">
        <p className="label-eyebrow">
          S&amp;S <span className="mx-1.5 opacity-40">·</span> Private Space
        </p>
        <p className="label-eyebrow">2026</p>
      </div>

      <div className="mb-16 text-center sm:mb-24">
        <h1 className="font-serif-display text-6xl font-medium leading-[0.92] tracking-tight sm:text-8xl md:text-9xl">
          BETWEEN
          <br />
          <span className="italic text-accent">US</span>
        </h1>
        <p className="mx-auto mt-6 max-w-sm text-base italic text-muted-foreground">
          Our little corner of the internet.
        </p>
      </div>

      <div className="mb-20 sm:mb-28">
        <HeroConnector profile={profile} partner={partner} avatarA={profileAvatarUrl} avatarB={partnerAvatarUrl} />
      </div>

      {/* ---------- Editorial section grid ---------- */}
      <div className="mb-20 sm:mb-28">
        <SectionGrid
          memoryPreviewUrl={memoryPreviewUrl}
          placesVisited={placesVisited ?? 0}
          placesWaiting={(placesSaved ?? 0) - (placesVisited ?? 0)}
        />
      </div>

      {/* ---------- Functional dashboard: status, stats, activity ---------- */}
      <div className="mb-16 border-t border-border pt-14 sm:mb-20">
        <p className="label-eyebrow mb-5">Current status</p>
        <LiveStatusSection avatarA={profileAvatarUrl} avatarB={partnerAvatarUrl} />
      </div>

      <div className="mb-16 sm:mb-20">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard icon={Gamepad2} value={gamesPlayed ?? 0} label="Games played" />
          <StatCard icon={Map} value={placesSaved ?? 0} label="Places saved" />
          <StatCard icon={ListChecks} value={wishlistItems ?? 0} label="Wishlist items" />
          <StatCard icon={Images} value={memoriesCount ?? 0} label="Memories" />
          <StatCard icon={HeartHandshake} value={fightsResolved ?? 0} label="Fights resolved" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <p className="label-eyebrow mb-4">Recent activity</p>
          <ActivityFeed items={activity ?? []} />
        </section>

        <section>
          <p className="label-eyebrow mb-4">Upcoming</p>
          {upcoming && upcomingLabel ? (
            <Link href={nextTripPlace ? "/world" : "/wishlist"}>
              <Card className="flex items-center gap-3 rounded-none p-5 transition-colors hover:border-accent-soft">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <CalendarHeart className="h-5 w-5 text-accent" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif-display text-lg">{upcomingLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {nextTripPlace ? "Next trip" : "On the wishlist"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          ) : (
            <EmptyState
              icon={CalendarHeart}
              title="Nothing planned yet."
              description="Add a place or a wishlist item and it'll show up here."
            />
          )}
        </section>
      </div>

      <p className="mt-20 text-center font-serif-display text-xl italic text-muted-foreground sm:mt-28">
        Two people. One little world.
      </p>
    </div>
  );
}
