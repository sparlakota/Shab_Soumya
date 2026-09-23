-- Realtime was only ever enabled for guess_me_entries (added alongside it in
-- 0005). Every other live-sync feature in the app — This or That, Draw
-- Together, Two Truths, Truth or Dare, Card Game, Random Challenge, partner
-- online/offline presence, Our World, Wishlist, Memories, Our Fights, Little
-- Things, Our Rules — subscribes to postgres_changes on these tables but the
-- Supabase project was never told to publish changes for them, so nothing
-- ever pushed live; every screen needed a manual reload to see the other
-- person's update. This is what actually makes those subscriptions work.

alter publication supabase_realtime add table
  public.profiles,
  public.fights,
  public.fight_perspectives,
  public.fight_resolutions,
  public.game_sessions,
  public.game_players,
  public.game_answers,
  public.places,
  public.ttal_guesses,
  public.wishlist_items,
  public.memories,
  public.truth_dare_rounds,
  public.little_things,
  public.rules;

-- Publishing INSERTs alone isn't enough: Postgres logical replication only
-- includes the primary key for UPDATE/DELETE unless REPLICA IDENTITY FULL is
-- set, and Supabase Realtime needs the full old+new row to evaluate a
-- column filter (e.g. game_id=eq.<uuid>) on those events. Without this,
-- INSERT-triggered pushes work but UPDATE-triggered ones (marking a round
-- completed, toggling online status, resolving a fight, etc.) silently never
-- reach subscribers — confirmed by testing Card Game's shared-draw flow live
-- across two real accounts: drawing a card pushed instantly, marking it done
-- did not, until this was added.
alter table public.profiles replica identity full;
alter table public.fights replica identity full;
alter table public.fight_perspectives replica identity full;
alter table public.fight_resolutions replica identity full;
alter table public.game_sessions replica identity full;
alter table public.game_players replica identity full;
alter table public.game_answers replica identity full;
alter table public.places replica identity full;
alter table public.ttal_guesses replica identity full;
alter table public.wishlist_items replica identity full;
alter table public.memories replica identity full;
alter table public.truth_dare_rounds replica identity full;
alter table public.little_things replica identity full;
alter table public.rules replica identity full;
alter table public.guess_me_entries replica identity full;
