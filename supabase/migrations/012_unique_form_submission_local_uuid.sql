-- Prevent duplicated form submissions when offline sync retries the same payload.

create unique index if not exists idx_form_submissions_local_uuid_unique
on public.form_submissions(local_uuid)
where local_uuid is not null;
