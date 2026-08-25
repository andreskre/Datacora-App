-- Allow managers to be responsible for more than one branch without granting national scope.

create table if not exists public.profile_branches (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, branch_id)
);

insert into public.profile_branches (profile_id, branch_id)
select id, branch_id
from public.profiles
where branch_id is not null
on conflict do nothing;

create index if not exists idx_profile_branches_branch
on public.profile_branches(branch_id);

create or replace function public.current_user_branch_ids()
returns table(branch_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select p.branch_id
  from public.profiles p
  where p.id = auth.uid()
    and p.branch_id is not null
  union
  select pb.branch_id
  from public.profile_branches pb
  where pb.profile_id = auth.uid();
$$;

alter table public.profile_branches enable row level security;

drop policy if exists "profile branches visible by scope" on public.profile_branches;
create policy "profile branches visible by scope"
on public.profile_branches for select
to authenticated
using (
  profile_id = auth.uid()
  or public.current_user_is_admin_scope()
  or branch_id in (select branch_id from public.current_user_branch_ids())
);

drop policy if exists "admins manage profile branches" on public.profile_branches;
create policy "admins manage profile branches"
on public.profile_branches for all
to authenticated
using (public.current_user_can_manage_users())
with check (public.current_user_can_manage_users());

grant select on public.profile_branches to authenticated;
grant insert, update, delete on public.profile_branches to authenticated;
grant select, insert, update, delete on public.profile_branches to service_role;

drop policy if exists "profiles visible by scope" on public.profiles;
create policy "profiles visible by scope"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.current_user_is_admin_scope()
  or branch_id in (select branch_id from public.current_user_branch_ids())
);

drop policy if exists "establishments visible by scope" on public.establishments;
create policy "establishments visible by scope"
on public.establishments for select
to authenticated
using (
  public.current_user_is_admin_scope()
  or branch_id in (select branch_id from public.current_user_branch_ids())
);

drop policy if exists "tasks visible by scope" on public.tasks;
create policy "tasks visible by scope"
on public.tasks for select
to authenticated
using (
  public.current_user_is_admin_scope()
  or assigned_to = auth.uid()
  or exists (
    select 1
    from public.profiles technician
    where technician.id = tasks.assigned_to
      and technician.branch_id in (select branch_id from public.current_user_branch_ids())
      and public.current_user_can_assign_tasks()
  )
);

drop policy if exists "assigners create tasks by scope" on public.tasks;
create policy "assigners create tasks by scope"
on public.tasks for insert
to authenticated
with check (
  public.current_user_is_admin_scope()
  or (
    public.current_user_can_assign_tasks()
    and assigned_by = auth.uid()
    and exists (
      select 1
      from public.profiles technician
      join public.establishments establishment on establishment.id = tasks.establishment_id
      where technician.id = tasks.assigned_to
        and technician.branch_id in (select branch_id from public.current_user_branch_ids())
        and establishment.branch_id in (select branch_id from public.current_user_branch_ids())
    )
  )
);

drop policy if exists "assigners update tasks by scope" on public.tasks;
create policy "assigners update tasks by scope"
on public.tasks for update
to authenticated
using (
  public.current_user_is_admin_scope()
  or assigned_to = auth.uid()
  or (
    public.current_user_can_assign_tasks()
    and exists (
      select 1
      from public.profiles technician
      where technician.id = tasks.assigned_to
        and technician.branch_id in (select branch_id from public.current_user_branch_ids())
    )
  )
)
with check (
  public.current_user_is_admin_scope()
  or assigned_to = auth.uid()
  or (
    public.current_user_can_assign_tasks()
    and exists (
      select 1
      from public.profiles technician
      where technician.id = tasks.assigned_to
        and technician.branch_id in (select branch_id from public.current_user_branch_ids())
    )
  )
);
