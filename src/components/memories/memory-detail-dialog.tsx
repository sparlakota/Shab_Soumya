"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSignedUrls } from "@/lib/storage";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { MemoryWithMedia } from "@/components/memories/memory-card";

export function MemoryDetailDialog({
  memory,
  onClose,
  onSaved,
  onDeleted,
}: {
  memory: MemoryWithMedia | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const supabase = createClient();
  const { push } = useToast();
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [tags, setTags] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!memory) return;
    setCaption(memory.caption ?? "");
    setLocation(memory.location ?? "");
    setDate(memory.memory_date);
    setTags(memory.tags.join(", "));
    getSignedUrls(supabase, "memories", memory.memory_media.map((m) => m.storage_path)).then(setUrls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory]);

  async function handleSave() {
    if (!memory) return;
    setSaving(true);
    try {
      await supabase
        .from("memories")
        .update({
          caption: caption || null,
          location: location || null,
          memory_date: date,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        })
        .eq("id", memory.id);
      push("Saved.", "success");
      onSaved();
      onClose();
    } catch {
      push("Couldn't save your changes. Try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!memory) return;
    await supabase.from("memories").delete().eq("id", memory.id);
    onDeleted();
    onClose();
  }

  if (!memory) return null;

  return (
    <Dialog open={!!memory} onClose={onClose} className="sm:max-w-xl">
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {memory.memory_media.map((m) =>
          urls[m.storage_path] ? (
            m.media_type === "video" ? (
              <video key={m.id} src={urls[m.storage_path]} controls className="aspect-square w-full rounded-lg object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m.id} src={urls[m.storage_path]} alt="" className="aspect-square w-full rounded-lg object-cover" />
            )
          ) : (
            <div key={m.id} className="aspect-square w-full animate-pulse rounded-lg bg-border/50" />
          )
        )}
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Caption</Label>
          <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Tags</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div className="flex gap-3 pt-1">
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
