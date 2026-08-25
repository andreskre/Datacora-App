import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AnswerValue = string | number | boolean | null | Record<string, unknown>;

type SubmissionAnswer = {
  code: string;
  label: string;
  value: AnswerValue;
  type?: "text" | "number" | "date" | "boolean" | "single_choice" | "observation";
};

type SubmissionItem = {
  label?: string;
  answers: SubmissionAnswer[];
};

type SubmissionSection = {
  code: string;
  title: string;
  items?: SubmissionItem[];
  answers?: SubmissionAnswer[];
};

type SubmitFormPayload = {
  localUuid?: string;
  task: {
    id?: string;
    type: string;
    rbd: string;
    establishment: string;
    description?: string;
    dueDate?: string;
    priority?: string;
  };
  sections: SubmissionSection[];
  signatures?: Array<{
    kind: "pae_manager" | "technician";
    label: string;
    dataUrl: string;
  }>;
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

function isUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeCode(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "respuesta";
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

function taskStatus(value?: string) {
  const normalized = normalizeCode(value ?? "");
  if (normalized === "urgente") return "urgente";
  if (normalized === "completada") return "completada";
  if (normalized === "cancelada") return "cancelada";
  return "pendiente";
}

function taskPriority(value?: string) {
  const normalized = normalizeCode(value ?? "");
  if (normalized === "alta") return "alta";
  if (normalized === "baja") return "baja";
  return "media";
}

function answerType(answer: SubmissionAnswer) {
  if (answer.type) return answer.type;
  if (typeof answer.value === "number") return "number";
  if (typeof answer.value === "boolean") return "boolean";
  if (typeof answer.value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(answer.value)) return "date";
  if (typeof answer.value === "object") return "observation";
  return "text";
}

function answerColumns(answer: SubmissionAnswer) {
  const value = answer.value;
  const requestedType = answerType(answer);
  const type = requestedType === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) ? "text" : requestedType;
  const columns: Record<string, unknown> = {
    answer_type: type,
    answer_text: null,
    answer_number: null,
    answer_date: null,
    answer_boolean: null,
    answer_json: {},
  };

  if (type === "number") columns.answer_number = Number(value);
  else if (type === "date") columns.answer_date = String(value);
  else if (type === "boolean") columns.answer_boolean = Boolean(value);
  else if (typeof value === "object" && value !== null) columns.answer_json = value;
  else columns.answer_text = value === null || value === undefined ? "" : String(value);

  return columns;
}

function submissionCompletedAtFromPayload(payload: SubmitFormPayload) {
  for (const section of payload.sections ?? []) {
    for (const answer of section.answers ?? []) {
      if (normalizeCode(answer.code || answer.label) !== "submit_captured_at") continue;
      const date = new Date(String(answer.value ?? ""));
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }

    for (const item of section.items ?? []) {
      for (const answer of item.answers ?? []) {
        if (normalizeCode(answer.code || answer.label) !== "submit_captured_at") continue;
        const date = new Date(String(answer.value ?? ""));
        if (!Number.isNaN(date.getTime())) return date.toISOString();
      }
    }
  }

  return new Date().toISOString();
}

async function single<T>(query: PromiseLike<{ data: T | null; error: unknown }>) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    return String(value.message ?? value.details ?? value.hint ?? value.code ?? JSON.stringify(value));
  }
  return String(error);
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

  let payload: SubmitFormPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "JSON invalido." }, 400);
  }

  if (!payload.task?.rbd || !payload.task?.type || !Array.isArray(payload.sections)) {
    return jsonResponse({ error: "Payload de formulario incompleto." }, 400);
  }

  try {
    const establishment = await single(adminClient
      .from("establishments")
      .select("id, rbd, name")
      .eq("rbd", String(payload.task.rbd))
      .single());
    if (!establishment) return jsonResponse({ error: `RBD ${payload.task.rbd} no existe en Supabase.` }, 404);

    const templateRows = await single(adminClient
      .from("form_templates")
      .select("id, code, visit_type")
      .eq("visit_type", payload.task.type)
      .limit(1));
    const template = Array.isArray(templateRows) ? templateRows[0] : templateRows;
    if (!template) return jsonResponse({ error: `No existe plantilla para ${payload.task.type}.` }, 404);

    let taskId = isUuid(payload.task.id) ? payload.task.id : "";
    if (!taskId) {
      const insertedTask = await single(adminClient
        .from("tasks")
        .insert({
          task_type: payload.task.type,
          establishment_id: establishment.id,
          assigned_to: authData.user.id,
          assigned_by: authData.user.id,
          form_template_id: template.id,
          description: payload.task.description ?? "Formulario enviado desde Datácora.",
          due_date: payload.task.dueDate || new Date().toISOString().slice(0, 10),
          status: taskStatus(payload.task.priority) === "urgente" ? "urgente" : "pendiente",
          priority: taskPriority(payload.task.priority),
          sync_state: "pending",
        })
        .select("id")
        .single());
      taskId = insertedTask.id;
    }

    const localUuid = isUuid(payload.localUuid) ? payload.localUuid : crypto.randomUUID();
    const existingSubmission = await single(adminClient
      .from("form_submissions")
      .select("id, task_id, submitted_at, folio")
      .eq("local_uuid", localUuid)
      .maybeSingle());

    if (existingSubmission) {
      const { count: existingAnswerCount } = await adminClient
        .from("form_answers")
        .select("id", { count: "exact", head: true })
        .eq("submission_id", existingSubmission.id);

      return jsonResponse({
        ok: true,
        duplicate: true,
        submissionId: existingSubmission.id,
        folio: existingSubmission.folio,
        taskId: existingSubmission.task_id,
        submittedAt: existingSubmission.submitted_at,
        answerCount: existingAnswerCount ?? 1,
        itemCount: 0,
        attachmentCount: 0,
        warnings: [],
      });
    }

    const completedAt = submissionCompletedAtFromPayload(payload);
    const submission = await single(adminClient
      .from("form_submissions")
      .insert({
        task_id: taskId,
        technician_id: authData.user.id,
        status: "submitted",
        local_uuid: localUuid,
        submitted_at: completedAt,
        synced_at: new Date().toISOString(),
      })
      .select("id, folio, submitted_at")
      .single());

    const sectionCache = new Map<string, { id: string; code: string }>();
    const questionCache = new Map<string, { id: string; answer_type: string }>();

    async function ensureSection(section: SubmissionSection, sortOrder: number) {
      if (sectionCache.has(section.code)) return sectionCache.get(section.code)!;

      let row = await single(adminClient
        .from("form_sections")
        .select("id, code")
        .eq("template_id", template.id)
        .eq("code", section.code)
        .maybeSingle());

      if (!row) {
        row = await single(adminClient
          .from("form_sections")
          .insert({
            template_id: template.id,
            code: section.code,
            title: section.title,
            sort_order: sortOrder,
          })
          .select("id, code")
          .single());
      }

      sectionCache.set(section.code, row);
      return row;
    }

    async function ensureQuestion(sectionId: string, answer: SubmissionAnswer, sortOrder: number) {
      const code = normalizeCode(answer.code || answer.label);
      const cacheKey = `${sectionId}:${code}`;
      if (questionCache.has(cacheKey)) return questionCache.get(cacheKey)!;

      let row = await single(adminClient
        .from("form_questions")
        .select("id, answer_type")
        .eq("section_id", sectionId)
        .eq("code", code)
        .maybeSingle());

      if (!row) {
        row = await single(adminClient
          .from("form_questions")
          .insert({
            section_id: sectionId,
            code,
            label: answer.label || code,
            answer_type: answerType(answer),
            sort_order: sortOrder,
            is_required: false,
          })
          .select("id, answer_type")
          .single());
      }

      questionCache.set(cacheKey, row);
      return row;
    }

    let answerCount = 0;
    let itemCount = 0;
    let attachmentCount = 0;
    const warnings: string[] = [];

    async function insertAnswer(sectionId: string, answer: SubmissionAnswer, itemId: string | null, sortOrder: number) {
      const question = await ensureQuestion(sectionId, answer, sortOrder);
      await single(adminClient
        .from("form_answers")
        .insert({
          submission_id: submission.id,
          response_item_id: itemId,
          section_id: sectionId,
          question_id: question.id,
          ...answerColumns(answer),
        })
        .select("id")
        .single());
      answerCount += 1;
    }

    for (const [sectionIndex, section] of payload.sections.entries()) {
      const sectionRow = await ensureSection(section, sectionIndex + 1);
      let sortOrder = 1;

      for (const answer of section.answers ?? []) {
        if (answer.value === "" || answer.value === null || answer.value === undefined) continue;
        await insertAnswer(sectionRow.id, answer, null, sortOrder++);
      }

      for (const [itemIndex, item] of (section.items ?? []).entries()) {
        const responseItem = await single(adminClient
          .from("response_items")
          .insert({
            submission_id: submission.id,
            section_id: sectionRow.id,
            item_index: itemIndex + 1,
            item_label: item.label ?? `${section.title} ${itemIndex + 1}`,
          })
          .select("id")
          .single());
        itemCount += 1;

        for (const answer of item.answers ?? []) {
          if (answer.value === "" || answer.value === null || answer.value === undefined) continue;
          await insertAnswer(sectionRow.id, answer, responseItem.id, sortOrder++);
        }
      }
    }

    for (const signature of payload.signatures ?? []) {
      if (!signature.dataUrl) continue;
      try {
        await single(adminClient
          .from("form_attachments")
          .insert({
            submission_id: submission.id,
            file_kind: "signature",
            storage_provider: "inline",
            storage_path: `inline-signature/${submission.id}/${signature.kind}.png`,
            mime_type: "image/png",
            file_name: `${signature.kind}.png`,
            metadata: {
              label: signature.label,
              data_url: signature.dataUrl,
            },
          })
          .select("id")
          .single());
        attachmentCount += 1;
      } catch (error) {
        warnings.push(`No se pudo guardar firma ${signature.kind}: ${errorMessage(error)}`);
      }
    }

    try {
      const { error: taskUpdateError } = await adminClient
        .from("tasks")
        .update({
          status: "completada",
          sync_state: "synced",
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (taskUpdateError) throw taskUpdateError;
    } catch (error) {
      warnings.push(`No se pudo actualizar la tarea ${taskId}: ${errorMessage(error)}`);
    }

    return jsonResponse({
      submissionId: submission.id,
      folio: submission.folio,
      taskId,
      submittedAt: submission.submitted_at,
      sectionCount: payload.sections.length,
      itemCount,
      answerCount,
      attachmentCount,
      warnings,
      submitted: true,
    });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 400);
  }
});
