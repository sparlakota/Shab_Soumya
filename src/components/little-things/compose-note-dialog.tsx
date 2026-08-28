"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
import { LITTLE_THING_CATEGORIES } from "@/lib/little-things-meta";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { LittleThingCategory, Profile } from "@/lib/database.types";

export function ComposeNoteDialog({
  open,
  onClose,
  onSent,
  profile,
  partnerName,
}: {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  profile: Profile;
  partnerName: string;
}) {
  const supabase = createClient();
  const { push } = useToast();
  const [category, setCategory] = useState<LittleThingCategory>("just_because");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [revealAt, setRevealAt] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    try {
      let imagePath: string | null = null;
      if (image) imagePath = await uploadFile(supabase, "little-things", profile.id, image);

      await supabase.from("little_things").insert({
        from_user: profile.id,
        category,
        message: message.trim(),
        image_path: imagePath,
        reveal_at: revealAt ? new Date(revealAt).toISOString() : null,
      });
      await logActivity(supabase, {
        actionType: "little_thing_sent",
        description: `${profile.display_name} left something for ${partnerName}.`,
        targetType: "little_thing",
      });
      push("Sent.", "success");
      setMessage("");
      setImage(null);
      setRevealAt("");
      onSent();
      onClose();
    } catch {
      push("Couldn't send that. Try again.", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <p className="mb-4 font-serif-display text-lg">Leave something for {partnerName}</p>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onChange={(e) => setCategory(e.target.value as LittleThingCategory)}>
            {LITTLE_THING_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Thought of you today." />
        </div>
        <div className="space-y-1.5">
          <Label>Photo (optional)</Label>
          <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} className="text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label>Reveal later (optional)</Label>
          <Input type="datetime-local" value={revealAt} onChange={(e) => setRevealAt(e.target.value)} />
          <p className="text-xs text-muted-foreground">Leave blank to send it right away.</p>
        </div>
        <Button className="w-full" size="lg" onClick={handleSend} disabled={sending || !message.trim()}>
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </Dialog>
  );
}
