use DBDATACORA;
go

/*
  Limpieza controlada para salida a pruebas/produccion.

  Conserva:
  - Zonas, grupos, roles, plantillas, secciones, preguntas, articulos,
    destinatarios de correo por RBD y establecimientos.
  - Solo los administradores que existan entre:
      patricio.tapia@soser.cl
      ingebord.castro@soser.cl
      admin@datacora.local

  Elimina:
  - Tareas de cualquier estado.
  - Bitacoras, respuestas y adjuntos.
  - Incidencias.
  - Procedimientos.
  - Mensajes internos.
  - Tokens push y eventos de sincronizacion.
  - Usuarios de tecnicos, jefes de mantencion, prevencionistas u otros
    perfiles que no sean los administradores indicados.
  - Solo establecimientos de prueba RBD 1 y RBD 2.

  El script crea respaldos logicos en el esquema cleanup_backup antes de borrar.
*/

set nocount on;
set xact_abort on;

declare @DeleteProcedures bit = 1;

declare @KeepAdmins table (
  email nvarchar(320) not null primary key
);

insert into @KeepAdmins (email)
values
  (N'patricio.tapia@soser.cl'),
  (N'ingebord.castro@soser.cl'),
  (N'admin@datacora.local');

declare @DefaultAdminId uniqueidentifier = (
  select top (1) p.id
  from dbo.profiles p
  join @KeepAdmins keep on lower(keep.email) = lower(p.email)
  where p.deleted_at is null
  order by case when lower(p.email) = N'patricio.tapia@soser.cl' then 0 else 1 end, p.email
);

if @DefaultAdminId is null
begin
  select keep.email as [Administrador esperado]
  from @KeepAdmins keep;

  throw 51000, 'No se encontro ningun administrador de la lista a conservar. Se cancela la limpieza.', 1;
end;

select keep.email as [Administrador esperado no encontrado]
from @KeepAdmins keep
where not exists (
  select 1
  from dbo.profiles p
  where lower(p.email) = lower(keep.email)
    and p.deleted_at is null
);

declare @AdminRoleId uniqueidentifier = (
  select top (1) id
  from dbo.roles
  where lower(name) like N'administrador aplicaci%n'
);

declare @AdminGroupId uniqueidentifier = (
  select top (1) id
  from dbo.groups
  where lower(name) like N'administraci%n'
);

if @AdminRoleId is null
  throw 51001, 'No existe el rol Administrador Aplicacion.', 1;

begin transaction;

if schema_id(N'cleanup_backup') is null
  exec(N'create schema cleanup_backup');

if object_id(N'cleanup_backup.launch_20260821_profiles', N'U') is null
  select * into cleanup_backup.launch_20260821_profiles from dbo.profiles;

if object_id(N'cleanup_backup.launch_20260821_profile_branches', N'U') is null
  select * into cleanup_backup.launch_20260821_profile_branches from dbo.profile_branches;

if object_id(N'cleanup_backup.launch_20260821_establishments', N'U') is null
  select * into cleanup_backup.launch_20260821_establishments from dbo.establishments;

if object_id(N'cleanup_backup.launch_20260821_tasks', N'U') is null
  select * into cleanup_backup.launch_20260821_tasks from dbo.tasks;

if object_id(N'cleanup_backup.launch_20260821_task_required_sections', N'U') is null
  select * into cleanup_backup.launch_20260821_task_required_sections from dbo.task_required_sections;

if object_id(N'cleanup_backup.launch_20260821_form_submissions', N'U') is null
  select * into cleanup_backup.launch_20260821_form_submissions from dbo.form_submissions;

if object_id(N'cleanup_backup.launch_20260821_response_items', N'U') is null
  select * into cleanup_backup.launch_20260821_response_items from dbo.response_items;

if object_id(N'cleanup_backup.launch_20260821_form_answers', N'U') is null
  select * into cleanup_backup.launch_20260821_form_answers from dbo.form_answers;

if object_id(N'cleanup_backup.launch_20260821_form_attachments', N'U') is null
  select * into cleanup_backup.launch_20260821_form_attachments from dbo.form_attachments;

if object_id(N'dbo.maintenance_incidents', N'U') is not null
   and object_id(N'cleanup_backup.launch_20260821_maintenance_incidents', N'U') is null
  select * into cleanup_backup.launch_20260821_maintenance_incidents from dbo.maintenance_incidents;

if object_id(N'dbo.maintenance_alerts', N'U') is not null
   and object_id(N'cleanup_backup.launch_20260821_maintenance_alerts', N'U') is null
  select * into cleanup_backup.launch_20260821_maintenance_alerts from dbo.maintenance_alerts;

