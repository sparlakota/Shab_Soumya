"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { Profile } from "@/lib/database.types";

export function AddFightDialog({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: Profile }) {
  const supabase = createClient();
  const router = useRouter();
  const { push } = useToast();
  const [title, setTitle] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [actualIssue, setActualIssue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { data: fight, error } = await supabase
        .from("fights")
        .insert({
          title: title.trim(),
          what_happened: whatHappened || null,
          actual_issue: actualIssue || null,
          created_by: profile.id,
        })
        .select()
        .single();
      if (error || !fight) throw error;
      await logActivity(supabase, {
        actionType: "fight_added",
        description: `${profile.display_name} logged a fight to work through.`,
        targetType: "fight",
        targetId: fight.id,
      });
      setTitle("");
      setWhatHappened("");
      setActualIssue("");
      onClose();
      router.push(`/fights/${fight.id}`);
    } catch {
      push("Couldn't save that. Try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <p className="mb-1 font-serif-display text-lg">Add a fight</p>
      <p className="mb-4 text-sm text-muted-foreground">Just the facts for now — perspectives come next.</p>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>What was this about?</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        </div>
        <div className="space-y-1.5">
          <Label>What happened?</Label>
          <Textarea value={whatHappened} onChange={(e) => setWhatHappened(e.target.value)} rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label>What was the actual issue?</Label>
          <Textarea
            value={actualIssue}
            onChange={(e) => setActualIssue(e.target.value)}
            rows={2}
            placeholder="Try to separate the event from the emotion."
          />
        </div>
        <Button className="w-full" size="lg" onClick={handleSubmit} disabled={saving || !title.trim()}>
          {saving ? "Saving…" : "Continue to perspectives"}
        </Button>
      </div>
    </Dialog>
  );
}
