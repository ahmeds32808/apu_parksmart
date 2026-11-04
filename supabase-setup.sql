create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  user_type text not null check (user_type in ('student', 'staff', 'visitor')),
  campus_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plate_number text not null check (plate_number ~ '^[A-Z]{1,3} ?[0-9]{1,4}$'),
  color text not null default 'orange',
  created_at timestamptz not null default now(),
  constraint vehicles_user_plate_unique unique (user_id, plate_number)
);

alter table public.vehicles add column if not exists color text not null default 'orange';
alter table public.vehicles drop constraint if exists vehicles_color_check;
alter table public.vehicles
  add constraint vehicles_color_check
  check (color in ('orange', 'blue', 'red', 'green', 'purple', 'silver', 'black'));

create table if not exists public.parking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id),
  zone_id text check (zone_id in ('zone-a', 'zone-b', 'zone-c')),
  sensor_location text,
  amount_rm numeric(8, 2) not null default 0 check (amount_rm >= 0),
  duration_hours integer check (duration_hours is null or duration_hours between 1 and 12),
  starts_at timestamptz not null,
  grace_until timestamptz,
  refund_until timestamptz,
  expires_at timestamptz,
  status text not null check (status in ('active', 'cancelled', 'completed')),
  refund_status text not null default 'pending' check (refund_status in ('pending', 'charged', 'not_charged')),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.parking_sessions add column if not exists sensor_location text;
alter table public.parking_sessions add column if not exists grace_until timestamptz;
alter table public.parking_sessions alter column zone_id drop not null;
alter table public.parking_sessions alter column refund_until drop not null;
alter table public.parking_sessions alter column expires_at drop not null;
alter table public.parking_sessions alter column amount_rm set default 0;
alter table public.parking_sessions drop constraint if exists parking_refund_window_check;
alter table public.parking_sessions drop constraint if exists parking_expiry_check;
alter table public.parking_sessions drop constraint if exists parking_daily_or_hourly_check;
alter table public.parking_sessions drop constraint if exists parking_sessions_refund_status_check;
update public.parking_sessions
set refund_status = case
  when refund_status = 'simulated_refund' then 'not_charged'
  when refund_status = 'not_refundable' then 'charged'
  else refund_status
end;
update public.parking_sessions
set grace_until = case
  when profiles.user_type = 'visitor' then null
  else parking_sessions.starts_at + interval '10 minutes'
end
from public.profiles
where parking_sessions.user_id = profiles.user_id
  and parking_sessions.status = 'active'
  and parking_sessions.grace_until is null;
alter table public.parking_sessions
  add constraint parking_sessions_refund_status_check
  check (refund_status in ('pending', 'charged', 'not_charged'));

create unique index if not exists one_active_parking_session_per_user
  on public.parking_sessions (user_id)
  where status = 'active';

create table if not exists public.parking_ratings (
  id uuid primary key default gen_random_uuid(),
  parking_session_id uuid not null unique references public.parking_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.parking_sessions enable row level security;
alter table public.parking_ratings enable row level security;

grant usage on schema public to anon, authenticated;
revoke all on public.profiles, public.vehicles, public.parking_sessions, public.parking_ratings from anon, authenticated;
grant select on public.profiles, public.vehicles, public.parking_sessions to authenticated;
grant select, insert on public.parking_ratings to authenticated;
grant insert, delete on public.vehicles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own vehicles" on public.vehicles;
create policy "Users can read their own vehicles"
  on public.vehicles for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own vehicles" on public.vehicles;
create policy "Users can add their own vehicles"
  on public.vehicles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove their own vehicles" on public.vehicles;
create policy "Users can remove their own vehicles"
  on public.vehicles for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own parking sessions" on public.parking_sessions;
create policy "Users can read their own parking sessions"
  on public.parking_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own parking ratings" on public.parking_ratings;
create policy "Users can read their own parking ratings"
  on public.parking_ratings for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can rate their own ended sessions" on public.parking_ratings;
create policy "Users can rate their own ended sessions"
  on public.parking_ratings for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.parking_sessions
      where parking_sessions.id = parking_session_id
        and parking_sessions.user_id = (select auth.uid())
        and parking_sessions.status in ('completed', 'cancelled')
    )
  );

