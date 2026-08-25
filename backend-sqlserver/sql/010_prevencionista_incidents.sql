use DBDATACORA;
go

set xact_abort on;
begin transaction;

merge dbo.groups as target
using (values (N'Prevención')) as source(name)
on target.name = source.name
when not matched then
  insert (name) values (source.name);

merge dbo.roles as target
using (values
  (N'Prevencionista', 0, 0, 0, 0)
) as source(name, can_manage_users, can_assign_tasks, can_view_notifications, can_view_national_data)
on target.name = source.name
when matched then
  update set
    can_manage_users = source.can_manage_users,
    can_assign_tasks = source.can_assign_tasks,
    can_view_notifications = source.can_view_notifications,
    can_view_national_data = source.can_view_national_data
when not matched then
  insert (name, can_manage_users, can_assign_tasks, can_view_notifications, can_view_national_data)
  values (source.name, source.can_manage_users, source.can_assign_tasks, source.can_view_notifications, source.can_view_national_data);

if object_id(N'dbo.maintenance_incidents', N'U') is null
begin
  create table dbo.maintenance_incidents (
    id uniqueidentifier not null primary key default newid(),
    title nvarchar(200) not null,
    description nvarchar(max) not null,
    photos nvarchar(max) not null default N'[]',
    severity nvarchar(40) not null default N'Alta',
    incident_type nvarchar(80) not null default N'Emergencia (inmediata)',
    status nvarchar(40) not null default N'En revisión',
    branch_id uniqueidentifier not null references dbo.branches(id),
    establishment_id uniqueidentifier not null references dbo.establishments(id),
    reported_by uniqueidentifier not null references dbo.profiles(id),
    task_id uniqueidentifier null references dbo.tasks(id),
    planned_details nvarchar(max) null,
    created_at datetimeoffset not null default sysdatetimeoffset(),
    updated_at datetimeoffset not null default sysdatetimeoffset()
  );
end;
go

if not exists (
  select 1
  from sys.indexes
  where name = N'ix_maintenance_incidents_branch_status'
    and object_id = object_id(N'dbo.maintenance_incidents')
)
begin
  create index ix_maintenance_incidents_branch_status
  on dbo.maintenance_incidents(branch_id, status, created_at desc);
end;
go

if not exists (
  select 1
  from sys.indexes
  where name = N'ix_maintenance_incidents_task'
    and object_id = object_id(N'dbo.maintenance_incidents')
)
begin
  create index ix_maintenance_incidents_task
  on dbo.maintenance_incidents(task_id)
  where task_id is not null;
end;
go

create or alter view dbo.vw_incidencias_mantencion_resumen_es as
select
  incident.id as [ID Incidencia],
  incident.created_at as [Fecha reporte],
  incident.updated_at as [Fecha actualización],
  branch.name as [Zona],
  establishment.rbd as [RBD],
  establishment.name as [Establecimiento],
  establishment.commune as [Comuna],
  reporter.full_name as [Reportado por],
  reporter.email as [Correo prevencionista],
  incident.incident_type as [Tipo incidencia],
  incident.severity as [Prioridad],
  case
    when task.status = N'completada' then N'Resuelta'
    when incident.status = N'Tarea creada' then N'Planificada'
    else incident.status
  end as [Estado incidencia],
  incident.title as [Título],
  incident.description as [Detalle],
  task.id as [ID Tarea],
  task.task_type as [Tipo visita],
  task.due_date as [Fecha planificada],
  technician.full_name as [Técnico asignado],
  planner.full_name as [Planificada por]
from dbo.maintenance_incidents incident
join dbo.branches branch on branch.id = incident.branch_id
join dbo.establishments establishment on establishment.id = incident.establishment_id
join dbo.profiles reporter on reporter.id = incident.reported_by
left join dbo.tasks task on task.id = incident.task_id
left join dbo.profiles technician on technician.id = task.assigned_to
left join dbo.profiles planner on planner.id = task.assigned_by;
go

create or alter view dbo.vw_incidencias_mantencion_detalle_es as
select
  incident.id as [ID Incidencia],
  incident.created_at as [Fecha reporte],
  branch.name as [Zona],
  establishment.rbd as [RBD],
  establishment.name as [Establecimiento],
  incident.incident_type as [Tipo incidencia],
  incident.severity as [Prioridad],
  case
    when task.status = N'completada' then N'Resuelta'
    when incident.status = N'Tarea creada' then N'Planificada'
    else incident.status
  end as [Estado incidencia],
  incident.title as [Título],
  incident.description as [Detalle],
  incident.photos as [Fotografías JSON],
  incident.planned_details as [Planificación JSON],
  task.description as [Detalle planificación],
  task.due_date as [Fecha planificada],
  technician.full_name as [Técnico asignado],
  technician.email as [Correo técnico]
from dbo.maintenance_incidents incident
join dbo.branches branch on branch.id = incident.branch_id
join dbo.establishments establishment on establishment.id = incident.establishment_id
left join dbo.tasks task on task.id = incident.task_id
left join dbo.profiles technician on technician.id = task.assigned_to;
go

commit transaction;
go
