alter table public.profiles
add column if not exists rut text;

create unique index if not exists idx_profiles_rut_unique
on public.profiles (rut)
where rut is not null and rut <> '';
