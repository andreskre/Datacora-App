-- Power BI friendly wide view: one row per submitted form.
-- Repeating sections are kept as JSON arrays so the row remains unique by submission.

create or replace view public.bi_bitacoras_formulario_ancho as
with answer_values as (
  select
    fsu.id as submission_id,
    sec.code as section_code,
    ri.id as response_item_id,
    ri.item_index,
    ri.item_label,
    q.code as question_code,
    coalesce(
      a.answer_text,
      a.answer_number::text,
      a.answer_date::text,
      a.answer_boolean::text,
      nullif(a.answer_json::text, '{}'::text)
    ) as answer_value
  from public.form_answers a
  join public.form_submissions fsu on fsu.id = a.submission_id
  join public.form_sections sec on sec.id = a.section_id
  join public.form_questions q on q.id = a.question_id
  left join public.response_items ri on ri.id = a.response_item_id
  where a.answer_type not in ('photo', 'attachment', 'signature')
),
section_answers as (
  select
    submission_id,
    section_code,
    jsonb_object_agg(question_code, answer_value order by question_code) as answers
  from answer_values
  where response_item_id is null
  group by submission_id, section_code
),
item_answers as (
  select
    submission_id,
    section_code,
    response_item_id,
    item_index,
    item_label,
    jsonb_object_agg(question_code, answer_value order by question_code) as answers
  from answer_values
  where response_item_id is not null
  group by submission_id, section_code, response_item_id, item_index, item_label
),
section_items as (
  select
    submission_id,
    section_code,
    count(*) as item_count,
    jsonb_agg(
      jsonb_build_object(
        'item_index', item_index,
        'item_label', item_label
      ) || answers
      order by item_index
    ) as items
  from item_answers
  group by submission_id, section_code
),
answer_counts as (
  select submission_id, count(*) as answer_count
  from answer_values
  group by submission_id
),
attachment_counts as (
  select
    submission_id,
    count(*) filter (where file_kind = 'signature') as signature_count,
    count(*) filter (where file_kind in ('pdf', 'onedrive_pdf')) as pdf_count
  from public.form_attachments
  group by submission_id
),
latest_pdf as (
  select distinct on (submission_id)
    submission_id,
    external_url as pdf_url,
    external_id as pdf_external_id,
    file_name as pdf_file_name
  from public.form_attachments
  where file_kind in ('pdf', 'onedrive_pdf')
  order by submission_id, created_at desc
)
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
  fsu.synced_at,
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
  coalesce(ac.answer_count, 0) as answer_count,
  coalesce(att.signature_count, 0) as signature_count,
  coalesce(att.pdf_count, 0) as pdf_count,
  pdf.pdf_url,
  pdf.pdf_external_id,
  pdf.pdf_file_name,

  pae.answers ->> 'name' as pae_manager_name,
  pae.answers ->> 'rut' as pae_manager_rut,
  pae.answers ->> 'role' as pae_manager_role,

  mpa.answers ->> 'hasdressingroom' as mpa_has_dressing_room,
  mpa.answers ->> 'dressingroomlocation' as mpa_dressing_room_location,
  mpa.answers ->> 'haslockers' as mpa_has_lockers,
  mpa.answers ->> 'lockersfitstaff' as mpa_lockers_fit_staff,
  mpa.answers ->> 'lockersgoodstate' as mpa_lockers_good_state,
  mpa.answers ->> 'hasshower' as mpa_has_shower,
  mpa.answers ->> 'showerexclusive' as mpa_shower_exclusive,
  mpa.answers ->> 'hasbathroom' as mpa_has_bathroom,
  mpa.answers ->> 'bathroomexclusive' as mpa_bathroom_exclusive,

  service.answers ->> 'exclusiveprogram' as service_yard_exclusive_program,

  rbd.answers ->> 'pestcontroluptodate' as pest_control_up_to_date,
  case
    when (rbd.answers ->> 'pestcontroldate') ~ '^\d{4}-\d{2}-\d{2}$'
    then (rbd.answers ->> 'pestcontroldate')::date
    else null
  end as pest_control_date,
  rbd.answers ->> 'hassanitaryresolution' as has_sanitary_resolution,
  rbd.answers ->> 'sanitaryresolutionnumber' as sanitary_resolution_number,
  rbd.answers ->> 'hasgreenseal' as has_green_seal,
  rbd.answers ->> 'greensealcode' as green_seal_code,
  case
    when (rbd.answers ->> 'greensealexpiration') ~ '^\d{4}-\d{2}-\d{2}$'
    then (rbd.answers ->> 'greensealexpiration')::date
    else null
  end as green_seal_expiration,
  rbd.answers ->> 'hasmaintenancecover' as has_maintenance_cover,
  rbd.answers ->> 'haspaintcertificate' as has_paint_certificate,

  coalesce(heat.item_count, 0) as heat_item_count,
  coalesce(electricity.item_count, 0) as electricity_item_count,
  coalesce(cold.item_count, 0) as cold_item_count,
  coalesce(vectors.item_count, 0) as vectors_item_count,
  coalesce(water.item_count, 0) as water_item_count,
  coalesce(infrastructure.item_count, 0) as infrastructure_item_count,

  coalesce(heat.items, '[]'::jsonb) as heat_items,
  coalesce(electricity.items, '[]'::jsonb) as electricity_items,
  coalesce(cold.items, '[]'::jsonb) as cold_items,
  coalesce(vectors.items, '[]'::jsonb) as vectors_items,
  coalesce(water.items, '[]'::jsonb) as water_items,
  coalesce(infrastructure.items, '[]'::jsonb) as infrastructure_items
from public.form_submissions fsu
join public.tasks t on t.id = fsu.task_id
join public.establishments e on e.id = t.establishment_id
join public.branches b on b.id = e.branch_id
join public.profiles tech on tech.id = fsu.technician_id
join public.profiles assigner on assigner.id = t.assigned_by
join public.form_templates ft on ft.id = t.form_template_id
left join answer_counts ac on ac.submission_id = fsu.id
left join attachment_counts att on att.submission_id = fsu.id
left join latest_pdf pdf on pdf.submission_id = fsu.id
left join section_answers pae on pae.submission_id = fsu.id and pae.section_code = 'pae-manager'
left join section_answers mpa on mpa.submission_id = fsu.id and mpa.section_code = 'mpa'
left join section_answers service on service.submission_id = fsu.id and service.section_code = 'service-yard'
left join section_answers rbd on rbd.submission_id = fsu.id and rbd.section_code = 'rbd-checkers'
left join section_items heat on heat.submission_id = fsu.id and heat.section_code = 'heat'
left join section_items electricity on electricity.submission_id = fsu.id and electricity.section_code = 'electricity'
left join section_items cold on cold.submission_id = fsu.id and cold.section_code = 'cold'
left join section_items vectors on vectors.submission_id = fsu.id and vectors.section_code = 'vectors'
left join section_items water on water.submission_id = fsu.id and water.section_code = 'water'
left join section_items infrastructure on infrastructure.submission_id = fsu.id and infrastructure.section_code = 'infrastructure';

grant select on public.bi_bitacoras_formulario_ancho to authenticated;
grant select on public.bi_bitacoras_formulario_ancho to service_role;
