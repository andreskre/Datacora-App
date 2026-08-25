-- Add a real sequential folio for submitted maintenance forms.
-- The frontend only displays this value; Supabase assigns it atomically.

create sequence if not exists public.form_submission_folio_seq;

alter table public.form_submissions
add column if not exists folio integer;

with numbered as (
  select
    id,
    row_number() over (order by created_at, id) as next_folio
  from public.form_submissions
  where folio is null
)
update public.form_submissions submission
set folio = numbered.next_folio
from numbered
where submission.id = numbered.id;

select setval(
  'public.form_submission_folio_seq',
  coalesce((select max(folio) from public.form_submissions), 0) + 1,
  false
);

alter sequence public.form_submission_folio_seq
owned by public.form_submissions.folio;

alter table public.form_submissions
alter column folio set default nextval('public.form_submission_folio_seq');

alter table public.form_submissions
alter column folio set not null;

create unique index if not exists idx_form_submissions_folio
on public.form_submissions(folio);
