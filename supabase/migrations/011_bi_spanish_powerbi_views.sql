-- Spanish Power BI views.
-- Keep technical views intact; expose friendly column names for reporting.

create or replace view public.bi_bitacoras_formulario_ancho_es as
select
  submission_id as "ID Formulario",
  task_id as "ID Tarea",
  task_type as "Tipo de tarea",
  task_status as "Estado tarea",
  priority as "Prioridad",
  assigned_at as "Fecha asignacion",
  due_date as "Fecha vencimiento",
  started_at as "Inicio formulario",
  submitted_at as "Fecha envio",
  synced_at as "Fecha sincronizacion",
  rbd as "RBD",
  establishment_name as "Establecimiento",
  commune as "Comuna",
  institution_type as "Tipo de institucion",
  address as "Direccion",
  branch_name as "Sucursal",
  technician_name as "Tecnico",
  technician_email as "Correo tecnico",
  assigned_by_name as "Asignado por",
  form_name as "Formulario",
  form_version as "Version formulario",
  answer_count as "Cantidad respuestas",
  signature_count as "Cantidad firmas",
  pdf_count as "Cantidad PDF",
  pdf_url as "URL PDF",
  pdf_external_id as "ID externo PDF",
  pdf_file_name as "Nombre archivo PDF",
  pae_manager_name as "Encargado PAE - Nombre",
  pae_manager_rut as "Encargado PAE - RUT",
  pae_manager_role as "Encargado PAE - Cargo",
  mpa_has_dressing_room as "MPA - RBD cuenta con vestidores",
  mpa_dressing_room_location as "MPA - Ubicacion del vestidor",
  mpa_has_lockers as "MPA - Existen casilleros en el RBD",
  mpa_lockers_fit_staff as "MPA - Casilleros acorde al personal de planta",
  mpa_lockers_good_state as "MPA - Casillero en buen estado y permite cierre",
  mpa_has_shower as "MPA - Cuenta con ducha",
  mpa_shower_exclusive as "MPA - Duchas exclusivas para personal Soser",
  mpa_has_bathroom as "MPA - Cuenta con bano",
  mpa_bathroom_exclusive as "MPA - Bano exclusivo para personal Soser",
  service_yard_exclusive_program as "Patio Servicio - Exclusivo para el programa",
  pest_control_up_to_date as "Verificadores RBD - Control de plagas al dia",
  pest_control_date as "Verificadores RBD - Fecha ultimo control de plagas",
  has_sanitary_resolution as "Verificadores RBD - Cuenta con resolucion sanitaria",
  sanitary_resolution_number as "Verificadores RBD - Numero resolucion sanitaria",
  has_green_seal as "Verificadores RBD - Posee sello verde",
  green_seal_code as "Verificadores RBD - Codigo o ID sello verde",
  green_seal_expiration as "Verificadores RBD - Fecha vencimiento sello verde",
  has_maintenance_cover as "Verificadores RBD - Caratula de mantencion correspondiente al ano",
  has_paint_certificate as "Verificadores RBD - Certificado de pintura",
  heat_item_count as "Calor - Cantidad elementos",
  electricity_item_count as "Electricidad - Cantidad elementos",
  cold_item_count as "Frio - Cantidad elementos",
  vectors_item_count as "Vectores - Cantidad elementos",
  water_item_count as "Agua - Cantidad elementos",
  infrastructure_item_count as "Infraestructura - Cantidad elementos",
  heat_items as "Calor - Elementos JSON",
  electricity_items as "Electricidad - Elementos JSON",
  cold_items as "Frio - Elementos JSON",
  vectors_items as "Vectores - Elementos JSON",
  water_items as "Agua - Elementos JSON",
  infrastructure_items as "Infraestructura - Elementos JSON"
from public.bi_bitacoras_formulario_ancho;

create or replace view public.bi_bitacoras_elementos_es as
with items as (
  select b.*, 'Calor'::text as section_title, element.item
  from public.bi_bitacoras_formulario_ancho b
  cross join lateral jsonb_array_elements(coalesce(b.heat_items, '[]'::jsonb)) as element(item)
  union all
  select b.*, 'Electricidad'::text as section_title, element.item
  from public.bi_bitacoras_formulario_ancho b
  cross join lateral jsonb_array_elements(coalesce(b.electricity_items, '[]'::jsonb)) as element(item)
  union all
  select b.*, 'Frio'::text as section_title, element.item
  from public.bi_bitacoras_formulario_ancho b
  cross join lateral jsonb_array_elements(coalesce(b.cold_items, '[]'::jsonb)) as element(item)
  union all
  select b.*, 'Vectores'::text as section_title, element.item
  from public.bi_bitacoras_formulario_ancho b
  cross join lateral jsonb_array_elements(coalesce(b.vectors_items, '[]'::jsonb)) as element(item)
  union all
  select b.*, 'Agua'::text as section_title, element.item
  from public.bi_bitacoras_formulario_ancho b
  cross join lateral jsonb_array_elements(coalesce(b.water_items, '[]'::jsonb)) as element(item)
  union all
  select b.*, 'Infraestructura'::text as section_title, element.item
  from public.bi_bitacoras_formulario_ancho b
  cross join lateral jsonb_array_elements(coalesce(b.infrastructure_items, '[]'::jsonb)) as element(item)
)
select
  submission_id as "ID Formulario",
  task_id as "ID Tarea",
  task_type as "Tipo de tarea",
  task_status as "Estado tarea",
  priority as "Prioridad",
  assigned_at as "Fecha asignacion",
  due_date as "Fecha vencimiento",
  submitted_at as "Fecha envio",
  rbd as "RBD",
  establishment_name as "Establecimiento",
  commune as "Comuna",
  branch_name as "Sucursal",
  technician_name as "Tecnico",
  section_title as "Seccion",
  nullif(item ->> 'item_index', '')::integer as "Numero elemento",
  item ->> 'item_label' as "Etiqueta elemento",
  item ->> 'element' as "Elemento",
  item ->> 'site' as "Sitio",
  item ->> 'othersite' as "Otro sitio",
  item ->> 'quantity' as "Cantidad",
  item ->> 'action' as "Accion",
  item ->> 'observation' as "Observacion",
  item ->> 'evidencename' as "Nombre evidencia",
  item - 'item_index' - 'item_label' as "Respuestas extra JSON"
from items;

grant select on public.bi_bitacoras_formulario_ancho_es to authenticated;
grant select on public.bi_bitacoras_formulario_ancho_es to service_role;
grant select on public.bi_bitacoras_elementos_es to authenticated;
grant select on public.bi_bitacoras_elementos_es to service_role;
