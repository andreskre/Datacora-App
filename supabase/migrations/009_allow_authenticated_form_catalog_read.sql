-- Fix task assignment catalog reads.
-- Required by the app before inserting into public.tasks.

grant select on public.form_templates to authenticated;
grant select on public.form_sections to authenticated;
grant select on public.form_questions to authenticated;

drop policy if exists "authenticated can read form templates" on public.form_templates;
create policy "authenticated can read form templates"
on public.form_templates for select
to authenticated
using (true);

drop policy if exists "authenticated can read form sections" on public.form_sections;
create policy "authenticated can read form sections"
on public.form_sections for select
to authenticated
using (true);

drop policy if exists "authenticated can read form questions" on public.form_questions;
create policy "authenticated can read form questions"
on public.form_questions for select
to authenticated
using (true);
