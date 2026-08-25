-- Adds one form template per visit reason used by the app.
-- Keeps old labels for compatibility with tasks created before the rename.

insert into public.form_templates (code, name, visit_type, version, is_active) values
  ('maintenance_preventive_v1', 'Plan Preventivo Mantencion', 'Plan Preventivo Mantención', 1, true),
  ('maintenance_preventive_de_v1', 'Plan Preventivo de Mantencion', 'Plan Preventivo de Mantención', 1, true),
  ('dt_v1', 'DT', 'DT', 1, true),
  ('mutuality_v1', 'Mutualidad', 'Mutualidad', 1, true),
  ('sec_v1', 'SEC', 'SEC', 1, true),
  ('seremi_title_v1', 'Seremi', 'Seremi', 1, true)
on conflict (code) do update set
  name = excluded.name,
  visit_type = excluded.visit_type,
  version = excluded.version,
  is_active = excluded.is_active;

with sections as (
  select *
  from (values
    ('heat', 'Calor', 1, true, true, 2),
    ('electricity', 'Electricidad', 2, true, true, 6),
    ('cold', 'Frio', 3, false, false, null),
    ('vectors', 'Vectores', 4, false, false, null),
    ('water', 'Agua', 5, false, false, null),
    ('infrastructure', 'Infraestructura', 6, false, false, null),
    ('pae-manager', 'Encargado PAE', 7, true, false, null),
    ('mpa', 'MPA', 8, false, false, null),
    ('service-yard', 'Patio Servicio', 9, false, false, null),
    ('rbd-checkers', 'Verificadores RBD', 10, false, false, null),
    ('used-items', 'Articulos utilizados', 11, false, false, null)
  ) as section(code, title, sort_order, is_base_required, is_base_critical, fixed_min_required)
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
select
  template.id,
  section.code,
  section.title,
  section.sort_order,
  section.is_base_required,
  section.is_base_critical,
  section.fixed_min_required
from public.form_templates template
cross join sections section
where template.visit_type in (
  'Plan de mantención',
  'Plan Preventivo Mantención',
  'Plan Preventivo de Mantención',
  'DT',
  'Mutualidad',
  'Emergencia',
  'Acta',
  'SEREMI',
  'Seremi',
  'SEC'
)
on conflict (template_id, code) do update set
  title = excluded.title,
  sort_order = excluded.sort_order,
  is_base_required = excluded.is_base_required,
  is_base_critical = excluded.is_base_critical,
  fixed_min_required = excluded.fixed_min_required;
