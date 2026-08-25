-- Adjustment for low-cost pilot:
-- Supabase stores structured answers only. Photos are used to generate the PDF
-- and the final PDF is stored in OneDrive/SharePoint. Supabase keeps metadata
-- and the external link.

alter table public.form_attachments
  drop constraint if exists form_attachments_file_kind_check;

alter table public.form_attachments
  add constraint form_attachments_file_kind_check
  check (file_kind in ('pdf', 'onedrive_pdf', 'attachment', 'signature', 'photo'));

alter table public.form_attachments
  add column if not exists storage_provider text not null default 'onedrive',
  alter column storage_bucket drop not null,
  add column if not exists external_url text,
  add column if not exists external_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create or replace view public.bi_bitacoras_resumen as
select
  fsu.id as submission_id,
  t.id as task_id,
  t.task_type,
  t.status as task_status,
  t.priority,
  e.rbd,
  e.name as establishment_name,
  b.name as branch_name,
  tech.full_name as technician_name,
  assigner.full_name as assigned_by_name,
  t.assigned_at,
  t.due_date,
  fsu.started_at,
  fsu.submitted_at,
  pdf.external_url as pdf_url,
  pdf.external_id as pdf_external_id,
  pdf.file_name as pdf_file_name,
  count(a.id) filter (where a.answer_type not in ('photo', 'attachment', 'signature')) as answer_count,
  count(fa.id) filter (where fa.file_kind in ('pdf', 'onedrive_pdf')) as pdf_count,
  count(fa.id) filter (where fa.file_kind = 'signature') as signature_count
from public.form_submissions fsu
join public.tasks t on t.id = fsu.task_id
join public.establishments e on e.id = t.establishment_id
join public.branches b on b.id = e.branch_id
join public.profiles tech on tech.id = fsu.technician_id
join public.profiles assigner on assigner.id = t.assigned_by
left join public.form_answers a on a.submission_id = fsu.id
left join public.form_attachments fa on fa.submission_id = fsu.id
left join lateral (
  select external_url, external_id, file_name
  from public.form_attachments pdf_file
  where pdf_file.submission_id = fsu.id
    and pdf_file.file_kind in ('pdf', 'onedrive_pdf')
  order by pdf_file.created_at desc
  limit 1
) pdf on true
group by fsu.id, t.id, e.id, b.id, tech.id, assigner.id, pdf.external_url, pdf.external_id, pdf.file_name;

