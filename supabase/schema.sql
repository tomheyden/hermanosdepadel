-- ============================================================================
--  Hermanos de Padel — Supabase Schema
--  Einmal im Supabase SQL Editor ausführen (Dashboard → SQL Editor → New query).
-- ============================================================================

-- Ein aktives Turnier = genau eine Zeile (id = 1) mit dem kompletten State als JSONB.
create table if not exists public.tournament (
  id smallint primary key default 1 check (id = 1),
  state jsonb,
  updated_at timestamptz not null default now()
);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Alle dürfen LESEN (öffentliche Turnier-Ansicht), nur EINGELOGGTE dürfen schreiben.
alter table public.tournament enable row level security;

drop policy if exists "tournament_read" on public.tournament;
create policy "tournament_read"
  on public.tournament for select
  using (true);

drop policy if exists "tournament_insert" on public.tournament;
create policy "tournament_insert"
  on public.tournament for insert to authenticated
  with check (true);

drop policy if exists "tournament_update" on public.tournament;
create policy "tournament_update"
  on public.tournament for update to authenticated
  using (true) with check (true);

drop policy if exists "tournament_delete" on public.tournament;
create policy "tournament_delete"
  on public.tournament for delete to authenticated
  using (true);

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Änderungen an der Tabelle live an verbundene Clients pushen (Beamer/andere Geräte).
-- Falls die Tabelle schon Teil der Publication ist, wirft Supabase einen Fehler —
-- dann diese Zeile einfach überspringen.
alter publication supabase_realtime add table public.tournament;

-- ============================================================================
--  WICHTIG — Admin-Konto & Signups (Dashboard, nicht SQL):
--
--  1) Authentication → Users → "Add user":
--     E-Mail + Passwort der Turnierleitung anlegen ("Auto Confirm User" an).
--
--  2) Authentication → Sign In / Providers → Email:
--     "Allow new users to sign up" AUSSCHALTEN.
--     Sonst könnte sich jeder registrieren und (da eingeloggt) schreiben.
--     So kann sich nur das manuell angelegte Admin-Konto einloggen.
-- ============================================================================
