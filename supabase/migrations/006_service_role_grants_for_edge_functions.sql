-- Grants for Supabase Edge Functions that use the server-side secret key.
-- The function create-user creates Auth users and then inserts/updates public
-- profiles using service_role.

grant usage on schema public to service_role;

grant select, insert, update, delete on public.branches to service_role;
grant select, insert, update, delete on public.groups to service_role;
grant select, insert, update, delete on public.roles to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.establishments to service_role;
grant select, insert, update, delete on public.form_templates to service_role;
grant select, insert, update, delete on public.form_sections to service_role;
grant select, insert, update, delete on public.form_questions to service_role;
grant select, insert, update, delete on public.tasks to service_role;
grant select, insert, update, delete on public.task_required_sections to service_role;
grant select, insert, update, delete on public.form_submissions to service_role;
grant select, insert, update, delete on public.response_items to service_role;
grant select, insert, update, delete on public.form_answers to service_role;
grant select, insert, update, delete on public.form_attachments to service_role;
grant select, insert, update, delete on public.sync_events to service_role;

grant select on public.bi_bitacora_respuestas to service_role;
grant select on public.bi_bitacoras_resumen to service_role;
grant execute on function public.get_bi_bitacora_respuestas(date, date, text, text) to service_role;