-- Return anonymous rating totals only after a minimum number of responses.
-- The dashboard never receives user IDs, session IDs, or individual rating rows.
create or replace function public.get_parksmart_rating_summary()
returns table (
  results_ready boolean,
  average_rating numeric,
  total_ratings bigint,
  one_star bigint,
  two_stars bigint,
  three_stars bigint,
  four_stars bigint,
  five_stars bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with summary as (
    select
      count(*) as total,
      round(avg(rating)::numeric, 1) as average,
      count(*) filter (where rating = 1) as one_star_count,
      count(*) filter (where rating = 2) as two_star_count,
      count(*) filter (where rating = 3) as three_star_count,
      count(*) filter (where rating = 4) as four_star_count,
      count(*) filter (where rating = 5) as five_star_count
    from public.parking_ratings
  )
  select
    total >= 5,
    case when total >= 5 then average else null end,
    case when total >= 5 then total else null end,
    case when total >= 5 then one_star_count else null end,
    case when total >= 5 then two_star_count else null end,
    case when total >= 5 then three_star_count else null end,
    case when total >= 5 then four_star_count else null end,
    case when total >= 5 then five_star_count else null end
  from summary;
$$;

revoke all on function public.get_parksmart_rating_summary() from public, anon, authenticated;
grant execute on function public.get_parksmart_rating_summary() to anon, authenticated;

drop policy if exists "Users can create their own parking sessions" on public.parking_sessions;
drop policy if exists "Users can end their own parking sessions" on public.parking_sessions;

revoke insert, update on public.parking_sessions from anon, authenticated;

drop function if exists public.start_parking_session(uuid, text, integer);

create or replace function public.start_parking_session(p_vehicle_id uuid)
returns public.parking_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  account_type text;
  start_time timestamptz := now();
  new_session public.parking_sessions;
begin
  if current_user_id is null then
    raise exception 'Sign in before registering parking';
  end if;

  select user_type into account_type
  from public.profiles
  where profiles.user_id = current_user_id;
  if account_type is null then
    raise exception 'ParkSmart profile was not found';
  end if;

  if not exists (
    select 1 from public.vehicles
    where vehicles.id = p_vehicle_id
      and vehicles.user_id = current_user_id
  ) then
    raise exception 'Choose a vehicle registered to your account';
  end if;

  insert into public.parking_sessions (
    user_id, vehicle_id, amount_rm, starts_at, grace_until, status, refund_status
  ) values (
    current_user_id, p_vehicle_id, 0,
    start_time,
    case when account_type = 'visitor' then null else start_time + interval '10 minutes' end,
    'active',
    'pending'
  )
  returning * into new_session;
  return new_session;
end;
$$;

create or replace function public.end_parking_session(p_session_id uuid)
returns public.parking_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  account_type text;
  end_time timestamptz := now();
  final_amount numeric(8, 2);
  active_session public.parking_sessions;
  ended_session public.parking_sessions;
begin
  if current_user_id is null then
    raise exception 'Sign in before ending a parking session';
  end if;
  select * into active_session
  from public.parking_sessions
  where id = p_session_id
    and parking_sessions.user_id = current_user_id
    and status = 'active'
  for update;
  if not found then
    raise exception 'Active parking session was not found';
  end if;

  select user_type into account_type
  from public.profiles
  where profiles.user_id = current_user_id;
  if account_type is null then
    raise exception 'ParkSmart profile was not found';
  end if;

  if account_type = 'visitor' then
    final_amount := case
      when end_time <= active_session.starts_at then 0
      else greatest(
        0.01::numeric,
        ceil(extract(epoch from (end_time - active_session.starts_at)) / 36) / 100
      )
    end;
  elsif end_time < active_session.grace_until then
    final_amount := 0;
  else
    final_amount := 5 * (
      (end_time at time zone 'Asia/Kuala_Lumpur')::date
      - (active_session.starts_at at time zone 'Asia/Kuala_Lumpur')::date
      + 1
    );
  end if;

  update public.parking_sessions
  set amount_rm = final_amount,
      status = case when final_amount = 0 then 'cancelled' else 'completed' end,
      refund_status = case when final_amount = 0 then 'not_charged' else 'charged' end,
      ended_at = end_time
  where id = p_session_id
  returning * into ended_session;
  return ended_session;
end;
$$;

revoke all on function public.start_parking_session(uuid) from public;
revoke all on function public.end_parking_session(uuid) from public;
grant execute on function public.start_parking_session(uuid) to authenticated;
grant execute on function public.end_parking_session(uuid) to authenticated;

create or replace function public.create_parksmart_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  metadata jsonb;
  role_name text;
  campus_number text;
  plate text;
  vehicle_color text;
begin
  metadata := new.raw_user_meta_data;
  role_name := coalesce(metadata ->> 'user_type', 'visitor');
  campus_number := nullif(metadata ->> 'campus_id', '');
  plate := upper(nullif(metadata ->> 'vehicle_plate', ''));
  vehicle_color := coalesce(metadata ->> 'vehicle_color', 'orange');

  if role_name not in ('student', 'staff', 'visitor') then
    raise exception 'Invalid ParkSmart account type';
  end if;
  if role_name in ('student', 'staff') and campus_number is null then
    raise exception 'Student TP number or staff ID is required';
  end if;
  if role_name = 'student' and campus_number !~* '^TP[0-9]{6}$' then
    raise exception 'Student TP number must contain TP followed by 6 digits';
  end if;
  if role_name = 'staff' and length(campus_number) > 30 then
    raise exception 'Staff ID is too long';
  end if;
  if plate is null or plate !~ '^[A-Z]{1,3} ?[0-9]{1,4}$' then
    raise exception 'A valid first vehicle plate is required';
  end if;
  if vehicle_color not in ('orange', 'blue', 'red', 'green', 'purple', 'silver', 'black') then
    raise exception 'Invalid vehicle colour';
  end if;

  insert into public.profiles (user_id, full_name, user_type, campus_id)
  values (new.id, coalesce(nullif(metadata ->> 'full_name', ''), new.email), role_name, campus_number);
  insert into public.vehicles (user_id, plate_number, color)
  values (new.id, plate, vehicle_color);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_parksmart on auth.users;
create trigger on_auth_user_created_parksmart
  after insert on auth.users
  for each row execute function public.create_parksmart_profile();

revoke all on function public.create_parksmart_profile() from public, anon, authenticated;

drop function if exists public.record_daily_visitor(uuid);
