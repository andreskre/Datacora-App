-- Initial catalogs for Datacora.

insert into public.branches (name) values
  ('Los Ángeles'),
  ('Cañete'),
  ('Lautaro'),
  ('Rancagua'),
  ('San Fernando'),
  ('Santiago'),
  ('Talca'),
  ('Paillaco')
on conflict (name) do nothing;

insert into public.groups (name, description) values
  ('Administradores', 'Usuarios con administracion completa de la aplicacion.'),
  ('Jefatura Mantención', 'Jefes de mantencion por zona.'),
  ('Mantenimiento', 'Tecnicos de mantenimiento.'),
  ('Emergencias', 'Equipo tecnico para emergencias.')
on conflict (name) do nothing;

insert into public.roles (
  name,
  can_manage_users,
  can_assign_tasks,
  can_view_notifications,
  can_view_national_data
) values
  ('Administrador Aplicación', true, true, true, true),
  ('Jefe Nacional', false, true, true, true),
  ('Jefe Mantención', false, true, true, false),
  ('Técnico Multifuncional', false, false, false, false),
  ('Técnico Multifuncional SEC', false, false, false, false)
on conflict (name) do update set
  can_manage_users = excluded.can_manage_users,
  can_assign_tasks = excluded.can_assign_tasks,
  can_view_notifications = excluded.can_view_notifications,
  can_view_national_data = excluded.can_view_national_data;

insert into public.form_templates (code, name, visit_type, version) values
  ('maintenance_plan_v1', 'Plan de mantención', 'Plan de mantención', 1),
  ('emergency_v1', 'Emergencia', 'Emergencia', 1),
  ('record_v1', 'Acta', 'Acta', 1),
  ('seremi_v1', 'SEREMI', 'SEREMI', 1)
on conflict (code) do nothing;

with template as (
  select id from public.form_templates where code = 'maintenance_plan_v1'
)
insert into public.form_sections (
  template_id,
  code,
  title,
  sort_order,
  is_base_required,
  is_base_critical,
  fixed_min_required
)
select template.id, section.code, section.title, section.sort_order, section.is_base_required, section.is_base_critical, section.fixed_min_required
from template
cross join (values
  ('heat', 'Calor', 1, true, true, 2),
  ('electricity', 'Electricidad', 2, true, true, 6),
  ('cold', 'Frío', 3, false, false, null),
  ('vectors', 'Vectores', 4, false, false, null),
  ('water', 'Agua', 5, false, false, null),
  ('infrastructure', 'Infraestructura', 6, false, false, null),
  ('pae-manager', 'Encargado PAE', 7, true, false, null),
  ('mpa', 'MPA', 8, false, false, null),
  ('service-yard', 'Patio Servicio', 9, false, false, null),
  ('rbd-checkers', 'Verificadores RBD', 10, false, false, null),
  ('used-items', 'Artículos utilizados', 11, false, false, null)
) as section(code, title, sort_order, is_base_required, is_base_critical, fixed_min_required)
on conflict (template_id, code) do nothing;

