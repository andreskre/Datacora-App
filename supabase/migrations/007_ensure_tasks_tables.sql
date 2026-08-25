-- Ensure task assignment tables exist in Supabase.
-- Run this after branches, profiles, establishments and form_templates exist.

create extension if not exists pgcrypto;

do $$
begin
  create type public.task_status as enum ('pendiente', 'urgente', 'completada', 'cancelada');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.task_priority as enum ('baja', 'media', 'alta');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.sync_state as enum ('synced', 'pending', 'conflict');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.tasks (
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

create table if not exists public.task_required_sections (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  section_id uuid not null references public.form_sections(id),
  is_required boolean not null default true,
  is_critical boolean not null default false,
  min_required integer,
  unique (task_id, section_id)
);

create index if not exists idx_tasks_assigned_to_status on public.tasks(assigned_to, status);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_task_required_sections_task on public.task_required_sections(task_id);

grant select, insert, update on public.tasks to authenticated;
grant select, insert, update, delete on public.task_required_sections to authenticated;
grant select, insert, update, delete on public.tasks to service_role;
grant select, insert, update, delete on public.task_required_sections to service_role;
