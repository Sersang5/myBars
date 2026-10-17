-- MyBars initial schema. Single user, enforced via RLS on user_id.

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  google_place_id text not null,
  lat double precision,
  lng double precision,
  unique (user_id, google_place_id)
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  google_place_id text not null,
  name text not null,
  address text,
  city_id uuid references public.cities on delete set null,
  lat double precision,
  lng double precision,
  google_rating numeric(2,1),
  google_user_rating_count integer,
  google_price_level smallint,
  maps_url text,
  photo_ref text,
  details_json jsonb,
  details_fetched_at timestamptz,
  unique (user_id, google_place_id)
);

create table public.my_bars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  place_id uuid not null references public.places on delete cascade,
  status text not null check (status in ('visited', 'pending')),
  rating_local numeric(2,1) check (rating_local between 1 and 5 and rating_local * 2 = floor(rating_local * 2)),
  rating_service numeric(2,1) check (rating_service between 1 and 5 and rating_service * 2 = floor(rating_service * 2)),
  rating_food numeric(2,1) check (rating_food between 1 and 5 and rating_food * 2 = floor(rating_food * 2)),
  rating_overall_manual numeric(2,1) check (rating_overall_manual between 1 and 5 and rating_overall_manual * 2 = floor(rating_overall_manual * 2)),
  price_level smallint check (price_level between 1 and 4),
  notes text,
  pending_reason text,
  updated_at timestamptz not null default now(),
  unique (user_id, place_id)
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  my_bar_id uuid not null references public.my_bars on delete cascade,
  date date not null default current_date,
  note text
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  unique (user_id, name)
);

create table public.bar_tags (
  my_bar_id uuid not null references public.my_bars on delete cascade,
  tag_id uuid not null references public.tags on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  rating numeric(2,1) check (rating between 1 and 5 and rating * 2 = floor(rating * 2)),
  primary key (my_bar_id, tag_id)
);

create index places_city_id_idx on public.places (city_id);
create index my_bars_place_id_idx on public.my_bars (place_id);
create index visits_my_bar_id_idx on public.visits (my_bar_id);
create index bar_tags_tag_id_idx on public.bar_tags (tag_id);

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger my_bars_set_updated_at
  before update on public.my_bars
  for each row execute function public.set_updated_at();

-- Row level security: one policy per table.
alter table public.cities enable row level security;
alter table public.places enable row level security;
alter table public.my_bars enable row level security;
alter table public.visits enable row level security;
alter table public.tags enable row level security;
alter table public.bar_tags enable row level security;

create policy cities_owner on public.cities for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy places_owner on public.places for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy my_bars_owner on public.my_bars for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy visits_owner on public.visits for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tags_owner on public.tags for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy bar_tags_owner on public.bar_tags for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
