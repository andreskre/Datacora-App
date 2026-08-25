# Estrategia de almacenamiento Free + OneDrive

Para comenzar con Supabase Free, Datacora debe mantener Supabase liviano:

- guardar respuestas estructuradas;
- no guardar fotos crudas;
- generar un PDF final por bitacora;
- guardar el PDF en OneDrive/SharePoint;
- registrar en Supabase solo el enlace y metadatos del PDF.

## Flujo recomendado

1. El tecnico responde el formulario en la app.
2. La app captura fotos solo como evidencia temporal para armar el PDF.
3. Al finalizar, se genera el PDF de la bitacora.
4. El PDF se sube a OneDrive/SharePoint.
5. Supabase guarda:
   - tarea;
   - respuestas;
   - estado de envio;
   - enlace al PDF;
   - ID externo del archivo;
   - nombre y tamano del PDF.

## Integracion automatica con OneDrive

La subida automatica debe hacerse con Microsoft Graph desde una Edge Function,
no escribiendo directo en una carpeta local de OneDrive. Esto permite que funcione
igual en navegador, celular y APK.

Funcion preparada:

- `supabase/functions/upload-onedrive-pdf`

Variables requeridas en Supabase:

```txt
ONEDRIVE_TENANT_ID=<id del tenant Microsoft 365>
ONEDRIVE_CLIENT_ID=<id de la app registrada en Azure>
ONEDRIVE_CLIENT_SECRET=<secreto de la app>
ONEDRIVE_SITE_ID=<id del sitio SharePoint/OneDrive donde se guardara>
ONEDRIVE_DRIVE_ID=<opcional, id de la biblioteca/drive>
ONEDRIVE_FOLDER_PATH=Bitacoras
```

Para la carpeta SOSER indicada:

```txt
ONEDRIVE_FOLDER_PATH=MANTENIMIENTO/Datácora/PDF Bitacora
```

Esta ruta asume que `ONEDRIVE_DRIVE_ID` corresponde a la biblioteca
`Shared Documents` del sitio `GerenciaOperaciones`.

La app registrada en Microsoft Entra ID debe tener permisos de Microsoft Graph
para escribir en el sitio o biblioteca elegida. Recomendado para produccion:
`Sites.Selected`, dando acceso solo al sitio de bitacoras. Para piloto rapido
puede usarse `Files.ReadWrite.All` o `Sites.ReadWrite.All`, aceptando que son
permisos mas amplios.

La funcion espera:

```json
{
  "submissionId": "uuid-del-envio",
  "fileName": "Bitacora Mantencion N Folio 2.pdf",
  "pdfBase64": "base64-del-pdf",
  "folderPath": "Bitacoras"
}
```

Desde la app, el resumen de un formulario completado muestra dos acciones:

- `Generar PDF PAE`: abre la vista imprimible para guardar manualmente.
- `Respaldar PDF en OneDrive`: genera un PDF binario en memoria, llama a
  `upload-onedrive-pdf` y guarda el enlace en `form_attachments`.

Al terminar registra en `form_attachments`:

- `file_kind = 'onedrive_pdf'`
- `storage_provider = 'onedrive'`
- `storage_path`
- `external_url`
- `external_id`
- `file_name`
- `file_size_bytes`

## Que se guarda en Supabase

Tablas principales:

- `tasks`
- `form_submissions`
- `response_items`
- `form_answers`
- `form_attachments`

En `form_attachments`, para el PDF final:

```sql
file_kind = 'onedrive_pdf'
storage_provider = 'onedrive'
storage_path = '<ruta o drive item path>'
external_url = '<link al PDF>'
external_id = '<driveItem.id de Microsoft Graph>'
mime_type = 'application/pdf'
file_name = 'bitacora-rbd-2730-2026-07-06.pdf'
file_size_bytes = 123456
metadata = '{"source":"onedrive","library":"Bitacoras"}'
```

## Que no se guarda en Supabase

- Fotos originales.
- Adjuntos pesados.
- Binarios de PDF.

Si alguna foto se requiere para auditoria, debe quedar dentro del PDF o en OneDrive, no en Supabase Storage durante el piloto.

## Impacto en Power BI

Power BI debe consultar:

- `bi_bitacora_respuestas`: respuestas sin fotos ni firmas.
- `bi_bitacoras_resumen`: resumen de bitacoras y link del PDF.

El campo `pdf_url` permite abrir el documento final desde el reporte si el usuario tiene permisos en Microsoft 365.

## Beneficio

Esta estrategia reduce costos porque Supabase almacena texto y metadata, mientras OneDrive/SharePoint guarda los documentos pesados usando licencias ya disponibles en la organizacion.
