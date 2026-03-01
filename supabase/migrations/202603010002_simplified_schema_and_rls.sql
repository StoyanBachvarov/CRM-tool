alter table if exists public.customers
  add column if not exists customer_id text;

update public.customers
set customer_id = coalesce(customer_id, unique_number, substr(replace(id::text, '-', ''), 1, 10))
where customer_id is null;

alter table if exists public.customers
  alter column customer_id set not null;

create unique index if not exists customers_owner_customer_id_idx
  on public.customers(owner_id, customer_id);

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_projects enable row level security;
alter table public.project_stages enable row level security;
alter table public.tasks enable row level security;
alter table public.visits enable row level security;
alter table public.attachments enable row level security;

drop policy if exists "profiles select self or admin" on public.profiles;
drop policy if exists "profiles update self or admin" on public.profiles;
drop policy if exists "customers owner or admin" on public.customers;
drop policy if exists "projects owner customer owner or admin" on public.customer_projects;
drop policy if exists "stages project owner or admin" on public.project_stages;
drop policy if exists "tasks project owner or assignee or admin" on public.tasks;
drop policy if exists "visits customer owner rep or admin" on public.visits;
drop policy if exists "attachments owner or admin" on public.attachments;

create policy "profiles select self" on public.profiles
for select using (id = auth.uid());

create policy "profiles update self" on public.profiles
for update using (id = auth.uid())
with check (id = auth.uid());

create policy "customers own records" on public.customers
for all using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "projects from own customers" on public.customer_projects
for all using (
  exists (
    select 1
    from public.customers c
    where c.id = customer_projects.customer_id
      and c.owner_id = auth.uid()
  )
)
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.customers c
    where c.id = customer_projects.customer_id
      and c.owner_id = auth.uid()
  )
);

create policy "stages of own projects" on public.project_stages
for all using (
  exists (
    select 1
    from public.customer_projects p
    join public.customers c on c.id = p.customer_id
    where p.id = project_stages.project_id
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.customer_projects p
    join public.customers c on c.id = p.customer_id
    where p.id = project_stages.project_id
      and c.owner_id = auth.uid()
  )
);

create policy "tasks of own projects" on public.tasks
for all using (
  exists (
    select 1
    from public.customer_projects p
    join public.customers c on c.id = p.customer_id
    where p.id = tasks.project_id
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.customer_projects p
    join public.customers c on c.id = p.customer_id
    where p.id = tasks.project_id
      and c.owner_id = auth.uid()
  )
);

create policy "visits assigned or own customers" on public.visits
for all using (
  sales_rep_id = auth.uid()
  or exists (
    select 1
    from public.customers c
    where c.id = visits.customer_id
      and c.owner_id = auth.uid()
  )
)
with check (
  sales_rep_id = auth.uid()
  or exists (
    select 1
    from public.customers c
    where c.id = visits.customer_id
      and c.owner_id = auth.uid()
  )
);

create policy "attachments own records" on public.attachments
for all using (owner_id = auth.uid())
with check (owner_id = auth.uid());