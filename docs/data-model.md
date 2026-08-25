# Modelo de datos Datacora

Este modelo está pensado para Supabase/PostgreSQL y cubre:

- usuarios por rol, grupo y zona;
- establecimientos normalizados por RBD y zona;
- tareas asignadas a técnicos;
- formularios dinámicos por tipo de tarea;
- respuestas repetibles por sección;
- fotografías, adjuntos y firmas separadas de las respuestas textuales;
- extracción BI sin archivos binarios.

## Entidades principales

### Seguridad y organización

- `branches`: sucursales o zonas, por ejemplo Talca, Santiago, Los Ángeles.
- `groups`: grupos operativos, por ejemplo Mantenimiento o Emergencias.
- `roles`: cargos/permisos funcionales.
- `profiles`: perfil extendido del usuario autenticado en Supabase Auth.

`profiles.id` referencia `auth.users(id)`. Las contraseñas no se guardan en tablas propias.

### Base territorial

- `establishments`: establecimientos con `rbd`, nombre, comuna, tipo de institución, dirección, zona y coordenadas.

La regla clave para asignación es:

> un técnico solo puede recibir tareas de establecimientos cuya `branch_id` coincida con su `branch_id`, salvo perfiles nacionales o administradores con permiso explícito.

### Tareas

- `tasks`: tarea asignada a un técnico, con tipo de visita, RBD, fechas, estado, prioridad y plantilla de formulario.
- `task_required_sections`: permite que el asignador marque secciones adicionales como obligatorias o críticas, con mínimo requerido.

Calor y Electricidad pueden vivir como mínimos fijos en `form_sections.fixed_min_required`.

### Formularios dinámicos

- `form_templates`: plantilla por tipo de visita.
- `form_sections`: secciones del formulario, por ejemplo Calor, Electricidad, Agua.
- `form_questions`: preguntas dinámicas por sección.

Las condiciones, opciones y validaciones se almacenan en JSON:

- `options`: alternativas para selects/radios.
- `visibility_rule`: reglas de visibilidad condicional.
- `validation_rule`: reglas como RUT válido, mínimo, máximo o patrón.

### Respuestas

- `form_submissions`: una bitácora respondida o en borrador.
- `response_items`: elementos repetibles dentro de una sección, por ejemplo cada artefacto registrado en Calor.
- `form_answers`: respuestas textuales, numéricas, booleanas, fechas o JSON.
- `form_attachments`: fotos, archivos y firmas en Storage.

Las fotos y firmas no se mezclan en la tabla BI principal. Se guardan como archivos para PDF/evidencia, pero se excluyen de la vista de respuestas.

## Vistas BI

### `bi_bitacora_respuestas`

Una fila por respuesta no binaria:

- identificación de bitácora;
- tarea;
- RBD;
- establecimiento;
- zona;
- técnico;
- asignador;
- formulario;
- sección;
- elemento repetible;
- pregunta;
- respuesta.

Excluye:

- `photo`;
- `attachment`;
- `signature`.

Esta es la vista recomendada para Power BI cuando se requiere analizar respuestas.

### `bi_bitacoras_resumen`

Una fila por bitácora, con conteos:

- cantidad de respuestas;
- cantidad de fotos;
- cantidad de firmas.

Sirve para dashboards operativos y control de completitud.

### `bi_bitacoras_formulario_ancho`

Una fila por formulario enviado. Es la vista recomendada para una tabla principal en Power BI cuando se necesita evitar duplicados por respuesta.

Incluye:

- datos de tarea, tecnico, RBD, establecimiento y zona;
- respuestas no repetibles de PAE, MPA, Patio Servicio y Verificadores RBD como columnas;
- conteos de elementos por seccion repetible;
- elementos de Calor, Electricidad, Frio, Vectores, Agua e Infraestructura como arreglos JSON.

Para analizar cada elemento repetible en detalle, se puede expandir el JSON en Power BI o usar `bi_bitacora_respuestas`.

## API BI recomendada

Supabase puede exponer directamente:

- `GET /rest/v1/bi_bitacora_respuestas`
- `GET /rest/v1/bi_bitacoras_resumen`
- `GET /rest/v1/bi_bitacoras_formulario_ancho`

También se incluye RPC:

- `POST /rest/v1/rpc/get_bi_bitacora_respuestas`

Parámetros:

- `p_from`: fecha desde.
- `p_to`: fecha hasta.
- `p_branch`: zona.
- `p_rbd`: RBD.

Ejemplo payload:

```json
{
  "p_from": "2026-07-01",
  "p_to": "2026-07-31",
  "p_branch": "Talca",
  "p_rbd": null
}
```

## Próximos pasos sugeridos

1. Crear proyecto Supabase.
2. Ejecutar `supabase/migrations/001_initial_datacora_model.sql`.
3. Cargar sucursales, roles y establecimientos.
4. Migrar usuarios a Supabase Auth + `profiles`.
5. Conectar login real desde la app.
6. Reemplazar `src/data.js` por lecturas/escrituras contra Supabase.
7. Implementar caché local/offline en IndexedDB.
8. Conectar Power BI a las vistas `bi_*`.