if object_id(N'dbo.app_messages', N'U') is not null
   and object_id(N'cleanup_backup.launch_20260821_app_messages', N'U') is null
  select * into cleanup_backup.launch_20260821_app_messages from dbo.app_messages;

if object_id(N'dbo.app_message_recipients', N'U') is not null
   and object_id(N'cleanup_backup.launch_20260821_app_message_recipients', N'U') is null
  select * into cleanup_backup.launch_20260821_app_message_recipients from dbo.app_message_recipients;

if object_id(N'dbo.app_message_replies', N'U') is not null
   and object_id(N'cleanup_backup.launch_20260821_app_message_replies', N'U') is null
  select * into cleanup_backup.launch_20260821_app_message_replies from dbo.app_message_replies;

if object_id(N'dbo.procedures', N'U') is not null
   and object_id(N'cleanup_backup.launch_20260821_procedures', N'U') is null
  select * into cleanup_backup.launch_20260821_procedures from dbo.procedures;

if object_id(N'dbo.procedure_user_events', N'U') is not null
   and object_id(N'cleanup_backup.launch_20260821_procedure_user_events', N'U') is null
  select * into cleanup_backup.launch_20260821_procedure_user_events from dbo.procedure_user_events;

if object_id(N'dbo.device_push_tokens', N'U') is not null
   and object_id(N'cleanup_backup.launch_20260821_device_push_tokens', N'U') is null
  select * into cleanup_backup.launch_20260821_device_push_tokens from dbo.device_push_tokens;

if object_id(N'dbo.sync_events', N'U') is not null
   and object_id(N'cleanup_backup.launch_20260821_sync_events', N'U') is null
  select * into cleanup_backup.launch_20260821_sync_events from dbo.sync_events;

if object_id(N'dbo.procedure_user_events', N'U') is not null
  delete from dbo.procedure_user_events;

if object_id(N'dbo.procedures', N'U') is not null
begin
  if @DeleteProcedures = 1
    delete from dbo.procedures;
  else
    update dbo.procedures
    set created_by = @DefaultAdminId,
        updated_at = sysdatetimeoffset()
    where created_by not in (
      select p.id
      from dbo.profiles p
      join @KeepAdmins keep on lower(keep.email) = lower(p.email)
      where p.deleted_at is null
    );
end;

if object_id(N'dbo.app_message_replies', N'U') is not null
  delete from dbo.app_message_replies;

if object_id(N'dbo.app_message_recipients', N'U') is not null
  delete from dbo.app_message_recipients;

if object_id(N'dbo.app_messages', N'U') is not null
  delete from dbo.app_messages;

if object_id(N'dbo.maintenance_incidents', N'U') is not null
  delete from dbo.maintenance_incidents;

if object_id(N'dbo.maintenance_alerts', N'U') is not null
  delete from dbo.maintenance_alerts;

if object_id(N'dbo.device_push_tokens', N'U') is not null
  delete from dbo.device_push_tokens;

if object_id(N'dbo.sync_events', N'U') is not null
  delete from dbo.sync_events;

delete from dbo.form_answers;
delete from dbo.form_attachments;
delete from dbo.response_items;
delete from dbo.form_submissions;
delete from dbo.task_required_sections;
delete from dbo.tasks;

delete from dbo.establishments
where rbd in (N'1', N'2');

delete pb
from dbo.profile_branches pb
join dbo.profiles p on p.id = pb.profile_id
where not exists (
  select 1
  from @KeepAdmins keep
  where lower(keep.email) = lower(p.email)
);

delete p
from dbo.profiles p
where not exists (
  select 1
  from @KeepAdmins keep
  where lower(keep.email) = lower(p.email)
);

update p
set role_id = @AdminRoleId,
    group_id = coalesce(@AdminGroupId, p.group_id),
    status = N'activo',
    status_reason = N'Disponible',
    deleted_at = null,
    updated_at = sysdatetimeoffset()
from dbo.profiles p
join @KeepAdmins keep on lower(keep.email) = lower(p.email);

select
  (select count(*) from dbo.profiles) as perfiles_restantes,
  (select count(*) from dbo.tasks) as tareas_restantes,
  (select count(*) from dbo.form_submissions) as bitacoras_restantes,
  (select count(*) from dbo.establishments) as establecimientos_conservados,
  (select count(*) from dbo.establishments where rbd in (N'1', N'2')) as rbd_1_2_restantes,
  (select count(*) from dbo.branches) as zonas_conservadas,
  (select count(*) from dbo.groups) as grupos_conservados;

select
  p.email,
  p.full_name,
  r.name as rol,
  g.name as grupo,
  p.status
from dbo.profiles p
left join dbo.roles r on r.id = p.role_id
left join dbo.groups g on g.id = p.group_id
order by p.email;

commit transaction;
go
