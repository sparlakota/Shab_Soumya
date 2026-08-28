"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { LayoutGrid, GalleryVerticalEnd, Plus, Search, Images } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { MemoryCard, type MemoryWithMedia } from "@/components/memories/memory-card";
import { MemoryUploadDialog } from "@/components/memories/memory-upload-dialog";
import { MemoryDetailDialog } from "@/components/memories/memory-detail-dialog";
import type { Profile } from "@/lib/database.types";

export function MemoriesClient({
  initialMemories,
  profile,
  partner,
}: {
  initialMemories: MemoryWithMedia[];
  profile: Profile;
  partner: Profile;
}) {
  const supabase = createClient();
  const [memories, setMemories] = useState(initialMemories);
  const [view, setView] = useState<"grid" | "timeline">("grid");
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<MemoryWithMedia | null>(null);

  async function refresh() {
    const { data } = await supabase
      .from("memories")
      .select("*, memory_media(*)")
      .order("memory_date", { ascending: false });
    setMemories((data as unknown as MemoryWithMedia[]) ?? []);
  }

  useEffect(() => {
    const channel = supabase
      .channel("memories-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "memories" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = memories.filter((m) => {
    if (personFilter && m.added_by !== personFilter) return false;
    if (search) {
      const haystack = `${m.caption ?? ""} ${m.location ?? ""} ${m.tags.join(" ")}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const timelineGroups = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => a.memory_date.localeCompare(b.memory_date));
    const groups = new Map<string, MemoryWithMedia[]>();
    for (const m of sorted) {
      const key = format(new Date(m.memory_date), "MMMM yyyy");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <PageHeader
        title="Memories"
        tagline="Things worth remembering."
        number="04"
        action={
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" /> Upload
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search memories…" className="pl-10" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {[profile, partner].map((p) => (
              <button
                key={p.id}
                onClick={() => setPersonFilter(personFilter === p.id ? null : p.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  personFilter === p.id ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
                }`}
              >
                {p.display_name}
              </button>
            ))}
          </div>
          <div className="flex overflow-hidden rounded-full border border-border">
            <button
              onClick={() => setView("grid")}
              className={`p-2 ${view === "grid" ? "bg-accent/10 text-accent" : "text-muted-foreground"}`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("timeline")}
              className={`p-2 ${view === "timeline" ? "bg-accent/10 text-accent" : "text-muted-foreground"}`}
              aria-label="Timeline view"
            >
              <GalleryVerticalEnd className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Nothing here yet."
          description="Let's give us something to remember."
          action={
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4" /> Upload a memory
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="columns-2 sm:columns-3 md:columns-4">
          {filtered.map((m) => (
            <MemoryCard key={m.id} memory={m} onClick={() => setSelected(m)} />
          ))}
        </div>
      ) : (
        <div className="relative space-y-10 pl-6">
          <div className="absolute bottom-0 left-[7px] top-2 w-px bg-border" />
          {timelineGroups.map(([label, group]) => (
            <div key={label} className="relative">
              <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-accent bg-background" />
              <p className="mb-3 font-serif-display text-lg text-accent">{label}</p>
              <div className="columns-2 sm:columns-3 md:columns-4">
                {group.map((m) => (
                  <MemoryCard key={m.id} memory={m} onClick={() => setSelected(m)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <MemoryUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={refresh} profile={profile} />
      <MemoryDetailDialog memory={selected} onClose={() => setSelected(null)} onSaved={refresh} onDeleted={refresh} />
    </div>
  );
}
