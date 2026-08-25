import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type UploadPayload = {
  action?: string;
  submissionId?: string;
  submission_id?: string;
  id?: string;
  attachmentId?: string;
  attachment_id?: string;
  externalId?: string;
  external_id?: string;
  fileName?: string;
  pdfBase64?: string;
  fileBase64?: string;
  mimeType?: string;
  folderPath?: string;
  folderSegment?: string;
  fileKind?: string;
  metadata?: Record<string, unknown> | null;
  emailTo?: string | string[];
  emailCc?: string | string[];
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function secretValue(name: string) {
  const directValue = Deno.env.get(name);
  if (directValue) return directValue;

  if (name === "SUPABASE_ANON_KEY") {
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    return publishableKeys.default;
  }

  if (name === "SUPABASE_SERVICE_ROLE_KEY") {
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    return secretKeys.default;
  }

  return undefined;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    return String(value.message ?? value.error_description ?? value.details ?? value.hint ?? value.code ?? JSON.stringify(value));
  }
  return String(error);
}

function isUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value).trim());
}

function payloadSubmissionId(payload: UploadPayload) {
  return String(payload.submissionId || payload.submission_id || payload.id || "")
    .trim()
    .replace(/^"+|"+$/g, "");
}

function payloadAttachmentId(payload: UploadPayload) {
  return String(payload.attachmentId || payload.attachment_id || "")
    .trim()
    .replace(/^"+|"+$/g, "");
}

function payloadExternalId(payload: UploadPayload) {
  return String(payload.externalId || payload.external_id || "")
    .trim()
    .replace(/^"+|"+$/g, "");
}

