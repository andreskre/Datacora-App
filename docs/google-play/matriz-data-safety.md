# Matriz Data Safety - Google Play

Esta matriz sirve como base para completar la seccion "Data safety" en Play Console. Debe coincidir con la politica de privacidad publicada.

| Categoria Google Play | Dato en Datacora | Se recopila | Finalidad | Compartido con terceros | Comentario |
| --- | --- | --- | --- | --- | --- |
| Informacion personal | Nombre, correo, RUT, cargo, perfil | Si | Gestion de cuenta, permisos y trazabilidad | Solo proveedores operativos necesarios | Uso interno SOSER |
| Informacion personal | Ultima conexion | Si | Control operativo, soporte y seguridad | No directamente | Visible para perfiles autorizados |
| Ubicacion | Latitud/longitud inicio y termino formulario | Si | Validar ejecucion en terreno y distancia al establecimiento | No directamente | Requiere permiso de ubicacion |
| Fotos y videos | Fotografias de evidencia | Si | Respaldo de mantenimiento e incidencias | Proveedores de almacenamiento/backend | Capturadas por el usuario |
| Archivos y documentos | PDF de bitacoras | Si | Respaldo documental y envio por correo | Proveedores de correo/almacenamiento | Asociado a folio y establecimiento |
| Actividad de la app | Formularios, respuestas, tareas, incidencias | Si | Operacion de mantenimiento | No directamente | Datos operativos internos |
| Identificadores del dispositivo | Token push Firebase | Si | Envio de notificaciones | Firebase/Google | Necesario para push notifications |
| Mensajes | Mensajes internos y respuestas | Si | Comunicacion entre administrador/JM | No directamente | Contenido visible segun destinatario |

## Declaraciones sugeridas

- La app recopila datos para funcionamiento interno de mantenimiento.
- La app no vende datos.
- La app puede transferir datos a servicios necesarios para backend, almacenamiento, correo y notificaciones.
- La app requiere inicio de sesion y no esta destinada al publico general.
- La ubicacion se usa solo para registrar inicio y cierre de formularios en terreno.

## Revisión antes de enviar

- Confirmar si los datos estan cifrados en transito mediante HTTPS.
- Confirmar si existe proceso formal para eliminacion de usuarios o datos.
- Confirmar URL final de politica de privacidad.
- Confirmar si se usara Microsoft, Firebase, Azure, servidor SOSER u otros proveedores en produccion.
