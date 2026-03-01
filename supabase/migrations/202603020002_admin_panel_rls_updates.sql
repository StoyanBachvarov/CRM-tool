alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_stages enable row level security;
alter table public.tasks enable row level security;
alter table public.visits enable row level security;

drop policy if exists "profiles update self" on public.profiles;
drop policy if exists "profiles update self or admin" on public.profiles;
drop policy if exists "profiles delete admin" on public.profiles;

create policy "profiles update self or admin" on public.profiles
for update using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "profiles delete admin" on public.profiles
for delete using (public.is_admin());

drop policy if exists "customers own records" on public.customers;
drop policy if exists "customers owner or admin" on public.customers;

create policy "customers owner or admin" on public.customers
for all using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "customer projects select owner or member" on public.customer_projects;
drop policy if exists "customer projects insert owner only" on public.customer_projects;
drop policy if exists "customer projects update owner only" on public.customer_projects;
drop policy if exists "customer projects delete owner only" on public.customer_projects;

create policy "customer projects select owner member or admin" on public.customer_projects
for select using (public.can_access_project(id) or public.is_admin());

create policy "customer projects insert owner or admin" on public.customer_projects
for insert with check (
  public.is_admin()
  or (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.customers c
      where c.id = customer_projects.customer_id
        and c.owner_id = auth.uid()
    )
  )
);

create policy "customer projects update owner or admin" on public.customer_projects
for update using (public.is_project_owner(id) or public.is_admin())
with check (
  public.is_admin()
  or (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.customers c
      where c.id = customer_projects.customer_id
        and c.owner_id = auth.uid()
    )
  )
);

create policy "customer projects delete owner or admin" on public.customer_projects
for delete using (public.is_project_owner(id) or public.is_admin());

drop policy if exists "project members select owner or member" on public.project_members;
drop policy if exists "project members insert owner only" on public.project_members;
drop policy if exists "project members delete owner only" on public.project_members;

create policy "project members select owner member or admin" on public.project_members
for select using (public.can_access_project(project_id) or public.is_admin());

create policy "project members insert owner or admin" on public.project_members
for insert with check (public.is_project_owner(project_id) or public.is_admin());

create policy "project members delete owner or admin" on public.project_members
for delete using (public.is_project_owner(project_id) or public.is_admin());

drop policy if exists "project stages owner or member" on public.project_stages;
drop policy if exists "project stages owner member or admin" on public.project_stages;

create policy "project stages owner member or admin" on public.project_stages
for all using (public.can_access_project(project_id) or public.is_admin())
with check (public.can_access_project(project_id) or public.is_admin());

drop policy if exists "tasks owner or member" on public.tasks;
drop policy if exists "tasks owner member or admin" on public.tasks;

create policy "tasks owner member or admin" on public.tasks
for all using (public.can_access_project(project_id) or public.is_admin())
with check (public.can_access_project(project_id) or public.is_admin());

drop policy if exists "visits access by customer or linked project" on public.visits;
drop policy if exists "visits access by customer linked project or admin" on public.visits;

create policy "visits access by customer linked project or admin" on public.visits
for all using (
  public.is_admin()
  or sales_rep_id = auth.uid()
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
  public.is_admin()
  or sales_rep_id = auth.uid()
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
