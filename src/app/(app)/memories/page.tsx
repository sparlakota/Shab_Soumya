import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MemoriesClient } from "@/components/memories/memories-client";
import type { MemoryWithMedia } from "@/components/memories/memory-card";

export default async function MemoriesPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: memories } = await supabase
    .from("memories")
    .select("*, memory_media(*)")
    .order("memory_date", { ascending: false });

  return (
    <MemoriesClient
      initialMemories={(memories as unknown as MemoryWithMedia[]) ?? []}
      profile={session.profile}
    />
  );
}