function sanitizePathPart(value: string) {
  return String(value ?? "")
    .replace(/[\\/:*?"<>|#%{}~&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedFolderPath(value?: string) {
  return String(value || Deno.env.get("ONEDRIVE_FOLDER_PATH") || "Bitacoras")
    .split("/")
    .map(sanitizePathPart)
    .filter(Boolean)
    .join("/");
}

function normalizedFolderSegment(value?: string) {
  return String(value || "")
    .split("/")
    .map(sanitizePathPart)
    .filter(Boolean)
    .join("/");
}

function normalizedFileName(value?: string, folio?: number | string, extension = "pdf") {
  const fallback = `Bitacora Mantencion N Folio ${folio || "Pendiente"}.pdf`;
  const safeExtension = sanitizePathPart(extension || "pdf").replace(/^\.+/, "") || "pdf";
  const name = sanitizePathPart(value || fallback).replace(/\.[a-z0-9]{2,8}$/i, "");
  return `${name || sanitizePathPart(fallback).replace(/\.[a-z0-9]{2,8}$/i, "")}.${safeExtension}`;
}

function normalizedFileKind(value?: string) {
  const kind = String(value || "").trim();
  if (["onedrive_pdf", "onedrive_bitacora_pdf", "onedrive_internal_pdf", "onedrive_photos_zip", "onedrive_photo"].includes(kind)) return kind;
  return "onedrive_pdf";
}

function normalizedMimeType(value?: string) {
  const mimeType = String(value || "application/pdf").trim().toLowerCase();
  if (["application/pdf", "application/zip", "application/x-zip-compressed", "image/jpeg", "image/jpg", "image/png", "image/webp"].includes(mimeType)) return mimeType;
  return "application/octet-stream";
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") return "zip";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return "jpg";
  return "bin";
}

function decodeBase64File(value: string, mimeType: string) {
  const escapedMime = mimeType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const base64 = String(value || "").replace(new RegExp(`^data:${escapedMime};base64,`, "i"), "").trim();
  if (!base64) throw new Error("Archivo vacio.");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
  let result = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    result += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(result);
}

function splitEmails(value?: string | string[]) {
  const values = Array.isArray(value) ? value : String(value || "").split(/[;,]/);
  return values
    .map((item) => String(item || "").trim())
    .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
}

const todayOnlyEmailDate = "2026-07-31";
const todayOnlyEmailTo = ["patricio.tapia@soser.cl"];

function chileDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function todayOnlyEmailRecipients() {
  return chileDateKey() === todayOnlyEmailDate ? todayOnlyEmailTo : null;
}

function graphRecipients(emails: string[]) {
  return emails.map((address) => ({ emailAddress: { address } }));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatChileDateTime(value: unknown) {
  const date = value ? new Date(String(value)) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const parts = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(safeDate);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return {
    date: `${part("day")}-${part("month")}-${part("year")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "PDF";
  if (bytes >= 1024 * 1024) return `PDF - ${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `PDF - ${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const defaultEmailAssets = {
  soserLogo: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Logo%20Soser%20Png.png",
  datacoraIcon: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Icono_Datacora_Correo.png.png",
  maintenanceIcon: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Icono_RegistroMantencion_Correo.png",
  folioIcon: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Icono_Folio_Correo.png",
  establishmentIcon: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Icono_Establecimiento_Correo.png",
  dateIcon: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Icono_Fecha_Correo.png",
  timeIcon: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Icono_Reloj_Correo.png",
  pdfIcon: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Icono_PDF_Correo.png",
};

function emailAssetUrl(secretName: string, fallback: string) {
  return String(Deno.env.get(secretName) || fallback).trim();
}

function emailAssets() {
  return {
    soserLogo: emailAssetUrl("BITACORA_EMAIL_SOSER_LOGO_URL", defaultEmailAssets.soserLogo),
    datacoraIcon: emailAssetUrl("BITACORA_EMAIL_DATACORA_ICON_URL", defaultEmailAssets.datacoraIcon),
    maintenanceIcon: emailAssetUrl("BITACORA_EMAIL_MAINTENANCE_ICON_URL", defaultEmailAssets.maintenanceIcon),
    folioIcon: emailAssetUrl("BITACORA_EMAIL_FOLIO_ICON_URL", defaultEmailAssets.folioIcon),
    establishmentIcon: emailAssetUrl("BITACORA_EMAIL_ESTABLISHMENT_ICON_URL", defaultEmailAssets.establishmentIcon),
    dateIcon: emailAssetUrl("BITACORA_EMAIL_DATE_ICON_URL", defaultEmailAssets.dateIcon),
    timeIcon: emailAssetUrl("BITACORA_EMAIL_TIME_ICON_URL", defaultEmailAssets.timeIcon),
    pdfIcon: emailAssetUrl("BITACORA_EMAIL_PDF_ICON_URL", defaultEmailAssets.pdfIcon),
  };
}

function asRecord(value: unknown) {
  if (Array.isArray(value)) return (value[0] || {}) as Record<string, unknown>;
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return {} as Record<string, unknown>;
}

async function completionDateFromGeolocation(adminClient: any, submissionId: unknown) {
  if (!isUuid(String(submissionId || ""))) return null;

  const { data, error } = await adminClient
    .from("form_answers")
    .select("answer_text, answer_date, answer_json, form_questions!inner(code)")
    .eq("submission_id", String(submissionId))
    .eq("form_questions.code", "submit_captured_at")
    .maybeSingle();

  if (error) {
    console.warn("No se pudo leer fecha de finalizacion desde georreferenciacion.", error);
    return null;
  }

  const value = data?.answer_text || data?.answer_date || data?.answer_json?.value || null;
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function emailIcon(url: string, alt: string, size = 62) {
  return `<img src="${escapeHtml(url)}" width="${size}" height="${size}" alt="${escapeHtml(alt)}" style="display:block; width:${size}px; height:${size}px; border:0; outline:none; text-decoration:none;">`;
}

function fieldCard(label: string, value: unknown, iconUrl: string, borderRight = false) {
  return `
    <td width="50%" style="padding:18px 22px; ${borderRight ? "border-right:1px solid #d9e3df;" : ""}">
      <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse;">
        <tr>
          <td width="76" valign="middle" style="width:76px;">
            ${emailIcon(iconUrl, String(label), 62)}
          </td>
          <td valign="middle" style="font-family:Arial, Helvetica, sans-serif;">
            <div style="font-size:15px; color:#1d2733; line-height:1.2;">${escapeHtml(label)}</div>
            <div style="margin-top:5px; font-size:18px; color:#0b6a43; font-weight:800; line-height:1.2;">${escapeHtml(value || "-")}</div>
          </td>
        </tr>
      </table>
    </td>
  `;
}

async function graphToken() {
  const tenantId = Deno.env.get("ONEDRIVE_TENANT_ID");
  const clientId = Deno.env.get("ONEDRIVE_CLIENT_ID");
  const clientSecret = Deno.env.get("ONEDRIVE_CLIENT_SECRET");

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Faltan ONEDRIVE_TENANT_ID, ONEDRIVE_CLIENT_ID u ONEDRIVE_CLIENT_SECRET.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(errorMessage(data));
  return data.access_token as string;
}

async function sendBitacoraEmail(params: {
  accessToken: string;
  adminClient: any;
  payload: UploadPayload;
  fileKind: string;
  fileName: string;
  fileBytes: Uint8Array;
  externalUrl: string;
  submission: Record<string, unknown>;
  driveItem: Record<string, unknown>;
}) {
  if (params.fileKind !== "onedrive_bitacora_pdf") return { skipped: true, reason: "No es PDF bitacora." };

  const sender = String(Deno.env.get("BITACORA_EMAIL_FROM") || "").trim();
  if (!sender) return { skipped: true, reason: "Falta BITACORA_EMAIL_FROM." };

  const mode = String(Deno.env.get("BITACORA_EMAIL_MODE") || "test").trim().toLowerCase();
  const testRecipients = splitEmails(Deno.env.get("BITACORA_EMAIL_TEST_TO"));
  const defaultRecipients = splitEmails(Deno.env.get("BITACORA_EMAIL_DEFAULT_TO"));
  const payloadRecipients = splitEmails(params.payload.emailTo);
  const payloadCc = splitEmails(params.payload.emailCc);
  const forcedRecipients = todayOnlyEmailRecipients();
  const deliveryMode = forcedRecipients ? "today_only" : mode;
  const toRecipients = forcedRecipients || (mode === "production"
    ? [...payloadRecipients, ...defaultRecipients]
    : testRecipients);
  const ccRecipients = forcedRecipients ? [] : mode === "production" ? payloadCc : [];

  if (!toRecipients.length) return { skipped: true, reason: "Sin destinatarios configurados." };

  const folio = String(params.submission.folio || "Pendiente");
  const rbdMatch = params.fileName.replace(/\.pdf$/i, "").match(/RBD\s+([0-9A-Za-z.-]+)/i);
  const task = asRecord(params.submission.tasks);
  const establishment = asRecord(task.establishments);
  const rbd = String(establishment?.rbd || rbdMatch?.[1] || "").trim();
  const establishmentName = String(establishment?.name || (rbd ? `RBD ${rbd}` : "Establecimiento indicado")).trim();
  const completedAt = await completionDateFromGeolocation(params.adminClient, params.submission.id);
  const submittedAt = completedAt || params.submission.submitted_at || params.submission.created_at;
  const submittedDateTime = formatChileDateTime(submittedAt);
  const fileSize = formatFileSize(params.fileBytes.byteLength);
  const assets = emailAssets();
  const establishmentDisplay = [rbd ? `RBD ${rbd}` : "", establishmentName].filter(Boolean).join(" - ");
  const subjectPrefix = deliveryMode === "test" ? "[PRUEBA] " : "";
  const subject = `${subjectPrefix}Bitácora Mantención Folio ${folio} - ${params.fileName.replace(/\.pdf$/i, "")}`;
  const bodyHtml = `
    <div style="margin:0; padding:0; background:#f4f7f6;">
      <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse; background:#f4f7f6;">
        <tr>
          <td align="center" style="padding:28px 12px;">
            <table role="presentation" cellspacing="0" cellpadding="0" width="760" style="width:760px; max-width:100%; border-collapse:collapse; background:#ffffff; border:1px solid #dbe5e1; border-radius:12px;">
              <tr>
                <td style="padding:28px 44px 24px 44px; border-bottom:4px solid #0b6a43; font-family:Arial, Helvetica, sans-serif;">
                  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse;">
                    <tr>
                      <td valign="middle" width="50%" style="font-family:Arial, Helvetica, sans-serif;">
                        <img src="${escapeHtml(assets.soserLogo)}" width="210" alt="SOSER Servicios de Alimentacion" style="display:block; width:210px; max-width:100%; height:auto; border:0; outline:none; text-decoration:none;">
                      </td>
                      <td valign="middle" align="right" width="50%" style="font-family:Arial, Helvetica, sans-serif;">
                        <table role="presentation" cellspacing="0" cellpadding="0" align="right" style="border-collapse:collapse;">
                          <tr>
                            <td width="72" style="width:72px;">
                              ${emailIcon(assets.datacoraIcon, "Datácora", 66)}
                            </td>
                            <td style="font-family:Arial, Helvetica, sans-serif;">
                              <div style="color:#0b6a43; font-size:25px; line-height:1; font-weight:900; letter-spacing:.5px;">DATÁCORA</div>
                              <div style="margin-top:7px; color:#5c6670; font-size:14px;">Sistema Digital de Mantención</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:36px 44px 26px 44px; font-family:Arial, Helvetica, sans-serif; color:#102033; font-size:16px; line-height:1.55;">
                  ${deliveryMode === "test" ? `
                    <div style="margin:0 0 24px 0; padding:12px 14px; background:#eef5ff; border-left:4px solid #1f5faa; color:#0b3b75; font-size:14px;">
                      <strong>Correo de prueba:</strong> este mensaje aun no fue enviado a destinatarios reales del formulario.
                    </div>
                  ` : ""}
                  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse;">
                    <tr>
                      <td width="150" valign="top" style="width:150px; padding:4px 28px 0 0;">
                        <img src="${escapeHtml(assets.maintenanceIcon)}" width="112" height="112" alt="Registro de mantención" style="display:block; width:112px; height:112px; border:0; outline:none; text-decoration:none;">
                      </td>
                      <td valign="top">
                        <h1 style="margin:0 0 20px 0; font-family:Arial, Helvetica, sans-serif; color:#0b6a43; font-size:27px; line-height:1.25; font-weight:900;">
                          Bitácora de mantención registrada con éxito
                        </h1>
                        <p style="margin:0 0 18px 0;">Hola,</p>
                        <p style="margin:0 0 16px 0;">
                          Se ha registrado correctamente una visita de mantención en el establecimiento indicado.
                        </p>
                        <p style="margin:0;">
                          Adjunto encontrarás el respaldo oficial de la bitácora en formato PDF.
                        </p>
                      </td>
                    </tr>
                  </table>
                  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse; margin:34px 0 24px 0; border:1px solid #d9e3df; border-radius:10px; background:#fbfdfc;">
                    <tr>
                      ${fieldCard("Folio", folio, assets.folioIcon, true)}
                      ${fieldCard("Establecimiento", establishmentDisplay || "-", assets.establishmentIcon)}
                    </tr>
                    <tr>
                      <td colspan="2" style="padding:0 22px;"><div style="height:1px; background:#d9e3df; line-height:1px;">&nbsp;</div></td>
                    </tr>
                    <tr>
                      ${fieldCard("Fecha", submittedDateTime.date, assets.dateIcon, true)}
                      ${fieldCard("Hora", submittedDateTime.time, assets.timeIcon)}
                    </tr>
                  </table>
                  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse; margin:0 0 28px 0; border:1px solid #d9e3df; border-radius:10px;">
                    <tr>
                      <td width="86" valign="middle" style="width:86px; padding:20px 0 20px 22px;">
                        ${emailIcon(assets.pdfIcon, "PDF", 62)}
                      </td>
                      <td valign="middle" style="padding:20px 22px 20px 8px; font-family:Arial, Helvetica, sans-serif;">
                        <div style="font-size:17px; color:#102033; font-weight:800;">Documento adjunto</div>
                        <div style="margin-top:6px; font-size:18px; color:#0b6a43; font-weight:900;">${escapeHtml(params.fileName)}</div>
                        <div style="margin-top:6px; color:#667381; font-size:15px;">${escapeHtml(fileSize)}</div>
                      </td>
                    </tr>
                  </table>
                  <div style="border-top:1px solid #d9e3df; padding-top:22px;">
                    <p style="margin:0 0 2px 0;">Saludos cordiales,</p>
                    <p style="margin:0;"><strong style="color:#0b6a43;">Equipo de Mantención</strong><br>SOSER S.A.</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 44px; background:#f8faf9; border-top:1px solid #d9e3df; font-family:Arial, Helvetica, sans-serif; color:#4d5965; font-size:14px; line-height:1.45;">
                  <strong style="color:#0b6a43;">Correo generado automáticamente por Datácora.</strong><br>
                  No es necesario responder este mensaje.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const attachments = [
    ...(params.fileBytes.byteLength <= 3 * 1024 * 1024
    ? [{
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: params.fileName,
      contentType: "application/pdf",
      contentBytes: bytesToBase64(params.fileBytes),
    }]
    : [])
  ];

  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject,
        body: {
          contentType: "HTML",
          content: bodyHtml,
        },
        toRecipients: graphRecipients(Array.from(new Set(toRecipients))),
        ccRecipients: graphRecipients(Array.from(new Set(ccRecipients))),
        attachments,
      },
      saveToSentItems: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Graph sendMail ${response.status}`);
  }

  return {
    sent: true,
    skipped: false,
    mode: deliveryMode,
    subject,
    to: Array.from(new Set(toRecipients)),
    cc: Array.from(new Set(ccRecipients)),
    attachedPdf: params.fileBytes.byteLength <= 3 * 1024 * 1024,
    inlineLogo: false,
  };
}

function uploadUrl(filePath: string) {
  const siteId = Deno.env.get("ONEDRIVE_SITE_ID");
  const driveId = Deno.env.get("ONEDRIVE_DRIVE_ID");
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");

  if (driveId) return `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodedPath}:/content`;
  if (siteId) return `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encodedPath}:/content`;
  throw new Error("Falta ONEDRIVE_SITE_ID u ONEDRIVE_DRIVE_ID.");
}

function graphDriveRootUrl() {
  const siteId = Deno.env.get("ONEDRIVE_SITE_ID");
  const driveId = Deno.env.get("ONEDRIVE_DRIVE_ID");

  if (driveId) return `https://graph.microsoft.com/v1.0/drives/${driveId}/root`;
  if (siteId) return `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root`;
  throw new Error("Falta ONEDRIVE_SITE_ID u ONEDRIVE_DRIVE_ID.");
}

function graphPathUrl(path: string) {
  const rootUrl = graphDriveRootUrl();
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return encodedPath ? `${rootUrl}:/${encodedPath}` : rootUrl;
}

function graphChildrenUrl(parentPath: string) {
  const parentUrl = graphPathUrl(parentPath);
  return parentPath ? `${parentUrl}:/children` : `${parentUrl}/children`;
}

async function ensureOneDriveFolderPath(accessToken: string, folderPath: string) {
  const segments = folderPath.split("/").map(sanitizePathPart).filter(Boolean);
  let currentPath = "";

  for (const segment of segments) {
    const nextPath = currentPath ? `${currentPath}/${segment}` : segment;
    const existsResponse = await fetch(graphPathUrl(nextPath), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (existsResponse.ok) {
      currentPath = nextPath;
      continue;
    }

    if (existsResponse.status !== 404) {
      const data = await existsResponse.json().catch(() => ({}));
      throw new Error(errorMessage(data));
    }

    const createResponse = await fetch(graphChildrenUrl(currentPath), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: segment,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail",
      }),
    });

    if (!createResponse.ok && createResponse.status !== 409) {
      const data = await createResponse.json().catch(() => ({}));
      throw new Error(errorMessage(data));
    }

    currentPath = nextPath;
  }
}

