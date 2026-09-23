"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Images } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSignedUrls } from "@/lib/storage";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MemoryUploadDialog } from "@/components/memories/memory-upload-dialog";
import { MemoryDetailDialog } from "@/components/memories/memory-detail-dialog";
import type { MemoryWithMedia } from "@/components/memories/memory-card";
import type { Profile } from "@/lib/database.types";

export function MemoriesClient({
  initialMemories,
  profile,
}: {
  initialMemories: MemoryWithMedia[];
  profile: Profile;
}) {
  const supabase = createClient();
  const [memories, setMemories] = useState(initialMemories);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<MemoryWithMedia | null>(null);

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

  useEffect(() => {
    const allPaths = memories.flatMap((m) => m.memory_media.map((mm) => mm.storage_path));
    if (allPaths.length === 0) return;
    getSignedUrls(supabase, "memories", allPaths).then((u) => setUrls((prev) => ({ ...prev, ...u })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memories]);

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

      {memories.length === 0 ? (
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
      ) : (
        <div className="space-y-12">
          {memories.map((m) => (
            <section key={m.id}>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="font-serif-display text-2xl sm:text-3xl">
                    {m.location ? `${m.location} · ` : ""}
                    {format(new Date(m.memory_date), "MMMM yyyy")}
                  </p>
                  {m.caption && <p className="mt-1 italic text-muted-foreground">{m.caption}</p>}
                </div>
                <button
                  onClick={() => setEditing(m)}
                  className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-accent"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {m.memory_media.map((media) => (
                  <div key={media.id} className="aspect-square overflow-hidden rounded-lg border border-border bg-card">
                    {urls[media.storage_path] ? (
                      media.media_type === "video" ? (
                        <video src={urls[media.storage_path]} className="h-full w-full object-cover" muted controls />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={urls[media.storage_path]} alt="" className="h-full w-full object-cover" />
                      )
                    ) : (
                      <div className="h-full w-full animate-pulse bg-border/40" />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <MemoryUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={refresh} profile={profile} />
      <MemoryDetailDialog memory={editing} onClose={() => setEditing(null)} onSaved={refresh} onDeleted={refresh} />
    </div>
  );
}
