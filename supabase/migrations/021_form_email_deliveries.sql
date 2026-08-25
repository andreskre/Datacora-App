create table if not exists public.form_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  email_kind text not null,
  status text not null default 'sending',
  mode text,
  recipients jsonb not null default '{}'::jsonb,
  subject text,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint form_email_deliveries_status_check check (status in ('sending', 'sent', 'failed', 'skipped')),
  constraint form_email_deliveries_kind_check check (email_kind in ('bitacora_pdf'))
);

create unique index if not exists ux_form_email_deliveries_submission_kind
  on public.form_email_deliveries (submission_id, email_kind);

create index if not exists idx_form_email_deliveries_submission
  on public.form_email_deliveries (submission_id);

alter table public.form_email_deliveries enable row level security;

drop policy if exists "email deliveries visible through submission" on public.form_email_deliveries;
create policy "email deliveries visible through submission"
on public.form_email_deliveries
for select
to authenticated
using (
  exists (
    select 1
    from public.form_submissions s
    where s.id = form_email_deliveries.submission_id
      and (
        s.technician_id = auth.uid()
        or public.current_user_is_admin_scope()
      )
  )
);

drop policy if exists "service role can manage email deliveries" on public.form_email_deliveries;
create policy "service role can manage email deliveries"
on public.form_email_deliveries
for all
to service_role
using (true)
with check (true);

grant select on public.form_email_deliveries to authenticated;
grant all on public.form_email_deliveries to service_role;
