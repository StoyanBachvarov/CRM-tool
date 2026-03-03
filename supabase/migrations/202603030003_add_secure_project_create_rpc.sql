create or replace function public.create_customer_project(
  p_customer_id uuid,
  p_title text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_project_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not (
    public.is_admin()
    or public.is_customer_owner(p_customer_id, v_user_id)
  ) then
    raise exception 'Not allowed to create project for this customer';
  end if;

  insert into public.customer_projects (customer_id, owner_id, title, description)
  values (
    p_customer_id,
    v_user_id,
    p_title,
    nullif(trim(coalesce(p_description, '')), '')
  )
  returning id into v_project_id;

  return v_project_id;
end;
$$;

grant execute on function public.create_customer_project(uuid, text, text) to authenticated;
