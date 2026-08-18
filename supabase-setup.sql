create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  anime_id integer not null,
  parent_id uuid references public.comments(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 40),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;
create policy "Anyone can read comments" on public.comments for select using (true);
create policy "Signed-in users can write comments" on public.comments for insert to authenticated with check (auth.uid() = author_id);
create policy "Authors can delete their comments" on public.comments for delete to authenticated using (auth.uid() = author_id);

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