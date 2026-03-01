create table if not exists public.project_members (
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_members_user_idx on public.project_members(user_id);
create index if not exists project_members_project_idx on public.project_members(project_id);

alter table public.project_members enable row level security;

create or replace function public.is_project_owner(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.customer_projects p
    where p.id = project_uuid
      and p.owner_id = auth.uid()
  );
$$;

create or replace function public.is_project_member(project_uuid uuid, member_uuid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_uuid
      and pm.user_id = member_uuid
  );
$$;

create or replace function public.can_access_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_project_owner(project_uuid)
    or public.is_project_member(project_uuid);
$$;

drop policy if exists "profiles select self" on public.profiles;
drop policy if exists "profiles select authenticated" on public.profiles;
create policy "profiles select authenticated" on public.profiles
for select using (auth.uid() is not null);

drop policy if exists "projects from own customers" on public.customer_projects;
drop policy if exists "customer projects select owner or member" on public.customer_projects;
drop policy if exists "customer projects insert owner only" on public.customer_projects;
drop policy if exists "customer projects update owner only" on public.customer_projects;
drop policy if exists "customer projects delete owner only" on public.customer_projects;

create policy "customer projects select owner or member" on public.customer_projects
for select using (public.can_access_project(id));

create policy "customer projects insert owner only" on public.customer_projects
for insert with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.customers c
    where c.id = customer_projects.customer_id
      and c.owner_id = auth.uid()
  )
);

create policy "customer projects update owner only" on public.customer_projects
for update using (public.is_project_owner(id))
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.customers c
    where c.id = customer_projects.customer_id
      and c.owner_id = auth.uid()
  )
);

create policy "customer projects delete owner only" on public.customer_projects
for delete using (public.is_project_owner(id));

drop policy if exists "project members select owner or member" on public.project_members;
drop policy if exists "project members insert owner only" on public.project_members;
drop policy if exists "project members delete owner only" on public.project_members;

create policy "project members select owner or member" on public.project_members
for select using (public.can_access_project(project_id));

create policy "project members insert owner only" on public.project_members
for insert with check (public.is_project_owner(project_id));

create policy "project members delete owner only" on public.project_members
for delete using (public.is_project_owner(project_id));

drop policy if exists "stages of own projects" on public.project_stages;
drop policy if exists "project stages owner or member" on public.project_stages;

create policy "project stages owner or member" on public.project_stages
for all using (public.can_access_project(project_id))
with check (public.can_access_project(project_id));

drop policy if exists "tasks of own projects" on public.tasks;
drop policy if exists "tasks owner or member" on public.tasks;

create policy "tasks owner or member" on public.tasks
for all using (public.can_access_project(project_id))
with check (public.can_access_project(project_id));

drop policy if exists "visits assigned or own customers" on public.visits;
drop policy if exists "visits access by customer or linked project" on public.visits;

create policy "visits access by customer or linked project" on public.visits
for all using (
  sales_rep_id = auth.uid()
  or exists (
    select 1
    from public.customers c
    where c.id = visits.customer_id
      and c.owner_id = auth.uid()
  )
  or (
    to_jsonb(visits) ? 'project_id'
    and (to_jsonb(visits) ->> 'project_id') is not null
    and public.can_access_project((to_jsonb(visits) ->> 'project_id')::uuid)
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
  or (
    to_jsonb(visits) ? 'project_id'
    and (to_jsonb(visits) ->> 'project_id') is not null
    and public.can_access_project((to_jsonb(visits) ->> 'project_id')::uuid)
  )
);
