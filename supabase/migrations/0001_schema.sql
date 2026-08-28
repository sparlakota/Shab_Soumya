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
