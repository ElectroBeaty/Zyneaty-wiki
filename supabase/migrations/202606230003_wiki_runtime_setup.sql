create extension if not exists pgcrypto;

alter table public.submissions
  add column if not exists quote_speaker text;

alter table public.submissions
  add column if not exists quote_text text;

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

alter table if exists public.submissions enable row level security;
alter table if exists public.wiki_reactions enable row level security;
alter table if exists public.wiki_comments enable row level security;

drop policy if exists "Public can read approved submissions" on public.submissions;
create policy "Public can read approved submissions"
  on public.submissions
  for select
  to anon, authenticated
  using (approved = true);

drop policy if exists "Public can read wiki reactions" on public.wiki_reactions;
create policy "Public can read wiki reactions"
  on public.wiki_reactions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can insert wiki reactions" on public.wiki_reactions;
create policy "Public can insert wiki reactions"
  on public.wiki_reactions
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public can delete wiki reactions" on public.wiki_reactions;
create policy "Public can delete wiki reactions"
  on public.wiki_reactions
  for delete
  to anon, authenticated
  using (true);

drop policy if exists "Public can read wiki comments" on public.wiki_comments;
create policy "Public can read wiki comments"
  on public.wiki_comments
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can insert wiki comments" on public.wiki_comments;
create policy "Public can insert wiki comments"
  on public.wiki_comments
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public can delete wiki comments" on public.wiki_comments;
create policy "Public can delete wiki comments"
  on public.wiki_comments
  for delete
  to anon, authenticated
  using (true);
