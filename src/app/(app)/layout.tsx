import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/storage";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const { profile, partner } = session;
  const supabase = await createClient();
  const avatarUrl = await getSignedUrl(supabase, "avatars", profile.avatar_path);

  return (
    <AppShell profile={profile} partner={partner} avatarUrl={avatarUrl}>
      {children}
    </AppShell>
  );
}
