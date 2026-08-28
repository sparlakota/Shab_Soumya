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
