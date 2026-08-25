-- Fix login/task loading when PostgREST needs to embed establishments.
-- The app already filters establishments by branch in the UI.

grant select on public.establishments to authenticated;

drop policy if exists "authenticated can read establishments" on public.establishments;
create policy "authenticated can read establishments"
on public.establishments for select
to authenticated
using (true);
