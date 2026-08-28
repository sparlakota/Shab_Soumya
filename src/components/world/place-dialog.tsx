"use client";

import { useEffect, useState } from "react";
import { Trash2, MapPin, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadFile, getSignedUrls } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
import { PLACE_CATEGORIES } from "@/lib/place-category";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { Place, PlaceCategory, PlaceMedia, Profile } from "@/lib/database.types";

export function PlaceDialog({
  open,
  onClose,
  onSaved,
  onDeleted,
  profile,
  place,
  initialLatLng,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
  profile: Profile;
  place?: Place | null;
  initialLatLng?: { lat: number; lng: number } | null;
}) {
  const supabase = createClient();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("want_to_go");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [media, setMedia] = useState<(PlaceMedia & { url?: string })[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (place) {
      setName(place.name);
      setCategory(place.category);
      setDescription(place.description ?? "");
      setNotes(place.notes ?? "");
      setDate(place.place_date ?? "");
      supabase
        .from("place_media")
        .select("*")
        .eq("place_id", place.id)
        .then(async ({ data }) => {
          const urls = await getSignedUrls(supabase, "world", (data ?? []).map((m) => m.storage_path));
          setMedia((data ?? []).map((m) => ({ ...m, url: urls[m.storage_path] })));
        });
    } else {
      setName("");
      setCategory("want_to_go");
      setDescription("");
      setNotes("");
      setDate("");
      setMedia([]);
    }
  }, [place, open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (place) {
        await supabase
          .from("places")
          .update({ name: name.trim(), category, description: description || null, notes: notes || null, place_date: date || null })
          .eq("id", place.id);
      } else {
        if (!initialLatLng) return;
        const { data: created } = await supabase
          .from("places")
          .insert({
            name: name.trim(),
            category,
            description: description || null,
            notes: notes || null,
            place_date: date || null,
            lat: initialLatLng.lat,
            lng: initialLatLng.lng,
            added_by: profile.id,
          })
          .select()
          .single();
        if (created) {
          await logActivity(supabase, {
            actionType: "place_added",
            description: `${profile.display_name} added ${name.trim()} to Our World.`,
            targetType: "place",
            targetId: created.id,
          });
        }
      }
      push("Saved.", "success");
      onSaved();
      onClose();
    } catch {
      push("Couldn't save that place. Try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!place || !e.target.files) return;
    for (const file of Array.from(e.target.files)) {
      try {
        const path = await uploadFile(supabase, "world", profile.id, file);
        const { data: m } = await supabase.from("place_media").insert({ place_id: place.id, storage_path: path }).select().single();
        if (m) {
          const url = (await getSignedUrls(supabase, "world", [path]))[path];
          setMedia((prev) => [...prev, { ...m, url }]);
        }
      } catch {
        push("Couldn't upload a photo. Try again.", "error");
      }
    }
  }

  async function handleDeletePhoto(id: string) {
    await supabase.from("place_media").delete().eq("id", id);
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleDelete() {
    if (!place) return;
    await supabase.from("places").delete().eq("id", place.id);
    onDeleted?.();
    onClose();
  }

  async function handleMarkVisited() {
    if (!place) return;
    await supabase.from("places").update({ visited: true, visited_at: new Date().toISOString() }).eq("id", place.id);
    push("Marked as visited.", "success");
    onSaved();
  }

  async function handleAddToMemories() {
    if (!place) return;
    const { data: memory } = await supabase
      .from("memories")
      .insert({ caption: place.name, location: place.name, memory_date: place.place_date ?? new Date().toISOString().slice(0, 10), added_by: profile.id, tags: ["our-world"] })
      .select()
      .single();
    if (memory) {
      await logActivity(supabase, {
        actionType: "memory_uploaded",
        description: `${profile.display_name} added ${place.name} to Memories.`,
        targetType: "memory",
        targetId: memory.id,
      });
      push("Added to Memories — attach photos there.", "success");
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <p className="mb-4 flex items-center gap-2 font-serif-display text-lg">
        <MapPin className="h-4 w-4 text-accent" />
        {place ? "Edit place" : "Add a place"}
      </p>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mulki" />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onChange={(e) => setCategory(e.target.value as PlaceCategory)}>
            {PLACE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {place && (
          <div className="space-y-1.5">
            <Label>Photos</Label>
            <div className="flex flex-wrap gap-2">
              {media.map((m) => (
                <div key={m.id} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                  {m.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  )}
                  <button
                    onClick={() => handleDeletePhoto(m.id)}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-accent-soft">
                +
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
          </div>
        )}

        {place?.category === "want_to_go" && !place.visited && (
          <Button variant="outline" className="w-full" onClick={handleMarkVisited}>
            <CheckCircle2 className="h-4 w-4" /> Mark as visited
          </Button>
        )}
        {place?.visited && (
          <Button variant="outline" className="w-full" onClick={handleAddToMemories}>
            Save to Memories
          </Button>
        )}

        <div className="flex gap-3 pt-1">
          {place && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button className="flex-1" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
