import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CreateUserPayload = {
  fullName: string;
  email: string;
  rut: string;
  branchId: string;
  branchIds?: string[];
  groupId: string;
  roleId: string;
  status?: "activo" | "inactivo";
  statusReason?: string;
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeEmail(value: string) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeRut(value: string) {
  return String(value ?? "").replace(/[.\-\s]/g, "").toUpperCase();
}

function formatRut(value: string) {
  const normalized = normalizeRut(value).slice(0, 9);
  if (normalized.length <= 1) return normalized;
  const body = normalized.slice(0, -1);
  const checkDigit = normalized.slice(-1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${checkDigit}`;
}

function isValidRut(value: string) {
  const normalized = normalizeRut(value);
  if (!/^\d{7,8}[\dK]$/.test(normalized)) return false;

  const body = normalized.slice(0, -1);
  const checkDigit = normalized.slice(-1);
  let multiplier = 2;
  let sum = 0;

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedValue = 11 - (sum % 11);
  const expectedDigit = expectedValue === 11 ? "0" : expectedValue === 10 ? "K" : String(expectedValue);
  return checkDigit === expectedDigit;
}

function validatePayload(payload: Partial<CreateUserPayload>) {
  const errors: string[] = [];
  const email = normalizeEmail(payload.email ?? "");
  const rut = formatRut(payload.rut ?? "");

  if (!String(payload.fullName ?? "").trim()) errors.push("Nombre requerido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Correo invalido.");
  if (!rut || !isValidRut(rut)) errors.push("RUT invalido.");
  if (!payload.branchId || !isUuid(payload.branchId)) errors.push("Sucursal invalida.");
  if (payload.branchIds && (!Array.isArray(payload.branchIds) || payload.branchIds.some((branchId) => !isUuid(branchId)))) {
    errors.push("Sucursales invalidas.");
  }
  if (!payload.groupId || !isUuid(payload.groupId)) errors.push("Grupo invalido.");
  if (!payload.roleId || !isUuid(payload.roleId)) errors.push("Cargo invalido.");
  if (payload.status && !["activo", "inactivo"].includes(payload.status)) errors.push("Estado invalido.");

  return errors;
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

async function verifyTemporaryPassword(supabaseUrl: string, anonKey: string, email: string, password: string) {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "apikey": anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return response.ok;
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

  const { data: actorProfile, error: actorError } = await userClient
    .from("profiles")
    .select("id, role_id")
    .eq("id", authData.user.id)
    .single();

  if (actorError || !actorProfile?.role_id) {
    return jsonResponse({ error: "No tienes perfil o cargo asignado para crear usuarios." }, 403);
  }

  const { data: actorRole, error: roleError } = await userClient
    .from("roles")
    .select("can_manage_users")
    .eq("id", actorProfile.role_id)
    .single();

  if (roleError || !actorRole?.can_manage_users) {
    return jsonResponse({ error: "No tienes permisos para crear usuarios." }, 403);
  }

  let payload: CreateUserPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "JSON invalido." }, 400);
  }

  const validationErrors = validatePayload(payload);
  if (validationErrors.length) return jsonResponse({ error: "Datos invalidos.", details: validationErrors }, 400);

  const email = normalizeEmail(payload.email);
  const rut = formatRut(payload.rut);
  const temporaryPassword = generateTemporaryPassword();

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: payload.fullName.trim(),
      rut,
      require_password_change: true,
    },
  });

  if (createError || !createdUser.user) {
    return jsonResponse({ error: createError?.message ?? "No se pudo crear el usuario Auth." }, 400);
  }

  const { error: passwordError } = await adminClient.auth.admin.updateUserById(createdUser.user.id, {
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      ...createdUser.user.user_metadata,
      full_name: payload.fullName.trim(),
      rut,
      require_password_change: true,
    },
  });

  if (passwordError) {
    await adminClient.auth.admin.deleteUser(createdUser.user.id);
    return jsonResponse({ error: `No se pudo aplicar la contraseña temporal: ${passwordError.message}` }, 400);
  }

  const passwordWorks = await verifyTemporaryPassword(supabaseUrl, anonKey, email, temporaryPassword);
  if (!passwordWorks) {
    await adminClient.auth.admin.deleteUser(createdUser.user.id);
    return jsonResponse({ error: "No se pudo verificar la contraseña temporal. Intenta crear el usuario nuevamente." }, 400);
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: createdUser.user.id,
    full_name: payload.fullName.trim(),
    email,
    rut,
    branch_id: payload.branchId,
    group_id: payload.groupId,
    role_id: payload.roleId,
    status: payload.status ?? "activo",
    status_reason: payload.statusReason?.trim() || "Disponible",
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(createdUser.user.id);
    return jsonResponse({ error: profileError.message }, 400);
  }

  const branchIds = Array.from(new Set([payload.branchId, ...(payload.branchIds ?? [])]));
  const { error: profileBranchesError } = await adminClient.from("profile_branches").insert(
    branchIds.map((branchId) => ({
      profile_id: createdUser.user.id,
      branch_id: branchId,
    })),
  );

  if (profileBranchesError) {
    await adminClient.from("profiles").delete().eq("id", createdUser.user.id);
    await adminClient.auth.admin.deleteUser(createdUser.user.id);
    return jsonResponse({ error: profileBranchesError.message }, 400);
  }

  return jsonResponse({
    id: createdUser.user.id,
    email,
    temporaryPassword,
    requirePasswordChange: true,
  });
});
