use DBDATACORA;
go

create or alter view dbo.vw_datacora_tasks as
select
  task.id as [ID Tarea],
  task.task_type as [Tipo tarea],
  task.status as [Estado tarea],
  task.priority as [Prioridad],
  task.sync_state as [Estado sincronizacion],
  task.assigned_at as [Fecha asignacion],
  task.due_date as [Fecha vencimiento],
  establishment.rbd as [RBD],
  establishment.name as [Establecimiento],
  establishment.commune as [Comuna],
  establishment.address as [Direccion],
  branch.name as [Sucursal],
  technician.full_name as [Tecnico],
  technician.email as [Correo tecnico],
  assigner.full_name as [Asignado por]
from dbo.tasks task
join dbo.establishments establishment on establishment.id = task.establishment_id
left join dbo.branches branch on branch.id = establishment.branch_id
left join dbo.profiles technician on technician.id = task.assigned_to
left join dbo.profiles assigner on assigner.id = task.assigned_by;
go

create or alter view dbo.vw_datacora_submissions as
select
  submission.id as [ID Formulario],
  submission.folio as [Folio],
  submission.status as [Estado formulario],
  submission.submitted_at as [Fecha envio],
  submission.synced_at as [Fecha sincronizacion],
  task.id as [ID Tarea],
  task.task_type as [Tipo tarea],
  establishment.rbd as [RBD],
  establishment.name as [Establecimiento],
  establishment.commune as [Comuna],
  establishment.address as [Direccion],
  branch.name as [Sucursal],
  technician.full_name as [Tecnico],
  technician.email as [Correo tecnico]
from dbo.form_submissions submission
join dbo.tasks task on task.id = submission.task_id
join dbo.establishments establishment on establishment.id = task.establishment_id
left join dbo.branches branch on branch.id = establishment.branch_id
left join dbo.profiles technician on technician.id = submission.technician_id;
go

create or alter view dbo.vw_datacora_answers_long as
select
  submission.id as [ID Formulario],
  submission.folio as [Folio],
  submission.submitted_at as [Fecha envio],
  task.task_type as [Tipo tarea],
  establishment.rbd as [RBD],
  establishment.name as [Establecimiento],
  branch.name as [Sucursal],
  section.code as [Codigo seccion],
  section.title as [Seccion],
  item.item_index as [Numero elemento],
  item.item_label as [Etiqueta elemento],
  question.code as [Codigo pregunta],
  question.label as [Pregunta],
  answer.answer_type as [Tipo respuesta],
  coalesce(
    answer.answer_text,
    convert(nvarchar(100), answer.answer_number),
    convert(nvarchar(30), answer.answer_date, 23),
    case when answer.answer_boolean = 1 then N'Si' when answer.answer_boolean = 0 then N'No' end,
    answer.answer_json
  ) as [Respuesta]
from dbo.form_answers answer
join dbo.form_submissions submission on submission.id = answer.submission_id
join dbo.tasks task on task.id = submission.task_id
join dbo.establishments establishment on establishment.id = task.establishment_id
left join dbo.branches branch on branch.id = establishment.branch_id
join dbo.form_sections section on section.id = answer.section_id
join dbo.form_questions question on question.id = answer.question_id
left join dbo.response_items item on item.id = answer.response_item_id;
go

create or alter view dbo.vw_datacora_attachments as
select
  attachment.id as [ID Adjunto],
  attachment.submission_id as [ID Formulario],
  submission.folio as [Folio],
  task.task_type as [Tipo tarea],
  establishment.rbd as [RBD],
  establishment.name as [Establecimiento],
  branch.name as [Sucursal],
  attachment.file_kind as [Tipo archivo],
  attachment.storage_provider as [Proveedor almacenamiento],
  attachment.file_name as [Nombre archivo],
  attachment.mime_type as [Tipo MIME],
  attachment.external_url as [URL externa],
  attachment.external_id as [ID externo],
  attachment.created_at as [Fecha creacion],
  json_value(attachment.metadata, '$.section') as [Seccion],
  json_value(attachment.metadata, '$.element') as [Elemento],
  json_value(attachment.metadata, '$.site') as [Sitio],
  json_value(attachment.metadata, '$.action') as [Accion]
from dbo.form_attachments attachment
join dbo.form_submissions submission on submission.id = attachment.submission_id
join dbo.tasks task on task.id = submission.task_id
join dbo.establishments establishment on establishment.id = task.establishment_id
left join dbo.branches branch on branch.id = establishment.branch_id;
go
