-- ============================================================
-- Row Level Security
-- This app has exactly two accounts, created manually via the
-- Supabase admin API (see scripts/seed-users.mjs) — public sign-up
-- must stay disabled in Authentication settings. Because of that,
-- any authenticated request is guaranteed to be Shab or Soumya, so
-- shared data uses `auth.role() = 'authenticated'`. Content that is
-- personal to one account (profile edits, presence, scheduled Little
-- Things before reveal) is additionally scoped to auth.uid().
-- ============================================================

alter table public.profiles enable row level security;
alter table public.activity_log enable row level security;
alter table public.places enable row level security;
alter table public.place_media enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.memories enable row level security;
alter table public.memory_media enable row level security;
alter table public.games enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_players enable row level security;
alter table public.game_questions enable row level security;
alter table public.game_answers enable row level security;
alter table public.game_results enable row level security;
alter table public.ttal_statements enable row level security;
alter table public.ttal_guesses enable row level security;
alter table public.drawings enable row level security;
alter table public.truth_dare_prompts enable row level security;
alter table public.truth_dare_rounds enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_completions enable row level security;
alter table public.cards enable row level security;
alter table public.card_draws enable row level security;
alter table public.fights enable row level security;
alter table public.fight_perspectives enable row level security;
alter table public.fight_resolutions enable row level security;
alter table public.little_things enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.rules enable row level security;

-- PROFILES: both can read either profile; only the owner can edit their own.
create policy "profiles_select_authenticated" on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ACTIVITY LOG: shared read, insert only via log_activity() RPC (security definer) or as self.
create policy "activity_select_authenticated" on public.activity_log for select using (auth.role() = 'authenticated');
create policy "activity_insert_self" on public.activity_log for insert with check (auth.uid() = actor_id);

-- Generic "shared read/write, authenticated only" policy set, table by table.
create policy "places_all_authenticated" on public.places for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "place_media_all_authenticated" on public.place_media for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "wishlist_all_authenticated" on public.wishlist_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "memories_all_authenticated" on public.memories for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "memory_media_all_authenticated" on public.memory_media for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "games_select_authenticated" on public.games for select using (auth.role() = 'authenticated');

create policy "game_sessions_all_authenticated" on public.game_sessions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "game_players_all_authenticated" on public.game_players for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "game_questions_all_authenticated" on public.game_questions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "game_answers_all_authenticated" on public.game_answers for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "game_results_all_authenticated" on public.game_results for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "ttal_statements_all_authenticated" on public.ttal_statements for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "ttal_guesses_all_authenticated" on public.ttal_guesses for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "drawings_all_authenticated" on public.drawings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "td_prompts_all_authenticated" on public.truth_dare_prompts for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "td_rounds_all_authenticated" on public.truth_dare_rounds for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "challenges_all_authenticated" on public.challenges for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "challenge_completions_all_authenticated" on public.challenge_completions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "cards_all_authenticated" on public.cards for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "card_draws_all_authenticated" on public.card_draws for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- FIGHTS: shared, but a perspective row is only ever written by its owner (still
-- readable by both once submitted — "private until submitted" is enforced by the
-- app never persisting a draft, only the final submit).
create policy "fights_all_authenticated" on public.fights for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "fight_perspectives_select_authenticated" on public.fight_perspectives for select using (auth.role() = 'authenticated');
create policy "fight_perspectives_insert_own" on public.fight_perspectives for insert with check (auth.uid() = user_id);
create policy "fight_perspectives_update_own" on public.fight_perspectives for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fight_resolutions_select_authenticated" on public.fight_resolutions for select using (auth.role() = 'authenticated');
create policy "fight_resolutions_insert_own" on public.fight_resolutions for insert with check (auth.uid() = user_id);
create policy "fight_resolutions_update_own" on public.fight_resolutions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- LITTLE THINGS: sender always sees their own notes; the recipient can only see
-- a note once its reveal time has passed (or immediately if unscheduled).
create policy "little_things_select" on public.little_things for select using (
  auth.role() = 'authenticated' and (from_user = auth.uid() or reveal_at is null or reveal_at <= now())
);
create policy "little_things_insert_own" on public.little_things for insert with check (auth.uid() = from_user);
create policy "little_things_update_authenticated" on public.little_things for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "little_things_delete_own" on public.little_things for delete using (auth.uid() = from_user);

create policy "achievements_select_authenticated" on public.achievements for select using (auth.role() = 'authenticated');
create policy "user_achievements_select_authenticated" on public.user_achievements for select using (auth.role() = 'authenticated');
create policy "user_achievements_insert_authenticated" on public.user_achievements for insert with check (auth.role() = 'authenticated');

create policy "rules_all_authenticated" on public.rules for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
