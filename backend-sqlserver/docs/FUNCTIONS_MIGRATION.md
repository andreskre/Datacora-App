# Migracion de Edge Functions a backend SQL Server

Fecha: 2026-07-21

## Endpoints creados

| Edge Function Supabase | Backend SQL Server |
| --- | --- |
| `create-user` | `POST /functions/create-user` |
| `delete-user` | `POST /functions/delete-user` |
| `reset-user-password` | `POST /functions/reset-user-password` |
| `submit-form` | `POST /functions/submit-form` |
| `send-task-notification` | `POST /functions/send-task-notification` |
| `upload-onedrive-pdf` | `POST /functions/upload-onedrive-pdf` |

## Autenticacion nueva

| Flujo | Endpoint |
| --- | --- |
| Login | `POST /auth/login` |
| Cambio obligatorio de contrasena | `POST /auth/change-password` |

## Decisiones de migracion

- El backend usa JWT propio y tabla `dbo.profiles`, no Supabase Auth.
- Las contrasenas quedan guardadas como hash `bcrypt`.
- `submit-form` conserva idempotencia por `localUuid`.
- El folio se genera con `sequence dbo.form_submission_folio_seq`.
- Las firmas quedan en `dbo.form_attachments` con metadata inline, igual que la estrategia anterior.
- OneDrive, correo y FCM quedan usando las mismas credenciales conceptuales, pero desde variables `.env`.

## Pendiente para la siguiente etapa

## Endpoints REST creados

| Uso de la app | Endpoint |
| --- | --- |
| Catalogos base | `GET /api/catalogs` |
| Perfil autenticado | `GET /api/me` |
| Usuarios/tecnicos | `GET /api/users` |
| Actualizar usuario | `PATCH /api/users/:id` |
| Tareas visibles por usuario | `GET /api/tasks` |
| Crear/asignar tarea | `POST /api/tasks` |
| Buscar establecimientos | `GET /api/establishments?search=&branchId=` |
| Detalle de respuestas/fotos | `GET /api/submissions/:id/detail` |

## Pendiente para la siguiente etapa

- Migrar la app para que use `API_BASE_URL` en vez de `SUPABASE_URL`.
- Crear scripts de importacion desde Supabase a SQL Server.
- Completar vistas/reportes SQL Server equivalentes a las vistas BI actuales.
- Probar subida a OneDrive y envio de correo desde el backend Node.
