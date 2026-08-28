"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { Profile } from "@/lib/database.types";

export function MemoryUploadDialog({
  open,
  onClose,
  onUploaded,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  profile: Profile;
}) {
  const supabase = createClient();
  const { push } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  function reset() {
    setFiles([]);
    setCaption("");
    setLocation("");
    setDate(new Date().toISOString().slice(0, 10));
    setTags("");
    setProgress(0);
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const { data: memory, error } = await supabase
        .from("memories")
        .insert({
          caption: caption || null,
          location: location || null,
          memory_date: date,
          added_by: profile.id,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        })
        .select()
        .single();
      if (error || !memory) throw error;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = await uploadFile(supabase, "memories", profile.id, file);
        await supabase.from("memory_media").insert({
          memory_id: memory.id,
          storage_path: path,
          media_type: file.type.startsWith("video") ? "video" : "image",
        });
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      await logActivity(supabase, {
        actionType: "memory_uploaded",
        description: `${profile.display_name} uploaded a memory.`,
        targetType: "memory",
        targetId: memory.id,
      });
      push("Memory saved.", "success");
      reset();
      onUploaded();
      onClose();
    } catch {
      push("Something went wrong uploading this memory. Try again.", "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <p className="mb-4 font-serif-display text-lg">New memory</p>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Photos or videos</Label>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="text-xs"
          />
          {files.length > 0 && <p className="text-xs text-muted-foreground">{files.length} file(s) selected</p>}
        </div>
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
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Mulki" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Tags (comma separated)</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="trip, food, silly" />
        </div>
        <Button className="w-full" size="lg" onClick={handleUpload} disabled={uploading || files.length === 0}>
          {uploading ? `Uploading… ${progress}%` : "Save memory"}
        </Button>
      </div>
    </Dialog>
  );
}
