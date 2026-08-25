create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'android',
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_device_push_tokens_user_active
  on public.device_push_tokens (user_id)
  where is_active;

alter table public.device_push_tokens enable row level security;

drop policy if exists "users can read own push tokens" on public.device_push_tokens;
create policy "users can read own push tokens"
on public.device_push_tokens for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users can insert own push tokens" on public.device_push_tokens;
create policy "users can insert own push tokens"
on public.device_push_tokens for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users can update own push tokens" on public.device_push_tokens;
create policy "users can update own push tokens"
on public.device_push_tokens for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "service role can manage push tokens" on public.device_push_tokens;
create policy "service role can manage push tokens"
on public.device_push_tokens for all
to service_role
using (true)
with check (true);

grant select, insert, update, delete on public.device_push_tokens to authenticated;
grant all on public.device_push_tokens to service_role;
