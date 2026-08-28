"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, HeartHandshake } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_META } from "@/lib/fight-meta";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AddFightDialog } from "@/components/fights/add-fight-dialog";
import type { Fight, Profile } from "@/lib/database.types";

const FILTERS = ["all", "unresolved", "discussing", "resolved"] as const;

export function FightsClient({ initialFights, profile }: { initialFights: Fight[]; profile: Profile }) {
  const supabase = createClient();
  const [fights, setFights] = useState(initialFights);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel("fights-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "fights" }, async () => {
        const { data } = await supabase.from("fights").select("*").order("created_at", { ascending: false });
        setFights(data ?? []);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = filter === "all" ? fights : fights.filter((f) => f.status === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === "resolved" && b.status !== "resolved") return 1;
    if (a.status !== "resolved" && b.status === "resolved") return -1;
    return b.created_at.localeCompare(a.created_at);
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <PageHeader
        title="Our Fights"
        tagline="Understand. Repair. Move forward."
        number="06"
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add a fight
          </Button>
        }
      />

      <div className="mb-10 border-y border-border py-8 text-center">
        <p className="font-serif-display text-2xl italic leading-relaxed">
          &ldquo;We&apos;re not keeping score.
          <br />
          We&apos;re keeping perspective.&rdquo;
        </p>
        <p className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground">
          The problem is the problem. We&apos;re on the same team. The goal isn&apos;t to win the
          argument — it&apos;s to protect the relationship.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === f ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent-soft"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={HeartHandshake} title="Nothing to fix right now." description="Peaceful times. Keep it that way. ❤️" />
      ) : (
        <div className="relative space-y-1 border-l border-border pl-6">
          {sorted.map((fight) => (
            <Link key={fight.id} href={`/fights/${fight.id}`} className="group block">
              <div
                className={`relative border-b border-border py-5 transition-colors ${fight.status === "resolved" ? "opacity-60" : ""}`}
              >
                <span className="absolute -left-[29px] top-6 h-2 w-2 rounded-full bg-accent" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="label-eyebrow mb-1">Fight #{fight.fight_number}</p>
                    <p className="truncate font-serif-display text-xl transition-colors group-hover:text-accent">
                      {fight.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{format(new Date(fight.created_at), "MMM d, yyyy")}</p>
                  </div>
                  <Badge tone={STATUS_META[fight.status].tone}>
                    {fight.status === "resolved" ? "Resolved 💚" : STATUS_META[fight.status].label}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <AddFightDialog open={addOpen} onClose={() => setAddOpen(false)} profile={profile} />
    </div>
  );
}
