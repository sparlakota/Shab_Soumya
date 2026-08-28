import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FightsClient } from "@/components/fights/fights-client";

export default async function FightsPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: fights } = await supabase.from("fights").select("*").order("created_at", { ascending: false });

  return <FightsClient initialFights={fights ?? []} profile={session.profile} />;
}
