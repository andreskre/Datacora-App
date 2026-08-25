# Live Updates Ionic Appflow

Datacora queda preparada para recibir actualizaciones web por Ionic Appflow Live Updates.

## Primera APK con Live Updates

1. Crear la app en Ionic Appflow.
2. Copiar el App ID entregado por Appflow.
3. En `capacitor.config.json`, actualizar:

```json
"LiveUpdates": {
  "enabled": true,
  "appId": "APP_ID_DE_IONIC_APPFLOW",
  "channel": "Production",
  "autoUpdateMethod": "background",
  "maxVersions": 2
}
```

4. Ejecutar:

```powershell
npm run android:apk
```

5. Instalar esa APK en las tablets/JM.

## Que se puede actualizar sin reinstalar APK

- Cambios en `src/app.js`.
- Cambios en vistas, textos, filtros y validaciones.
- Cambios en estilos.
- Ajustes de formularios que no requieran permisos ni plugins nuevos.
- Assets web incluidos en `www`.

## Que requiere APK nueva

- Plugins Capacitor nuevos.
- Permisos Android.
- Cambios en `AndroidManifest.xml`.
- Icono o nombre nativo de la app.
- Firma, versionado o configuracion Gradle.

## Publicar un cambio web

Despues de modificar la app:

```powershell
npm run prepare:android
```

Luego publicar el contenido web generado en `www` mediante Ionic Appflow al canal configurado.

Notas:
- No usar CDN para librerias criticas; Datacora debe poder operar en terreno.
- Mantener el canal `Production` solo para versiones probadas.
- Usar un canal de prueba, por ejemplo `Staging`, antes de enviar cambios a JM.
