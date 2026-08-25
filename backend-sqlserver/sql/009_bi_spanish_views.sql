use DBDATACORA;
go

create or alter view dbo.vw_bitacoras_respuestas_detalle_es as
select
  submission.id as [ID Formulario],
  submission.folio as [Folio],
  task.id as [ID Tarea],
  task.task_type as [Tipo de tarea],
  task.status as [Estado tarea],
  task.priority as [Prioridad],
  task.assigned_at as [Fecha asignación],
  task.due_date as [Fecha vencimiento],
  submission.submitted_at as [Fecha envío],
  submission.synced_at as [Fecha sincronización],
  establishment.rbd as [RBD],
  establishment.name as [Establecimiento],
  establishment.commune as [Comuna],
  establishment.institution_type as [Tipo de institución],
  establishment.address as [Dirección],
  branch.name as [Sucursal],
  technician.full_name as [Técnico],
  technician.email as [Correo técnico],
  assigner.full_name as [Asignado por],
  template.title as [Formulario],
  cast(null as int) as [Versión formulario],
  section.code as [Código sección],
  section.title as [Sección],
  item.item_index as [Número elemento],
  item.item_label as [Etiqueta elemento],
  question.code as [Código pregunta],
  question.label as [Pregunta],
  answer.answer_type as [Tipo respuesta],
  coalesce(
    answer.answer_text,
    convert(nvarchar(100), answer.answer_number),
    convert(nvarchar(30), answer.answer_date, 23),
    case when answer.answer_boolean = 1 then N'Sí' when answer.answer_boolean = 0 then N'No' end,
    answer.answer_json
  ) as [Respuesta]
from dbo.form_answers answer
join dbo.form_submissions submission on submission.id = answer.submission_id
join dbo.tasks task on task.id = submission.task_id
join dbo.establishments establishment on establishment.id = task.establishment_id
left join dbo.branches branch on branch.id = establishment.branch_id
left join dbo.profiles technician on technician.id = submission.technician_id
left join dbo.profiles assigner on assigner.id = task.assigned_by
left join dbo.form_templates template on template.id = task.form_template_id
join dbo.form_sections section on section.id = answer.section_id
join dbo.form_questions question on question.id = answer.question_id
left join dbo.response_items item on item.id = answer.response_item_id;
go

