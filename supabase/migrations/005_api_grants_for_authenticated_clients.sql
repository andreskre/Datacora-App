-- Grants required by Supabase REST/PostgREST.
-- RLS policies still decide which rows each authenticated user can access.

grant usage on schema public to anon, authenticated;

grant select on public.branches to authenticated;
grant select on public.groups to authenticated;
grant select on public.roles to authenticated;
grant select on public.profiles to authenticated;
grant select on public.establishments to authenticated;
grant select on public.form_templates to authenticated;
grant select on public.form_sections to authenticated;
grant select on public.form_questions to authenticated;
grant select on public.tasks to authenticated;
grant select on public.task_required_sections to authenticated;
grant select on public.form_submissions to authenticated;
grant select on public.response_items to authenticated;
grant select on public.form_answers to authenticated;
grant select on public.form_attachments to authenticated;
grant select on public.sync_events to authenticated;

grant insert, update on public.tasks to authenticated;
grant insert, update, delete on public.task_required_sections to authenticated;
grant insert, update on public.form_submissions to authenticated;
grant insert, update, delete on public.response_items to authenticated;
grant insert, update, delete on public.form_answers to authenticated;
grant insert, update, delete on public.form_attachments to authenticated;
grant insert on public.sync_events to authenticated;

grant insert, update, delete on public.branches to authenticated;
grant insert, update, delete on public.groups to authenticated;
grant insert, update, delete on public.roles to authenticated;
grant insert, update, delete on public.profiles to authenticated;
grant insert, update, delete on public.establishments to authenticated;
grant insert, update, delete on public.form_templates to authenticated;
grant insert, update, delete on public.form_sections to authenticated;
grant insert, update, delete on public.form_questions to authenticated;

grant select on public.bi_bitacora_respuestas to authenticated;
grant select on public.bi_bitacoras_resumen to authenticated;
grant execute on function public.get_bi_bitacora_respuestas(date, date, text, text) to authenticated;
