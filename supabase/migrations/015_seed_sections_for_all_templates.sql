-- Keep the same maintenance sections available for every task template.
-- Without this, custom required/critical sections only work for maintenance_plan_v1.

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
on conflict (template_id, code) do update set
  title = excluded.title,
  sort_order = excluded.sort_order,
  is_base_required = excluded.is_base_required,
  is_base_critical = excluded.is_base_critical,
  fixed_min_required = excluded.fixed_min_required;
