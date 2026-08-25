# Backend SQL Server

Este backend replica progresivamente las Edge Functions de Supabase para migrar Datacora a SQL Server sin tocar la version estable.

Funciones migradas como endpoints iniciales:
- `POST /functions/create-user`
- `POST /functions/delete-user`
- `POST /functions/reset-user-password`
- `POST /functions/submit-form`
- `POST /functions/send-task-notification`
- `POST /functions/upload-onedrive-pdf`
- `GET /api/catalogs`
- `GET /api/me`
- `GET /api/users`
- `PATCH /api/users/:id`
- `GET /api/tasks`
- `POST /api/tasks`
- `POST /api/scheduled-notifications/run`
- `POST /api/device-push-tokens`
- `GET /api/submissions/:id/detail`

Para iniciar:

```powershell
cd C:\Programacion\Datacora_SQLSERVER_DEV\backend-sqlserver
npm install
Copy-Item .env.example .env
powershell -ExecutionPolicy Bypass -File scripts/start-backend.ps1
```

Antes de ejecutar, crear la base con `sql\001_initial_schema.sql` y ajustar `.env`.

En Windows se recomienda `scripts/start-backend.ps1` porque inicia Node con
`NODE_OPTIONS=--use-system-ca`, necesario para que Microsoft Graph/OneDrive
confie en los certificados del sistema.

La app web de esta copia ya carga `src/api-config.js` antes de `src/app.js`.
Por defecto queda apuntando a `http://127.0.0.1:8081`:

```js
window.DatacoraApiConfig = {
  enabled: true,
  mode: "sqlserver",
  baseUrl: "http://127.0.0.1:8081"
};
```

Para probar desde un APK o telefono real, cambiar `baseUrl` por la IP LAN del PC o la URL del VPS, porque `127.0.0.1` dentro del telefono apunta al propio telefono.

## Notificaciones programadas

El backend puede enviar notificaciones push programadas sin que la app este abierta:

- recordatorio generico de inicio de sesion a tecnicos.
- recordatorio diario a Jefes de Mantencion activos.
- recordatorio diario a todos los tecnicos activos.
- alerta diaria a cada tecnico que tenga visitas atrasadas.

Las notificaciones automaticas se ejecutan solo de lunes a viernes. Para recibir push, el tecnico debe haber iniciado sesion al menos una vez en la app y tener permisos de notificacion activos, porque ahi se registra el token del dispositivo.

Variables opcionales:

```env
SCHEDULED_NOTIFICATIONS_ENABLED=true
SCHEDULED_NOTIFICATIONS_TIMEZONE=America/Santiago
LOGIN_REMINDER_ENABLED=true
LOGIN_REMINDER_TIME=07:25
LOGIN_REMINDER_TITLE=Datacora
LOGIN_REMINDER_BODY=Hola, no olvides iniciar sesion antes de salir a terreno!
DAILY_JM_REMINDER_ENABLED=true
DAILY_JM_REMINDER_TIME=07:30
DAILY_JM_REMINDER_TITLE=Datacora
DAILY_JM_REMINDER_BODY=Buen dia {nombre}, Te deseamos una excelente jornada liderando al equipo!
DAILY_TECH_REMINDER_ENABLED=true
DAILY_TECH_REMINDER_TIME=07:40
DAILY_TECH_REMINDER_TITLE=Buen dia, {nombre}
DAILY_TECH_REMINDER_BODY=Recuerda realizar tus visitas y responder los formularios mediante la app, animo para esta nueva jornada!
OVERDUE_TASK_ALERT_ENABLED=true
OVERDUE_TASK_ALERT_TIME=07:45
```

El texto acepta `{nombre}` para usar el primer nombre del destinatario y `{nombreCompleto}` para usar el nombre completo.

Para probar manualmente desde un usuario administrador o jefe nacional:

```http
POST /api/scheduled-notifications/run
Authorization: Bearer TOKEN

{ "force": true }
```

Los envios diarios quedan registrados en `dbo.sync_events` para evitar duplicados el mismo dia.
