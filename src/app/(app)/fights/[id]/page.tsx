import { redirect, notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FightDetailClient } from "@/components/fights/fight-detail-client";

export default async function FightDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: fight } = await supabase.from("fights").select("*").eq("id", id).maybeSingle();
  if (!fight) notFound();

  const [{ data: perspectives }, { data: resolutions }] = await Promise.all([
    supabase.from("fight_perspectives").select("*").eq("fight_id", id),
    supabase.from("fight_resolutions").select("*").eq("fight_id", id),
  ]);

  return (
    <FightDetailClient
      initialFight={fight}
      initialPerspectives={perspectives ?? []}
      initialResolutions={resolutions ?? []}
      profile={session.profile}
      partner={session.partner}
    />
  );
}
