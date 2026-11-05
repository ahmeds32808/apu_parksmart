-- Anonymous website ratings. This is separate from account-linked parking ratings.
-- Keep would_use nullable so existing rows in an existing public.ratings table remain valid.
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  rating smallint not null,
  feedback text,
  would_use boolean,
  created_at timestamptz not null default now()
);

alter table public.ratings add column if not exists would_use boolean;
alter table public.ratings add column if not exists feedback text;
alter table public.ratings drop constraint if exists ratings_rating_check;
alter table public.ratings
  add constraint ratings_rating_check check (rating between 1 and 5);
alter table public.ratings drop constraint if exists ratings_feedback_length_check;
alter table public.ratings
  add constraint ratings_feedback_length_check
  check (feedback is null or char_length(feedback) <= 280);

grant usage on schema public to anon, authenticated;
alter table public.ratings enable row level security;
revoke all on public.ratings from public, anon, authenticated;
grant select, insert on public.ratings to anon, authenticated;

drop policy if exists "Anyone can read website ratings" on public.ratings;
create policy "Anyone can read website ratings"
  on public.ratings for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can submit website ratings" on public.ratings;
create policy "Anyone can submit website ratings"
  on public.ratings for insert
  to anon, authenticated
  with check (
    rating between 1 and 5
    and would_use is not null
    and (feedback is null or char_length(feedback) <= 280)
  );

create or replace function public.get_website_rating_summary()
returns table (
  average_rating numeric,
  total_ratings bigint,
  would_use_percentage integer,
  would_use_answers bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    round(avg(rating)::numeric, 1),
    count(*),
    case
      when count(*) filter (where would_use is not null) = 0 then null
      else round(
        100.0 * count(*) filter (where would_use is true)
        / count(*) filter (where would_use is not null)
      )::integer
    end,
    count(*) filter (where would_use is not null)
  from public.ratings;
$$;

revoke all on function public.get_website_rating_summary() from public, anon, authenticated;
grant execute on function public.get_website_rating_summary() to anon, authenticated;
