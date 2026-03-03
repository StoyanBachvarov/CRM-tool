alter table public.tasks
  add column if not exists due_date timestamptz;

create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  position int not null default 1,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_checklist_items_task_idx on public.task_checklist_items(task_id, position);

create table if not exists public.task_activity_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete set null,
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action_type text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists task_activity_logs_task_idx on public.task_activity_logs(task_id, created_at desc);
create index if not exists task_activity_logs_project_idx on public.task_activity_logs(project_id, created_at desc);

alter table public.task_checklist_items enable row level security;
alter table public.task_activity_logs enable row level security;

drop policy if exists "task checklist access by project" on public.task_checklist_items;
create policy "task checklist access by project" on public.task_checklist_items
for all using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_checklist_items.task_id
      and (public.can_access_project(t.project_id) or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.tasks t
    where t.id = task_checklist_items.task_id
      and (public.can_access_project(t.project_id) or public.is_admin())
  )
);

drop policy if exists "task activity read by project" on public.task_activity_logs;
create policy "task activity read by project" on public.task_activity_logs
for select using (public.can_access_project(project_id) or public.is_admin());

drop policy if exists "task activity insert by actor" on public.task_activity_logs;
create policy "task activity insert by actor" on public.task_activity_logs
for insert with check (
  (actor_id = auth.uid() and public.can_access_project(project_id))
  or public.is_admin()
);

create or replace function public.log_task_activity_from_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity_logs (task_id, project_id, actor_id, action_type, message, details)
    values (
      new.id,
      new.project_id,
      actor,
      'task_created',
      'Task created',
      jsonb_build_object('title', new.title)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.task_activity_logs (task_id, project_id, actor_id, action_type, message, details)
      values (
        new.id,
        new.project_id,
        actor,
        'status_changed',
        'Task status changed',
        jsonb_build_object('from', old.status, 'to', new.status)
      );
    end if;

    if new.assigned_sales_rep_id is distinct from old.assigned_sales_rep_id then
      insert into public.task_activity_logs (task_id, project_id, actor_id, action_type, message, details)
      values (
        new.id,
        new.project_id,
        actor,
        'assignee_changed',
        'Task assignee changed',
        jsonb_build_object('from', old.assigned_sales_rep_id, 'to', new.assigned_sales_rep_id)
      );
    end if;

    if new.stage_id is distinct from old.stage_id then
      insert into public.task_activity_logs (task_id, project_id, actor_id, action_type, message, details)
      values (
        new.id,
        new.project_id,
        actor,
        'task_moved',
        'Task moved between stages',
        jsonb_build_object('from_stage_id', old.stage_id, 'to_stage_id', new.stage_id)
      );
    end if;

    if new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.due_date is distinct from old.due_date
      or new.position is distinct from old.position then
      insert into public.task_activity_logs (task_id, project_id, actor_id, action_type, message, details)
      values (
        new.id,
        new.project_id,
        actor,
        'task_edited',
        'Task edited',
        jsonb_build_object(
          'old_title', old.title,
          'new_title', new.title,
          'old_due_date', old.due_date,
          'new_due_date', new.due_date
        )
      );
    end if;

    return new;
  elsif tg_op = 'DELETE' then
    insert into public.task_activity_logs (task_id, project_id, actor_id, action_type, message, details)
    values (
      old.id,
      old.project_id,
      actor,
      'task_deleted',
      'Task deleted',
      jsonb_build_object('title', old.title)
    );
    return old;
  end if;

  return null;
end;
$$;

create or replace function public.log_task_comment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  task_project uuid;
begin
  select t.project_id into task_project
  from public.tasks t
  where t.id = new.task_id;

  if task_project is null then
    return new;
  end if;

  insert into public.task_activity_logs (task_id, project_id, actor_id, action_type, message, details)
  values (
    new.task_id,
    task_project,
    new.author_id,
    'comment_added',
    'Comment added',
    jsonb_build_object('comment_id', new.id, 'message', new.message)
  );

  return new;
end;
$$;

drop trigger if exists trg_tasks_activity_insert_update on public.tasks;
create trigger trg_tasks_activity_insert_update
after insert or update on public.tasks
for each row execute function public.log_task_activity_from_task();

drop trigger if exists trg_tasks_activity_delete on public.tasks;
create trigger trg_tasks_activity_delete
before delete on public.tasks
for each row execute function public.log_task_activity_from_task();

drop trigger if exists trg_task_comments_activity on public.task_comments;
create trigger trg_task_comments_activity
after insert on public.task_comments
for each row execute function public.log_task_comment_activity();