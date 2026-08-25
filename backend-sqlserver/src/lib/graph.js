function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable ${name}`);
  return value;
}

async function graphAccessToken() {
  const tenantId = requiredEnv("ONEDRIVE_TENANT_ID");
  const clientId = requiredEnv("ONEDRIVE_CLIENT_ID");
  const clientSecret = requiredEnv("ONEDRIVE_CLIENT_SECRET");
  let response;
  try {
    response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials"
      })
    });
  } catch (error) {
    throw new Error(`No se pudo conectar con Microsoft Login: ${error.cause?.code || error.code || error.message}`);
  }
  const body = await response.json();
  if (!response.ok || !body.access_token) throw new Error(body.error_description || body.error || "No se pudo obtener token de Microsoft Graph.");
  return body.access_token;
}

function sanitizePathPart(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|#%{}~&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedFolderPath(value, fallback = "Bitacoras") {
  return String(value || fallback)
    .split("/")
    .map(sanitizePathPart)
    .filter(Boolean)
    .join("/");
}

function normalizedFileName(value, extension = "pdf") {
  const safeExtension = sanitizePathPart(extension).replace(/^\.+/, "") || "pdf";
  const name = sanitizePathPart(value || `Bitacora Mantencion.${safeExtension}`).replace(/\.[a-z0-9]{2,8}$/i, "");
  return `${name || "Bitacora Mantencion"}.${safeExtension}`;
}

function bytesFromBase64(value, mimeType) {
  const escapedMime = String(mimeType || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const base64 = String(value || "").replace(new RegExp(`^data:${escapedMime};base64,`, "i"), "").trim();
  if (!base64) throw new Error("Archivo vacio.");
  return Buffer.from(base64, "base64");
}

async function uploadDriveFile({ folderPath, folderSegment, fileName, bytes, mimeType }) {
  const token = await graphAccessToken();
  const siteId = requiredEnv("ONEDRIVE_SITE_ID");
  const driveId = process.env.ONEDRIVE_DRIVE_ID;
  const baseFolder = normalizedFolderPath(folderPath || process.env.ONEDRIVE_FOLDER_PATH);
  const segment = normalizedFolderPath(folderSegment || "", "");
  const fullFolder = [baseFolder, segment].filter(Boolean).join("/");
  const safeName = normalizedFileName(fileName, extensionForMimeType(mimeType));
  const uploadPath = `${fullFolder}/${safeName}`.split("/").map(encodeURIComponent).join("/");
  const url = driveId
    ? `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/root:/${uploadPath}:/content`
    : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${uploadPath}:/content`;

  let response;
  try {
    response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": mimeType || "application/octet-stream"
      },
      body: bytes
    });
  } catch (error) {
    throw new Error(`No se pudo conectar con Microsoft Graph para subir a OneDrive: ${error.cause?.code || error.code || error.message}`);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || `No se pudo subir archivo a OneDrive (${response.status}).`);
  return body;
}

async function downloadDriveItemContent(driveItemId) {
  const token = await graphAccessToken();
  const siteId = requiredEnv("ONEDRIVE_SITE_ID");
  let response;
  try {
    response = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${encodeURIComponent(driveItemId)}/content`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (error) {
    throw new Error(`No se pudo conectar con Microsoft Graph para descargar desde OneDrive: ${error.cause?.code || error.code || error.message}`);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "No se pudo descargar archivo desde OneDrive.");
  }
  return Buffer.from(await response.arrayBuffer());
}

function extensionForMimeType(mimeType) {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized.includes("zip")) return "zip";
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  return "pdf";
}

function splitEmails(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(/[;,]/);
  return values.map((item) => String(item || "").trim()).filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
}

async function sendMail({ to, cc, subject, html, attachmentName, attachmentBytes, inlineAttachments = [] }) {
  const token = await graphAccessToken();
  const fromUser = requiredEnv("MAIL_FROM_USER");
  const toRecipients = splitEmails(to);
  const ccRecipients = splitEmails(cc);
  if (!toRecipients.length) throw new Error("No hay destinatarios validos.");

  const attachments = [
    ...inlineAttachments.map((attachment) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: attachment.name,
      contentType: attachment.contentType,
      contentBytes: attachment.contentBytes,
      isInline: true,
      contentId: attachment.contentId,
      contentLocation: `cid:${attachment.contentId}`
    })),
    ...(attachmentBytes ? [{
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: attachmentName,
      contentType: "application/pdf",
      contentBytes: attachmentBytes.toString("base64")
    }] : [])
  ];

  const message = {
    subject,
    body: { contentType: "HTML", content: html },
    toRecipients: toRecipients.map((address) => ({ emailAddress: { address } })),
    ccRecipients: ccRecipients.map((address) => ({ emailAddress: { address } })),
    attachments
  };

  let response;
  try {
    response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromUser)}/sendMail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message, saveToSentItems: true })
    });
  } catch (error) {
    throw new Error(`No se pudo conectar con Microsoft Graph para enviar correo: ${error.cause?.code || error.code || error.message}`);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "No se pudo enviar correo.");
  }
  return { sent: true, inlineCount: inlineAttachments.length };
}

module.exports = {
  bytesFromBase64,
  normalizedFileName,
  normalizedFolderPath,
  splitEmails,
  uploadDriveFile,
  downloadDriveItemContent,
  sendMail
};
