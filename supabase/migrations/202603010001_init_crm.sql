create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Sales Rep',
  role text not null default 'sales_rep' check (role in ('sales_rep', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  company text,
  address text,
  unique_number text not null,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists customers_unique_owner_number_idx on public.customers(owner_id, unique_number);
create index if not exists customers_owner_idx on public.customers(owner_id);

create table if not exists public.customer_projects (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists projects_customer_idx on public.customer_projects(customer_id);
create index if not exists projects_owner_idx on public.customer_projects(owner_id);

create table if not exists public.project_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  name text not null,
  position int not null default 1,
  created_at timestamptz not null default now(),
  unique(project_id, position)
);

create index if not exists stages_project_idx on public.project_stages(project_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  stage_id uuid not null references public.project_stages(id) on delete cascade,
  title text not null,
  description text,
  assigned_sales_rep_id uuid references public.profiles(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed')),
  position int not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists tasks_project_idx on public.tasks(project_id);
create index if not exists tasks_stage_idx on public.tasks(stage_id);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  sales_rep_id uuid not null references public.profiles(id) on delete cascade,
  visit_date timestamptz not null,
  description text,
  notes text,
  outcome text,
  created_at timestamptz not null default now()
);

create index if not exists visits_customer_idx on public.visits(customer_id);
create index if not exists visits_sales_rep_idx on public.visits(sales_rep_id);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('task', 'visit', 'project')),
  entity_id uuid not null,
  file_name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists attachments_entity_idx on public.attachments(entity_type, entity_id);

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_projects enable row level security;
alter table public.project_stages enable row level security;
alter table public.tasks enable row level security;
alter table public.visits enable row level security;
alter table public.attachments enable row level security;

create or replace function public.is_admin() returns boolean
language sql
stable
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create policy "profiles select self or admin" on public.profiles
for select using (id = auth.uid() or public.is_admin());

create policy "profiles update self or admin" on public.profiles
for update using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "customers owner or admin" on public.customers
for all using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy "projects owner customer owner or admin" on public.customer_projects
for all using (
  owner_id = auth.uid() or
  public.is_admin() or
  exists(select 1 from public.customers c where c.id = customer_projects.customer_id and c.owner_id = auth.uid())
)
with check (
  owner_id = auth.uid() or
  public.is_admin() or
  exists(select 1 from public.customers c where c.id = customer_projects.customer_id and c.owner_id = auth.uid())
);

create policy "stages project owner or admin" on public.project_stages
for all using (
  public.is_admin() or
  exists(select 1 from public.customer_projects p where p.id = project_stages.project_id and p.owner_id = auth.uid())
)
with check (
  public.is_admin() or
  exists(select 1 from public.customer_projects p where p.id = project_stages.project_id and p.owner_id = auth.uid())
);

create policy "tasks project owner or assignee or admin" on public.tasks
for all using (
  public.is_admin() or
  assigned_sales_rep_id = auth.uid() or
  exists(select 1 from public.customer_projects p where p.id = tasks.project_id and p.owner_id = auth.uid())
)
with check (
  public.is_admin() or
  assigned_sales_rep_id = auth.uid() or
  exists(select 1 from public.customer_projects p where p.id = tasks.project_id and p.owner_id = auth.uid())
);

create policy "visits customer owner rep or admin" on public.visits
for all using (
  public.is_admin() or
  sales_rep_id = auth.uid() or
  exists(select 1 from public.customers c where c.id = visits.customer_id and c.owner_id = auth.uid())
)
with check (
  public.is_admin() or
  sales_rep_id = auth.uid() or
  exists(select 1 from public.customers c where c.id = visits.customer_id and c.owner_id = auth.uid())
);

create policy "attachments owner or admin" on public.attachments
for all using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public)
values ('crm-attachments', 'crm-attachments', false)
on conflict (id) do nothing;

create policy "attachment storage access" on storage.objects
for all
using (bucket_id = 'crm-attachments' and owner = auth.uid())
with check (bucket_id = 'crm-attachments' and owner = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'sales_rep'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
