# Checklist tecnico release Android

## Antes de generar release

- Confirmar `packageName` definitivo.
- Confirmar `versionCode` nuevo e incremental.
- Confirmar `versionName` visible para usuario.
- Confirmar icono final de la app.
- Confirmar splash/logo final.
- Confirmar backend productivo estable.
- Confirmar que el backend productivo use HTTPS.
- Confirmar variables Firebase de produccion.
- Confirmar permisos Android usados realmente.
- Confirmar politica de privacidad publicada en URL publica.

## Permisos esperados

- Internet.
- Camara.
- Ubicacion.
- Notificaciones.
- Almacenamiento interno/app storage, si aplica.

## Pruebas funcionales minimas

- Login de tecnico.
- Login de JM.
- Login de administrador.
- Login de prevencionista.
- Carga de tareas desde backend.
- Completar formulario con fotografias.
- Guardado local sin conexion.
- Sincronizacion al recuperar internet.
- Registro de geolocalizacion inicio/termino.
- Envio PDF por correo.
- Respaldo de fotografias.
- Notificacion de tarea nueva al tecnico.
- Notificacion de incidencia al JM.
- Notificacion de incidencia planificada/resuelta al prevencionista.
- Mensajes internos y respuestas.
- Vista de ultima conexion por usuario y tecnicos.

## Build

Google Play debe recibir un Android App Bundle:

```powershell
cd C:\Programacion\Datacora_SQLSERVER_DEV
npm run android:sync
cd android
.\gradlew bundleRelease
```

El archivo esperado queda normalmente en:

```text
android\app\build\outputs\bundle\release\app-release.aab
```

## Firma

- Generar o usar keystore release custodiado por SOSER.
- Guardar alias, clave y keystore en ubicacion segura.
- No subir keystore ni claves al repositorio.
- Considerar Play App Signing.

## Validacion final

- Instalar build release en un equipo real.
- Probar con datos reales controlados.
- Confirmar que no apunte a backend local.
- Confirmar que no haya credenciales visibles en frontend.
- Confirmar que los mensajes de error sean entendibles.
