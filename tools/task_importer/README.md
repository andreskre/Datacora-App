# Importador masivo de tareas Datacora

Aplicación de escritorio para Jefes de Mantención. Permite cargar tareas desde una planilla Excel y crearlas en Datacora SQL Server usando el backend actual.

## Flujo

1. Abrir el `.exe`.
2. Iniciar sesión con un usuario Jefe de Mantención o Administrador.
3. Presionar `Descargar plantilla` si se necesita una planilla nueva.
4. Seleccionar la planilla Excel.
5. Presionar `Leer y validar`.
6. Revisar errores por fila.
7. Presionar `Crear tareas`.
8. Exportar el resultado si se necesita respaldo.

La conexión al backend queda configurada internamente. La pantalla no muestra IP ni URL de API.

## Columnas reconocidas

La plantilla descargada por el `.exe` usa el mismo formato que la versión móvil.

Obligatorias:

- `Fecha planificada`
- `Nombre Técnico`
- `RBD`
- `Tipo Visita`

Opcionales:

- `Descripción`
- `Prioridad`
- `Estado`
- `Secciones requeridas`
- `Secciones críticas`
- `Mínimos secciones`

## Valores

Prioridad permitida:

- `alta`
- `media`
- `baja`

Estado permitido:

- `pendiente`
- `urgente`
- `completada`
- `cancelada`

Secciones permitidas:

- `heat` o `calor`
- `electricity` o `electricidad`
- `cold` o `frio`
- `vectors` o `vectores`
- `water` o `agua`
- `infrastructure` o `infraestructura`
- `pae-manager` o `encargado pae`
- `mpa`
- `service-yard` o `patio servicio`
- `rbd-checkers` o `verificadores rbd`

Ejemplo de mínimos:

```text
heat=2;electricity=6
```
