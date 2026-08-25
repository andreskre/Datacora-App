-- Enable Supabase Realtime events for task assignment updates.
-- Required so connected technician devices can refresh as soon as a task is inserted/updated.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'task_required_sections'
  ) then
    alter publication supabase_realtime add table public.task_required_sections;
  end if;
end $$;
