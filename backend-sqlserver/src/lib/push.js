const crypto = require("crypto");
const { sql } = require("./db");

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable ${name}`);
  return value;
}

function base64Url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createFirebaseAccessToken() {
  const clientEmail = requiredEnv("FCM_CLIENT_EMAIL");
  const privateKey = requiredEnv("FCM_PRIVATE_KEY").replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }))}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), privateKey);
  const assertion = `${unsigned}.${base64Url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) throw new Error(body.error_description || body.error || "No se pudo obtener token de Firebase.");
  return body.access_token;
}

function isInvalidTokenResponse(text) {
  return text.includes("UNREGISTERED")
    || text.includes("registration token is not a valid FCM")
    || text.includes("Requested entity was not found");
}

async function sendPushToUserIds(db, userIds, message) {
  const distinctUserIds = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (!distinctUserIds.length) return { sent: 0, failed: 0, tokenCount: 0, skipped: "Sin destinatarios" };

  const tokensResult = await db.request()
    .input("userIds", sql.NVarChar(sql.MAX), JSON.stringify(distinctUserIds))
    .query(`
      select token
      from dbo.device_push_tokens
      where is_active = 1
        and user_id in (select try_convert(uniqueidentifier, value) from openjson(@userIds))
    `);
  const tokens = tokensResult.recordset;
  if (!tokens.length) return { sent: 0, failed: 0, tokenCount: 0, skipped: "Sin dispositivos registrados" };

  const accessToken = await createFirebaseAccessToken();
  const projectId = requiredEnv("FCM_PROJECT_ID");
  let sent = 0;
  let failed = 0;
  const invalidTokens = [];

  await Promise.all(tokens.map(async ({ token }) => {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: message.title, body: message.body },
          data: message.data || {},
          android: {
            priority: "high",
            notification: { channel_id: "datacora_tasks", sound: "default" }
          }
        }
      })
    });
    const text = await response.text();
    if (response.ok) sent += 1;
    else {
      failed += 1;
      if (isInvalidTokenResponse(text)) invalidTokens.push(token);
      console.warn("FCM send failed", response.status, text);
    }
  }));

  if (invalidTokens.length) {
    await db.request()
      .input("tokens", sql.NVarChar(sql.MAX), JSON.stringify(invalidTokens))
      .query(`
        update dbo.device_push_tokens
        set is_active = 0, updated_at = sysdatetimeoffset()
        where token in (select value from openjson(@tokens))
      `);
  }

  return { sent, failed, tokenCount: tokens.length };
}

module.exports = { sendPushToUserIds };
