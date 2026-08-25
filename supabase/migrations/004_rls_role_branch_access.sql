-- Row Level Security for Datacora.
-- Access is controlled by role capabilities first, then by branch.
-- Admin users can have a branch such as Santiago for their profile, but
-- can_view_national_data=true lets them see every branch.

create or replace function public.current_user_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select branch_id
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.current_user_can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(r.can_manage_users, false)
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid();
$$;

create or replace function public.current_user_can_assign_tasks()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(r.can_assign_tasks, false)
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid();
$$;

create or replace function public.current_user_can_view_national_data()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(r.can_view_national_data, false)
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid();
$$;

create or replace function public.current_user_is_admin_scope()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_can_manage_users() or public.current_user_can_view_national_data();
$$;

alter table public.branches enable row level security;
alter table public.groups enable row level security;
alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.establishments enable row level security;
alter table public.form_templates enable row level security;
alter table public.form_sections enable row level security;
alter table public.form_questions enable row level security;
alter table public.tasks enable row level security;
alter table public.task_required_sections enable row level security;
alter table public.form_submissions enable row level security;
alter table public.response_items enable row level security;
alter table public.form_answers enable row level security;
alter table public.form_attachments enable row level security;
alter table public.sync_events enable row level security;

drop policy if exists "authenticated can read branches" on public.branches;
create policy "authenticated can read branches"
on public.branches for select
to authenticated
using (is_active = true);

drop policy if exists "admins manage branches" on public.branches;
create policy "admins manage branches"
on public.branches for all
to authenticated
using (public.current_user_can_manage_users())
with check (public.current_user_can_manage_users());

drop policy if exists "authenticated can read groups" on public.groups;
create policy "authenticated can read groups"
on public.groups for select
to authenticated
using (true);

drop policy if exists "admins manage groups" on public.groups;
create policy "admins manage groups"
on public.groups for all
to authenticated
using (public.current_user_can_manage_users())
with check (public.current_user_can_manage_users());

drop policy if exists "authenticated can read roles" on public.roles;
create policy "authenticated can read roles"
on public.roles for select
to authenticated
using (true);

drop policy if exists "admins manage roles" on public.roles;
create policy "admins manage roles"
on public.roles for all
to authenticated
using (public.current_user_can_manage_users())
with check (public.current_user_can_manage_users());

drop policy if exists "profiles visible by scope" on public.profiles;
create policy "profiles visible by scope"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.current_user_is_admin_scope()
  or branch_id = public.current_user_branch_id()
);

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles"
on public.profiles for all
to authenticated
using (public.current_user_can_manage_users())
with check (public.current_user_can_manage_users());

drop policy if exists "establishments visible by scope" on public.establishments;
create policy "establishments visible by scope"
on public.establishments for select
to authenticated
using (
  public.current_user_is_admin_scope()
  or branch_id = public.current_user_branch_id()
);

drop policy if exists "admins manage establishments" on public.establishments;
create policy "admins manage establishments"
on public.establishments for all
to authenticated
using (public.current_user_can_manage_users())
with check (public.current_user_can_manage_users());

drop policy if exists "form templates visible to authenticated" on public.form_templates;
create policy "form templates visible to authenticated"
on public.form_templates for select
to authenticated
using (is_active = true);

drop policy if exists "form sections visible to authenticated" on public.form_sections;
create policy "form sections visible to authenticated"
on public.form_sections for select
to authenticated
using (true);

drop policy if exists "form questions visible to authenticated" on public.form_questions;
create policy "form questions visible to authenticated"
on public.form_questions for select
to authenticated
using (true);

drop policy if exists "admins manage form templates" on public.form_templates;
create policy "admins manage form templates"
on public.form_templates for all
to authenticated
using (public.current_user_can_manage_users())
with check (public.current_user_can_manage_users());

drop policy if exists "admins manage form sections" on public.form_sections;
create policy "admins manage form sections"
on public.form_sections for all
to authenticated
using (public.current_user_can_manage_users())
with check (public.current_user_can_manage_users());

