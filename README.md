# Datacora

Aplicacion movil multiplataforma (iOS y Android) para digitalizacion de bitacoras de mantenimiento por establecimiento.

## Stack

- Expo + React Native + TypeScript
- React Navigation (stack + tabs)
- Context API para sesion y asignaciones
- API REST con JWT y control de roles
- Montserrat como tipografia principal

## Roles incluidos

- tecnico
- jefe_mantencion
- jefe_nacional
- admin

## Flujo implementado

1. Login con validaciones y manejo de error.
2. Jefe de mantencion asigna visitas a tecnicos por RBD.
3. Tecnico visualiza sus asignaciones y completa formulario en terreno.
4. Formularios diferenciados por tipo de establecimiento:
   - JUNAEB
   - JUNJI
   - INTEGRA
5. Jefe nacional revisa metricas globales.
6. Admin visualiza control basico de usuarios por rol.

## Credenciales demo

- tecnico@datacora.cl / Datacora123
- jefe@datacora.cl / Datacora123
- nacional@datacora.cl / Datacora123
- admin@datacora.cl / Datacora123

## Scripts

- `npm run start`
- `npm run android`
- `npm run ios`
- `npm run web`
- `npm run api:start`

## Conexion API real

La app ahora consume una API REST local con persistencia en `server/db.json`.

1. Inicie la API:
  - `npm run api:start`
2. Configure variables en `.env` (raiz del proyecto):
  - `EXPO_PUBLIC_API_URL=http://localhost:4000`
  - `JWT_SECRET=defina_un_secreto_seguro`

Notas de entorno:

- Android Emulator: use `http://10.0.2.2:4000`
- iOS Simulator: use `http://localhost:4000`
- Dispositivo fisico: use `http://IP_DE_SU_PC:4000`

## Branding

- Paleta aplicada:
  - #00162A
  - #00B4D8
  - #22C55E
  - #E6EDF3
- Tipografia: Montserrat
- Logo: `assets/Logo1.png`

## Nota tecnica

La app ya utiliza persistencia local en `server/db.json`, autenticacion JWT y autorizacion por rol en endpoints.
