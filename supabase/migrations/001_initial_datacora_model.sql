-- Datacora initial data model for Supabase/PostgreSQL.
-- Goal: support mobile task assignment, dynamic forms, offline sync,
-- answers, external PDF references, signatures metadata, and BI extraction without photos.

create extension if not exists pgcrypto;

create type public.user_status as enum ('activo', 'inactivo');
create type public.task_status as enum ('pendiente', 'urgente', 'completada', 'cancelada');
create type public.task_priority as enum ('baja', 'media', 'alta');
create type public.sync_state as enum ('synced', 'pending', 'conflict');
create type public.answer_type as enum (
  'text',
  'number',
  'date',
  'boolean',
  'single_choice',
  'multi_choice',
  'observation',
  'photo',
  'attachment',
  'signature'
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  can_manage_users boolean not null default false,
  can_assign_tasks boolean not null default false,
  can_view_notifications boolean not null default false,
  can_view_national_data boolean not null default false
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  branch_id uuid references public.branches(id),
  group_id uuid references public.groups(id),
  role_id uuid not null references public.roles(id),
  status public.user_status not null default 'activo',
  status_reason text not null default 'Disponible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.establishments (
  id uuid primary key default gen_random_uuid(),
  rbd text not null unique,
  name text not null,
  commune text,
  institution_type text,
  address text,
  branch_id uuid not null references public.branches(id),
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.form_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  visit_type text not null,
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.form_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.form_templates(id) on delete cascade,
  code text not null,
  title text not null,
  sort_order integer not null,
  is_base_required boolean not null default false,
  is_base_critical boolean not null default false,
  fixed_min_required integer,
  unique (template_id, code)
);

create table public.form_questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.form_sections(id) on delete cascade,
  code text not null,
  label text not null,
  answer_type public.answer_type not null,
  sort_order integer not null,
  is_required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  visibility_rule jsonb not null default '{}'::jsonb,
  validation_rule jsonb not null default '{}'::jsonb,
  unique (section_id, code)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  task_type text not null,
  establishment_id uuid not null references public.establishments(id),
  assigned_to uuid not null references public.profiles(id),
  assigned_by uuid not null references public.profiles(id),
  form_template_id uuid not null references public.form_templates(id),
  description text,
  assigned_at timestamptz not null default now(),
  due_date date not null,
  status public.task_status not null default 'pendiente',
  priority public.task_priority not null default 'media',
  sync_state public.sync_state not null default 'synced',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_required_sections (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  section_id uuid not null references public.form_sections(id),
  is_required boolean not null default true,
  is_critical boolean not null default false,
  min_required integer,
  unique (task_id, section_id)
);

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  technician_id uuid not null references public.profiles(id),
  status text not null default 'draft',
  local_uuid text,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Repeating item groups, e.g. each Calor element registered by a technician.
create table public.response_items (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  section_id uuid not null references public.form_sections(id),
  item_index integer not null,
  item_label text,
  created_at timestamptz not null default now(),
  unique (submission_id, section_id, item_index)
);

create table public.form_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  response_item_id uuid references public.response_items(id) on delete cascade,
  section_id uuid not null references public.form_sections(id),
  question_id uuid not null references public.form_questions(id),
  answer_type public.answer_type not null,
  answer_text text,
  answer_number numeric,
  answer_date date,
  answer_boolean boolean,
  answer_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.form_attachments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  response_item_id uuid references public.response_items(id) on delete cascade,
  answer_id uuid references public.form_answers(id) on delete set null,
  file_kind text not null check (file_kind in ('pdf', 'onedrive_pdf', 'attachment', 'signature', 'photo')),
  storage_provider text not null default 'onedrive',
  storage_bucket text,
  storage_path text not null,
  external_url text,
  external_id text,
  mime_type text,
  file_name text,
  file_size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.sync_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  device_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_profiles_branch on public.profiles(branch_id);
create index idx_establishments_branch on public.establishments(branch_id);
create index idx_tasks_assigned_to_status on public.tasks(assigned_to, status);
create index idx_tasks_due_date on public.tasks(due_date);
create index idx_submissions_task on public.form_submissions(task_id);
create index idx_answers_submission on public.form_answers(submission_id);
create index idx_answers_question on public.form_answers(question_id);
create index idx_attachments_submission on public.form_attachments(submission_id);

-- BI view: one row per non-file answer. Photos, attachments, signatures,
-- and generated PDFs are deliberately excluded from the answer-level view.
create or replace view public.bi_bitacora_respuestas as
select
  fsu.id as submission_id,
  t.id as task_id,
  t.task_type,
  t.status as task_status,
  t.priority,
  t.assigned_at,
  t.due_date,
  fsu.started_at,
  fsu.submitted_at,
  e.rbd,
  e.name as establishment_name,
  e.commune,
  e.institution_type,
  e.address,
  b.name as branch_name,
  tech.full_name as technician_name,
  tech.email as technician_email,
  assigner.full_name as assigned_by_name,
  ft.name as form_name,
  ft.version as form_version,
  sec.code as section_code,
  sec.title as section_title,
  ri.item_index,
  ri.item_label,
  q.code as question_code,
  q.label as question_label,
  a.answer_type,
  coalesce(
    a.answer_text,
    a.answer_number::text,
    a.answer_date::text,
    a.answer_boolean::text,
    nullif(a.answer_json::text, '{}'::text)
  ) as answer_value,
  a.answer_json,
  a.created_at as answered_at
from public.form_answers a
join public.form_submissions fsu on fsu.id = a.submission_id
join public.tasks t on t.id = fsu.task_id
join public.establishments e on e.id = t.establishment_id
join public.branches b on b.id = e.branch_id
join public.profiles tech on tech.id = fsu.technician_id
join public.profiles assigner on assigner.id = t.assigned_by
join public.form_templates ft on ft.id = t.form_template_id
join public.form_sections sec on sec.id = a.section_id
join public.form_questions q on q.id = a.question_id
left join public.response_items ri on ri.id = a.response_item_id
where a.answer_type not in ('photo', 'attachment', 'signature');

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

-- Optional RPC for BI/API consumers. Supabase exposes this as:
-- POST /rest/v1/rpc/get_bi_bitacora_respuestas
create or replace function public.get_bi_bitacora_respuestas(
  p_from date default null,
  p_to date default null,
  p_branch text default null,
  p_rbd text default null
)
returns setof public.bi_bitacora_respuestas
language sql
stable
as $$
  select *
  from public.bi_bitacora_respuestas
  where (p_from is null or submitted_at::date >= p_from)
    and (p_to is null or submitted_at::date <= p_to)
    and (p_branch is null or branch_name = p_branch)
    and (p_rbd is null or rbd = p_rbd)
  order by submitted_at desc nulls last, rbd, section_code, item_index, question_code;
$$;
