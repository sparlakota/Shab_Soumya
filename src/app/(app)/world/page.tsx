import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WorldClient } from "@/components/world/world-client";

export default async function WorldPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: places } = await supabase.from("places").select("*").order("created_at", { ascending: false });

  return <WorldClient initialPlaces={places ?? []} profile={session.profile} />;
}
