import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RulesClient } from "@/components/rules/rules-client";

export default async function RulesPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: rules } = await supabase.from("rules").select("*").order("order_index", { ascending: true });

  return <RulesClient initialRules={rules ?? []} profile={session.profile} partner={session.partner} />;
}
