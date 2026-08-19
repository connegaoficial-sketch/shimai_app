-- Admin team management without service_role in the Next.js app.

create or replace function shimai.admin_list_team()
returns jsonb
language plpgsql
stable
security definer
set search_path = shimai, auth, public
as $$
begin
  if not shimai.is_admin() then
    raise exception 'Forbidden';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'email', u.email,
          'full_name', p.full_name,
          'role', p.role,
          'created_at', p.created_at
        )
        order by p.created_at
      )
      from shimai.profiles p
      join auth.users u on u.id = p.id
      where p.role in ('admin'::shimai.user_role, 'driver'::shimai.user_role)
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function shimai.admin_upsert_team_member(
  p_email text,
  p_full_name text,
  p_role shimai.user_role
)
returns uuid
language plpgsql
security definer
set search_path = shimai, auth, public
as $$
declare
  v_user_id uuid;
  v_full_name text;
begin
  if not shimai.is_admin() then
    raise exception 'Forbidden';
  end if;

  if p_role not in ('admin'::shimai.user_role, 'driver'::shimai.user_role) then
    raise exception 'Invalid team role';
  end if;

  v_full_name := nullif(trim(p_full_name), '');

  select id
  into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_email));

  if v_user_id is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  insert into shimai.profiles (id, full_name, role)
  values (v_user_id, v_full_name, p_role)
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, shimai.profiles.full_name),
        role = excluded.role;

  return v_user_id;
end;
$$;

revoke all on function shimai.admin_list_team() from public;
grant execute on function shimai.admin_list_team() to authenticated;

revoke all on function shimai.admin_upsert_team_member(text, text, shimai.user_role) from public;
grant execute on function shimai.admin_upsert_team_member(text, text, shimai.user_role) to authenticated;
