# Edge Function `create-user`

Esta funcion permite que un usuario con rol `Administrador Aplicación` cree usuarios reales en Supabase Auth y su fila asociada en `profiles`.

## Archivo

```text
supabase/functions/create-user/index.ts
```

## Seguridad

La funcion:

1. exige sesion con `Authorization: Bearer <access_token>`;
2. valida que el usuario autenticado tenga `can_manage_users = true`;
3. crea el usuario en Supabase Auth con contrasena temporal;
4. crea la fila en `profiles`;
5. si falla la creacion del perfil, elimina el usuario Auth recien creado.

La app nunca debe exponer `SUPABASE_SERVICE_ROLE_KEY`. Esa llave queda solo dentro de la Edge Function.

## Payload

```json
{
  "fullName": "Tecnico Prueba",
  "email": "tecnico.prueba@soser.cl",
  "branchId": "uuid-sucursal-talca",
  "groupId": "uuid-grupo-mantenimiento",
  "roleId": "uuid-rol-tecnico-multifuncional",
  "status": "activo",
  "statusReason": "Disponible"
}
```

## Respuesta exitosa

```json
{
  "id": "uuid-auth-user",
  "email": "tecnico.prueba@soser.cl",
  "temporaryPassword": "Abc123!xyz",
  "requirePasswordChange": true
}
```

## Despliegue

Desde la carpeta del proyecto Supabase local:

```bash
supabase functions deploy create-user
```

Si estas trabajando solo desde el dashboard, puedes copiar el contenido de `index.ts` en una Edge Function llamada `create-user`.

## Prueba con curl

Reemplaza:

- `<PROJECT_URL>` por tu URL de Supabase.
- `<ACCESS_TOKEN_ADMIN>` por el access token del administrador iniciado en la app.

```bash
curl -X POST '<PROJECT_URL>/functions/v1/create-user' \
  -H 'Authorization: Bearer <ACCESS_TOKEN_ADMIN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "fullName": "Tecnico Prueba",
    "email": "tecnico.prueba@soser.cl",
    "branchId": "uuid-sucursal-talca",
    "groupId": "uuid-grupo-mantenimiento",
    "roleId": "uuid-rol-tecnico-multifuncional",
    "status": "activo",
    "statusReason": "Disponible"
  }'
```

## Siguiente integracion en la app

Cuando conectemos Datacora a Supabase, el boton `Crear usuario` del panel administrador debe llamar esta Edge Function y mostrar la contrasena temporal devuelta.

