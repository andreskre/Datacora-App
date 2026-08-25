import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type DeleteUserPayload = {
  userId: string;
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

async function countRows(client: ReturnType<typeof createClient>, table: string, column: string, userId: string) {
  const { count, error } = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, userId);

  if (error) throw error;
  return count ?? 0;
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

  let payload: DeleteUserPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "JSON invalido." }, 400);
  }

  const userId = String(payload.userId ?? "").trim();
  if (!isUuid(userId)) return jsonResponse({ error: "Usuario invalido." }, 400);
  if (userId === authData.user.id) return jsonResponse({ error: "No puedes eliminar tu propio usuario administrador." }, 400);

  const { data: actorProfile, error: actorError } = await userClient
    .from("profiles")
    .select("id, role_id")
    .eq("id", authData.user.id)
    .single();

  if (actorError || !actorProfile?.role_id) {
    return jsonResponse({ error: "No tienes perfil o cargo asignado para eliminar usuarios." }, 403);
  }

  const { data: actorRole, error: roleError } = await userClient
    .from("roles")
    .select("can_manage_users")
    .eq("id", actorProfile.role_id)
    .single();

  if (roleError || !actorRole?.can_manage_users) {
    return jsonResponse({ error: "No tienes permisos para eliminar usuarios." }, 403);
  }

  const { data: targetProfile, error: targetError } = await adminClient
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", userId)
    .single();

  if (targetError || !targetProfile) return jsonResponse({ error: "Usuario no encontrado." }, 404);

  const dependencies = [
    ["tasks", "assigned_to", await countRows(adminClient, "tasks", "assigned_to", userId)],
    ["tasks", "assigned_by", await countRows(adminClient, "tasks", "assigned_by", userId)],
    ["form_submissions", "technician_id", await countRows(adminClient, "form_submissions", "technician_id", userId)],
    ["sync_events", "user_id", await countRows(adminClient, "sync_events", "user_id", userId)],
  ].filter(([, , count]) => Number(count) > 0);

  if (dependencies.length) {
    return jsonResponse({
      error: "No se puede eliminar un usuario con tareas, formularios o eventos asociados. Déjalo inactivo para mantener la trazabilidad.",
      dependencies: dependencies.map(([table, column, count]) => ({ table, column, count })),
    }, 409);
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profileError) return jsonResponse({ error: profileError.message }, 400);

  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (authDeleteError) return jsonResponse({ error: authDeleteError.message }, 400);

  return jsonResponse({
    id: userId,
    email: targetProfile.email,
    deleted: true,
  });
});