drop policy if exists "admins manage form questions" on public.form_questions;
create policy "admins manage form questions"
on public.form_questions for all
to authenticated
using (public.current_user_can_manage_users())
with check (public.current_user_can_manage_users());

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
      and technician.branch_id = public.current_user_branch_id()
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
        and technician.branch_id = public.current_user_branch_id()
        and establishment.branch_id = public.current_user_branch_id()
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
        and technician.branch_id = public.current_user_branch_id()
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
        and technician.branch_id = public.current_user_branch_id()
    )
  )
);

drop policy if exists "task required sections visible through task" on public.task_required_sections;
create policy "task required sections visible through task"
on public.task_required_sections for select
to authenticated
using (exists (select 1 from public.tasks t where t.id = task_required_sections.task_id));

drop policy if exists "assigners manage required sections" on public.task_required_sections;
create policy "assigners manage required sections"
on public.task_required_sections for all
to authenticated
using (exists (select 1 from public.tasks t where t.id = task_required_sections.task_id and (public.current_user_is_admin_scope() or t.assigned_by = auth.uid())))
with check (exists (select 1 from public.tasks t where t.id = task_required_sections.task_id and (public.current_user_is_admin_scope() or t.assigned_by = auth.uid())));

drop policy if exists "submissions visible by scope" on public.form_submissions;
create policy "submissions visible by scope"
on public.form_submissions for select
to authenticated
using (
  technician_id = auth.uid()
  or exists (select 1 from public.tasks t where t.id = form_submissions.task_id)
);

drop policy if exists "technicians create own submissions" on public.form_submissions;
create policy "technicians create own submissions"
on public.form_submissions for insert
to authenticated
with check (technician_id = auth.uid());

drop policy if exists "technicians update own submissions" on public.form_submissions;
create policy "technicians update own submissions"
on public.form_submissions for update
to authenticated
using (technician_id = auth.uid() or public.current_user_is_admin_scope())
with check (technician_id = auth.uid() or public.current_user_is_admin_scope());

drop policy if exists "response items visible through submission" on public.response_items;
create policy "response items visible through submission"
on public.response_items for select
to authenticated
using (exists (select 1 from public.form_submissions s where s.id = response_items.submission_id));

drop policy if exists "technicians manage response items" on public.response_items;
create policy "technicians manage response items"
on public.response_items for all
to authenticated
using (exists (select 1 from public.form_submissions s where s.id = response_items.submission_id and (s.technician_id = auth.uid() or public.current_user_is_admin_scope())))
with check (exists (select 1 from public.form_submissions s where s.id = response_items.submission_id and (s.technician_id = auth.uid() or public.current_user_is_admin_scope())));

drop policy if exists "answers visible through submission" on public.form_answers;
create policy "answers visible through submission"
on public.form_answers for select
to authenticated
using (exists (select 1 from public.form_submissions s where s.id = form_answers.submission_id));

drop policy if exists "technicians manage answers" on public.form_answers;
create policy "technicians manage answers"
on public.form_answers for all
to authenticated
using (exists (select 1 from public.form_submissions s where s.id = form_answers.submission_id and (s.technician_id = auth.uid() or public.current_user_is_admin_scope())))
with check (exists (select 1 from public.form_submissions s where s.id = form_answers.submission_id and (s.technician_id = auth.uid() or public.current_user_is_admin_scope())));

drop policy if exists "attachments visible through submission" on public.form_attachments;
create policy "attachments visible through submission"
on public.form_attachments for select
to authenticated
using (exists (select 1 from public.form_submissions s where s.id = form_attachments.submission_id));

drop policy if exists "technicians manage attachments" on public.form_attachments;
create policy "technicians manage attachments"
on public.form_attachments for all
to authenticated
using (exists (select 1 from public.form_submissions s where s.id = form_attachments.submission_id and (s.technician_id = auth.uid() or public.current_user_is_admin_scope())))
with check (exists (select 1 from public.form_submissions s where s.id = form_attachments.submission_id and (s.technician_id = auth.uid() or public.current_user_is_admin_scope())));

drop policy if exists "users insert sync events" on public.sync_events;
create policy "users insert sync events"
on public.sync_events for insert
to authenticated
with check (user_id = auth.uid() or user_id is null);

drop policy if exists "users read own sync events" on public.sync_events;
create policy "users read own sync events"
on public.sync_events for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_admin_scope());