async function createShareLink(accessToken: string, driveItem: Record<string, unknown>) {
  const itemId = String(driveItem.id || "");
  const parent = driveItem.parentReference as Record<string, unknown> | undefined;
  const driveId = String(parent?.driveId || Deno.env.get("ONEDRIVE_DRIVE_ID") || "");
  if (!itemId || !driveId) return String(driveItem.webUrl || "");

  const response = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/createLink`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "view", scope: "organization" }),
  });

  const data = await response.json();
  if (!response.ok) return String(driveItem.webUrl || "");
  return String(data?.link?.webUrl || driveItem.webUrl || "");
}

async function downloadDriveItemBytes(accessToken: string, itemId: string, driveId?: string) {
  const safeDriveId = String(driveId || Deno.env.get("ONEDRIVE_DRIVE_ID") || "");
  if (!safeDriveId || !itemId) throw new Error("No se pudo identificar la fotografia en OneDrive.");

  const response = await fetch(`https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(safeDriveId)}/items/${encodeURIComponent(itemId)}/content`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: "follow",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Graph download ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { contentType, bytes };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Metodo no permitido." }, 405);

  const supabaseUrl = secretValue("SUPABASE_URL");
  const anonKey = secretValue("SUPABASE_ANON_KEY");
  const serviceRoleKey = secretValue("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Variables de entorno Supabase no configuradas." }, 500);
  }

  const authorization = req.headers.get("Authorization") ?? "";
  const jwt = authorization.replace("Bearer ", "").trim();
  if (!jwt) return jsonResponse({ error: "Sesion requerida." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await userClient.auth.getUser(jwt);
  if (authError || !authData.user) return jsonResponse({ error: "Sesion invalida." }, 401);

  let payload: UploadPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "JSON invalido." }, 400);
  }

  const submissionId = payloadSubmissionId(payload);
  if (!isUuid(submissionId)) {
    return jsonResponse({
      error: "submissionId invalido.",
      receivedLength: submissionId.length,
    }, 400);
  }

  try {
    const { data: visibleSubmission, error: visibleError } = await userClient
      .from("form_submissions")
      .select("id, task_id, folio, submitted_at, created_at, tasks(task_type, establishments(rbd, name))")
      .eq("id", submissionId)
      .maybeSingle();

    if (visibleError) throw visibleError;
    if (!visibleSubmission) return jsonResponse({ error: "Envio no encontrado o sin permisos." }, 404);

    if (payload.action === "submission-photos") {
      const { data: attachments, error: attachmentLookupError } = await adminClient
        .from("form_attachments")
        .select("id, external_id, mime_type, file_name, external_url, metadata, created_at")
        .eq("submission_id", visibleSubmission.id)
        .eq("file_kind", "onedrive_photo")
        .order("created_at", { ascending: true });

      if (attachmentLookupError) throw attachmentLookupError;

      const accessToken = await graphToken();
      const photos = [];
      for (const attachment of attachments || []) {
        const metadata = attachment.metadata as Record<string, unknown> | null;
        const driveId = String(metadata?.drive_id || Deno.env.get("ONEDRIVE_DRIVE_ID") || "");
        try {
          const downloaded = await downloadDriveItemBytes(accessToken, String(attachment.external_id || ""), driveId);
          const mimeType = String(attachment.mime_type || downloaded.contentType || "image/jpeg");
          photos.push({
            id: attachment.id,
            file_kind: "onedrive_photo",
            file_name: attachment.file_name,
            external_id: attachment.external_id,
            external_url: attachment.external_url,
            mime_type: mimeType,
            metadata: attachment.metadata,
            created_at: attachment.created_at,
            dataUrl: `data:${mimeType};base64,${bytesToBase64(downloaded.bytes)}`,
          });
        } catch (error) {
          photos.push({
            id: attachment.id,
            file_kind: "onedrive_photo",
            file_name: attachment.file_name,
            external_id: attachment.external_id,
            external_url: attachment.external_url,
            mime_type: attachment.mime_type,
            metadata: attachment.metadata,
            created_at: attachment.created_at,
            error: errorMessage(error),
          });
        }
      }

      return jsonResponse({ ok: true, photos });
    }

    if (payload.action === "download-photo") {
      const attachmentId = payloadAttachmentId(payload);
      const requestedExternalId = payloadExternalId(payload);
      const query = adminClient
        .from("form_attachments")
        .select("id, external_id, mime_type, file_name, metadata")
        .eq("submission_id", visibleSubmission.id)
        .eq("file_kind", "onedrive_photo");

      const { data: attachments, error: attachmentLookupError } = await query;
      if (attachmentLookupError) throw attachmentLookupError;

      const attachment = (attachments || []).find((item: Record<string, unknown>) => (
        (attachmentId && item.id === attachmentId)
        || (requestedExternalId && item.external_id === requestedExternalId)
      ));
      if (!attachment) return jsonResponse({ error: "Fotografia no encontrada o sin permisos." }, 404);

      const metadata = attachment.metadata as Record<string, unknown> | null;
      const driveId = String(metadata?.drive_id || Deno.env.get("ONEDRIVE_DRIVE_ID") || "");
      const accessToken = await graphToken();
      const downloaded = await downloadDriveItemBytes(accessToken, String(attachment.external_id || ""), driveId);
      const mimeType = String(attachment.mime_type || downloaded.contentType || "image/jpeg");

      return jsonResponse({
        ok: true,
        attachmentId: attachment.id,
        fileName: attachment.file_name,
        mimeType,
        dataUrl: `data:${mimeType};base64,${bytesToBase64(downloaded.bytes)}`,
      });
    }

    const baseFolderPath = normalizedFolderPath(payload.folderPath);
    const folderSegment = normalizedFolderSegment(payload.folderSegment);
    const folderPath = folderSegment ? `${baseFolderPath}/${folderSegment}` : baseFolderPath;
    const fileKind = normalizedFileKind(payload.fileKind);
    const mimeType = normalizedMimeType(payload.mimeType);
    const fileName = normalizedFileName(payload.fileName, visibleSubmission.folio, extensionForMimeType(mimeType));
    const storagePath = `${folderPath}/${fileName}`;
    const fileBytes = decodeBase64File(payload.fileBase64 || payload.pdfBase64 || "", mimeType);
    const accessToken = await graphToken();

    await ensureOneDriveFolderPath(accessToken, folderPath);

    const uploadResponse = await fetch(uploadUrl(storagePath), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": mimeType,
      },
      body: fileBytes,
    });

    const driveItem = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(errorMessage(driveItem));

    const externalUrl = await createShareLink(accessToken, driveItem);
    let emailStatus: Record<string, unknown> | null = null;
    if (fileKind === "onedrive_bitacora_pdf") {
      const { data: emailDelivery, error: emailDeliveryError } = await adminClient
        .from("form_email_deliveries")
        .insert({
          submission_id: visibleSubmission.id,
          email_kind: "bitacora_pdf",
          status: "sending",
          metadata: {
            file_name: fileName,
            storage_path: storagePath,
          },
        })
        .select("id")
        .single();

      if (emailDeliveryError) {
        emailStatus = {
          sent: false,
          skipped: true,
          reason: "Correo ya reservado o enviado anteriormente para este envio.",
        };
      } else {
        try {
          emailStatus = await sendBitacoraEmail({
            accessToken,
            adminClient,
            payload,
            fileKind,
            fileName,
            fileBytes,
            externalUrl,
            submission: visibleSubmission,
            driveItem,
          });
          await adminClient
            .from("form_email_deliveries")
            .update({
              status: emailStatus?.skipped ? "skipped" : "sent",
              mode: typeof emailStatus?.mode === "string" ? emailStatus.mode : null,
              recipients: {
                to: emailStatus?.to || [],
                cc: emailStatus?.cc || [],
              },
              subject: String(emailStatus?.subject || ""),
              metadata: {
                file_name: fileName,
                storage_path: storagePath,
                attachment_id: driveItem.id,
                attached_pdf: emailStatus?.attachedPdf === true,
              },
              sent_at: emailStatus?.sent ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", emailDelivery.id);
        } catch (error) {
          emailStatus = {
            sent: false,
            skipped: false,
            error: errorMessage(error),
          };
          await adminClient
            .from("form_email_deliveries")
            .update({
              status: "failed",
              error: emailStatus.error,
              updated_at: new Date().toISOString(),
            })
            .eq("id", emailDelivery.id);
          console.warn("No se pudo enviar correo de bitacora.", error);
        }
      }
    }

    const { data: attachment, error: attachmentError } = await adminClient
      .from("form_attachments")
      .insert({
        submission_id: visibleSubmission.id,
        file_kind: fileKind,
        storage_provider: "onedrive",
        storage_path: storagePath,
        external_url: externalUrl,
        external_id: driveItem.id,
        mime_type: mimeType,
        file_name: fileName,
        file_size_bytes: fileBytes.byteLength,
        metadata: {
          ...(payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {}),
          source: "onedrive",
          file_kind: fileKind,
          graph_web_url: driveItem.webUrl,
          graph_download_url: driveItem["@microsoft.graph.downloadUrl"] || null,
          drive_id: (driveItem.parentReference as Record<string, unknown> | undefined)?.driveId,
          email_status: emailStatus,
        },
      })
      .select("id")
      .single();

    if (attachmentError) throw attachmentError;

    return jsonResponse({
      ok: true,
      attachmentId: attachment.id,
      submissionId: visibleSubmission.id,
      folio: visibleSubmission.folio,
      fileName,
      storagePath,
      externalUrl,
      externalId: driveItem.id,
      downloadUrl: driveItem["@microsoft.graph.downloadUrl"] || null,
      emailStatus,
    });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 400);
  }
});
