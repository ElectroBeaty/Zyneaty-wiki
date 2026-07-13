create extension if not exists pgcrypto;

create table if not exists public.deck_lab_decks (
  id uuid primary key default gen_random_uuid(),
  owner_discord_id text not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  format text not null default 'commander',
  commander_name text,
  raw_list text not null check (char_length(raw_list) between 1 and 20000),
  notes text,
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deck_lab_decks_owner_updated_idx
  on public.deck_lab_decks (owner_discord_id, updated_at desc);

alter table public.deck_lab_decks enable row level security;

revoke all privileges on public.deck_lab_decks from anon, authenticated;
