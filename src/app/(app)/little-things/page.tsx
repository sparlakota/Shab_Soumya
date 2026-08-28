import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LittleThingsClient } from "@/components/little-things/little-things-client";

export default async function LittleThingsPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: notes } = await supabase.from("little_things").select("*").order("created_at", { ascending: false });

  return <LittleThingsClient initialNotes={notes ?? []} profile={session.profile} partner={session.partner} />;
}
