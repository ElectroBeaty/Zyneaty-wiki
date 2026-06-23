with ranked_reactions as (
  select
    id,
    row_number() over (
      partition by submission_id, user_id
      order by created_at asc, id asc
    ) as row_number
  from public.wiki_reactions
)
delete from public.wiki_reactions
using ranked_reactions
where public.wiki_reactions.id = ranked_reactions.id
  and ranked_reactions.row_number > 1;

update public.wiki_reactions
set reaction = 'fire'
where reaction <> 'fire';

alter table public.wiki_reactions
  drop constraint if exists wiki_reactions_reaction_check;

alter table public.wiki_reactions
  add constraint wiki_reactions_reaction_check
  check (reaction in ('fire'));
