
create table if not exists public.ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_id integer not null,
  score smallint not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  primary key (user_id, anime_id)
);

alter table public.ratings enable row level security;
create policy "Anyone can read ratings" on public.ratings for select using (true);
create policy "Users can add their rating" on public.ratings for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can change their rating" on public.ratings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);