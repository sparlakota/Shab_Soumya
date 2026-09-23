-- SHAB × SOUMYA — core schema
-- Run in order: 0001_schema.sql, 0002_functions_triggers.sql, 0003_rls.sql, 0004_storage.sql
-- Then supabase/seed.sql for game content banks + default rules + achievement definitions.

create extension if not exists pgcrypto;

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username in ('shab', 'soumya')),
  display_name text not null,
  avatar_path text,
  status text,
  bio text,
  birthday date,
  is_online boolean not null default false,
  last_seen_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action_type text not null,
  description text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);

-- ============================================================
-- OUR WORLD — places
-- ============================================================
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision not null,
  lng double precision not null,
  category text not null check (category in ('been_here', 'want_to_go', 'special_place', 'next_trip')),
  description text,
  notes text,
  place_date date,
  added_by uuid not null references public.profiles(id),
  visited boolean not null default false,
  visited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.place_media (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- WISHLIST
-- ============================================================
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null check (category in ('places', 'food', 'movies_shows', 'things_to_do', 'experiences', 'someday')),
  added_by uuid not null references public.profiles(id),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'to_do' check (status in ('to_do', 'in_progress', 'done')),
  image_path text,
  location text,
  completed_at timestamptz,
  saved_to_memories boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- MEMORIES
-- ============================================================
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  caption text,
  memory_date date not null default current_date,
  location text,
  added_by uuid not null references public.profiles(id),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memory_media (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index if not exists memory_media_memory_idx on public.memory_media (memory_id);

-- ============================================================
-- GAMES — registry + generic session/player scaffolding
-- ============================================================
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  icon text not null
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'locked', 'revealed', 'completed', 'abandoned')),
  category text,
  custom_question text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists game_sessions_game_idx on public.game_sessions (game_id, created_at desc);

create table if not exists public.game_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists public.game_questions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id),
  category text not null default 'random',
  prompt text not null,
  target_user_id uuid references public.profiles(id),
  is_custom boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.game_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  question_id uuid references public.game_questions(id),
  user_id uuid not null references public.profiles(id),
  answer text not null,
  locked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade unique,
  is_match boolean,
  winner_id uuid references public.profiles(id),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Two Truths & a Lie
create table if not exists public.ttal_statements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  statement_order int not null,
  statement text not null,
  is_lie boolean not null default false,
  created_by uuid not null references public.profiles(id)
);

create table if not exists public.ttal_guesses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  guesser_id uuid not null references public.profiles(id),
  guessed_statement_id uuid not null references public.ttal_statements(id),
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  unique (session_id, guesser_id)
);

-- Draw Together
create table if not exists public.drawings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  storage_path text not null,
  submitted_at timestamptz not null default now(),
  saved_to_memories boolean not null default false,
  unique (session_id, user_id)
);

-- Truth or Dare
create table if not exists public.truth_dare_prompts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('truth', 'dare')),
  level text not null check (level in ('cute', 'funny', 'deep', 'flirty', 'bold')),
  prompt text not null,
  is_custom boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.truth_dare_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  player_turn uuid not null references public.profiles(id),
  prompt_id uuid references public.truth_dare_prompts(id),
  custom_text text,
  type text not null check (type in ('truth', 'dare')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Random Challenge
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  prompt text not null,
  is_custom boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_completions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id),
  user_id uuid not null references public.profiles(id),
  status text not null check (status in ('completed', 'skipped')),
  completed_at timestamptz not null default now()
);

-- Card Game
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  prompt text not null,
  is_custom boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.card_draws (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id),
  drawn_by uuid not null references public.profiles(id),
  note text,
  completed_at timestamptz not null default now()
);

