-- Allow authenticated users who can see a task submission to read the detail
-- needed by the mobile summary: response item counts, answer counts and section names.

grant select on public.form_sections to authenticated;
grant select on public.form_submissions to authenticated;
grant select on public.response_items to authenticated;
grant select on public.form_answers to authenticated;
grant select on public.form_attachments to authenticated;

drop policy if exists "submissions visible by task access" on public.form_submissions;
create policy "submissions visible by task access"
on public.form_submissions
for select
to authenticated
using (
  technician_id = auth.uid()
  or exists (
    select 1
    from public.tasks t
    where t.id = form_submissions.task_id
      and (
        t.assigned_to = auth.uid()
        or t.assigned_by = auth.uid()
        or public.current_user_can_assign_tasks()
        or public.current_user_is_admin_scope()
      )
  )
);

drop policy if exists "response items visible by task access" on public.response_items;
create policy "response items visible by task access"
on public.response_items
for select
to authenticated
using (
  exists (
    select 1
    from public.form_submissions s
    join public.tasks t on t.id = s.task_id
    where s.id = response_items.submission_id
      and (
        s.technician_id = auth.uid()
        or t.assigned_to = auth.uid()
        or t.assigned_by = auth.uid()
        or public.current_user_can_assign_tasks()
        or public.current_user_is_admin_scope()
      )
  )
);

drop policy if exists "answers visible by task access" on public.form_answers;
create policy "answers visible by task access"
on public.form_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.form_submissions s
    join public.tasks t on t.id = s.task_id
    where s.id = form_answers.submission_id
      and (
        s.technician_id = auth.uid()
        or t.assigned_to = auth.uid()
        or t.assigned_by = auth.uid()
        or public.current_user_can_assign_tasks()
        or public.current_user_is_admin_scope()
      )
  )
);

drop policy if exists "attachments visible by task access" on public.form_attachments;
create policy "attachments visible by task access"
on public.form_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.form_submissions s
    join public.tasks t on t.id = s.task_id
    where s.id = form_attachments.submission_id
      and (
        s.technician_id = auth.uid()
        or t.assigned_to = auth.uid()
        or t.assigned_by = auth.uid()
        or public.current_user_can_assign_tasks()
        or public.current_user_is_admin_scope()
      )
  )
);
