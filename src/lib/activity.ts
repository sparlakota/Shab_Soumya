import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export async function logActivity(
  supabase: SupabaseClient<Database>,
  args: {
    actionType: string;
    description: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  await supabase.rpc("log_activity", {
    p_action_type: args.actionType,
    p_description: args.description,
    p_target_type: args.targetType ?? null,
    p_target_id: args.targetId ?? null,
    p_metadata: args.metadata ?? {},
  });
}

export const ACTIVITY_LINKS: Record<string, string> = {
  place: "/world",
  wishlist_item: "/wishlist",
  memory: "/memories",
  game_session: "/play",
  fight: "/fights",
  achievement: "/scoreboard",
  little_thing: "/little-things",
  rule: "/rules",
};
