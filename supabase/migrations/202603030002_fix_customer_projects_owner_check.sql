create or replace function public.is_customer_owner(customer_uuid uuid, user_uuid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.customers c
    where c.id = customer_uuid
      and c.owner_id = user_uuid
  );
$$;

drop policy if exists "customer projects insert owner or admin" on public.customer_projects;
create policy "customer projects insert owner or admin" on public.customer_projects
for insert with check (
  public.is_admin()
  or (
    owner_id = auth.uid()
    and public.is_customer_owner(customer_id, auth.uid())
  )
);

drop policy if exists "customer projects update owner or admin" on public.customer_projects;
create policy "customer projects update owner or admin" on public.customer_projects
for update using (public.is_project_owner(id) or public.is_admin())
with check (
  public.is_admin()
  or (
    owner_id = auth.uid()
    and public.is_customer_owner(customer_id, auth.uid())
  )
);
