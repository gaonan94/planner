create table if not exists public.planner_records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  collection text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.planner_records
drop constraint if exists planner_records_collection_check;

alter table public.planner_records
add constraint planner_records_collection_check
check (collection in ('research', 'fitness', 'english', 'ideas', 'settings'));

alter table public.planner_records enable row level security;

create policy "Users can read their planner records"
on public.planner_records
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their planner records"
on public.planner_records
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their planner records"
on public.planner_records
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their planner records"
on public.planner_records
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists planner_records_user_updated_idx
on public.planner_records (user_id, updated_at desc);