create or alter view dbo.vw_bitacoras_formulario_resumen_es as
with respuestas as (
  select
    answer.submission_id,
    section.code as section_code,
    question.code as question_code,
    coalesce(
      answer.answer_text,
      convert(nvarchar(100), answer.answer_number),
      convert(nvarchar(30), answer.answer_date, 23),
      case when answer.answer_boolean = 1 then N'Sí' when answer.answer_boolean = 0 then N'No' end,
      answer.answer_json
    ) as answer_value
  from dbo.form_answers answer
  join dbo.form_sections section on section.id = answer.section_id
  join dbo.form_questions question on question.id = answer.question_id
  where answer.response_item_id is null
),
conteo_respuestas as (
  select submission_id, count(*) as answer_count
  from dbo.form_answers
  group by submission_id
),
conteo_firmas as (
  select submission_id, count(*) as signature_count
  from dbo.form_attachments
  where file_kind = N'signature'
  group by submission_id
),
conteo_pdf as (
  select submission_id, count(*) as pdf_count
  from dbo.form_attachments
  where file_kind in (N'pdf', N'onedrive_pdf', N'onedrive_bitacora_pdf', N'onedrive_internal_pdf')
  group by submission_id
),
ultimo_pdf as (
  select *
  from (
    select
      attachment.submission_id,
      attachment.external_url,
      attachment.external_id,
      attachment.file_name,
      row_number() over (partition by attachment.submission_id order by attachment.created_at desc) as rn
    from dbo.form_attachments attachment
    where attachment.file_kind in (N'pdf', N'onedrive_pdf', N'onedrive_bitacora_pdf')
  ) latest
  where latest.rn = 1
),
conteo_elementos as (
  select
    item.submission_id,
    section.code as section_code,
    count(*) as item_count
  from dbo.response_items item
  join dbo.form_sections section on section.id = item.section_id
  group by item.submission_id, section.code
)
select
  submission.id as [ID Formulario],
  submission.folio as [Folio],
  task.id as [ID Tarea],
  task.task_type as [Tipo de tarea],
  task.status as [Estado tarea],
  task.priority as [Prioridad],
  task.assigned_at as [Fecha asignación],
  task.due_date as [Fecha vencimiento],
  submission.submitted_at as [Fecha envío],
  submission.synced_at as [Fecha sincronización],
  establishment.rbd as [RBD],
  establishment.name as [Establecimiento],
  establishment.commune as [Comuna],
  establishment.institution_type as [Tipo de institución],
  establishment.address as [Dirección],
  branch.name as [Sucursal],
  technician.full_name as [Técnico],
  technician.email as [Correo técnico],
  assigner.full_name as [Asignado por],
  template.title as [Formulario],
  cast(null as int) as [Versión formulario],
  coalesce(conteo_respuestas.answer_count, 0) as [Cantidad respuestas],
  coalesce(conteo_firmas.signature_count, 0) as [Cantidad firmas],
  coalesce(conteo_pdf.pdf_count, 0) as [Cantidad PDF],
  ultimo_pdf.external_url as [URL PDF],
  ultimo_pdf.external_id as [ID externo PDF],
  ultimo_pdf.file_name as [Nombre archivo PDF],
  max(case when respuestas.section_code = N'pae-manager' and respuestas.question_code = N'name' then respuestas.answer_value end) as [Encargado PAE - Nombre],
  max(case when respuestas.section_code = N'pae-manager' and respuestas.question_code = N'rut' then respuestas.answer_value end) as [Encargado PAE - RUT],
  max(case when respuestas.section_code = N'pae-manager' and respuestas.question_code = N'role' then respuestas.answer_value end) as [Encargado PAE - Cargo],
  max(case when respuestas.section_code = N'mpa' and respuestas.question_code = N'hasdressingroom' then respuestas.answer_value end) as [MPA - RBD cuenta con vestidores],
  max(case when respuestas.section_code = N'mpa' and respuestas.question_code = N'dressingroomlocation' then respuestas.answer_value end) as [MPA - Ubicación del vestidor],
  max(case when respuestas.section_code = N'mpa' and respuestas.question_code = N'haslockers' then respuestas.answer_value end) as [MPA - Existen casilleros en el RBD],
  max(case when respuestas.section_code = N'mpa' and respuestas.question_code = N'lockersfitstaff' then respuestas.answer_value end) as [MPA - Casilleros acorde al personal de planta],
  max(case when respuestas.section_code = N'mpa' and respuestas.question_code = N'lockersgoodstate' then respuestas.answer_value end) as [MPA - Casillero en buen estado y permite cierre],
  max(case when respuestas.section_code = N'mpa' and respuestas.question_code = N'hasshower' then respuestas.answer_value end) as [MPA - Cuenta con ducha],
  max(case when respuestas.section_code = N'mpa' and respuestas.question_code = N'showerexclusive' then respuestas.answer_value end) as [MPA - Duchas exclusivas para personal Soser],
  max(case when respuestas.section_code = N'mpa' and respuestas.question_code = N'hasbathroom' then respuestas.answer_value end) as [MPA - Cuenta con baño],
  max(case when respuestas.section_code = N'mpa' and respuestas.question_code = N'bathroomexclusive' then respuestas.answer_value end) as [MPA - Baño exclusivo para personal Soser],
  max(case when respuestas.section_code = N'service-yard' and respuestas.question_code = N'exclusiveprogram' then respuestas.answer_value end) as [Patio Servicio - Exclusivo para el programa],
  max(case when respuestas.section_code = N'rbd-checkers' and respuestas.question_code = N'pestcontroluptodate' then respuestas.answer_value end) as [Verificadores RBD - Control de plagas al día],
  max(case when respuestas.section_code = N'rbd-checkers' and respuestas.question_code = N'pestcontroldate' then respuestas.answer_value end) as [Verificadores RBD - Fecha último control de plagas],
  max(case when respuestas.section_code = N'rbd-checkers' and respuestas.question_code = N'hassanitaryresolution' then respuestas.answer_value end) as [Verificadores RBD - Cuenta con resolución sanitaria],
  max(case when respuestas.section_code = N'rbd-checkers' and respuestas.question_code = N'sanitaryresolutionnumber' then respuestas.answer_value end) as [Verificadores RBD - Número resolución sanitaria],
  max(case when respuestas.section_code = N'rbd-checkers' and respuestas.question_code = N'hasgreenseal' then respuestas.answer_value end) as [Verificadores RBD - Posee sello verde],
  max(case when respuestas.section_code = N'rbd-checkers' and respuestas.question_code = N'greensealcode' then respuestas.answer_value end) as [Verificadores RBD - Código o ID sello verde],
  max(case when respuestas.section_code = N'rbd-checkers' and respuestas.question_code = N'greensealexpiration' then respuestas.answer_value end) as [Verificadores RBD - Fecha vencimiento sello verde],
  max(case when respuestas.section_code = N'rbd-checkers' and respuestas.question_code = N'hasmaintenancecover' then respuestas.answer_value end) as [Verificadores RBD - Carátula de mantención correspondiente al año],
  max(case when respuestas.section_code = N'rbd-checkers' and respuestas.question_code = N'haspaintcertificate' then respuestas.answer_value end) as [Verificadores RBD - Certificado de pintura],
  coalesce(max(case when conteo_elementos.section_code = N'heat' then conteo_elementos.item_count end), 0) as [Calor - Cantidad elementos],
  coalesce(max(case when conteo_elementos.section_code = N'electricity' then conteo_elementos.item_count end), 0) as [Electricidad - Cantidad elementos],
  coalesce(max(case when conteo_elementos.section_code = N'cold' then conteo_elementos.item_count end), 0) as [Frío - Cantidad elementos],
  coalesce(max(case when conteo_elementos.section_code = N'vectors' then conteo_elementos.item_count end), 0) as [Vectores - Cantidad elementos],
  coalesce(max(case when conteo_elementos.section_code = N'water' then conteo_elementos.item_count end), 0) as [Agua - Cantidad elementos],
  coalesce(max(case when conteo_elementos.section_code = N'infrastructure' then conteo_elementos.item_count end), 0) as [Infraestructura - Cantidad elementos]
