"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadFile, getSignedUrl } from "@/lib/storage";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { Profile } from "@/lib/database.types";

export function ProfileForm({ profile, avatarUrl }: { profile: Profile; avatarUrl: string | null }) {
  const router = useRouter();
  const { push } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [status, setStatus] = useState(profile.status ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [birthday, setBirthday] = useState(profile.birthday ?? "");
  const [avatar, setAvatar] = useState(avatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const supabase = createClient();
      const path = await uploadFile(supabase, "avatars", profile.id, file);
      await supabase.from("profiles").update({ avatar_path: path }).eq("id", profile.id);
      const url = await getSignedUrl(supabase, "avatars", path);
      setAvatar(url);
      push("Photo updated.", "success");
    } catch {
      push("Couldn't upload that photo. Try again.", "error");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          status: status || null,
          bio: bio || null,
          birthday: birthday || null,
        })
        .eq("id", profile.id);
      if (error) throw error;
      push("Saved.", "success");
      router.refresh();
    } catch {
      push("Something went wrong saving your profile. Try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.rpc("touch_presence", { p_online: false });
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative"
            aria-label="Change profile photo"
          >
            <Avatar src={avatar} name={profile.display_name} size={72} />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/30">
              {uploadingAvatar ? (
                <Loader2 className="h-5 w-5 animate-spin text-white opacity-0 group-hover:opacity-100" />
              ) : (
                <Camera className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div>
            <p className="font-serif-display text-lg">{profile.display_name}</p>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="display_name">Display name</Label>
            <Input id="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Short status</Label>
            <Input
              id="status"
              placeholder="e.g. thinking about tacos"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birthday">Birthday</Label>
            <Input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={handleLogout} className="w-full text-danger hover:bg-danger/5">
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </div>
  );
}
