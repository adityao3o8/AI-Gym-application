-- GYMERS Phase 2 — unique features migration

-- ---------------------------------------------------------------------------
-- User extensions
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists injury_flags text[] not null default '{}',
  add column if not exists rest_tokens integer not null default 1 check (rest_tokens >= 0),
  add column if not exists gym_cred integer not null default 0 check (gym_cred >= 0),
  add column if not exists season_xp integer not null default 0 check (season_xp >= 0),
  add column if not exists division text not null default 'bronze',
  add column if not exists accountability_partner_id uuid references public.users (id) on delete set null;

create index if not exists users_accountability_partner_idx on public.users (accountability_partner_id);

-- ---------------------------------------------------------------------------
-- Gym white-label + check-in
-- ---------------------------------------------------------------------------
alter table public.gyms
  add column if not exists logo_url text,
  add column if not exists primary_color text default '#2997ff',
  add column if not exists check_in_code text unique;

-- ---------------------------------------------------------------------------
-- Workout extensions (form check auto-log)
-- ---------------------------------------------------------------------------
alter table public.workouts
  add column if not exists form_score numeric(5, 2) check (form_score is null or (form_score >= 0 and form_score <= 100)),
  add column if not exists reps_detected integer check (reps_detected is null or reps_detected >= 0),
  add column if not exists exercise_detected text,
  add column if not exists source text not null default 'manual';

-- ---------------------------------------------------------------------------
-- Seasons
-- ---------------------------------------------------------------------------
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Gym challenges
-- ---------------------------------------------------------------------------
create table if not exists public.gym_challenges (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  created_by uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  challenge_type text not null default 'workout_count',
  target_value integer not null default 1 check (target_value > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index gym_challenges_gym_id_idx on public.gym_challenges (gym_id);

create table if not exists public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.gym_challenges (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  progress integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  joined_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Gym feed (scoped social)
-- ---------------------------------------------------------------------------
create table if not exists public.gym_feed_posts (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  body text not null,
  post_type text not null default 'update',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index gym_feed_posts_gym_id_idx on public.gym_feed_posts (gym_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Hall of fame (gym PR wall)
-- ---------------------------------------------------------------------------
create table if not exists public.gym_hall_of_fame (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  exercise_name text not null,
  weight_kg numeric(6, 2) not null check (weight_kg > 0),
  reps integer not null default 1 check (reps > 0),
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index gym_hall_of_fame_gym_idx on public.gym_hall_of_fame (gym_id, exercise_name);

-- ---------------------------------------------------------------------------
-- Equipment queue
-- ---------------------------------------------------------------------------
create table if not exists public.gym_equipment (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  name text not null,
  zone text not null default 'general',
  capacity integer not null default 1 check (capacity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.equipment_usage (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.gym_equipment (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index equipment_usage_active_idx on public.equipment_usage (equipment_id) where ended_at is null;

-- ---------------------------------------------------------------------------
-- Ghost rep sessions (reference pose metrics)
-- ---------------------------------------------------------------------------
create table if not exists public.ghost_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  exercise text not null,
  reps integer not null default 0,
  form_score numeric(5, 2),
  metrics jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index ghost_sessions_user_idx on public.ghost_sessions (user_id, exercise, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.seasons enable row level security;
alter table public.gym_challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.gym_feed_posts enable row level security;
alter table public.gym_hall_of_fame enable row level security;
alter table public.gym_equipment enable row level security;
alter table public.equipment_usage enable row level security;
alter table public.ghost_sessions enable row level security;

create policy "Anyone authenticated can read seasons"
  on public.seasons for select to authenticated using (true);

create policy "Gym members can read challenges"
  on public.gym_challenges for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.gym_id = gym_challenges.gym_id
    )
  );

create policy "Gym staff can manage challenges"
  on public.gym_challenges for all
  using (public.is_gym_staff(gym_id))
  with check (public.is_gym_staff(gym_id));

create policy "Users manage own challenge participation"
  on public.challenge_participants for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Gym members read challenge progress"
  on public.challenge_participants for select
  using (
    exists (
      select 1 from public.gym_challenges c
      join public.users u on u.gym_id = c.gym_id
      where c.id = challenge_participants.challenge_id and u.id = auth.uid()
    )
  );

create policy "Gym members read feed"
  on public.gym_feed_posts for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.gym_id = gym_feed_posts.gym_id
    )
  );

create policy "Gym members post to feed"
  on public.gym_feed_posts for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.gym_id = gym_feed_posts.gym_id
    )
  );

create policy "Users delete own posts"
  on public.gym_feed_posts for delete
  using (auth.uid() = user_id);

create policy "Gym members read hall of fame"
  on public.gym_hall_of_fame for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.gym_id = gym_hall_of_fame.gym_id
    )
  );

create policy "Gym members insert hall of fame"
  on public.gym_hall_of_fame for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.gym_id = gym_hall_of_fame.gym_id
    )
  );

create policy "Gym members read equipment"
  on public.gym_equipment for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.gym_id = gym_equipment.gym_id
    )
  );

create policy "Gym staff manage equipment"
  on public.gym_equipment for all
  using (public.is_gym_staff(gym_id))
  with check (public.is_gym_staff(gym_id));

create policy "Users manage own equipment usage"
  on public.equipment_usage for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Gym members read equipment usage"
  on public.equipment_usage for select
  using (
    exists (
      select 1 from public.gym_equipment e
      join public.users u on u.gym_id = e.gym_id
      where e.id = equipment_usage.equipment_id and u.id = auth.uid()
    )
  );

create policy "Users manage own ghost sessions"
  on public.ghost_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Seed active season + extra trophies
-- ---------------------------------------------------------------------------
insert into public.seasons (name, starts_at, ends_at, is_active)
values (
  'Season 1 — Iron Rising',
  date_trunc('month', now()),
  date_trunc('month', now()) + interval '8 weeks',
  true
)
on conflict do nothing;

insert into public.trophies (slug, name, description, icon, criteria) values
  ('gym-cred-500', 'Cred Legend', 'Reached 500 Gym Cred', 'medal', '{"type":"gym_cred","min":500}'),
  ('check-in-10', 'Regular', '10 gym check-ins', 'flame', '{"type":"check_in_count","min":10}'),
  ('challenge-win', 'Challenger', 'Completed a gym challenge', 'trophy', '{"type":"challenge_complete","min":1}')
on conflict (slug) do nothing;
