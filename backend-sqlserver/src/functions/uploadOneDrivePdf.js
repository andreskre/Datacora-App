const express = require("express");
const fs = require("fs");
const path = require("path");
const { pool, sql } = require("../lib/db");
const { asyncHandler, httpError, ok } = require("../lib/http");
const { requireAuth } = require("../middleware/auth");
const { bytesFromBase64, uploadDriveFile, downloadDriveItemContent, sendMail, splitEmails } = require("../lib/graph");

const router = express.Router();

function payloadSubmissionId(payload) {
  return String(payload.submissionId || payload.submission_id || payload.id || "").trim().replace(/^"+|"+$/g, "");
}

function normalizedMimeType(value) {
  const mimeType = String(value || "application/pdf").trim().toLowerCase();
  if (["application/pdf", "application/zip", "application/x-zip-compressed", "image/jpeg", "image/jpg", "image/png", "image/webp"].includes(mimeType)) return mimeType;
  return "application/octet-stream";
}

function fileKind(value) {
  const kind = String(value || "").trim();
  if (["onedrive_pdf", "onedrive_bitacora_pdf", "onedrive_internal_pdf", "onedrive_photos_zip", "onedrive_photo"].includes(kind)) return kind;
  return "onedrive_pdf";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatChileDateTime(value) {
  const date = value ? new Date(String(value)) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const parts = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(safeDate);
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return {
    date: `${part("day")}-${part("month")}-${part("year")}`,
    time: `${part("hour")}:${part("minute")}`
  };
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "PDF";
  if (bytes >= 1024 * 1024) return `PDF - ${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `PDF - ${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const emailAssetDefinitions = {
  soserLogo: {
    envName: "BITACORA_EMAIL_SOSER_LOGO_URL",
    fallback: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Logo%20Soser%20Png.png",
    contentId: "soser-logo@datacora.local",
    fileName: "soser-logo.png",
    localPath: path.resolve(__dirname, "../../assets/email/soser-logo.png")
  },
  datacoraIcon: {
    envName: "BITACORA_EMAIL_DATACORA_ICON_URL",
    fallback: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Icono_Datacora_Correo.png.png",
    contentId: "datacora-icon@datacora.local",
    fileName: "datacora-icon.png",
    localPath: path.resolve(__dirname, "../../assets/email/datacora-icon.png")
  },
  maintenanceIcon: {
    envName: "BITACORA_EMAIL_MAINTENANCE_ICON_URL",
    fallback: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Icono_RegistroMantencion_Correo.png",
    contentId: "maintenance-icon@datacora.local",
    fileName: "maintenance-icon.png",
    localPath: path.resolve(__dirname, "../../assets/email/maintenance-icon.png")
  },
  folioIcon: {
    envName: "BITACORA_EMAIL_FOLIO_ICON_URL",
    fallback: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Icono_Folio_Correo.png",
    contentId: "folio-icon@datacora.local",
    fileName: "folio-icon.png",
    localPath: path.resolve(__dirname, "../../assets/email/folio-icon.png")
  },
  establishmentIcon: {
    envName: "BITACORA_EMAIL_ESTABLISHMENT_ICON_URL",
    fallback: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Icono_Establecimiento_Correo.png",
    contentId: "establishment-icon@datacora.local",
    fileName: "establishment-icon.png",
    localPath: path.resolve(__dirname, "../../assets/email/establishment-icon.png")
  },
  dateIcon: {
    envName: "BITACORA_EMAIL_DATE_ICON_URL",
    fallback: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Icono_Fecha_Correo.png",
    contentId: "date-icon@datacora.local",
    fileName: "date-icon.png",
    localPath: path.resolve(__dirname, "../../assets/email/date-icon.png")
  },
  timeIcon: {
    envName: "BITACORA_EMAIL_TIME_ICON_URL",
    fallback: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Icono_Reloj_Correo.png",
    contentId: "time-icon@datacora.local",
    fileName: "time-icon.png",
    localPath: path.resolve(__dirname, "../../assets/email/time-icon.png")
  },
  pdfIcon: {
    envName: "BITACORA_EMAIL_PDF_ICON_URL",
    fallback: "https://xuqhwiowqnlpsprgjrsc.supabase.co/storage/v1/object/public/public-assets/email/Icono_PDF_Correo.png",
    contentId: "pdf-icon@datacora.local",
    fileName: "pdf-icon.png",
    localPath: path.resolve(__dirname, "../../assets/email/pdf-icon.png")
  }
};

function emailAssetUrl(definition) {
  return String(process.env[definition.envName] || definition.fallback).trim();
}

function emailAssets(mode = "url") {
  return Object.fromEntries(Object.entries(emailAssetDefinitions).map(([key, definition]) => [
    key,
    mode === "cid" ? `cid:${definition.contentId}` : emailAssetUrl(definition)
  ]));
}

async function inlineEmailAttachments() {
  const attachments = [];
  for (const definition of Object.values(emailAssetDefinitions)) {
    if (definition.localPath && fs.existsSync(definition.localPath)) {
      attachments.push({
        name: definition.fileName,
        contentType: "image/png",
        contentId: definition.contentId,
        contentBytes: fs.readFileSync(definition.localPath).toString("base64")
      });
      continue;
    }
    const response = await fetch(emailAssetUrl(definition));
    if (!response.ok) throw new Error(`No se pudo cargar asset de correo: ${definition.fileName}`);
    attachments.push({
      name: definition.fileName,
      contentType: response.headers.get("content-type") || "image/png",
      contentId: definition.contentId,
      contentBytes: Buffer.from(await response.arrayBuffer()).toString("base64")
    });
  }
  return attachments;
}

function emailIcon(url, alt, size = 62) {
  return `<img src="${escapeHtml(url)}" width="${size}" height="${size}" alt="${escapeHtml(alt)}" style="display:block; width:${size}px; height:${size}px; border:0; outline:none; text-decoration:none;">`;
}

function badgeIcon(label) {
  const shortLabel = String(label || "").slice(0, 3).toUpperCase();
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center" valign="middle" style="width:58px; height:58px; border-radius:29px; background:#e7f4ee; border:1px solid #cce4d8; color:#0b6a43; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:58px; font-weight:900;">
          ${escapeHtml(shortLabel)}
        </td>
      </tr>
    </table>
  `;
}

function fieldCard(label, value, iconUrl, borderRight = false) {
  return `
    <td width="50%" style="padding:18px 22px; ${borderRight ? "border-right:1px solid #d9e3df;" : ""}">
      <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse;">
        <tr>
          <td width="76" valign="middle" style="width:76px;">
            ${iconUrl ? emailIcon(iconUrl, String(label), 62) : badgeIcon(label)}
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

function emailHtml(payload, fileName, fileBytesLength, assets = emailAssets()) {
  const folio = payload.metadata?.folio || payload.folio || "";
  const rbd = payload.metadata?.rbd || payload.rbd || "";
  const establishment = payload.metadata?.establishment || payload.establishment || "";
  const establishmentDisplay = [rbd ? `RBD ${rbd}` : "", establishment].filter(Boolean).join(" - ");
  const submittedDateTime = formatChileDateTime(payload.metadata?.submittedAt || payload.metadata?.submitted_at || payload.submittedAt);
  const fileSize = formatFileSize(fileBytesLength);
  return `
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
                        <div style="margin-top:6px; font-size:18px; color:#0b6a43; font-weight:900;">${escapeHtml(fileName)}</div>
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
}

function emailHtmlFixed(payload, fileName, fileBytesLength, assets = emailAssets()) {
  const folio = payload.metadata?.folio || payload.folio || "";
  const rbd = payload.metadata?.rbd || payload.rbd || "";
  const establishment = payload.metadata?.establishment || payload.establishment || "";
  const establishmentDisplay = [rbd ? `RBD ${rbd}` : "", establishment].filter(Boolean).join(" - ");
  const submittedDateTime = formatChileDateTime(payload.metadata?.submittedAt || payload.metadata?.submitted_at || payload.submittedAt);
  const fileSize = formatFileSize(fileBytesLength);
  return `
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
                        <img src="${escapeHtml(assets.soserLogo)}" width="210" alt="SOSER Servicios de Alimentación" style="display:block; width:210px; max-width:100%; height:auto; border:0; outline:none; text-decoration:none;">
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
                        <div style="margin-top:6px; font-size:18px; color:#0b6a43; font-weight:900;">${escapeHtml(fileName)}</div>
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
}

function uniqueEmails(values) {
  return Array.from(new Set(splitEmails(values)));
}

async function supervisorRecipientsForRbd(db, rbd) {
  const cleanRbd = String(rbd || "").trim();
  if (!cleanRbd) return [];

  const result = await db.request()
    .input("rbd", sql.NVarChar(30), cleanRbd)
    .query(`
      select email
      from dbo.form_email_recipients
      where rbd = @rbd
        and recipient_kind = N'supervisor'
        and is_active = 1
      order by email
    `);

  return uniqueEmails(result.recordset.map((row) => row.email));
}

async function submissionEmailContext(db, submissionId) {
  const result = await db.request()
    .input("submissionId", sql.UniqueIdentifier, submissionId)
    .query(`
      select top 1
        submission.folio,
        submission.submitted_at as submittedAt,
        establishment.rbd,
        establishment.name as establishment,
        branch.name as branch_name,
        technician.full_name as technician
      from dbo.form_submissions submission
      join dbo.tasks task on task.id = submission.task_id
      join dbo.establishments establishment on establishment.id = task.establishment_id
      left join dbo.branches branch on branch.id = establishment.branch_id
      left join dbo.profiles technician on technician.id = submission.technician_id
      where submission.id = @submissionId
    `);
  return result.recordset[0] || {};
}

router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const submissionId = payloadSubmissionId(payload);
  if (!submissionId) throw httpError(400, "submissionId invalido.");

  if (payload.action === "submission-photos") {
    const db = await pool();
    const result = await db.request()
      .input("submissionId", sql.UniqueIdentifier, submissionId)
      .query(`
        select id, file_kind, file_name, storage_path, external_url, external_id, metadata, created_at
        from dbo.form_attachments
        where submission_id = @submissionId and file_kind = 'onedrive_photo'
        order by created_at
      `);
    ok(res, {
      photos: result.recordset.map((row) => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }))
    });
    return;
  }

  if (payload.action === "download-photo") {
    const db = await pool();
    const attachmentId = String(payload.attachmentId || "").trim();
    const externalId = String(payload.externalId || "").trim();
    const result = await db.request()
      .input("submissionId", sql.UniqueIdentifier, submissionId)
      .input("attachmentId", sql.NVarChar(36), attachmentId)
      .input("externalId", sql.NVarChar(300), externalId)
      .query(`
        select top 1 id, file_name, mime_type, external_id
        from dbo.form_attachments
        where submission_id = @submissionId
          and file_kind = 'onedrive_photo'
          and (
            (@attachmentId <> '' and convert(nvarchar(36), id) = @attachmentId)
            or (@externalId <> '' and external_id = @externalId)
          )
        order by created_at desc
      `);
    const row = result.recordset[0];
    if (!row?.external_id) throw httpError(404, "Fotografia no encontrada.");
    const bytes = await downloadDriveItemContent(row.external_id);
    ok(res, {
      attachmentId: row.id,
      fileName: row.file_name,
      dataUrl: `data:${row.mime_type || "image/jpeg"};base64,${bytes.toString("base64")}`
    });
    return;
  }

  const mimeType = normalizedMimeType(payload.mimeType);
  const fileBase64 = payload.fileBase64 || payload.pdfBase64;
  const bytes = bytesFromBase64(fileBase64, mimeType);
  const name = payload.fileName || `Bitacora Mantencion Folio ${payload.metadata?.folio || ""}.pdf`;
  const kind = fileKind(payload.fileKind);

  const driveItem = await uploadDriveFile({
    folderPath: payload.folderPath,
    folderSegment: payload.folderSegment,
    fileName: name,
    bytes,
    mimeType
  });

  const db = await pool();
  const context = await submissionEmailContext(db, submissionId);
  const metadata = {
    ...context,
    ...(payload.metadata || {})
  };
  await db.request()
    .input("id", sql.UniqueIdentifier, require("crypto").randomUUID())
    .input("submissionId", sql.UniqueIdentifier, submissionId)
    .input("fileKind", sql.NVarChar(40), kind)
    .input("storageProvider", sql.NVarChar(40), "onedrive")
    .input("storagePath", sql.NVarChar(1000), driveItem.webUrl || driveItem.id || "")
    .input("externalUrl", sql.NVarChar(1000), driveItem.webUrl || "")
    .input("externalId", sql.NVarChar(300), driveItem.id || "")
    .input("mimeType", sql.NVarChar(100), mimeType)
    .input("fileName", sql.NVarChar(255), driveItem.name || name)
    .input("metadata", sql.NVarChar(sql.MAX), JSON.stringify({ ...metadata, driveItemId: driveItem.id, webUrl: driveItem.webUrl }))
    .query(`
      insert into dbo.form_attachments (
        id, submission_id, file_kind, storage_provider, storage_path, external_url, external_id, mime_type, file_name, metadata
      )
      values (
        @id, @submissionId, @fileKind, @storageProvider, @storagePath, @externalUrl, @externalId, @mimeType, @fileName, @metadata
      )
    `);

  let email = null;
  const shouldSendEmail = kind === "onedrive_bitacora_pdf" || payload.action === "upload_and_email" || payload.action === "email";
  if (shouldSendEmail) {
    const rbd = metadata.rbd || payload.rbd || "";
    const rbdRecipients = await supervisorRecipientsForRbd(db, rbd);
    const defaultRecipients = splitEmails(process.env.MAIL_DEFAULT_TO || process.env.BITACORA_EMAIL_DEFAULT_TO);
    const payloadRecipients = Array.isArray(payload.emailTo) ? payload.emailTo : splitEmails(payload.emailTo);
    const toRecipients = uniqueEmails([...payloadRecipients, ...rbdRecipients, ...defaultRecipients]);
    if (toRecipients.length) {
      try {
        let inlineAttachments = [];
        let assets = emailAssets();
        try {
          inlineAttachments = await inlineEmailAttachments();
          assets = emailAssets("cid");
        } catch (assetError) {
          console.warn("No se pudieron adjuntar imagenes inline al correo.", assetError);
        }
        email = await sendMail({
          to: toRecipients,
          cc: payload.emailCc,
          subject: `Bitácora Mantención Folio ${metadata.folio || ""} - ${driveItem.name || name}`,
          html: emailHtmlFixed({ ...payload, metadata }, driveItem.name || name, bytes.byteLength, assets),
          attachmentName: driveItem.name || name,
          attachmentBytes: mimeType === "application/pdf" ? bytes : null,
          inlineAttachments
        });
      } catch (error) {
        email = { sent: false, error: error.message };
      }
    } else {
      email = { skipped: true, reason: `Sin destinatarios configurados para RBD ${rbd || "sin RBD"}.` };
    }
  }

  ok(res, {
    ok: true,
    submissionId,
    fileName: driveItem.name || name,
    webUrl: driveItem.webUrl,
    driveItemId: driveItem.id,
    email
  });
}));

module.exports = { router };
