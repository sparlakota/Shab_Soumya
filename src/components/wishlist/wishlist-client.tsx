"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search, ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { WISHLIST_CATEGORIES, WISHLIST_STATUSES } from "@/lib/wishlist-meta";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { WishlistCard } from "@/components/wishlist/wishlist-card";
import { WishlistDialog } from "@/components/wishlist/wishlist-dialog";
import type { Profile, WishlistItem } from "@/lib/database.types";

export function WishlistClient({ initialItems, profile }: { initialItems: WishlistItem[]; profile: Profile }) {
  const supabase = createClient();
  const { push } = useToast();
  const [items, setItems] = useState(initialItems);
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<WishlistItem | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  async function refresh() {
    const { data } = await supabase.from("wishlist_items").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  }

  useEffect(() => {
    const channel = supabase
      .channel("wishlist-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "wishlist_items" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleComplete(item: WishlistItem) {
    await supabase
      .from("wishlist_items")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", item.id);
    await logActivity(supabase, {
      actionType: "wishlist_completed",
      description: `${profile.display_name} completed ${item.title}.`,
      targetType: "wishlist_item",
      targetId: item.id,
    });
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 1400);
    refresh();
  }

  async function handleSaveToMemories(item: WishlistItem) {
    const { data: memory } = await supabase
      .from("memories")
      .insert({
        caption: item.title,
        location: item.location,
        added_by: profile.id,
        tags: ["wishlist"],
      })
      .select()
      .single();
    if (memory) {
      await supabase.from("wishlist_items").update({ saved_to_memories: true }).eq("id", item.id);
      await logActivity(supabase, {
        actionType: "memory_uploaded",
        description: `${profile.display_name} saved ${item.title} to Memories.`,
        targetType: "memory",
        targetId: memory.id,
      });
      push("Saved to Memories — attach photos there.", "success");
      refresh();
    }
  }

  const filtered = items.filter((i) => {
    if (category && i.category !== category) return false;
    if (status && i.status !== status) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <PageHeader
        title="Wishlist"
        tagline="Things we haven't done yet."
        number="03"
        action={
          <Button
            onClick={() => {
              setSelected(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        }
      />

      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search wishlist…" className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(null)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!category ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"}`}
          >
            All categories
          </button>
          {WISHLIST_CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${category === c.value ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatus(null)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!status ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"}`}
          >
            All statuses
          </button>
          {WISHLIST_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${status === s.value ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing planned yet."
          description="Add the first thing."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Add to wishlist
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              onClick={() => {
                setSelected(item);
                setDialogOpen(true);
              }}
              onComplete={() => handleComplete(item)}
              onSaveToMemories={() => handleSaveToMemories(item)}
            />
          ))}
        </div>
      )}

      <WishlistDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={refresh} onDeleted={refresh} profile={profile} item={selected} />

      <AnimatePresence>
        {celebrate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
          >
            <div className="rounded-full bg-accent px-6 py-3 font-serif-display text-2xl text-accent-foreground shadow-xl">
              ✓ Done
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
