"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadFile, getSignedUrl } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
import { WISHLIST_CATEGORIES, WISHLIST_PRIORITIES } from "@/lib/wishlist-meta";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { Profile, WishlistCategory, WishlistItem, WishlistPriority } from "@/lib/database.types";

export function WishlistDialog({
  open,
  onClose,
  onSaved,
  onDeleted,
  profile,
  item,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
  profile: Profile;
  item?: WishlistItem | null;
}) {
  const supabase = createClient();
  const { push } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<WishlistCategory>("things_to_do");
  const [priority, setPriority] = useState<WishlistPriority>("medium");
  const [location, setLocation] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description ?? "");
      setCategory(item.category);
      setPriority(item.priority);
      setLocation(item.location ?? "");
      setImagePath(item.image_path);
      if (item.image_path) getSignedUrl(supabase, "world", item.image_path).then(setImageUrl);
      else setImageUrl(null);
    } else {
      setTitle("");
      setDescription("");
      setCategory("things_to_do");
      setPriority("medium");
      setLocation("");
      setImagePath(null);
      setImageUrl(null);
    }
  }, [item, open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const path = await uploadFile(supabase, "world", profile.id, file);
      setImagePath(path);
      setImageUrl(await getSignedUrl(supabase, "world", path));
    } catch {
      push("Couldn't upload that image.", "error");
    }
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (item) {
        await supabase
          .from("wishlist_items")
          .update({
            title: title.trim(),
            description: description || null,
            category,
            priority,
            location: location || null,
            image_path: imagePath,
          })
          .eq("id", item.id);
      } else {
        const { data: created } = await supabase
          .from("wishlist_items")
          .insert({
            title: title.trim(),
            description: description || null,
            category,
            priority,
            location: location || null,
            image_path: imagePath,
            added_by: profile.id,
          })
          .select()
          .single();
        if (created) {
          await logActivity(supabase, {
            actionType: "wishlist_added",
            description: `${profile.display_name} added ${title.trim()} to the wishlist.`,
            targetType: "wishlist_item",
            targetId: created.id,
          });
        }
      }
      push("Saved.", "success");
      onSaved();
      onClose();
    } catch {
      push("Something went wrong saving that. Try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    await supabase.from("wishlist_items").delete().eq("id", item.id);
    onDeleted?.();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <p className="mb-4 font-serif-display text-lg">{item ? "Edit item" : "Add to wishlist"}</p>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Try that new ramen place" />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value as WishlistCategory)}>
              {WISHLIST_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as WishlistPriority)}>
              {WISHLIST_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Location (optional)</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bangalore" />
        </div>
        <div className="space-y-1.5">
          <Label>Image (optional)</Label>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="mb-2 h-24 w-full rounded-xl object-cover" />
          )}
          <input type="file" accept="image/*" onChange={handleImage} className="text-xs" />
        </div>

        <div className="flex gap-3 pt-1">
          {item && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button className="flex-1" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
