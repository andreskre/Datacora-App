import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type FcmTokenRow = {
  token: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

function base64Url(input: ArrayBuffer | string) {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string) {
  const normalized = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function createFirebaseAccessToken() {
  const clientEmail = requiredEnv("FCM_CLIENT_EMAIL");
  const privateKey = requiredEnv("FCM_PRIVATE_KEY");
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const tokenBody = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenBody.access_token) {
    throw new Error(tokenBody.error_description || tokenBody.error || "No se pudo obtener token de Firebase.");
  }
  return String(tokenBody.access_token);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization") ?? "";
    const userJwt = authorization.replace(/^Bearer\s+/i, "");
    if (!userJwt) return jsonResponse({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await adminClient.auth.getUser(userJwt);
    if (authError || !authData.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { taskId } = await req.json();
    if (!taskId) return jsonResponse({ error: "taskId requerido" }, 400);

    const { data: task, error: taskError } = await adminClient
      .from("tasks")
      .select(`
        id,
        task_type,
        priority,
        assigned_to,
        establishments (
          rbd,
          name,
          commune
        )
      `)
      .eq("id", taskId)
      .single();

    if (taskError || !task) return jsonResponse({ error: "Tarea no encontrada" }, 404);

    const { data: tokens, error: tokensError } = await adminClient
      .from("device_push_tokens")
      .select("token")
      .eq("user_id", task.assigned_to)
      .eq("is_active", true);

    if (tokensError) throw tokensError;
    if (!tokens?.length) return jsonResponse({ sent: 0, skipped: "Sin dispositivos registrados" });

    const accessToken = await createFirebaseAccessToken();
    const projectId = requiredEnv("FCM_PROJECT_ID");
    const establishment = Array.isArray(task.establishments) ? task.establishments[0] : task.establishments;
    const rbd = establishment?.rbd ? String(establishment.rbd) : "";
    const title = task.priority === "high" ? "Nueva emergencia asignada" : "Nueva tarea asignada";
    const body = rbd
      ? `RBD ${rbd} - ${establishment?.name ?? "establecimiento"}`
      : "Revisa tus tareas pendientes en Datacora.";

    let sent = 0;
    let failed = 0;
    const invalidTokens: string[] = [];

    await Promise.all((tokens as FcmTokenRow[]).map(async ({ token }) => {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data: {
              type: "task_assigned",
              taskId: String(task.id),
              rbd,
              route: "tasks",
            },
            android: {
              priority: "high",
              notification: {
                channel_id: "datacora_tasks",
                sound: "default",
              },
            },
          },
        }),
      });

      const responseText = await response.text();
      if (response.ok) {
        sent += 1;
        return;
      }
      failed += 1;
      if (responseText.includes("UNREGISTERED")) invalidTokens.push(token);
      console.warn("FCM send failed", response.status, responseText);
    }));

    if (invalidTokens.length) {
      await adminClient
        .from("device_push_tokens")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in("token", invalidTokens);
    }

    return jsonResponse({ sent, failed });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Error enviando notificación" }, 500);
  }
});
