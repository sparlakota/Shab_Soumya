# SHAB × SOUMYA

_Our little corner of the internet._

A private, two-person web app — home dashboard, seven real-time multiplayer games, an interactive map of places, a shared wishlist, a photo/video memory gallery, a scoreboard with automatic achievements, a two-perspective conflict-repair tool ("Our Fights"), scheduled private notes ("Little Things"), and a shared house-rules page.

Built with Next.js (App Router) + TypeScript + Tailwind v4, backed entirely by Supabase (Postgres, Auth, Storage, Realtime). Nothing here is a mock — every page reads and writes the live database.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **Styling:** Tailwind CSS v4, Framer Motion, Lucide icons
- **Backend:** Supabase — Postgres with row-level security, Auth (email/password, two accounts only), Storage (private buckets, signed URLs), Realtime (`postgres_changes` subscriptions)
- **Map:** Leaflet + OpenStreetMap (no API key required)

## Project structure

```
src/app/(app)/…       Authenticated route group — every page here requires a session
src/app/login/         The two-person login screen
src/components/…       UI split by feature (play/, world/, wishlist/, memories/, fights/, …)
src/lib/…              Supabase clients, auth helpers, storage/signed-URL helpers,
                        the activity-log helper, and per-domain metadata (categories, etc.)
src/hooks/…             use-presence (online/offline), use-simultaneous-round (the
                        "both lock an answer, then reveal" mechanic shared by This or
                        That / Guess Me / Draw Together)
supabase/migrations/    Full SQL schema, RLS policies, and storage bucket setup, in order
supabase/seed.sql       Game content banks (questions/cards/challenges/prompts),
                        achievement definitions, and the default 8 house rules.
                        No fake relationship data — memories/wishlist/places/fights
                        start empty for the two of you to fill in.
scripts/seed-users.mjs  Creates the two (and only two) accounts via the Supabase
                        admin API, from the credentials in .env.local
```

## First-time setup

**1. Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is enough).

**2. Copy `.env.local.example` to `.env.local`** and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — from **Project Settings → API**
- `NEXT_PUBLIC_SHAB_EMAIL` / `SHAB_PASSWORD` and `NEXT_PUBLIC_SOUMYA_EMAIL` / `SOUMYA_PASSWORD` — pick any email format (they don't need to be real/deliverable — no confirmation email is sent), but **the part before `@` must be exactly `shab` and `soumya`**, since that's what derives the username via the `handle_new_user` trigger.

**3. Run the schema.** Open your Supabase project → SQL Editor → New query, paste the contents of `supabase/run_in_sql_editor.sql` (schema + RLS + storage buckets + seed content, concatenated and already ordered), and run it. It's meant to run once against a fresh project.

**4. Create the two accounts:**

```bash
npm install
npm run seed:users
```

This calls the Supabase Auth admin API to create exactly two users. The `handle_new_user` trigger automatically creates their `profiles` row.

**5. Run it:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), pick Shab or Soumya, enter the password from `.env.local`.

## Security model

- **Exactly two accounts, ever.** `profiles.username` has a check constraint allowing only `'shab'` / `'soumya'`, accounts are created only via the admin script, and public sign-up must stay off in your Supabase project's Auth settings — never expose a sign-up form.
- **RLS everywhere.** Every table has row-level security enabled. Shared data (games, wishlist, memories, places, fights, rules) is readable/writable by any authenticated request — safe only because exactly two accounts can ever authenticate. A few tables are additionally scoped to `auth.uid()`: profile edits (only the owner), fight perspectives/resolutions (only the author can insert/update their own), and Little Things (a scheduled note is invisible to the recipient — not just hidden client-side — until its `reveal_at` time passes; the sender can always see their own).
- **Storage is private.** All four buckets (`avatars`, `memories`, `world`, `little-things`) are non-public. The app resolves stored paths to short-lived signed URLs on read (`src/lib/storage.ts`) — nothing is served from an open bucket.
- **No service-role key in the browser.** It's used only by `scripts/seed-users.mjs`, which runs locally against your `.env.local`.

## Notable implementation details

- **Realtime multiplayer** (This or That, Guess Me, Draw Together) shares one hook, `useSimultaneousRound`: create a round → partner joins → both lock an answer → a synchronized 3-2-1 reveal → the match is persisted to `game_results`. Two Truths & a Lie and Truth or Dare use their own turn-based flows since the mechanics aren't symmetric.
- **Achievements** are computed from real activity (wins, games played, dares completed, drawings, match counts) and synced whenever the Scoreboard page loads — no hard-coded unlock state.
- **Draw Together** drawings upload straight into the `memories` bucket; "Save to Memories" just references the same file rather than re-uploading.
- **Timeline view** on the Memories page groups by month/year of the actual `memory_date` values — nothing is hard-coded.

## Deploying

Not deployed yet by default — this was built to run locally first. To put it on Vercel: push this repo, import it in Vercel, add the same environment variables from `.env.local` (service role key too, if you ever re-run the seed script from CI — otherwise you can omit it), and deploy. No other configuration is required; the map needs no API key.
