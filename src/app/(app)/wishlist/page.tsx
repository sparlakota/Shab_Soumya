import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WishlistClient } from "@/components/wishlist/wishlist-client";

export default async function WishlistPage() {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: items } = await supabase.from("wishlist_items").select("*").order("created_at", { ascending: false });

  return <WishlistClient initialItems={items ?? []} profile={session.profile} />;
}