-- ============================================================
-- OUR FIGHTS
-- ============================================================
create table if not exists public.fights (
  id uuid primary key default gen_random_uuid(),
  fight_number serial,
  title text not null,
  what_happened text,
  actual_issue text,
  what_to_do_differently text,
  what_we_learned text,
  status text not null default 'unresolved' check (status in ('unresolved', 'discussing', 'resolved')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.fight_perspectives (
  id uuid primary key default gen_random_uuid(),
  fight_id uuid not null references public.fights(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  feelings text[] not null default '{}',
  needs text[] not null default '{}',
  perspective text not null,
  other_perspective_guess text,
  submitted_at timestamptz not null default now(),
  unique (fight_id, user_id)
);

create table if not exists public.fight_resolutions (
  id uuid primary key default gen_random_uuid(),
  fight_id uuid not null references public.fights(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  felt_heard boolean not null default false,
  understood_perspective boolean not null default false,
  know_next_steps boolean not null default false,
  confirmed_at timestamptz not null default now(),
  unique (fight_id, user_id)
);

-- ============================================================
-- LITTLE THINGS
-- ============================================================
create table if not exists public.little_things (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id),
  category text not null check (category in ('just_because', 'open_when_miss_me', 'open_when_bad_day', 'open_when_need_motivation', 'open_when_cant_sleep')),
  message text not null,
  image_path text,
  voice_path text,
  reveal_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  icon text not null,
  criteria jsonb not null default '{}'::jsonb
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  achievement_id uuid not null references public.achievements(id),
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

-- ============================================================
-- RULES
-- ============================================================
create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  order_index int not null default 0,
  text text not null,
  added_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- ============================================================
-- updated_at maintenance
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['profiles','places','wishlist_items','memories','game_sessions','fights','rules']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ============================================================
-- Auto-create profile row when an auth user is created.
-- Username is derived from the local part of the email
-- (expects shab@... / soumya@...). Only these two usernames
-- are permitted by the profiles.username check constraint.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  derived_username text;
  derived_display text;
begin
  derived_username := lower(split_part(new.email, '@', 1));
  derived_display := initcap(derived_username);

  insert into public.profiles (id, username, display_name)
  values (new.id, derived_username, derived_display)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Activity logging helper (called from the app via RPC so the
-- description text stays consistent with what triggered it).
-- ============================================================
create or replace function public.log_activity(
  p_action_type text,
  p_description text,
  p_target_type text default null,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.activity_log (actor_id, action_type, description, target_type, target_id, metadata)
  values (auth.uid(), p_action_type, p_description, p_target_type, p_target_id, p_metadata);
end;
$$;

-- ============================================================
-- Presence helper: mark caller online + bump last_seen_at
-- ============================================================
create or replace function public.touch_presence(p_online boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set is_online = p_online, last_seen_at = now()
  where id = auth.uid();
end;
$$;
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
-- ============================================================
-- STORAGE — private buckets, served via short-lived signed URLs
-- from the app (see src/lib/storage.ts). Nothing is public.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('avatars', 'avatars', false, 5242880),
  ('memories', 'memories', false, 104857600),
  ('world', 'world', false, 20971520),
  ('little-things', 'little-things', false, 20971520)
on conflict (id) do nothing;

create policy "storage_authenticated_select" on storage.objects
  for select using (
    bucket_id in ('avatars', 'memories', 'world', 'little-things')
    and auth.role() = 'authenticated'
  );

create policy "storage_authenticated_insert" on storage.objects
  for insert with check (
    bucket_id in ('avatars', 'memories', 'world', 'little-things')
    and auth.role() = 'authenticated'
  );

create policy "storage_authenticated_update" on storage.objects
  for update using (
    bucket_id in ('avatars', 'memories', 'world', 'little-things')
    and auth.role() = 'authenticated'
  );

create policy "storage_authenticated_delete" on storage.objects
  for delete using (
    bucket_id in ('avatars', 'memories', 'world', 'little-things')
    and auth.role() = 'authenticated'
  );
-- ============================================================
-- Seed: app content only (games registry, question/card/challenge/
-- prompt banks, achievement definitions, default rules). No fake
-- relationship data — memories/wishlist/places/fights start empty.
-- Meant to run once against a fresh database: games/achievements are
-- deduped by slug, but game_questions/truth_dare_prompts/challenges/
-- cards/rules have no natural unique key, so re-running this file
-- will duplicate those rows.
-- ============================================================

insert into public.games (slug, name, description, icon) values
  ('guess_me', 'Guess Me', 'Answer what you think the other would say — see if you''re in sync.', 'Sparkles'),
  ('this_or_that', 'This or That', 'Simultaneous picks. Same wavelength, or time to talk it out.', 'SplitSquareHorizontal'),
  ('two_truths', 'Two Truths & a Lie', 'Three statements, one lie. Can they catch it?', 'Fingerprint'),
  ('draw_together', 'Draw Together', 'Same prompt, two canvases, one reveal.', 'Paintbrush'),
  ('card_game', 'Card Game', 'Draw a card. Funny, deep, flirty, or wild.', 'Layers'),
  ('random_challenge', 'Random Challenge', 'A small dare for right now.', 'Dice5'),
  ('truth_or_dare', 'Truth or Dare', 'Classic, with levels — cute to bold.', 'Flame')
on conflict (slug) do nothing;

-- GUESS ME + THIS OR THAT questions share game_questions, split by game_id.
with g as (select id, slug from public.games where slug in ('guess_me','this_or_that'))
insert into public.game_questions (game_id, category, prompt, is_custom)
select id, category, prompt, false from (
  values
  ('guess_me','funny','What''s the silliest thing I get unreasonably competitive about?'),
  ('guess_me','personality','Am I more of a morning person or a night owl?'),
  ('guess_me','preferences','What''s my go-to comfort food?'),
  ('guess_me','relationship','What''s the first thing I noticed about you?'),
  ('guess_me','deep','What do I think is my biggest fear right now?'),
  ('guess_me','random','If I could teleport anywhere right now, where would I go?'),
  ('guess_me','personality','Am I an introvert or an extrovert on a bad day?'),
  ('guess_me','preferences','What''s my least favorite chore?'),
  ('guess_me','relationship','What do I think you love most about us?'),
  ('guess_me','funny','What''s my most-used emoji?')
) as t(gs, category, prompt)
join g on g.slug = t.gs;

with g as (select id, slug from public.games where slug = 'this_or_that')
insert into public.game_questions (game_id, category, prompt, is_custom)
select id, category, prompt, false from (
  values
  ('food','Sweet or savory?'),
  ('travel','Beach or mountains?'),
  ('personality','Plan everything or wing it?'),
  ('lifestyle','Early mornings or late nights?'),
  ('funny','Cats or dogs?'),
  ('romantic','Slow dance or dance party?'),
  ('deep','Say what you mean or read between the lines?'),
  ('random','Books or movies?'),
  ('food','Coffee or tea?'),
  ('travel','City trip or nature retreat?'),
  ('romantic','Love letters or love songs?'),
  ('lifestyle','Big party or small dinner?')
) as t(category, prompt)
join g on true;

insert into public.truth_dare_prompts (type, level, prompt) values
  ('truth','cute','What''s a small thing I do that makes you smile?'),
  ('truth','cute','What''s your favorite memory of us so far?'),
  ('truth','funny','What''s the most ridiculous thing you''ve done to get my attention?'),
  ('truth','funny','What''s a weird habit of mine you secretly love?'),
  ('truth','deep','What''s something you''ve never told me because it felt too vulnerable?'),
  ('truth','deep','What do you need from me on your hardest days?'),
  ('truth','flirty','What was your first genuinely attracted-to-me moment?'),
  ('truth','flirty','What''s something you find irresistible about me?'),
  ('truth','bold','What''s a fear about us you''ve never said out loud?'),
  ('dare','cute','Send me a voice note saying something you appreciate about me.'),
  ('dare','cute','Describe our relationship in exactly three words.'),
  ('dare','funny','Do your best impression of me for the next minute.'),
  ('dare','funny','Text me the most dramatic version of what you had for breakfast.'),
  ('dare','deep','Tell me one way I''ve helped you grow.'),
  ('dare','flirty','Send the cheesiest compliment you can think of.'),
  ('dare','flirty','Describe our perfect night in.'),
  ('dare','bold','Share the last thing that made you cry.'),
  ('dare','bold','Tell me something you''ve been putting off telling me.')
;

insert into public.challenges (category, prompt) values
  ('funny','Take a photo of something directly in front of you, no cheating.'),
  ('funny','Describe your day in exactly three words.'),
  ('creative','Find something in your room that reminds you of the other person.'),
  ('creative','Write a two-line poem about us, right now.'),
  ('romantic','Send a photo from the day you two met, or one that feels like it.'),
  ('romantic','Tell them one thing you''re grateful for about them today.'),
  ('random','Send the last song you listened to and why.'),
  ('random','Do 10 jumping jacks and send proof.'),
  ('competitive','Whoever replies with the better pun in the next 2 minutes wins.'),
  ('competitive','Name 5 movies in 30 seconds. Loser buys snacks next time.'),
  ('flirty','Send the emoji combo that best describes how you feel about them.'),
  ('flirty','Say one thing you find attractive about them that you don''t say enough.')
;

insert into public.cards (category, prompt) values
  ('funny','What''s the weirdest dream you''ve had about me?'),
  ('funny','Do an impression of how I react when I''m hangry.'),
  ('deep','What''s something you''ve wanted to tell me but never found the right moment?'),
  ('deep','What does "home" mean to you?'),
  ('romantic','What''s your favorite version of "us"?'),
  ('romantic','Plan our next date, out loud, right now.'),
  ('flirty','What first made you want to get to know me?'),
  ('flirty','Send the funniest photo currently in your gallery.'),
  ('random','Choose our next food adventure.'),
  ('random','Pick a song that describes this week for you.'),
  ('challenge','Text a photo of your current view.'),
  ('challenge','Give a genuine compliment you don''t usually say.'),
  ('wild','What''s the boldest thing you''d want us to try together?'),
  ('wild','Describe your ideal spontaneous weekend for us.')
;

insert into public.achievements (slug, name, description, icon, criteria) values
  ('first_win', 'First Win', 'Won a game for the first time.', 'Trophy', '{"type":"wins","count":1}'),
  ('win_streak', 'Win Streak', 'Won three games in a row.', 'Flame', '{"type":"streak","count":3}'),
  ('mind_reader', 'Mind Reader', 'Matched answers five times in Guess Me.', 'Brain', '{"type":"guess_me_matches","count":5}'),
  ('professional_menace', 'Professional Menace', 'Completed 10 dares.', 'Zap', '{"type":"dares_completed","count":10}'),
  ('drawing_disaster', 'Drawing Disaster', 'Finished a Draw Together round — no judgment.', 'Paintbrush', '{"type":"drawings","count":1}'),
  ('perfect_match', 'Perfect Match', 'Agreed on 10 This or That rounds.', 'Heart', '{"type":"this_or_that_matches","count":10}'),
  ('ten_games', '10 Games Played', 'Played 10 games together.', 'Gamepad2', '{"type":"games_played","count":10}'),
  ('twentyfive_games', '25 Games Played', 'Played 25 games together.', 'Gamepad2', '{"type":"games_played","count":25}')
on conflict (slug) do nothing;

insert into public.rules (order_index, text, added_by) values
  (1, 'We''re on the same team.', null),
  (2, 'The problem is the problem, not each other.', null),
  (3, 'We talk to understand, not to win.', null),
  (4, 'We don''t use old fights as ammunition.', null),
  (5, 'We give each other space without making each other feel abandoned.', null),
  (6, 'We celebrate each other''s wins.', null),
  (7, 'We keep choosing each other.', null),
  (8, 'We''re allowed to change the rules as we grow.', null)
on conflict do nothing;

-- ============================================================
-- 0005_guess_me_v2.sql — multiple-choice questions + two-phase
-- self-answer-then-guess-partner support for Guess Me.
-- ============================================================
alter table public.game_questions add column if not exists options text[];
alter table public.game_sessions add column if not exists question_ids uuid[];

create table if not exists public.guess_me_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  question_id uuid not null references public.game_questions(id),
  user_id uuid not null references public.profiles(id),
  phase text not null check (phase in ('self', 'guess')),
  choice text not null,
  created_at timestamptz not null default now(),
  unique (session_id, question_id, user_id, phase)
);
create index if not exists guess_me_entries_session_idx on public.guess_me_entries (session_id);

alter table public.guess_me_entries enable row level security;
create policy "guess_me_entries_all_authenticated" on public.guess_me_entries for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter publication supabase_realtime add table public.guess_me_entries;
