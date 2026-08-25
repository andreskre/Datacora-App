alter table public.form_attachments
  drop constraint if exists form_attachments_file_kind_check;

alter table public.form_attachments
  add constraint form_attachments_file_kind_check
  check (file_kind in (
    'pdf',
    'onedrive_pdf',
    'onedrive_bitacora_pdf',
    'onedrive_internal_pdf',
    'onedrive_photos_zip',
    'onedrive_photo',
    'attachment',
    'signature',
    'photo'
  ));
