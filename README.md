# Datácora

Primera versión funcional de interfaz móvil para digitalizar bitácoras de mantenimiento en terreno.

## Cómo abrir

Abrir `index.html` en el navegador. La interfaz está construida sin dependencias externas para que funcione como prototipo local.

## Estructura

- `index.html`: entrada principal de la app.
- `manifest.webmanifest`: base PWA para instalación futura en Android.
- `src/app.js`: navegación, componentes reutilizables y renderizado de pantallas.
- `src/data.js`: datos simulados, tareas, historial, usuario y estructuras base de formularios dinámicos.
- `src/styles.css`: diseño mobile-first, paleta, estados visuales y layout.
- `src/assets/logo.svg`: ícono de Datácora.

## Base para formularios dinámicos

Cada tarea incluye:

- `form.blueprintKey`: conecta la tarea con una plantilla de formulario.

Las plantillas en `formBlueprints` declaran tipos de respuesta soportados:

- Texto.
- Alternativas simples o múltiples.
- Observaciones.
- Fotografías.
- Archivos adjuntos.

Las preguntas definitivas no están implementadas todavía.

## Usuarios

`src/data.js` incluye una tabla mock de usuarios con:

- `id`
- `nombre`
- `usuario`
- `sucursal`
- `grupo`
- `cargo`
- `estado`
- `motivoEstado`
- `permisos`

Usuario administrador de prototipo:

- Usuario: `patricio.tapia@soser.cl`
- Contraseña: `Neo.0109`

El administrador puede cambiar estados entre activo e inactivo por disponibilidad, ausencia, licencia o despido desde el menu Usuarios.

El administrador tiene un flujo propio con solo dos accesos inferiores:

- `Acciones`
- `Perfil`

Desde `Acciones` puede entrar a:

- Usuarios.
- Grupos.
- Asignar tareas a tecnicos activos.

## Politica de contrasenas

Las contrasenas nuevas deben cumplir:

- Minimo 8 caracteres.
- Al menos una mayuscula.
- Al menos una minuscula.
- Al menos un numero.
- Al menos un caracter especial.

Cuando un administrador crea un usuario, la app genera una contrasena temporal de un solo uso y marca `requirePasswordChange: true`. En el primer ingreso, el usuario debe definir una nueva contrasena antes de acceder a las tareas.

Nota: la contraseña está en texto plano solo porque esta versión es un prototipo local sin backend. En producción debe reemplazarse por autenticación segura y hash de contraseñas.