from dbo.form_submissions submission
join dbo.tasks task on task.id = submission.task_id
join dbo.establishments establishment on establishment.id = task.establishment_id
left join dbo.branches branch on branch.id = establishment.branch_id
left join dbo.profiles technician on technician.id = submission.technician_id
left join dbo.profiles assigner on assigner.id = task.assigned_by
left join dbo.form_templates template on template.id = task.form_template_id
left join conteo_respuestas on conteo_respuestas.submission_id = submission.id
left join conteo_firmas on conteo_firmas.submission_id = submission.id
left join conteo_pdf on conteo_pdf.submission_id = submission.id
left join ultimo_pdf on ultimo_pdf.submission_id = submission.id
left join respuestas on respuestas.submission_id = submission.id
left join conteo_elementos on conteo_elementos.submission_id = submission.id
group by
  submission.id,
  submission.folio,
  task.id,
  task.task_type,
  task.status,
  task.priority,
  task.assigned_at,
  task.due_date,
  submission.submitted_at,
  submission.synced_at,
  establishment.rbd,
  establishment.name,
  establishment.commune,
  establishment.institution_type,
  establishment.address,
  branch.name,
  technician.full_name,
  technician.email,
  assigner.full_name,
  template.title,
  conteo_respuestas.answer_count,
  conteo_firmas.signature_count,
  conteo_pdf.pdf_count,
  ultimo_pdf.external_url,
  ultimo_pdf.external_id,
  ultimo_pdf.file_name;
go

create or alter view dbo.vw_bitacoras_elementos_es as
with elemento_respuestas as (
  select
    item.id as response_item_id,
    answer.submission_id,
    section.code as section_code,
    question.code as question_code,
    question.label as question_label,
    coalesce(
      answer.answer_text,
      convert(nvarchar(100), answer.answer_number),
      convert(nvarchar(30), answer.answer_date, 23),
      case when answer.answer_boolean = 1 then N'Sí' when answer.answer_boolean = 0 then N'No' end,
      answer.answer_json
    ) as answer_value
  from dbo.response_items item
  join dbo.form_sections section on section.id = item.section_id
  left join dbo.form_answers answer on answer.response_item_id = item.id
  left join dbo.form_questions question on question.id = answer.question_id
)
select
  submission.id as [ID Formulario],
  submission.folio as [Folio],
  task.id as [ID Tarea],
  task.task_type as [Tipo de tarea],
  task.status as [Estado tarea],
  task.priority as [Prioridad],
  task.assigned_at as [Fecha asignación],
  task.due_date as [Fecha vencimiento],
  submission.submitted_at as [Fecha envío],
  establishment.rbd as [RBD],
  establishment.name as [Establecimiento],
  establishment.commune as [Comuna],
  branch.name as [Sucursal],
  technician.full_name as [Técnico],
  section.title as [Sección],
  item.item_index as [Número elemento],
  item.item_label as [Etiqueta elemento],
  max(case when elemento_respuestas.question_code = N'element' then elemento_respuestas.answer_value end) as [Elemento],
  max(case when elemento_respuestas.question_code = N'site' then elemento_respuestas.answer_value end) as [Sitio],
  max(case when elemento_respuestas.question_code = N'othersite' then elemento_respuestas.answer_value end) as [Otro sitio],
  max(case when elemento_respuestas.question_code = N'quantity' then elemento_respuestas.answer_value end) as [Cantidad],
  max(case when elemento_respuestas.question_code = N'action' then elemento_respuestas.answer_value end) as [Acción],
  max(case when elemento_respuestas.question_code = N'observation' then elemento_respuestas.answer_value end) as [Observación],
  max(case when elemento_respuestas.question_code = N'evidencename' then elemento_respuestas.answer_value end) as [Nombre evidencia],
  (
    select
      detail.question_code as [Código pregunta],
      detail.question_label as [Pregunta],
      detail.answer_value as [Respuesta]
    from elemento_respuestas detail
    where detail.response_item_id = item.id
    for json path
  ) as [Respuestas extra JSON]
from dbo.response_items item
join dbo.form_submissions submission on submission.id = item.submission_id
join dbo.tasks task on task.id = submission.task_id
join dbo.establishments establishment on establishment.id = task.establishment_id
left join dbo.branches branch on branch.id = establishment.branch_id
left join dbo.profiles technician on technician.id = submission.technician_id
join dbo.form_sections section on section.id = item.section_id
left join elemento_respuestas on elemento_respuestas.response_item_id = item.id
group by
  submission.id,
  submission.folio,
  task.id,
  task.task_type,
  task.status,
  task.priority,
  task.assigned_at,
  task.due_date,
  submission.submitted_at,
  establishment.rbd,
  establishment.name,
  establishment.commune,
  branch.name,
  technician.full_name,
  section.title,
  item.id,
  item.item_index,
  item.item_label;
go
