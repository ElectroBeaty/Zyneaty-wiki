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

drop policy if exists "Public can read wiki comments" on public.wiki_comments;
create policy "Public can read wiki comments"
  on public.wiki_comments
  for select
  to anon, authenticated
  using (true);
