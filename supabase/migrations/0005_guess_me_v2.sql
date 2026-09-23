-- Guess Me v2: self-answer-then-guess-partner flow needs multiple-choice
-- questions (options) and its own per-question, per-phase answer table,
-- since game_answers only holds one answer per user per session.

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
