import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/storage";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "@/components/settings/profile-form";

export default async function SettingsPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const avatarUrl = await getSignedUrl(supabase, "avatars", session.profile.avatar_path);

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      <PageHeader title="Settings" tagline="Your corner of our corner." />
      <ProfileForm profile={session.profile} avatarUrl={avatarUrl} />
    </div>
  );
}
