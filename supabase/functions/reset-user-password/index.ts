import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-setup-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ResetPasswordPayload = {
  email: string;
  password?: string;
  requirePasswordChange?: boolean;
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

function normalizeEmail(value: string) {
  return String(value ?? "").trim().toLowerCase();
}

function randomFrom(pool: string) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateTemporaryPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const special = "!#$%&*.?";
  const all = upper + lower + numbers + special;
  const chars = [
    randomFrom(upper),
    randomFrom(lower),
    randomFrom(numbers),
    randomFrom(special),
  ];

  while (chars.length < 12) chars.push(randomFrom(all));
  return chars.sort(() => Math.random() - 0.5).join("");
}

function isValidPassword(password: string) {
  return password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /[0-9]/.test(password)
    && /[^A-Za-z0-9]/.test(password);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Metodo no permitido." }, 405);

  const supabaseUrl = secretValue("SUPABASE_URL");
  const anonKey = secretValue("SUPABASE_ANON_KEY");
  const serviceRoleKey = secretValue("SUPABASE_SERVICE_ROLE_KEY");
  const setupSecret = Deno.env.get("SETUP_ADMIN_SECRET") ?? Deno.env.get("SETUP");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Variables de entorno no configuradas." }, 500);
  }

  const setupAuthorized = Boolean(setupSecret && req.headers.get("x-setup-secret") === setupSecret);

  if (!setupAuthorized) {
    if (!anonKey) return jsonResponse({ error: "Clave publica Supabase no configurada." }, 500);

    const authorization = req.headers.get("Authorization") ?? "";
    const jwt = authorization.replace("Bearer ", "").trim();
    if (!jwt) return jsonResponse({ error: "Sesion requerida." }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser(jwt);
    if (authError || !authData.user) return jsonResponse({ error: "Sesion invalida." }, 401);

    const { data: actorProfile, error: actorError } = await userClient
      .from("profiles")
      .select("id, role_id")
      .eq("id", authData.user.id)
      .single();

    if (actorError || !actorProfile?.role_id) {
      return jsonResponse({ error: "No tienes perfil o cargo asignado para generar contraseñas temporales." }, 403);
    }

    const { data: actorRole, error: roleError } = await userClient
      .from("roles")
      .select("can_manage_users")
      .eq("id", actorProfile.role_id)
      .single();

    if (roleError || !actorRole?.can_manage_users) {
      return jsonResponse({ error: "No tienes permisos para generar contraseñas temporales." }, 403);
    }
  }

  let payload: ResetPasswordPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "JSON invalido." }, 400);
  }

  const email = normalizeEmail(payload.email);
  const password = payload.password ? String(payload.password) : generateTemporaryPassword();
  const generatedTemporaryPassword = !payload.password;
  const requirePasswordChange = payload.requirePasswordChange ?? true;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: "Correo invalido." }, 400);
  }

  if (!isValidPassword(password)) {
    return jsonResponse({ error: "La contraseña debe tener 8 caracteres, mayuscula, minuscula, numero y caracter especial." }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();

  if (listError) return jsonResponse({ error: listError.message }, 400);

  const user = usersData.users.find((item) => item.email?.toLowerCase() === email);
  if (!user) return jsonResponse({ error: "Usuario no encontrado." }, 404);

  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: {
      ...user.user_metadata,
      require_password_change: requirePasswordChange,
    },
  });

  if (updateError) return jsonResponse({ error: updateError.message }, 400);

  return jsonResponse({
    id: user.id,
    email,
    updated: true,
    temporaryPassword: generatedTemporaryPassword ? password : undefined,
    requirePasswordChange,
  });
});
