-- Gym AI App — initial MVP schema
-- Run via Supabase CLI: supabase db push
-- Or paste into Supabase Dashboard → SQL Editor

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('member', 'owner', 'admin');

-- ---------------------------------------------------------------------------
-- Gyms
-- ---------------------------------------------------------------------------
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  address text,
  phone text,
  owner_id uuid, -- set after user profile exists
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gyms_slug_idx on public.gyms (slug);
create index gyms_owner_id_idx on public.gyms (owner_id);

-- ---------------------------------------------------------------------------
-- Users (profiles linked to auth.users)
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'member',
  gym_id uuid references public.gyms (id) on delete set null,
  streak_count integer not null default 0 check (streak_count >= 0),
  last_workout_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_gym_id_idx on public.users (gym_id);
create index users_role_idx on public.users (role);

alter table public.gyms
  add constraint gyms_owner_id_fkey
  foreign key (owner_id) references public.users (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Workouts (member workout sessions)
-- ---------------------------------------------------------------------------
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  gym_id uuid references public.gyms (id) on delete set null,
  title text not null default 'Workout',
  notes text,
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workouts_user_id_idx on public.workouts (user_id);
create index workouts_performed_at_idx on public.workouts (performed_at desc);

-- Exercise line items (sets, reps, weight per exercise)
create table public.workout_entries (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_name text not null,
  sets integer not null default 1 check (sets > 0),
  reps integer not null default 1 check (reps > 0),
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index workout_entries_workout_id_idx on public.workout_entries (workout_id);

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  gym_id uuid not null references public.gyms (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  created_at timestamptz not null default now(),
  constraint attendance_checkout_after_checkin check (
    checked_out_at is null or checked_out_at >= checked_in_at
  )
);

create index attendance_gym_id_idx on public.attendance (gym_id);
create index attendance_user_id_idx on public.attendance (user_id);
create index attendance_checked_in_at_idx on public.attendance (checked_in_at desc);

-- ---------------------------------------------------------------------------
-- Trophies (definitions + user awards)
-- ---------------------------------------------------------------------------
create table public.trophies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text not null default 'trophy',
  criteria jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.user_trophies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  trophy_id uuid not null references public.trophies (id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, trophy_id)
);

create index user_trophies_user_id_idx on public.user_trophies (user_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger gyms_set_updated_at
  before update on public.gyms
  for each row execute function public.set_updated_at();

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    case
      when new.raw_user_meta_data ->> 'role' in ('member', 'owner', 'admin')
      then (new.raw_user_meta_data ->> 'role')::public.user_role
      else 'member'::public.user_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.gyms enable row level security;
alter table public.users enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_entries enable row level security;
alter table public.attendance enable row level security;
alter table public.trophies enable row level security;
alter table public.user_trophies enable row level security;

-- Helper: current user's role
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- Helper: owner/admin of a gym
create or replace function public.is_gym_staff(target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role in ('owner', 'admin')
      and (
        u.gym_id = target_gym_id
        or exists (
          select 1 from public.gyms g
          where g.id = target_gym_id and g.owner_id = auth.uid()
        )
      )
  );
$$;

-- USERS
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Gym staff can read members in their gym"
  on public.users for select
  using (
    public.is_gym_staff(gym_id)
    and gym_id is not null
  );

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- GYMS
create policy "Anyone authenticated can read gyms"
  on public.gyms for select
  to authenticated
  using (true);

create policy "Owners can insert gyms"
  on public.gyms for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Gym staff can update their gym"
  on public.gyms for update
  using (public.is_gym_staff(id));

-- WORKOUTS
create policy "Users can manage own workouts"
  on public.workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Gym staff can read gym member workouts"
  on public.workouts for select
  using (
    gym_id is not null and public.is_gym_staff(gym_id)
  );

-- WORKOUT ENTRIES
create policy "Users can manage entries for own workouts"
  on public.workout_entries for all
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  );

create policy "Gym staff can read workout entries"
  on public.workout_entries for select
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id
        and w.gym_id is not null
        and public.is_gym_staff(w.gym_id)
    )
  );

-- ATTENDANCE
create policy "Users can manage own attendance"
  on public.attendance for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Gym staff can read gym attendance"
  on public.attendance for select
  using (public.is_gym_staff(gym_id));

create policy "Gym staff can insert attendance for members"
  on public.attendance for insert
  with check (public.is_gym_staff(gym_id));

-- TROPHIES (definitions are public read)
create policy "Authenticated users can read trophies"
  on public.trophies for select
  to authenticated
  using (true);

-- USER TROPHIES
create policy "Users can read own trophies"
  on public.user_trophies for select
  using (auth.uid() = user_id);

create policy "Users can read trophies of gym members when staff"
  on public.user_trophies for select
  using (
    exists (
      select 1 from public.users u
      where u.id = user_trophies.user_id
        and u.gym_id is not null
        and public.is_gym_staff(u.gym_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Seed trophy definitions (optional MVP badges)
-- ---------------------------------------------------------------------------
insert into public.trophies (slug, name, description, icon, criteria) values
  ('first-workout', 'First Rep', 'Logged your first workout', 'dumbbell', '{"type":"workout_count","min":1}'),
  ('streak-7', 'Week Warrior', '7-day workout streak', 'flame', '{"type":"streak","min":7}'),
  ('streak-30', 'Iron Month', '30-day workout streak', 'medal', '{"type":"streak","min":30}')
on conflict (slug) do nothing;
