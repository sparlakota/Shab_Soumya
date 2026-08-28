import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

// Every page under (app) calls this to get its redirect-guard data, and the
// (app) layout calls it again for the shell. `cache()` gives per-request
// memoization so that pair of calls shares one auth round trip and one
// profiles query instead of doing each twice.
export const getCurrentProfile = cache(async (): Promise<{
  profile: Profile;
  partner: Profile;
} | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profiles } = await supabase.from("profiles").select("*");
  if (!profiles || profiles.length === 0) return null;

  const profile = profiles.find((p) => p.id === user.id);
  const partner = profiles.find((p) => p.id !== user.id);
  if (!profile) return null;

  return { profile, partner: partner ?? profile };
});
