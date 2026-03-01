create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(trim(message)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_idx on public.task_comments(task_id, created_at);
create index if not exists task_comments_author_idx on public.task_comments(author_id);

create table if not exists public.task_labels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default 'secondary',
  created_at timestamptz not null default now()
);

create table if not exists public.task_label_assignments (
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.task_labels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, label_id)
);

create index if not exists task_label_assignments_label_idx on public.task_label_assignments(label_id);

alter table public.task_comments enable row level security;
alter table public.task_labels enable row level security;
alter table public.task_label_assignments enable row level security;

drop policy if exists "task comments access by project" on public.task_comments;
create policy "task comments access by project" on public.task_comments
for select using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_comments.task_id
      and (public.can_access_project(t.project_id) or public.is_admin())
  )
);

create policy "task comments insert by project access" on public.task_comments
for insert with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.tasks t
    where t.id = task_comments.task_id
      and (public.can_access_project(t.project_id) or public.is_admin())
  )
);

create policy "task comments update own or admin" on public.task_comments
for update using (author_id = auth.uid() or public.is_admin())
with check (author_id = auth.uid() or public.is_admin());

create policy "task comments delete own or admin" on public.task_comments
for delete using (author_id = auth.uid() or public.is_admin());

drop policy if exists "task labels select authenticated" on public.task_labels;
drop policy if exists "task labels admin all" on public.task_labels;

create policy "task labels select authenticated" on public.task_labels
for select using (auth.uid() is not null);

create policy "task labels admin all" on public.task_labels
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "task label assignments access by project" on public.task_label_assignments;

create policy "task label assignments access by project" on public.task_label_assignments
for all using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_label_assignments.task_id
      and (public.can_access_project(t.project_id) or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.tasks t
    where t.id = task_label_assignments.task_id
      and (public.can_access_project(t.project_id) or public.is_admin())
  )
);

insert into public.task_labels (name, color)
values
  ('Sales', 'primary'),
  ('Follow-up', 'info'),
  ('Support', 'success'),
  ('Urgent', 'danger')
on conflict (name) do nothing;
