import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GuessMe } from "@/components/play/guess-me/guess-me";
import { ThisOrThat } from "@/components/play/this-or-that/this-or-that";
import { TwoTruths } from "@/components/play/two-truths/two-truths";
import { DrawTogether } from "@/components/play/draw-together/draw-together";
import { CardGame } from "@/components/play/card-game/card-game";
import { RandomChallenge } from "@/components/play/random-challenge/random-challenge";
import { TruthOrDare } from "@/components/play/truth-or-dare/truth-or-dare";
import type { GameSlug } from "@/lib/database.types";

export default async function GameSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: game } = await supabase.from("games").select("*").eq("slug", slug as GameSlug).maybeSingle();
  if (!game) notFound();

  const props = { game, profile: session.profile, partner: session.partner };

  switch (slug) {
    case "guess_me":
      return <GuessMe {...props} />;
    case "this_or_that":
      return <ThisOrThat {...props} />;
    case "two_truths":
      return <TwoTruths {...props} />;
    case "draw_together":
      return <DrawTogether {...props} />;
    case "card_game":
      return <CardGame {...props} />;
    case "random_challenge":
      return <RandomChallenge {...props} />;
    case "truth_or_dare":
      return <TruthOrDare {...props} />;
    default:
      notFound();
  }
}
