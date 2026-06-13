create extension if not exists pgcrypto;

create table if not exists public.wiki_reactions (
  id uuid primary key default gen_random_uuid(),
  submission_id text not null,
  user_id text not null,
  reaction text not null check (reaction in ('legendary', 'cursed', 'classic', 'wild')),
  created_at timestamptz not null default now()
);

create unique index if not exists wiki_reactions_submission_user_reaction_idx
  on public.wiki_reactions (submission_id, user_id, reaction);

create index if not exists wiki_reactions_submission_idx
  on public.wiki_reactions (submission_id);

create table if not exists public.wiki_comments (
  id uuid primary key default gen_random_uuid(),
  submission_id text not null,
  user_id text not null,
  user_name text not null,
  user_image text,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists wiki_comments_submission_created_idx
  on public.wiki_comments (submission_id, created_at desc);
