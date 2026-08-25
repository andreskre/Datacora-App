use DBDATACORA;
go

set xact_abort on;
begin transaction;

/* Sucursales / zonas */
merge dbo.branches as target
using (values
  (N'Cañete'),
  (N'Lautaro'),
  (N'Los Ángeles'),
  (N'Paillaco'),
  (N'Rancagua'),
  (N'San Fernando'),
  (N'Santiago'),
  (N'Talca')
) as source(name)
on target.name = source.name
when matched then
  update set is_active = 1
when not matched then
  insert (name, is_active) values (source.name, 1);

/* Grupos */
merge dbo.groups as target
using (values
  (N'Mantenimiento'),
  (N'Jefatura Mantención'),
  (N'Administración')
) as source(name)
on target.name = source.name
when not matched then
  insert (name) values (source.name);

/* Roles / cargos */
merge dbo.roles as target
using (values
  (N'Técnico Multifuncional', 0, 0, 0, 0),
  (N'Técnico Multifuncional SEC', 0, 0, 0, 0),
  (N'Jefe Mantención', 0, 1, 1, 0),
  (N'Jefe Nacional', 0, 1, 1, 1),
  (N'Administrador Aplicación', 1, 1, 1, 1)
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

/* Plantillas base por tipo de visita */
merge dbo.form_templates as target
using (values
  (N'plan_preventivo_mantencion', N'Plan Preventivo Mantención', N'Plan Preventivo Mantención'),
  (N'plan_de_mantencion', N'Plan de mantención', N'Plan de mantención'),
  (N'emergencia', N'Emergencia', N'Emergencia'),
  (N'dt', N'DT', N'DT'),
  (N'mutualidad', N'Mutualidad', N'Mutualidad'),
  (N'acta', N'Acta', N'Acta'),
  (N'seremi', N'Seremi', N'Seremi'),
  (N'sec', N'SEC', N'SEC')
) as source(code, visit_type, title)
on target.visit_type = source.visit_type
when matched then
  update set code = source.code, title = source.title
when not matched then
  insert (code, visit_type, title) values (source.code, source.visit_type, source.title);

/* Secciones base para cada plantilla */
declare @sections table (
  code nvarchar(80) not null,
  title nvarchar(200) not null,
  sort_order int not null
);

insert into @sections (code, title, sort_order)
values
  (N'heat', N'Calor', 1),
  (N'electricity', N'Electricidad', 2),
  (N'cold', N'Frío', 3),
  (N'vectors', N'Vectores', 4),
  (N'water', N'Agua', 5),
  (N'infrastructure', N'Infraestructura', 6),
  (N'pae-manager', N'Encargado PAE', 7),
  (N'mpa', N'MPA', 8),
  (N'service-yard', N'Patio Servicio', 9),
  (N'rbd-checkers', N'Verificadores RBD', 10);

insert into dbo.form_sections (template_id, code, title, sort_order)
select template.id, section.code, section.title, section.sort_order
from dbo.form_templates template
cross join @sections section
where not exists (
  select 1
  from dbo.form_sections existing
  where existing.template_id = template.id
    and existing.code = section.code
);

/* Establecimiento ficticio para pruebas */
declare @santiagoBranchId uniqueidentifier = (
  select id from dbo.branches where name = N'Santiago'
);

merge dbo.establishments as target
using (values
  (
    N'1',
    N'Casa Matriz',
    N'Lo Barnechea',
    N'Estab Junaeb',
    N'Av. La Dehesa N° 181',
    @santiagoBranchId,
    cast(-33.3683920 as decimal(10,7)),
    cast(-70.5114470 as decimal(10,7))
  ),
  (
    N'2',
    N'Casa Matriz 2',
    N'Lo Barnechea',
    N'Estab Junaeb',
    N'Av. La Dehesa N° 181',
    @santiagoBranchId,
    cast(-33.3683920 as decimal(10,7)),
    cast(-70.5114470 as decimal(10,7))
  )
) as source(rbd, name, commune, institution_type, address, branch_id, latitude, longitude)
on target.rbd = source.rbd
when matched then
  update set
    name = source.name,
    commune = source.commune,
    institution_type = source.institution_type,
    address = source.address,
    branch_id = source.branch_id,
    latitude = source.latitude,
    longitude = source.longitude
when not matched then
  insert (rbd, name, commune, institution_type, address, branch_id, latitude, longitude)
  values (source.rbd, source.name, source.commune, source.institution_type, source.address, source.branch_id, source.latitude, source.longitude);

/*
  Usuario administrador inicial.

  Correo: admin@datacora.local
  Contraseña temporal: password

  Este hash bcrypt corresponde a la palabra "password". Se usa solo para bootstrap local.
  Al iniciar sesión, el sistema exigirá cambio obligatorio de contraseña.
  Antes de producción, cambia correo, RUT y/o reemplaza este usuario por uno real.
*/
declare @adminBranchId uniqueidentifier = @santiagoBranchId;
declare @adminGroupId uniqueidentifier = (
  select id from dbo.groups where name = N'Administración'
);
declare @adminRoleId uniqueidentifier = (
  select id from dbo.roles where name = N'Administrador Aplicación'
);
declare @adminUserId uniqueidentifier = (
  select id from dbo.profiles where email = N'admin@datacora.local' and deleted_at is null
);

if @adminUserId is null
begin
  set @adminUserId = newid();

  insert into dbo.profiles (
    id,
    full_name,
    email,
    rut,
    branch_id,
    group_id,
    role_id,
    status,
    status_reason,
    password_hash,
    require_password_change
  )
  values (
    @adminUserId,
    N'Administrador Datácora',
    N'admin@datacora.local',
    N'11.111.111-1',
    @adminBranchId,
    @adminGroupId,
    @adminRoleId,
    N'activo',
    N'Disponible',
    N'$2a$10$N9qo8uLOickgx2ZMRZoMye.IjZAgcfl7p92ldGxad68LJZdL17lhWy',
    1
  );
end
else
begin
  update dbo.profiles
  set full_name = N'Administrador Datácora',
      rut = coalesce(rut, N'11.111.111-1'),
      branch_id = @adminBranchId,
      group_id = @adminGroupId,
      role_id = @adminRoleId,
      status = N'activo',
      status_reason = N'Disponible',
      updated_at = sysdatetimeoffset()
  where id = @adminUserId;
end;

if not exists (
  select 1
  from dbo.profile_branches
  where profile_id = @adminUserId
    and branch_id = @adminBranchId
)
begin
  insert into dbo.profile_branches (profile_id, branch_id)
  values (@adminUserId, @adminBranchId);
end;

commit transaction;
go


