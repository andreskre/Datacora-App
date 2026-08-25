const express = require("express");
const crypto = require("crypto");
const { pool, sql, transaction, request } = require("../lib/db");
const { asyncHandler, httpError, ok } = require("../lib/http");
const { requireAuth } = require("../middleware/auth");
const { sendPushToUserIds } = require("../lib/push");
const { runScheduledNotificationsOnce } = require("../lib/scheduledNotifications");

const router = express.Router();

function isUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value).trim());
}

function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isoDateOnly(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function localTodayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function daysUntilIsoDate(dateIso) {
  const date = new Date(`${dateIso}T00:00:00Z`);
  const today = new Date(`${localTodayIso()}T00:00:00Z`);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

const PROCEDURE_TARGET_ROLES = new Set(["technician", "jm", "prevention", "admin"]);

function normalizeProcedureTargetRoles(value) {
  const rawValue = String(typeof value === "string" ? value : JSON.stringify(value || ""));
  const inferred = [];
  const normalizedRaw = rawValue.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalizedRaw.includes("jm") || normalizedRaw.includes("jefe") || normalizedRaw.includes("mantencion")) inferred.push("jm");
  if (normalizedRaw.includes("tecnico") || normalizedRaw.includes("technician") || normalizedRaw.includes("multifuncional")) inferred.push("technician");
  if (normalizedRaw.includes("prevencion") || normalizedRaw.includes("prevention")) inferred.push("prevention");
  if (normalizedRaw.includes("admin") || normalizedRaw.includes("nacional")) inferred.push("admin");
  const roles = parseJsonArray(value)
    .map((role) => String(role || "").trim().toLowerCase())
    .filter((role) => PROCEDURE_TARGET_ROLES.has(role));
  return Array.from(new Set([...roles, ...inferred]));
}

function procedureTargetRoleForUser(user = {}) {
  const roleName = String(user.roleName || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const fullName = String(user.fullName || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const email = String(user.email || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (user.canManageUsers || user.canViewNationalData || roleName.includes("admin") || roleName.includes("nacional")) return "admin";
  if (
    user.canAssignTasks
    || roleName.includes("jefe")
    || roleName.includes("mantencion")
    || fullName.includes("jefe")
    || fullName.includes("mantencion")
    || email.startsWith("jm.")
  ) return "jm";
  if (roleName.includes("prevencion") || fullName.includes("prevencion")) return "prevention";
  if (roleName.includes("tecnico") || roleName.includes("multifuncional") || fullName.includes("tecnico") || fullName.includes("multifuncional")) return "technician";
  return "technician";
}

function procedureTargetAccessFlags(user = {}) {
  const role = procedureTargetRoleForUser(user);
  return {
    isAdminTarget: role === "admin",
    isJmTarget: role === "jm",
    isPreventionTarget: role === "prevention",
    isTechnicianTarget: role === "technician"
  };
}

function maintenanceAlertRow(row = {}) {
  return {
    id: row.id,
    type: row.alert_type,
    status: row.status,
    severity: row.severity,
    title: row.title,
    body: row.body || "",
    dueDate: row.due_date,
    daysToExpire: row.days_to_expire,
    replacementExpirationDate: row.replacement_expiration_date || null,
    resolvedDaysToExpire: row.resolved_days_to_expire ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    taskId: row.task_id,
    submissionId: row.submission_id,
    reportedBy: row.reported_by,
    reportedByName: row.reported_by_name || "",
    branchId: row.branch_id,
    branchName: row.branch_name || "",
    establishmentId: row.establishment_id,
    rbd: row.rbd,
    establishmentName: row.establishment_name || "",
    commune: row.commune || "",
    metadata: parseJsonObject(row.metadata)
  };
}

function statusToDb(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["urgente", "completada", "cancelada"].includes(normalized)) return normalized;
  return "pendiente";
}

function priorityToDb(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["alta", "baja"].includes(normalized)) return normalized;
  return "media";
}

function sectionDefinitions() {
  return [
    { id: "heat", title: "Calor", sortOrder: 1, minimum: 2, baseRequired: true, baseCritical: true },
    { id: "electricity", title: "Electricidad", sortOrder: 2, minimum: 6, baseRequired: true, baseCritical: true },
    { id: "cold", title: "Frio", sortOrder: 3 },
    { id: "vectors", title: "Vectores", sortOrder: 4 },
    { id: "water", title: "Agua", sortOrder: 5 },
    { id: "infrastructure", title: "Infraestructura", sortOrder: 6 },
    { id: "pae-manager", title: "Encargado PAE", sortOrder: 7, baseRequired: true },
    { id: "mpa", title: "MPA", sortOrder: 8 },
    { id: "service-yard", title: "Patio Servicio", sortOrder: 9 },
    { id: "rbd-checkers", title: "Verificadores RBD", sortOrder: 10 },
    { id: "used-items", title: "Articulos usados", sortOrder: 11 }
  ];
}

async function queryRows(query, inputs = {}) {
  const db = await pool();
  const req = db.request();
  Object.entries(inputs).forEach(([key, [type, value]]) => req.input(key, type, value));
  const result = await req.query(query);
  return result.recordset;
}

function profileRow(row, branchRows = []) {
  const branches = branchRows.filter((branch) => branch.profile_id === row.id);
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    rut: row.rut || "",
    status: row.status,
    status_reason: row.status_reason,
    branch_id: row.branch_id,
    group_id: row.group_id,
    role_id: row.role_id,
    last_login_at: row.last_login_at || null,
    branches: row.branch_id ? { id: row.branch_id, name: row.branch_name } : null,
    groups: row.group_id ? { id: row.group_id, name: row.group_name } : null,
    roles: row.role_id ? {
      id: row.role_id,
      name: row.role_name,
      can_manage_users: Boolean(row.can_manage_users),
      can_assign_tasks: Boolean(row.can_assign_tasks),
      can_view_notifications: Boolean(row.can_view_notifications),
      can_view_national_data: Boolean(row.can_view_national_data)
    } : null,
    profile_branches: branches.map((branch) => ({ branches: { id: branch.branch_id, name: branch.branch_name } })),
    require_password_change: Boolean(row.require_password_change)
  };
}

async function ensureTemplateAndSections(tx, visitType) {
  let template = await request(tx)
    .input("visitType", sql.NVarChar(120), visitType)
    .query("select top 1 id from dbo.form_templates where visit_type = @visitType order by created_at");
  let templateId = template.recordset[0]?.id;
  if (!templateId) {
    templateId = crypto.randomUUID();
    await request(tx)
      .input("id", sql.UniqueIdentifier, templateId)
      .input("code", sql.NVarChar(80), visitType.toLowerCase().replace(/[^a-z0-9]+/gi, "_"))
      .input("visitType", sql.NVarChar(120), visitType)
      .input("title", sql.NVarChar(200), visitType)
      .query("insert into dbo.form_templates (id, code, visit_type, title) values (@id, @code, @visitType, @title)");
  }

  const sectionRows = await request(tx)
    .input("templateId", sql.UniqueIdentifier, templateId)
    .query("select id, code from dbo.form_sections where template_id = @templateId");
  const byCode = new Map(sectionRows.recordset.map((row) => [row.code, row]));

  for (const definition of sectionDefinitions()) {
    if (byCode.has(definition.id)) continue;
    const id = crypto.randomUUID();
    await request(tx)
      .input("id", sql.UniqueIdentifier, id)
      .input("templateId", sql.UniqueIdentifier, templateId)
      .input("code", sql.NVarChar(80), definition.id)
      .input("title", sql.NVarChar(200), definition.title)
      .input("sortOrder", sql.Int, definition.sortOrder)
      .query("insert into dbo.form_sections (id, template_id, code, title, sort_order) values (@id, @templateId, @code, @title, @sortOrder)");
    byCode.set(definition.id, { id, code: definition.id });
  }

  return { templateId, sectionsByCode: byCode };
}

function taskResponseFromRow(row, sectionConfig = {}) {
  return {
    id: row.id,
    rbd: row.rbd,
    type: row.task_type,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to_full_name || "",
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    description: row.description || "",
    sectionConfig: {
      requiredSections: sectionConfig.requiredSections || [],
      criticalSections: sectionConfig.criticalSections || [],
      sectionMinimums: sectionConfig.sectionMinimums || {}
    }
  };
}

async function taskResponseById(taskId) {
  const rows = await queryRows(`
    select
      t.id,
      t.task_type,
      t.description,
      t.due_date,
      t.status,
      t.priority,
      t.assigned_to,
      assigned_to_profile.full_name as assigned_to_full_name,
      e.rbd
    from dbo.tasks t
    join dbo.establishments e on e.id = t.establishment_id
    left join dbo.profiles assigned_to_profile on assigned_to_profile.id = t.assigned_to
    where t.id = @taskId
  `, { taskId: [sql.UniqueIdentifier, taskId] });
  if (!rows[0]) return null;
  const requirements = await taskRequirements();
  return taskResponseFromRow(rows[0], requirements[taskId] || {});
}

async function findOpenTaskForEstablishment(tx, establishmentId, excludeTaskId = null) {
  const result = await request(tx)
    .input("establishmentId", sql.UniqueIdentifier, establishmentId)
    .input("excludeTaskId", sql.UniqueIdentifier, excludeTaskId || null)
    .query(`
      select top 1
        t.id,
        t.task_type,
        t.description,
        t.due_date,
        t.assigned_to,
        assigned_to_profile.full_name as assigned_to_full_name,
        t.priority,
        t.status,
        e.rbd
      from dbo.tasks t with (updlock, holdlock)
      join dbo.establishments e on e.id = t.establishment_id
      left join dbo.profiles assigned_to_profile on assigned_to_profile.id = t.assigned_to
      where t.establishment_id = @establishmentId
        and lower(isnull(t.status, N'')) not in (N'completada', N'cancelada')
        and (@excludeTaskId is null or t.id <> @excludeTaskId)
      order by t.created_at desc
    `);
  return result.recordset[0] || null;
}

function openTaskConflict(row) {
  throw httpError(409, "Ya existe una visita programada para este RBD.", {
    existingTask: taskResponseFromRow(row)
  });
}

function combinedTaskDescription(existingDescription = "", incomingDescription = "") {
  const existing = String(existingDescription || "").trim();
  const incoming = String(incomingDescription || "").trim();
  if (!existing) return incoming;
  if (!incoming || existing.toLowerCase().includes(incoming.toLowerCase())) return existing;
  return `${existing}\n\n--- Nueva contingencia incorporada ---\n${incoming}`;
}

function normalizedSectionConfig(sectionConfig = {}) {
  const requiredSections = Array.isArray(sectionConfig.requiredSections) ? sectionConfig.requiredSections : [];
  const criticalSections = Array.isArray(sectionConfig.criticalSections) ? sectionConfig.criticalSections : [];
  const sectionMinimums = sectionConfig.sectionMinimums && typeof sectionConfig.sectionMinimums === "object"
    ? sectionConfig.sectionMinimums
    : {};
  return {
    requiredSections: Array.from(new Set(requiredSections.map((code) => String(code || "").trim()).filter(Boolean))),
    criticalSections: Array.from(new Set(criticalSections.map((code) => String(code || "").trim()).filter(Boolean))),
    sectionMinimums
  };
}

function mergeSectionConfig(existingConfig = {}, incomingConfig = {}) {
  const existing = normalizedSectionConfig(existingConfig);
  const incoming = normalizedSectionConfig(incomingConfig);
  return {
    requiredSections: Array.from(new Set([...existing.requiredSections, ...incoming.requiredSections])),
    criticalSections: Array.from(new Set([...existing.criticalSections, ...incoming.criticalSections])),
    sectionMinimums: { ...existing.sectionMinimums, ...incoming.sectionMinimums }
  };
}

async function replaceTaskSectionConfig(tx, taskId, sectionsByCode, sectionConfig = {}) {
  const config = normalizedSectionConfig(sectionConfig);
  await request(tx)
    .input("taskId", sql.UniqueIdentifier, taskId)
    .query("delete from dbo.task_required_sections where task_id = @taskId");

  const configured = Array.from(new Set([
    ...config.requiredSections,
    ...config.criticalSections,
    ...Object.keys(config.sectionMinimums)
  ]));

  for (const code of configured) {
    const section = sectionsByCode.get(code);
    if (!section) continue;
    const parsedMinimum = Number(config.sectionMinimums?.[code]);
    await request(tx)
      .input("taskId", sql.UniqueIdentifier, taskId)
      .input("sectionId", sql.UniqueIdentifier, section.id)
      .input("isRequired", sql.Bit, config.requiredSections.includes(code))
      .input("isCritical", sql.Bit, config.criticalSections.includes(code))
      .input("minRequired", sql.Int, Number.isFinite(parsedMinimum) && parsedMinimum > 0 ? Math.trunc(parsedMinimum) : null)
      .query(`
        insert into dbo.task_required_sections (task_id, section_id, is_required, is_critical, min_required)
        values (@taskId, @sectionId, @isRequired, @isCritical, @minRequired)
      `);
  }
}

function plannedDetailsForTask(taskId, payload, userId) {
  return {
    id: taskId,
    task_type: payload.type || "Mutualidad",
    description: payload.description || "",
    due_date: payload.dueDate || payload.dueDateIso || "",
    status: statusToDb(payload.status),
    priority: priorityToDb(payload.priority),
    assigned_to: payload.assignedTo || "",
    assigned_by: userId
  };
}

async function taskRowsForUser(user) {
  const canSeeAll = user.canManageUsers || user.canViewNationalData;
  return queryRows(`
    select
      t.id,
      t.task_type,
      t.description,
      t.due_date,
      t.status,
      t.priority,
      t.sync_state,
      t.assigned_at,
      t.assigned_to,
      t.assigned_by,
      assigned_to_profile.full_name as assigned_to_full_name,
      assigned_to_profile.email as assigned_to_email,
      assigned_by_profile.full_name as assigned_by_full_name,
      assigned_by_profile.email as assigned_by_email,
      e.rbd,
      e.name as establishment_name,
      e.branch_id,
      branch.name as branch_name,
      e.commune,
      e.institution_type,
      e.address,
      e.latitude,
      e.longitude,
      fs.id as submission_id,
      fs.folio,
      fs.submitted_at,
      latest_pdf.external_url as pdf_url,
      latest_pdf.file_name as pdf_file_name,
      latest_pdf.external_id as pdf_external_id
    from dbo.tasks t
    join dbo.establishments e on e.id = t.establishment_id
    left join dbo.branches branch on branch.id = e.branch_id
    left join dbo.profiles assigned_to_profile on assigned_to_profile.id = t.assigned_to
    left join dbo.profiles assigned_by_profile on assigned_by_profile.id = t.assigned_by
    left join dbo.form_submissions fs on fs.task_id = t.id
    outer apply (
      select top 1 external_url, file_name, external_id
      from dbo.form_attachments fa
      where fa.submission_id = fs.id
        and fa.file_kind in ('onedrive_pdf', 'onedrive_bitacora_pdf', 'onedrive_internal_pdf', 'onedrive_photos_zip', 'onedrive_photo')
      order by fa.created_at desc
    ) latest_pdf
    where (
      @canSeeAll = 1
      or t.assigned_to = @userId
      or exists (
        select 1
        from dbo.profile_branches pb
        where pb.profile_id = @userId
          and pb.branch_id = e.branch_id
      )
    )
    order by t.created_at desc
  `, {
    canSeeAll: [sql.Bit, Boolean(canSeeAll)],
    userId: [sql.UniqueIdentifier, user.id]
  });
}

function incidentRow(row) {
  const task = row.task_id ? {
    id: row.task_id,
    task_type: row.task_type,
    description: row.task_description,
    due_date: row.due_date,
    status: row.task_status,
    priority: row.task_priority,
    sync_state: row.sync_state,
    assigned_at: row.assigned_at,
    assigned_to: row.assigned_to,
    assigned_by: row.assigned_by,
    assigned_to_profile: { full_name: row.technician_name, email: row.technician_email },
    assigned_by_profile: { full_name: row.planner_name, email: row.planner_email },
    establishments: {
      rbd: row.rbd,
      name: row.establishment_name,
      commune: row.commune,
      institution_type: row.institution_type,
      address: row.address
    }
  } : null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    photos: parseJsonArray(row.photos),
    severity: row.severity,
    incident_type: row.incident_type,
    status: row.task_status === "completada" ? "Resuelta" : row.status,
    task_id: row.task_id || "",
    planned_details: parseJsonObject(row.planned_details) || task,
    created_at: row.created_at,
    branches: { id: row.branch_id, name: row.branch_name },
    establishments: {
      id: row.establishment_id,
      rbd: row.rbd,
      name: row.establishment_name,
      commune: row.commune,
      institution_type: row.institution_type,
      address: row.address
    },
    profiles: { id: row.reported_by, full_name: row.reporter_name, email: row.reporter_email }
  };
}

function appMessageRow(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    scope: row.scope,
    branch_id: row.branch_id || "",
    branch_name: row.branch_name || "",
    sender_id: row.sender_id,
    sender_name: row.sender_name || "",
    sender_email: row.sender_email || "",
    recipient_count: Number(row.recipient_count || 0),
    read_count: Number(row.read_count || 0),
    read_at: row.read_at || "",
    created_at: row.created_at
  };
}

function appMessageReplyRow(row) {
  return {
    id: row.id,
    message_id: row.message_id,
    sender_id: row.sender_id,
    sender_name: row.sender_name || "",
    sender_email: row.sender_email || "",
    body: row.body,
    created_at: row.created_at
  };
}

function procedureRow(row, includeFile = false) {
  const item = {
    id: row.id,
    title: row.title,
    description: row.description || "",
    category: row.category || "",
    file_name: row.file_name || "",
    file_mime: row.file_mime || "",
    external_url: row.external_url || "",
    target_roles: normalizeProcedureTargetRoles(row.target_roles || '["technician","jm"]'),
    created_by: row.created_by,
    author_name: row.author_name || "",
    author_email: row.author_email || "",
    created_at: row.created_at,
    updated_at: row.updated_at || "",
    has_file: Boolean(row.file_data_length || row.has_file)
  };
  if (includeFile && row.file_data) {
    item.file_base64 = Buffer.from(row.file_data).toString("base64");
  }
  return item;
}

function canSendAppMessages(user) {
  return Boolean(user?.canManageUsers || user?.canViewNationalData);
}

function canManageProcedures(user) {
  return Boolean(user?.canManageUsers || user?.canViewNationalData);
}

function procedureAudienceWhereClause(alias = "p", roleAlias = "r", targetParam = "@targetRoles") {
  return `
    (
      ${targetParam} like '%"admin"%' and (${roleAlias}.can_manage_users = 1 or ${roleAlias}.can_view_national_data = 1)
    )
    or (
      ${targetParam} like '%"jm"%' and (
        isnull(${roleAlias}.can_manage_users, 0) = 0
        and isnull(${roleAlias}.can_view_national_data, 0) = 0
        and (
        ${roleAlias}.can_assign_tasks = 1
        or ${roleAlias}.name like N'%Jefe%'
        or ${roleAlias}.name like N'%Mantencion%'
        or ${roleAlias}.name like N'%Mantención%'
        or ${alias}.full_name like N'%Jefe%'
        or ${alias}.full_name like N'%Mantencion%'
        or ${alias}.full_name like N'%Mantención%'
        or ${alias}.email like N'jm.%'
        )
      )
    )
    or (
      ${targetParam} like '%"prevention"%' and (
        isnull(${roleAlias}.can_manage_users, 0) = 0
        and isnull(${roleAlias}.can_view_national_data, 0) = 0
        and (
        ${roleAlias}.name like N'%Prevencion%'
        or ${roleAlias}.name like N'%Prevención%'
        or ${alias}.full_name like N'%Prevencion%'
        or ${alias}.full_name like N'%Prevención%'
        )
      )
    )
    or (
      ${targetParam} like '%"technician"%' and (
        isnull(${roleAlias}.can_manage_users, 0) = 0
        and isnull(${roleAlias}.can_view_national_data, 0) = 0
        and isnull(${roleAlias}.can_assign_tasks, 0) = 0
        and (
        ${roleAlias}.name like N'%Tecnico%'
        or ${roleAlias}.name like N'%Técnico%'
        or ${roleAlias}.name like N'%Multifuncional%'
        or ${alias}.full_name like N'%Tecnico%'
        or ${alias}.full_name like N'%Técnico%'
        or ${alias}.full_name like N'%Multifuncional%'
        )
      )
    )
  `;
}

function procedureAudienceRow(row = {}) {
  return {
    user_id: row.user_id,
    full_name: row.full_name || "",
    email: row.email || "",
    role_name: row.role_name || "",
    branch_name: row.branch_name || "",
    viewed_at: row.viewed_at || "",
    downloaded_at: row.downloaded_at || "",
    has_viewed: Boolean(row.viewed_at),
    has_downloaded: Boolean(row.downloaded_at)
  };
}

async function markProcedureEvent(procedureId, userId, action = "viewed") {
  if (!isUuid(procedureId) || !isUuid(userId)) return;
  const isDownload = action === "downloaded";
  const db = await pool();
  await db.request()
    .input("procedureId", sql.UniqueIdentifier, procedureId)
    .input("userId", sql.UniqueIdentifier, userId)
    .input("isDownload", sql.Bit, isDownload)
    .query(`
      if exists (
        select 1
        from dbo.procedure_user_events
        where procedure_id = @procedureId and user_id = @userId
      )
      begin
        update dbo.procedure_user_events
        set viewed_at = coalesce(viewed_at, sysdatetimeoffset()),
            downloaded_at = case when @isDownload = 1 then coalesce(downloaded_at, sysdatetimeoffset()) else downloaded_at end,
            last_event_at = sysdatetimeoffset()
        where procedure_id = @procedureId and user_id = @userId
      end
      else
      begin
        insert into dbo.procedure_user_events (procedure_id, user_id, viewed_at, downloaded_at, last_event_at)
        values (
          @procedureId,
          @userId,
          sysdatetimeoffset(),
          case when @isDownload = 1 then sysdatetimeoffset() else null end,
          sysdatetimeoffset()
        )
      end
    `);
}

async function notifyProcedureAvailable(procedureId, title, createdBy, targetRoles = []) {
  const roles = normalizeProcedureTargetRoles(targetRoles);
  if (!roles.length) return null;
  const db = await pool();
  const recipients = await db.request()
    .input("createdBy", sql.UniqueIdentifier, createdBy)
    .input("targetRoles", sql.NVarChar(400), JSON.stringify(roles))
    .query(`
      select distinct p.id
      from dbo.profiles p
      left join dbo.roles r on r.id = p.role_id
      where p.deleted_at is null
        and p.status = 'activo'
        and p.id <> @createdBy
        and (
          (@targetRoles like '%"admin"%' and (r.can_manage_users = 1 or r.can_view_national_data = 1))
          or (@targetRoles like '%"jm"%' and (
            r.can_assign_tasks = 1
            or r.name like N'%Jefe%'
            or r.name like N'%Mantencion%'
            or r.name like N'%Mantención%'
            or p.full_name like N'%Jefe%'
            or p.full_name like N'%Mantencion%'
            or p.full_name like N'%Mantención%'
            or p.email like N'jm.%'
          ))
          or (@targetRoles like '%"prevention"%' and (
            r.name like N'%Prevencion%'
            or p.full_name like N'%Prevencion%'
          ))
          or (@targetRoles like '%"technician"%' and (
            1 = 0
          or p.full_name like N'Tecnico%'
          or p.full_name like N'Técnico%'
          or r.name like N'Tecnico%'
          or r.name like N'Técnico%'
          ))
        )
    `);
  const userIds = recipients.recordset.map((row) => row.id).filter(Boolean);
  if (!userIds.length) return null;
  return sendPushToUserIds(db, userIds, {
    title: "Nuevo procedimiento disponible",
    body: "Revisa el nuevo documento desde la pestaña Perfil.",
    data: {
      type: "procedure_created",
      route: "procedures",
      procedureId: String(procedureId),
      title: String(title || "")
    }
  });
}

async function incidentRowsForUser(user, incidentId = "") {
  return queryRows(`
    select
      incident.id,
      incident.title,
      incident.description,
      incident.photos,
      incident.severity,
      incident.incident_type,
      incident.status,
      incident.task_id,
      incident.planned_details,
      incident.created_at,
      incident.reported_by,
      branch.id as branch_id,
      branch.name as branch_name,
      establishment.id as establishment_id,
      establishment.rbd,
      establishment.name as establishment_name,
      establishment.commune,
      establishment.institution_type,
      establishment.address,
      reporter.full_name as reporter_name,
      reporter.email as reporter_email,
      task.task_type,
      task.description as task_description,
      task.due_date,
      task.status as task_status,
      task.priority as task_priority,
      task.sync_state,
      task.assigned_at,
      task.assigned_to,
      task.assigned_by,
      technician.full_name as technician_name,
      technician.email as technician_email,
      planner.full_name as planner_name,
      planner.email as planner_email
    from dbo.maintenance_incidents incident
    join dbo.branches branch on branch.id = incident.branch_id
    join dbo.establishments establishment on establishment.id = incident.establishment_id
    join dbo.profiles reporter on reporter.id = incident.reported_by
    left join dbo.tasks task on task.id = incident.task_id
    left join dbo.profiles technician on technician.id = task.assigned_to
    left join dbo.profiles planner on planner.id = task.assigned_by
    where (@incidentId = '' or convert(nvarchar(36), incident.id) = @incidentId)
      and (
        @canManageUsers = 1
        or incident.reported_by = @userId
        or (
          @canAssignTasks = 1
          and (
            establishment.branch_id = @branchId
            or exists (
              select 1
              from dbo.profile_branches pb
              where pb.profile_id = @userId
                and pb.branch_id = establishment.branch_id
            )
          )
        )
      )
    order by incident.created_at desc
  `, {
    incidentId: [sql.NVarChar(36), incidentId],
    canManageUsers: [sql.Bit, Boolean(user.canManageUsers)],
    canAssignTasks: [sql.Bit, Boolean(user.canAssignTasks)],
    userId: [sql.UniqueIdentifier, user.id],
    branchId: [sql.UniqueIdentifier, user.branchId || null]
  });
}

async function notifyIncidentToManagers(incident) {
  if (!incident?.branch_id) return;
  const db = await pool();
  const managers = await db.request()
    .input("branchId", sql.UniqueIdentifier, incident.branch_id)
    .query(`
      select distinct p.id
      from dbo.profiles p
      join dbo.roles r on r.id = p.role_id
      left join dbo.profile_branches pb on pb.profile_id = p.id
      where p.deleted_at is null
        and p.status = N'activo'
        and (r.can_assign_tasks = 1 or r.can_manage_users = 1)
        and (p.branch_id = @branchId or pb.branch_id = @branchId or r.can_view_national_data = 1)
    `);
  const title = incident.severity === "Alta" ? "Nueva incidencia urgente" : "Nueva incidencia reportada";
  const body = `RBD ${incident.rbd || ""} - ${incident.establishment_name || "establecimiento"}`.trim();
  return sendPushToUserIds(db, managers.recordset.map((row) => row.id), {
    title,
    body,
    data: {
      type: "incident_created",
      incidentId: String(incident.id),
      rbd: String(incident.rbd || ""),
      route: "incidents"
    }
  });
}

async function notifyTaskToTechnician(taskId) {
  if (!isUuid(taskId)) return;
  const db = await pool();
  const taskResult = await db.request()
    .input("taskId", sql.UniqueIdentifier, taskId)
    .query(`
      select t.id, t.task_type, t.priority, t.assigned_to, e.rbd, e.name
      from dbo.tasks t
      join dbo.establishments e on e.id = t.establishment_id
      where t.id = @taskId
    `);
  const task = taskResult.recordset[0];
  if (!task?.assigned_to) return;

  const visitType = String(task.task_type || "").trim() || "Tarea";
  const isEmergencyVisit = visitType.toLowerCase().includes("emergencia");
  const title = isEmergencyVisit ? "Nueva emergencia asignada" : "Nueva tarea asignada";
  const body = task.rbd
    ? `${visitType} · RBD ${task.rbd} - ${task.name || "establecimiento"}`
    : `${visitType} disponible en Mis tareas.`;
  return sendPushToUserIds(db, [task.assigned_to], {
    title,
    body,
    data: {
      type: "task_assigned",
      taskId: String(task.id),
      rbd: String(task.rbd || ""),
      route: "tasks"
    }
  });
}

async function notifyIncidentStatusToReporter(incidentId, status, taskId = "") {
  if (!isUuid(incidentId)) return;
  const db = await pool();
  const result = await db.request()
    .input("incidentId", sql.UniqueIdentifier, incidentId)
    .query(`
      select
        incident.id,
        incident.title,
        incident.status,
        incident.reported_by,
        establishment.rbd,
        establishment.name as establishment_name
      from dbo.maintenance_incidents incident
      join dbo.establishments establishment on establishment.id = incident.establishment_id
      where incident.id = @incidentId
    `);
  const incident = result.recordset[0];
  if (!incident?.reported_by) return;

  const shortId = String(incident.id).slice(0, 8).toUpperCase();
  const displayStatus = status === "Resuelta" ? "resuelta" : "planificada";
  const title = `Tu incidencia N° ${shortId} ha sido ${displayStatus}`;
  const body = incident.rbd
    ? `RBD ${incident.rbd} - ${incident.establishment_name || incident.title || "establecimiento"}`
    : incident.title || "Revisa el detalle en Datacora.";

  return sendPushToUserIds(db, [incident.reported_by], {
    title,
    body,
    data: {
      type: status === "Resuelta" ? "incident_resolved" : "incident_planned",
      incidentId: String(incident.id),
      taskId: String(taskId || ""),
      rbd: String(incident.rbd || ""),
      route: "incidents"
    }
  });
}

async function notifyIncidentStatusByTask(taskId, status) {
  if (!isUuid(taskId)) return;
  const db = await pool();
  const result = await db.request()
    .input("taskId", sql.UniqueIdentifier, taskId)
    .query(`
      select id
      from dbo.maintenance_incidents
      where task_id = @taskId
    `);
  const incidentId = result.recordset[0]?.id;
  if (!incidentId) return;
  return notifyIncidentStatusToReporter(incidentId, status, taskId);
}

async function taskRequirements() {
  const rows = await queryRows(`
    select trs.task_id, fs.code, trs.is_required, trs.is_critical, trs.min_required
    from dbo.task_required_sections trs
    join dbo.form_sections fs on fs.id = trs.section_id
  `);
  return rows.reduce((byTask, row) => {
    if (!byTask[row.task_id]) byTask[row.task_id] = { requiredSections: [], criticalSections: [], sectionMinimums: {} };
    if (row.is_required) byTask[row.task_id].requiredSections.push(row.code);
    if (row.is_critical) byTask[row.task_id].criticalSections.push(row.code);
    const minimum = Number(row.min_required);
    if (Number.isFinite(minimum) && minimum > 0) byTask[row.task_id].sectionMinimums[row.code] = Math.trunc(minimum);
    return byTask;
  }, {});
}

async function submissionCounts() {
  const rows = await queryRows(`
    select fs.task_id, fs.id as submission_id, fs.folio, fs.submitted_at, sec.code, count(distinct ri.id) as item_count, count(distinct fa.id) as single_answer_count
    from dbo.form_submissions fs
    left join dbo.response_items ri on ri.submission_id = fs.id
    left join dbo.form_sections sec on sec.id = ri.section_id
    left join dbo.form_answers fa on fa.submission_id = fs.id and fa.response_item_id is null
    group by fs.task_id, fs.id, fs.folio, fs.submitted_at, sec.code
  `);
  return rows.reduce((byTask, row) => {
    if (!byTask[row.task_id]) {
      byTask[row.task_id] = {
        id: row.submission_id,
        folio: row.folio,
        submitted_at: row.submitted_at,
        sectionCounts: {}
      };
    }
    if (row.code) byTask[row.task_id].sectionCounts[row.code] = Number(row.item_count || 0);
    return byTask;
  }, {});
}

router.get("/catalogs", requireAuth, asyncHandler(async (_req, res) => {
  const [branches, groups, roles] = await Promise.all([
    queryRows("select id, name from dbo.branches where is_active = 1 order by name"),
    queryRows("select id, name from dbo.groups order by name"),
    queryRows("select id, name, can_manage_users, can_assign_tasks, can_view_notifications, can_view_national_data from dbo.roles order by name")
  ]);
  ok(res, { branches, groups, roles });
}));

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const rows = await queryRows(`
    select p.*, b.name as branch_name, g.name as group_name, r.name as role_name,
      r.can_manage_users, r.can_assign_tasks, r.can_view_notifications, r.can_view_national_data
    from dbo.profiles p
    left join dbo.branches b on b.id = p.branch_id
    left join dbo.groups g on g.id = p.group_id
    left join dbo.roles r on r.id = p.role_id
    where p.id = @id and p.deleted_at is null
  `, { id: [sql.UniqueIdentifier, req.user.id] });
  const branchRows = await queryRows(`
    select pb.profile_id, pb.branch_id, b.name as branch_name
    from dbo.profile_branches pb join dbo.branches b on b.id = pb.branch_id
    where pb.profile_id = @id
  `, { id: [sql.UniqueIdentifier, req.user.id] });
  ok(res, profileRow(rows[0], branchRows));
}));

router.get("/users", requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.canManageUsers && !req.user.canAssignTasks) throw httpError(403, "No tienes permisos para ver usuarios.");
  const rows = await queryRows(`
    select p.*, b.name as branch_name, g.name as group_name, r.name as role_name,
      r.can_manage_users, r.can_assign_tasks, r.can_view_notifications, r.can_view_national_data
    from dbo.profiles p
    left join dbo.branches b on b.id = p.branch_id
    left join dbo.groups g on g.id = p.group_id
    left join dbo.roles r on r.id = p.role_id
    where p.deleted_at is null
    order by p.full_name
  `);
  const branchRows = await queryRows(`
    select pb.profile_id, pb.branch_id, b.name as branch_name
    from dbo.profile_branches pb join dbo.branches b on b.id = pb.branch_id
  `);
  ok(res, rows.map((row) => profileRow(row, branchRows)));
}));

router.patch("/users/:id", requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.canManageUsers) throw httpError(403, "No tienes permisos para actualizar usuarios.");
  const userId = req.params.id;
  if (!isUuid(userId)) throw httpError(400, "Usuario invalido.");
  const payload = req.body || {};
  await transaction(async (tx) => {
    await request(tx)
      .input("id", sql.UniqueIdentifier, userId)
      .input("fullName", sql.NVarChar(200), payload.fullName || payload.full_name || payload.nombre || null)
      .input("rut", sql.NVarChar(20), payload.rut ?? null)
      .input("email", sql.NVarChar(320), payload.email || payload.usuario || null)
      .input("branchId", sql.UniqueIdentifier, payload.branchId || payload.branch_id || null)
      .input("groupId", sql.UniqueIdentifier, payload.groupId || payload.group_id || null)
      .input("roleId", sql.UniqueIdentifier, payload.roleId || payload.role_id || null)
      .input("status", sql.NVarChar(30), payload.status || payload.estado || null)
      .input("statusReason", sql.NVarChar(200), payload.statusReason || payload.status_reason || payload.motivoEstado || null)
      .query(`
        update dbo.profiles
        set full_name = coalesce(@fullName, full_name),
            rut = coalesce(@rut, rut),
            email = coalesce(@email, email),
            branch_id = coalesce(@branchId, branch_id),
            group_id = coalesce(@groupId, group_id),
            role_id = coalesce(@roleId, role_id),
            status = coalesce(@status, status),
            status_reason = coalesce(@statusReason, status_reason),
            updated_at = sysdatetimeoffset()
        where id = @id and deleted_at is null
      `);

    if (Array.isArray(payload.branchIds)) {
      await request(tx).input("id", sql.UniqueIdentifier, userId).query("delete from dbo.profile_branches where profile_id = @id");
      for (const branchId of Array.from(new Set(payload.branchIds.filter(isUuid)))) {
        await request(tx)
          .input("profileId", sql.UniqueIdentifier, userId)
          .input("branchId", sql.UniqueIdentifier, branchId)
          .query("insert into dbo.profile_branches (profile_id, branch_id) values (@profileId, @branchId)");
      }
    }
  });
  ok(res, { updated: true, id: userId });
}));

router.get("/app-messages", requireAuth, asyncHandler(async (req, res) => {
  const sent = String(req.query.sent || "") === "1";
  if (sent && !canSendAppMessages(req.user)) throw httpError(403, "No tienes permisos para ver comunicados enviados.");

  const rows = sent
    ? await queryRows(`
        select top 100
          msg.id, msg.title, msg.body, msg.scope, msg.branch_id, branch.name as branch_name,
          msg.sender_id, sender.full_name as sender_name, sender.email as sender_email,
          msg.created_at,
          count(recipient.id) as recipient_count,
          sum(case when recipient.read_at is not null then 1 else 0 end) as read_count,
          cast(null as datetimeoffset) as read_at
        from dbo.app_messages msg
        join dbo.profiles sender on sender.id = msg.sender_id
        left join dbo.branches branch on branch.id = msg.branch_id
        left join dbo.app_message_recipients recipient on recipient.message_id = msg.id
        where msg.deleted_at is null
          and (@canSeeAll = 1 or msg.sender_id = @userId)
        group by msg.id, msg.title, msg.body, msg.scope, msg.branch_id, branch.name,
          msg.sender_id, sender.full_name, sender.email, msg.created_at
        order by msg.created_at desc
      `, {
        canSeeAll: [sql.Bit, Boolean(req.user.canManageUsers || req.user.canViewNationalData)],
        userId: [sql.UniqueIdentifier, req.user.id]
      })
    : await queryRows(`
        select top 100
          msg.id, msg.title, msg.body, msg.scope, msg.branch_id, branch.name as branch_name,
          msg.sender_id, sender.full_name as sender_name, sender.email as sender_email,
          msg.created_at,
          1 as recipient_count,
          case when recipient.read_at is not null then 1 else 0 end as read_count,
          recipient.read_at
        from dbo.app_message_recipients recipient
        join dbo.app_messages msg on msg.id = recipient.message_id
        join dbo.profiles sender on sender.id = msg.sender_id
        left join dbo.branches branch on branch.id = msg.branch_id
        where recipient.recipient_id = @userId
          and msg.deleted_at is null
        order by msg.created_at desc
      `, { userId: [sql.UniqueIdentifier, req.user.id] });

  ok(res, rows.map(appMessageRow));
}));

router.get("/app-messages/:id", requireAuth, asyncHandler(async (req, res) => {
  if (!isUuid(req.params.id)) throw httpError(400, "Comunicado invalido.");
  const rows = await queryRows(`
    select top 1
      msg.id, msg.title, msg.body, msg.scope, msg.branch_id, branch.name as branch_name,
      msg.sender_id, sender.full_name as sender_name, sender.email as sender_email,
      msg.created_at,
      count(recipient_all.id) as recipient_count,
      sum(case when recipient_all.read_at is not null then 1 else 0 end) as read_count,
      recipient.read_at
    from dbo.app_messages msg
    join dbo.profiles sender on sender.id = msg.sender_id
    left join dbo.branches branch on branch.id = msg.branch_id
    left join dbo.app_message_recipients recipient on recipient.message_id = msg.id and recipient.recipient_id = @userId
    left join dbo.app_message_recipients recipient_all on recipient_all.message_id = msg.id
    where msg.id = @messageId
      and msg.deleted_at is null
      and (@canSend = 1 or recipient.id is not null)
    group by msg.id, msg.title, msg.body, msg.scope, msg.branch_id, branch.name,
      msg.sender_id, sender.full_name, sender.email, msg.created_at, recipient.read_at
  `, {
    messageId: [sql.UniqueIdentifier, req.params.id],
    userId: [sql.UniqueIdentifier, req.user.id],
    canSend: [sql.Bit, canSendAppMessages(req.user)]
  });
  if (!rows[0]) throw httpError(404, "Comunicado no encontrado.");

  const replies = await queryRows(`
    select
      reply.id,
      reply.message_id,
      reply.sender_id,
      sender.full_name as sender_name,
      sender.email as sender_email,
      reply.body,
      reply.created_at
    from dbo.app_message_replies reply
    join dbo.profiles sender on sender.id = reply.sender_id
    where reply.message_id = @messageId
    order by reply.created_at asc
  `, { messageId: [sql.UniqueIdentifier, req.params.id] });

  ok(res, { ...appMessageRow(rows[0]), replies: replies.map(appMessageReplyRow) });
}));

router.post("/app-messages", requireAuth, asyncHandler(async (req, res) => {
  if (!canSendAppMessages(req.user)) throw httpError(403, "No tienes permisos para enviar comunicados.");
  const payload = req.body || {};
  const title = String(payload.title || "").trim();
  const body = String(payload.body || "").trim();
  const recipientId = String(payload.recipientId || payload.recipient_id || "").trim();
  const branchId = String(payload.branchId || payload.branch_id || "").trim();
  if (!title || !body) throw httpError(400, "Titulo y mensaje requeridos.");
  if (title.length > 160) throw httpError(400, "El titulo no puede superar 160 caracteres.");
  if (recipientId && !isUuid(recipientId)) throw httpError(400, "Destinatario invalido.");
  if (branchId && !isUuid(branchId)) throw httpError(400, "Zona invalida.");

  const result = await transaction(async (tx) => {
    const recipientsResult = await request(tx)
      .input("recipientId", sql.NVarChar(36), recipientId)
      .input("branchId", sql.NVarChar(36), branchId)
      .query(`
        select distinct p.id, p.full_name, p.email
        from dbo.profiles p
        join dbo.roles r on r.id = p.role_id
        where p.deleted_at is null
          and lower(isnull(p.status, 'activo')) in ('activo', 'active')
          and r.can_assign_tasks = 1
          and r.can_view_notifications = 1
          and (@recipientId = '' or convert(nvarchar(36), p.id) = @recipientId)
          and (@recipientId <> '' or @branchId = ''
            or convert(nvarchar(36), p.branch_id) = @branchId
            or exists (
              select 1
              from dbo.profile_branches pb
              where pb.profile_id = p.id
                and convert(nvarchar(36), pb.branch_id) = @branchId
            )
          )
      `);
    const recipientIds = recipientsResult.recordset.map((row) => row.id);
    if (!recipientIds.length) throw httpError(400, "No se encontraron Jefes de Mantencion destinatarios.");

    const id = crypto.randomUUID();
    await request(tx)
      .input("id", sql.UniqueIdentifier, id)
      .input("title", sql.NVarChar(160), title)
      .input("body", sql.NVarChar(sql.MAX), body)
      .input("scope", sql.NVarChar(40), recipientId ? "jefe_mantencion" : branchId ? "zona" : "jefes_mantencion")
      .input("branchId", sql.UniqueIdentifier, branchId || null)
      .input("senderId", sql.UniqueIdentifier, req.user.id)
      .query(`
        insert into dbo.app_messages (id, title, body, scope, branch_id, sender_id)
        values (@id, @title, @body, @scope, @branchId, @senderId)
      `);

    for (const recipientId of recipientIds) {
      await request(tx)
        .input("messageId", sql.UniqueIdentifier, id)
        .input("recipientId", sql.UniqueIdentifier, recipientId)
        .query(`
          insert into dbo.app_message_recipients (message_id, recipient_id)
          values (@messageId, @recipientId)
        `);
    }

    return { id, recipientIds };
  });

  sendPushToUserIds(await pool(), result.recipientIds, {
    title: "Datacora",
    body: "Tienes un nuevo mensaje.",
    data: {
      type: "app_message",
      messageId: String(result.id),
      route: "messages"
    }
  }).catch((error) => {
    console.warn("El comunicado fue creado, pero no se pudo enviar push.", error.message);
  });

  ok(res, { id: result.id, recipientCount: result.recipientIds.length });
}));

router.post("/app-messages/:id/replies", requireAuth, asyncHandler(async (req, res) => {
  if (!isUuid(req.params.id)) throw httpError(400, "Comunicado invalido.");
  const body = String(req.body?.body || "").trim();
  if (!body) throw httpError(400, "Respuesta requerida.");
  if (body.length > 1000) throw httpError(400, "La respuesta no puede superar 1000 caracteres.");

  const allowed = await queryRows(`
    select top 1 msg.id, msg.sender_id
    from dbo.app_messages msg
    left join dbo.app_message_recipients recipient on recipient.message_id = msg.id and recipient.recipient_id = @userId
    where msg.id = @messageId
      and msg.deleted_at is null
      and (@canSend = 1 or recipient.id is not null)
  `, {
    messageId: [sql.UniqueIdentifier, req.params.id],
    userId: [sql.UniqueIdentifier, req.user.id],
    canSend: [sql.Bit, canSendAppMessages(req.user)]
  });
  const message = allowed[0];
  if (!message) throw httpError(404, "Comunicado no encontrado.");

  const id = crypto.randomUUID();
  await queryRows(`
    insert into dbo.app_message_replies (id, message_id, sender_id, body)
    values (@id, @messageId, @senderId, @body)
  `, {
    id: [sql.UniqueIdentifier, id],
    messageId: [sql.UniqueIdentifier, req.params.id],
    senderId: [sql.UniqueIdentifier, req.user.id],
    body: [sql.NVarChar(sql.MAX), body]
  });

  const rows = await queryRows(`
    select
      reply.id,
      reply.message_id,
      reply.sender_id,
      sender.full_name as sender_name,
      sender.email as sender_email,
      reply.body,
      reply.created_at
    from dbo.app_message_replies reply
    join dbo.profiles sender on sender.id = reply.sender_id
    where reply.id = @id
  `, { id: [sql.UniqueIdentifier, id] });

  const recipientRows = await queryRows(`
    select recipient_id
    from dbo.app_message_recipients
    where message_id = @messageId
  `, { messageId: [sql.UniqueIdentifier, req.params.id] });
  const notifyUserIds = Array.from(new Set([
    message.sender_id,
    ...recipientRows.map((row) => row.recipient_id)
  ].filter((userId) => userId && userId !== req.user.id)));
  if (notifyUserIds.length) {
    sendPushToUserIds(await pool(), notifyUserIds, {
      title: "Datacora",
      body: "Tienes un nuevo mensaje.",
      data: {
        type: "app_message",
        messageId: String(req.params.id),
        route: "messages"
      }
    }).catch((error) => {
      console.warn("La respuesta fue creada, pero no se pudo enviar push.", error.message);
    });
  }

  ok(res, appMessageReplyRow(rows[0]));
}));

router.patch("/app-messages/:id/read", requireAuth, asyncHandler(async (req, res) => {
  if (!isUuid(req.params.id)) throw httpError(400, "Comunicado invalido.");
  await queryRows(`
    update dbo.app_message_recipients
    set read_at = coalesce(read_at, sysdatetimeoffset())
    where message_id = @messageId
      and recipient_id = @userId
  `, {
    messageId: [sql.UniqueIdentifier, req.params.id],
    userId: [sql.UniqueIdentifier, req.user.id]
  });
  ok(res, { read: true });
}));

router.get("/procedures", requireAuth, asyncHandler(async (req, res) => {
  const search = String(req.query.search || "").trim();
  const category = String(req.query.category || "").trim();
  const targetAccess = procedureTargetAccessFlags(req.user);
  const rows = await queryRows(`
    select top 200
      prd.id,
      prd.title,
      prd.description,
      prd.category,
      prd.file_name,
      prd.file_mime,
      prd.external_url,
      prd.target_roles,
      prd.created_by,
      author.full_name as author_name,
      author.email as author_email,
      prd.created_at,
      prd.updated_at,
      datalength(prd.file_data) as file_data_length
    from dbo.procedures prd
    join dbo.profiles author on author.id = prd.created_by
    where prd.deleted_at is null
      and (@category = '' or prd.category = @category)
      and (
        @canManage = 1
        or prd.target_roles is null
        or prd.target_roles = ''
        or prd.target_roles = '[]'
        or (@isAdminTarget = 1 and prd.target_roles like '%"admin"%')
        or (@isJmTarget = 1 and (prd.target_roles like '%"jm"%' or prd.target_roles like '%Jefe%' or prd.target_roles like '%Mantencion%' or prd.target_roles like '%MantenciÃ³n%'))
        or (@isPreventionTarget = 1 and (prd.target_roles like '%"prevention"%' or prd.target_roles like '%Prevencion%' or prd.target_roles like '%PrevenciÃ³n%'))
        or (@isTechnicianTarget = 1 and (prd.target_roles like '%"technician"%' or prd.target_roles like '%Tecnico%' or prd.target_roles like '%TÃ©cnico%' or prd.target_roles like '%Multifuncional%'))
      )
      and (
        @search = ''
        or prd.title like '%' + @search + '%'
        or isnull(prd.description, '') like '%' + @search + '%'
        or isnull(prd.category, '') like '%' + @search + '%'
        or isnull(prd.file_name, '') like '%' + @search + '%'
      )
    order by prd.created_at desc
  `, {
    search: [sql.NVarChar(180), search],
    category: [sql.NVarChar(120), category],
    isAdminTarget: [sql.Bit, targetAccess.isAdminTarget],
    isJmTarget: [sql.Bit, targetAccess.isJmTarget],
    isPreventionTarget: [sql.Bit, targetAccess.isPreventionTarget],
    isTechnicianTarget: [sql.Bit, targetAccess.isTechnicianTarget],
    canManage: [sql.Bit, canManageProcedures(req.user)]
  });
  ok(res, rows.map((row) => procedureRow(row)));
}));

router.get("/procedures/:id", requireAuth, asyncHandler(async (req, res) => {
  if (!isUuid(req.params.id)) throw httpError(400, "Procedimiento invalido.");
  const targetAccess = procedureTargetAccessFlags(req.user);
  const rows = await queryRows(`
    select top 1
      prd.id,
      prd.title,
      prd.description,
      prd.category,
      prd.file_name,
      prd.file_mime,
      prd.file_data,
      prd.external_url,
      prd.target_roles,
      prd.created_by,
      author.full_name as author_name,
      author.email as author_email,
      prd.created_at,
      prd.updated_at,
      datalength(prd.file_data) as file_data_length
    from dbo.procedures prd
    join dbo.profiles author on author.id = prd.created_by
    where prd.id = @id
      and prd.deleted_at is null
      and (
        @canManage = 1
        or prd.target_roles is null
        or prd.target_roles = ''
        or prd.target_roles = '[]'
        or (@isAdminTarget = 1 and prd.target_roles like '%"admin"%')
        or (@isJmTarget = 1 and (prd.target_roles like '%"jm"%' or prd.target_roles like '%Jefe%' or prd.target_roles like '%Mantencion%' or prd.target_roles like '%MantenciÃ³n%'))
        or (@isPreventionTarget = 1 and (prd.target_roles like '%"prevention"%' or prd.target_roles like '%Prevencion%' or prd.target_roles like '%PrevenciÃ³n%'))
        or (@isTechnicianTarget = 1 and (prd.target_roles like '%"technician"%' or prd.target_roles like '%Tecnico%' or prd.target_roles like '%TÃ©cnico%' or prd.target_roles like '%Multifuncional%'))
      )
  `, {
    id: [sql.UniqueIdentifier, req.params.id],
    isAdminTarget: [sql.Bit, targetAccess.isAdminTarget],
    isJmTarget: [sql.Bit, targetAccess.isJmTarget],
    isPreventionTarget: [sql.Bit, targetAccess.isPreventionTarget],
    isTechnicianTarget: [sql.Bit, targetAccess.isTechnicianTarget],
    canManage: [sql.Bit, canManageProcedures(req.user)]
  });
  if (!rows[0]) throw httpError(404, "Procedimiento no encontrado.");
  await markProcedureEvent(req.params.id, req.user.id, "viewed");
  ok(res, procedureRow(rows[0], true));
}));

router.get("/procedures/:id/audience", requireAuth, asyncHandler(async (req, res) => {
  if (!canManageProcedures(req.user)) throw httpError(403, "No tienes permisos para revisar seguimiento de procedimientos.");
  if (!isUuid(req.params.id)) throw httpError(400, "Procedimiento invalido.");

  const procedureRows = await queryRows(`
    select top 1 id, title, target_roles
    from dbo.procedures
    where id = @id and deleted_at is null
  `, {
    id: [sql.UniqueIdentifier, req.params.id]
  });
  const procedure = procedureRows[0];
  if (!procedure) throw httpError(404, "Procedimiento no encontrado.");

  const targetRoles = JSON.stringify(normalizeProcedureTargetRoles(procedure.target_roles || '["technician","jm"]'));
  const audienceRows = await queryRows(`
    select distinct
      p.id as user_id,
      p.full_name,
      p.email,
      r.name as role_name,
      b.name as branch_name,
      evt.viewed_at,
      evt.downloaded_at
    from dbo.profiles p
    left join dbo.roles r on r.id = p.role_id
    left join dbo.branches b on b.id = p.branch_id
    left join dbo.procedure_user_events evt
      on evt.user_id = p.id
      and evt.procedure_id = @procedureId
    where p.deleted_at is null
      and p.status = 'activo'
      and (${procedureAudienceWhereClause("p", "r", "@targetRoles")})
    order by p.full_name, p.email
  `, {
    procedureId: [sql.UniqueIdentifier, req.params.id],
    targetRoles: [sql.NVarChar(400), targetRoles]
  });

  const recipients = audienceRows.map(procedureAudienceRow);
  ok(res, {
    procedure_id: procedure.id,
    title: procedure.title,
    target_roles: JSON.parse(targetRoles),
    total: recipients.length,
    viewed: recipients.filter((item) => item.has_viewed).length,
    downloaded: recipients.filter((item) => item.has_downloaded).length,
    recipients
  });
}));

router.post("/procedures/:id/events", requireAuth, asyncHandler(async (req, res) => {
  if (!isUuid(req.params.id)) throw httpError(400, "Procedimiento invalido.");
  const action = String(req.body?.action || "viewed").trim().toLowerCase();
  if (!["viewed", "downloaded"].includes(action)) throw httpError(400, "Accion invalida.");

  const rows = await queryRows(`
    select top 1 id
    from dbo.procedures
    where id = @id and deleted_at is null
  `, {
    id: [sql.UniqueIdentifier, req.params.id]
  });
  if (!rows[0]) throw httpError(404, "Procedimiento no encontrado.");

  await markProcedureEvent(req.params.id, req.user.id, action);
  ok(res, { registered: true, action });
}));

router.post("/procedures", requireAuth, asyncHandler(async (req, res) => {
  if (!canManageProcedures(req.user)) throw httpError(403, "No tienes permisos para subir procedimientos.");
  const payload = req.body || {};
  const title = String(payload.title || "").trim();
  const description = String(payload.description || "").trim();
  const category = String(payload.category || "").trim();
  const externalUrl = String(payload.externalUrl || payload.external_url || "").trim();
  const fileName = String(payload.fileName || payload.file_name || "").trim();
  const fileMime = String(payload.fileMime || payload.file_mime || "").trim();
  const fileBase64 = String(payload.fileBase64 || payload.file_base64 || "").trim();
  const targetRoles = normalizeProcedureTargetRoles(payload.targetRoles || payload.target_roles);

  if (!title) throw httpError(400, "Titulo requerido.");
  if (title.length > 180) throw httpError(400, "El titulo no puede superar 180 caracteres.");
  if (!externalUrl && !fileBase64) throw httpError(400, "Adjunta un archivo o ingresa un enlace.");
  if (externalUrl && !/^https?:\/\//i.test(externalUrl)) throw httpError(400, "El enlace debe comenzar con http o https.");
  if (!targetRoles.length) throw httpError(400, "Selecciona al menos un cargo destinatario.");

  let fileBuffer = null;
  if (fileBase64) {
    fileBuffer = Buffer.from(fileBase64, "base64");
    if (!fileBuffer.length) throw httpError(400, "Archivo invalido.");
    if (fileBuffer.length > 8 * 1024 * 1024) throw httpError(400, "El archivo no puede superar 8 MB.");
  }

  const id = crypto.randomUUID();
  await queryRows(`
    insert into dbo.procedures (
      id, title, description, category, file_name, file_mime, file_data, external_url, target_roles, created_by
    )
    values (
      @id, @title, @description, @category, @fileName, @fileMime, @fileData, @externalUrl, @targetRoles, @createdBy
    )
  `, {
    id: [sql.UniqueIdentifier, id],
    title: [sql.NVarChar(180), title],
    description: [sql.NVarChar(sql.MAX), description || null],
    category: [sql.NVarChar(120), category || null],
    fileName: [sql.NVarChar(260), fileName || null],
    fileMime: [sql.NVarChar(160), fileMime || null],
    fileData: [sql.VarBinary(sql.MAX), fileBuffer],
    externalUrl: [sql.NVarChar(1000), externalUrl || null],
    targetRoles: [sql.NVarChar(400), JSON.stringify(targetRoles)],
    createdBy: [sql.UniqueIdentifier, req.user.id]
  });

  notifyProcedureAvailable(id, title, req.user.id, targetRoles).catch((error) => {
    console.warn("El procedimiento fue creado, pero no se pudo enviar push.", error.message);
  });

  ok(res, { id });
}));

router.patch("/procedures/:id", requireAuth, asyncHandler(async (req, res) => {
  if (!canManageProcedures(req.user)) throw httpError(403, "No tienes permisos para editar procedimientos.");
  if (!isUuid(req.params.id)) throw httpError(400, "Procedimiento invalido.");

  const existingRows = await queryRows(`
    select top 1 id, file_name, datalength(file_data) as file_data_length
    from dbo.procedures
    where id = @id and deleted_at is null
  `, {
    id: [sql.UniqueIdentifier, req.params.id]
  });
  const existing = existingRows[0];
  if (!existing) throw httpError(404, "Procedimiento no encontrado.");

  const payload = req.body || {};
  const title = String(payload.title || "").trim();
  const description = String(payload.description || "").trim();
  const category = String(payload.category || "").trim();
  const externalUrl = String(payload.externalUrl || payload.external_url || "").trim();
  const fileName = String(payload.fileName || payload.file_name || "").trim();
  const fileMime = String(payload.fileMime || payload.file_mime || "").trim();
  const fileBase64 = String(payload.fileBase64 || payload.file_base64 || "").trim();
  const removeFile = Boolean(payload.removeFile || payload.remove_file);
  const targetRoles = normalizeProcedureTargetRoles(payload.targetRoles || payload.target_roles);

  if (!title) throw httpError(400, "Titulo requerido.");
  if (title.length > 180) throw httpError(400, "El titulo no puede superar 180 caracteres.");
  if (externalUrl && !/^https?:\/\//i.test(externalUrl)) throw httpError(400, "El enlace debe comenzar con http o https.");
  if (!targetRoles.length) throw httpError(400, "Selecciona al menos un cargo destinatario.");

  let fileBuffer = null;
  if (fileBase64) {
    fileBuffer = Buffer.from(fileBase64, "base64");
    if (!fileBuffer.length) throw httpError(400, "Archivo invalido.");
    if (fileBuffer.length > 8 * 1024 * 1024) throw httpError(400, "El archivo no puede superar 8 MB.");
  }

  const keepsExistingFile = Boolean(existing.file_data_length) && !removeFile && !fileBuffer;
  if (!externalUrl && !fileBuffer && !keepsExistingFile) {
    throw httpError(400, "Adjunta un archivo o ingresa un enlace.");
  }

  const db = await pool();
  await db.request()
    .input("id", sql.UniqueIdentifier, req.params.id)
    .input("title", sql.NVarChar(180), title)
    .input("description", sql.NVarChar(sql.MAX), description || null)
    .input("category", sql.NVarChar(120), category || null)
    .input("externalUrl", sql.NVarChar(1000), externalUrl || null)
    .input("targetRoles", sql.NVarChar(400), JSON.stringify(targetRoles))
    .input("hasNewFile", sql.Bit, Boolean(fileBuffer))
    .input("removeFile", sql.Bit, removeFile)
    .input("fileName", sql.NVarChar(260), fileBuffer ? (fileName || "procedimiento") : null)
    .input("fileMime", sql.NVarChar(160), fileBuffer ? (fileMime || "application/octet-stream") : null)
    .input("fileData", sql.VarBinary(sql.MAX), fileBuffer)
    .query(`
      update dbo.procedures
      set
        title = @title,
        description = @description,
        category = @category,
        external_url = @externalUrl,
        target_roles = @targetRoles,
        file_name = case when @removeFile = 1 then null when @hasNewFile = 1 then @fileName else file_name end,
        file_mime = case when @removeFile = 1 then null when @hasNewFile = 1 then @fileMime else file_mime end,
        file_data = case when @removeFile = 1 then null when @hasNewFile = 1 then @fileData else file_data end,
        updated_at = sysdatetimeoffset()
      where id = @id and deleted_at is null
    `);

  ok(res, { id: req.params.id });
}));

router.delete("/procedures/:id", requireAuth, asyncHandler(async (req, res) => {
  if (!canManageProcedures(req.user)) throw httpError(403, "No tienes permisos para eliminar procedimientos.");
  if (!isUuid(req.params.id)) throw httpError(400, "Procedimiento invalido.");

  const db = await pool();
  const result = await db.request()
    .input("id", sql.UniqueIdentifier, req.params.id)
    .query(`
      update dbo.procedures
      set deleted_at = sysdatetimeoffset(), updated_at = sysdatetimeoffset()
      where id = @id and deleted_at is null
    `);

  if (!result.rowsAffected?.[0]) throw httpError(404, "Procedimiento no encontrado.");
  ok(res, { id: req.params.id, deleted: true });
}));

router.get("/tasks", requireAuth, asyncHandler(async (req, res) => {
  const [rows, requirements, counts] = await Promise.all([
    taskRowsForUser(req.user),
    taskRequirements(),
    submissionCounts()
  ]);
  ok(res, rows.map((row) => {
    const submission = counts[row.id] || {};
    const config = requirements[row.id] || {};
    return {
      ...row,
      establishments: {
        rbd: row.rbd,
        name: row.establishment_name,
        commune: row.commune,
        institution_type: row.institution_type,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude
      },
      assigned_to_profile: { full_name: row.assigned_to_full_name, email: row.assigned_to_email },
      assigned_by_profile: { full_name: row.assigned_by_full_name, email: row.assigned_by_email },
      submissionId: row.submission_id || submission.id || "",
      folio: row.folio || submission.folio || "",
      submittedAt: row.submitted_at || submission.submitted_at || "",
      pdfUrl: row.pdf_url || "",
      pdfFileName: row.pdf_file_name || "",
      pdfExternalId: row.pdf_external_id || "",
      remoteSectionCounts: submission.sectionCounts || {},
      requiredSections: config.requiredSections || [],
      criticalSections: config.criticalSections || [],
      sectionMinimums: config.sectionMinimums || {}
    };
  }));
}));

router.get("/incidents", requireAuth, asyncHandler(async (req, res) => {
  const rows = await incidentRowsForUser(req.user);
  ok(res, rows.map(incidentRow));
}));

router.get("/incidents/:id", requireAuth, asyncHandler(async (req, res) => {
  if (!isUuid(req.params.id)) throw httpError(400, "Incidencia invalida.");
  const rows = await incidentRowsForUser(req.user, req.params.id);
  if (!rows[0]) throw httpError(404, "Incidencia no encontrada.");
  ok(res, incidentRow(rows[0]));
}));

router.post("/incidents", requireAuth, asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const title = String(payload.title || "").trim();
  const description = String(payload.description || "").trim();
  const rbd = String(payload.rbd || payload.establishment_rbd || "").trim();
  if (!title || !description) throw httpError(400, "Titulo y detalle requeridos.");
  if (!rbd && !isUuid(payload.establishment_id)) throw httpError(400, "Establecimiento requerido.");

  const incidentId = await transaction(async (tx) => {
    const establishment = payload.establishment_id
      ? await request(tx)
        .input("id", sql.UniqueIdentifier, payload.establishment_id)
        .query("select top 1 e.id, e.branch_id from dbo.establishments e where e.id = @id")
      : await request(tx)
        .input("rbd", sql.NVarChar(30), rbd)
        .query("select top 1 e.id, e.branch_id from dbo.establishments e where e.rbd = @rbd");
    const selected = establishment.recordset[0];
    if (!selected) throw httpError(404, `El RBD ${rbd} no existe en SQL Server.`);

    const allowed = await request(tx)
      .input("userId", sql.UniqueIdentifier, req.user.id)
      .input("branchId", sql.UniqueIdentifier, selected.branch_id)
      .input("canManageUsers", sql.Bit, Boolean(req.user.canManageUsers))
      .query(`
        select allowed = case when @canManageUsers = 1
          or exists (select 1 from dbo.profiles p where p.id = @userId and p.branch_id = @branchId)
          or exists (select 1 from dbo.profile_branches pb where pb.profile_id = @userId and pb.branch_id = @branchId)
          then 1 else 0 end
      `);
    if (!allowed.recordset[0]?.allowed) throw httpError(403, "No tienes acceso a la zona del RBD seleccionado.");

    const id = crypto.randomUUID();
    await request(tx)
      .input("id", sql.UniqueIdentifier, id)
      .input("title", sql.NVarChar(200), title)
      .input("description", sql.NVarChar(sql.MAX), description)
      .input("photos", sql.NVarChar(sql.MAX), JSON.stringify(Array.isArray(payload.photos) ? payload.photos.slice(0, 4) : []))
      .input("severity", sql.NVarChar(40), payload.severity || "Alta")
      .input("incidentType", sql.NVarChar(80), payload.incident_type || payload.type || "Emergencia (inmediata)")
      .input("branchId", sql.UniqueIdentifier, selected.branch_id)
      .input("establishmentId", sql.UniqueIdentifier, selected.id)
      .input("reportedBy", sql.UniqueIdentifier, req.user.id)
      .query(`
        insert into dbo.maintenance_incidents (
          id, title, description, photos, severity, incident_type, status,
          branch_id, establishment_id, reported_by, created_at, updated_at
        )
        values (
          @id, @title, @description, @photos, @severity, @incidentType, N'En revisión',
          @branchId, @establishmentId, @reportedBy, sysdatetimeoffset(), sysdatetimeoffset()
        )
      `);
    return id;
  });

  const rows = await incidentRowsForUser(req.user, incidentId);
  const incident = rows[0];
  notifyIncidentToManagers(incident).catch((error) => {
    console.warn("La incidencia fue creada, pero no se pudo enviar la notificacion push al JM.", error.message);
  });
  ok(res, incidentRow(incident));
}));

router.post("/tasks", requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.canAssignTasks && !req.user.canManageUsers) throw httpError(403, "No tienes permisos para asignar tareas.");
  const payload = req.body || {};
  if (!isUuid(payload.assignedTo)) throw httpError(400, "Tecnico invalido.");
  if (!payload.rbd && !payload.establishmentId) throw httpError(400, "Establecimiento requerido.");
  const dueDateValue = String(payload.dueDate || payload.dueDateIso || "").slice(0, 10);
  const todayValue = new Date().toLocaleDateString("en-CA");
  if (!dueDateValue) {
    throw httpError(400, "La fecha planificada es obligatoria.");
  }
  if (dueDateValue && dueDateValue < todayValue) {
    throw httpError(400, "No puedes asignar tareas en fechas anteriores a hoy.");
  }
  const taskId = await transaction(async (tx) => {
    const establishment = payload.establishmentId
      ? await request(tx).input("id", sql.UniqueIdentifier, payload.establishmentId).query("select id from dbo.establishments where id = @id")
      : await request(tx).input("rbd", sql.NVarChar(30), String(payload.rbd)).query("select id from dbo.establishments where rbd = @rbd");
    const establishmentId = establishment.recordset[0]?.id;
    if (!establishmentId) throw httpError(404, `El RBD ${payload.rbd} no existe en SQL Server.`);

    const openTask = await findOpenTaskForEstablishment(tx, establishmentId);
    if (openTask) {
      if (!payload.consolidateOpenTask) openTaskConflict(openTask);

      const taskType = String(payload.type || openTask.task_type || "Plan Preventivo Mantencion").trim();
      const { templateId, sectionsByCode } = await ensureTemplateAndSections(tx, taskType);
      const existingRequirements = await taskRequirements();
      const sectionConfig = mergeSectionConfig(existingRequirements[openTask.id], payload.sectionConfig || {});
      const description = combinedTaskDescription(openTask.description, payload.description || "");

      await request(tx)
        .input("taskId", sql.UniqueIdentifier, openTask.id)
        .input("taskType", sql.NVarChar(120), taskType)
        .input("assignedTo", sql.UniqueIdentifier, payload.assignedTo)
        .input("assignedBy", sql.UniqueIdentifier, req.user.id)
        .input("templateId", sql.UniqueIdentifier, templateId)
        .input("description", sql.NVarChar(500), description)
        .input("dueDate", sql.Date, dueDateValue)
        .input("status", sql.NVarChar(40), statusToDb(payload.status))
        .input("priority", sql.NVarChar(40), priorityToDb(payload.priority))
        .query(`
          update dbo.tasks
          set task_type = @taskType,
              assigned_to = @assignedTo,
              assigned_by = @assignedBy,
              form_template_id = @templateId,
              description = @description,
              due_date = @dueDate,
              status = @status,
              priority = @priority,
              sync_state = 'synced',
              updated_at = sysdatetimeoffset()
          where id = @taskId
        `);

      await replaceTaskSectionConfig(tx, openTask.id, sectionsByCode, sectionConfig);

      if (isUuid(payload.incidentId)) {
        const plannedDetails = plannedDetailsForTask(openTask.id, { ...payload, description }, req.user.id);
        const incidentUpdate = await request(tx)
          .input("incidentId", sql.UniqueIdentifier, payload.incidentId)
          .input("taskId", sql.UniqueIdentifier, openTask.id)
          .input("plannedDetails", sql.NVarChar(sql.MAX), JSON.stringify(plannedDetails))
          .input("userId", sql.UniqueIdentifier, req.user.id)
          .input("canManageUsers", sql.Bit, Boolean(req.user.canManageUsers))
          .query(`
            update incident
            set status = N'Planificada',
                task_id = @taskId,
                planned_details = @plannedDetails,
                updated_at = sysdatetimeoffset()
            from dbo.maintenance_incidents incident
            join dbo.establishments establishment on establishment.id = incident.establishment_id
            where incident.id = @incidentId
              and establishment.id = (select establishment_id from dbo.tasks where id = @taskId)
              and (
                @canManageUsers = 1
                or exists (
                  select 1
                  from dbo.profile_branches pb
                  where pb.profile_id = @userId
                    and pb.branch_id = establishment.branch_id
                )
                or exists (
                  select 1
                  from dbo.profiles p
                  where p.id = @userId
                    and p.branch_id = establishment.branch_id
                )
              )
          `);
        if (!incidentUpdate.rowsAffected?.[0]) throw httpError(404, "Incidencia no encontrada o sin permisos para consolidarla.");
      }

      return openTask.id;
    }

    const { templateId, sectionsByCode } = await ensureTemplateAndSections(tx, payload.type || "Plan Preventivo Mantención");
    const id = crypto.randomUUID();
    await request(tx)
      .input("id", sql.UniqueIdentifier, id)
      .input("taskType", sql.NVarChar(120), payload.type || "Plan Preventivo Mantención")
      .input("establishmentId", sql.UniqueIdentifier, establishmentId)
      .input("assignedTo", sql.UniqueIdentifier, payload.assignedTo)
      .input("assignedBy", sql.UniqueIdentifier, req.user.id)
      .input("templateId", sql.UniqueIdentifier, templateId)
      .input("description", sql.NVarChar(500), payload.description || "")
      .input("dueDate", sql.Date, dueDateValue || new Date())
      .input("status", sql.NVarChar(40), statusToDb(payload.status))
      .input("priority", sql.NVarChar(40), priorityToDb(payload.priority))
      .query(`
        insert into dbo.tasks (
          id, task_type, establishment_id, assigned_to, assigned_by, form_template_id,
          description, due_date, status, priority, sync_state, assigned_at, created_at, updated_at
        )
        values (
          @id, @taskType, @establishmentId, @assignedTo, @assignedBy, @templateId,
          @description, @dueDate, @status, @priority, 'synced', sysdatetimeoffset(), sysdatetimeoffset(), sysdatetimeoffset()
        )
      `);

    await replaceTaskSectionConfig(tx, id, sectionsByCode, payload.sectionConfig || {});

    if (isUuid(payload.incidentId)) {
      const plannedDetails = plannedDetailsForTask(id, payload, req.user.id);
      const incidentUpdate = await request(tx)
        .input("incidentId", sql.UniqueIdentifier, payload.incidentId)
        .input("taskId", sql.UniqueIdentifier, id)
        .input("plannedDetails", sql.NVarChar(sql.MAX), JSON.stringify(plannedDetails))
        .input("userId", sql.UniqueIdentifier, req.user.id)
        .input("canManageUsers", sql.Bit, Boolean(req.user.canManageUsers))
        .query(`
          update incident
          set status = N'Planificada',
              task_id = @taskId,
              planned_details = @plannedDetails,
              updated_at = sysdatetimeoffset()
          from dbo.maintenance_incidents incident
          join dbo.establishments establishment on establishment.id = incident.establishment_id
          where incident.id = @incidentId
            and (
              @canManageUsers = 1
              or
              exists (
                select 1
                from dbo.profile_branches pb
                where pb.profile_id = @userId
                  and pb.branch_id = establishment.branch_id
              )
              or exists (
                select 1
                from dbo.profiles p
                where p.id = @userId
                  and p.branch_id = establishment.branch_id
              )
            )
        `);
      if (!incidentUpdate.rowsAffected?.[0]) throw httpError(404, "Incidencia no encontrada o sin permisos para planificarla.");
    }
    return id;
  });
  notifyTaskToTechnician(taskId).catch((error) => {
    console.warn("La tarea fue creada, pero no se pudo enviar la notificacion push al tecnico.", error.message);
  });
  if (isUuid(payload.incidentId)) {
    notifyIncidentStatusToReporter(payload.incidentId, "Planificada", taskId).catch((error) => {
      console.warn("La incidencia fue planificada, pero no se pudo notificar al prevencionista.", error.message);
    });
  }
  ok(res, { id: taskId });
}));

router.patch("/tasks/:id", requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.canAssignTasks && !req.user.canManageUsers) throw httpError(403, "No tienes permisos para modificar tareas.");
  const taskId = req.params.id;
  if (!isUuid(taskId)) throw httpError(400, "Tarea invalida.");

  const payload = req.body || {};
  if (payload.assignedTo !== undefined && !isUuid(payload.assignedTo)) throw httpError(400, "Tecnico invalido.");

  const dueDateValue = String(payload.dueDate || payload.dueDateIso || "").slice(0, 10);
  const todayValue = new Date().toLocaleDateString("en-CA");
  if (dueDateValue && dueDateValue < todayValue) {
    throw httpError(400, "No puedes asignar tareas en fechas anteriores a hoy.");
  }

  const incidentId = isUuid(payload.incidentId) ? payload.incidentId : "";

  await transaction(async (tx) => {
    const currentResult = await request(tx)
      .input("taskId", sql.UniqueIdentifier, taskId)
      .query(`
        select top 1
          t.id,
          t.task_type,
          t.establishment_id,
          t.assigned_to,
          t.description,
          t.due_date,
          t.status,
          t.priority,
          e.branch_id
        from dbo.tasks t with (updlock, holdlock)
        join dbo.establishments e on e.id = t.establishment_id
        where t.id = @taskId
      `);
    const current = currentResult.recordset[0];
    if (!current) throw httpError(404, "Tarea no encontrada.");
    if (!dueDateValue && !current.due_date) throw httpError(400, "La fecha planificada es obligatoria.");

    const allowed = await request(tx)
      .input("userId", sql.UniqueIdentifier, req.user.id)
      .input("branchId", sql.UniqueIdentifier, current.branch_id)
      .input("canManageUsers", sql.Bit, Boolean(req.user.canManageUsers))
      .input("canAssignTasks", sql.Bit, Boolean(req.user.canAssignTasks))
      .query(`
        select allowed = case when @canManageUsers = 1
          or @canAssignTasks = 1
          or exists (select 1 from dbo.profiles p where p.id = @userId and p.branch_id = @branchId)
          or exists (select 1 from dbo.profile_branches pb where pb.profile_id = @userId and pb.branch_id = @branchId)
          then 1 else 0 end
      `);
    if (!allowed.recordset[0]?.allowed) throw httpError(403, "No tienes acceso a la zona de esta tarea.");

    const openTask = await findOpenTaskForEstablishment(tx, current.establishment_id, taskId);
    if (openTask) openTaskConflict(openTask);

    const taskType = payload.type !== undefined ? String(payload.type || "").trim() : current.task_type;
    const { templateId, sectionsByCode } = await ensureTemplateAndSections(tx, taskType || current.task_type || "Plan Preventivo Mantencion");
    const assignedTo = payload.assignedTo || current.assigned_to;
    const description = payload.description !== undefined ? String(payload.description || "") : (current.description || "");
    const status = payload.status !== undefined ? statusToDb(payload.status) : statusToDb(current.status);
    const priority = payload.priority !== undefined ? priorityToDb(payload.priority) : priorityToDb(current.priority);

    await request(tx)
      .input("taskId", sql.UniqueIdentifier, taskId)
      .input("taskType", sql.NVarChar(120), taskType || current.task_type)
      .input("assignedTo", sql.UniqueIdentifier, assignedTo)
      .input("templateId", sql.UniqueIdentifier, templateId)
      .input("description", sql.NVarChar(500), description)
      .input("dueDate", sql.Date, dueDateValue || current.due_date)
      .input("status", sql.NVarChar(40), status)
      .input("priority", sql.NVarChar(40), priority)
      .query(`
        update dbo.tasks
        set task_type = @taskType,
            assigned_to = @assignedTo,
            form_template_id = @templateId,
            description = @description,
            due_date = @dueDate,
            status = @status,
            priority = @priority,
            sync_state = 'synced',
            updated_at = sysdatetimeoffset()
        where id = @taskId
      `);

    if (payload.sectionConfig && typeof payload.sectionConfig === "object") {
      await replaceTaskSectionConfig(tx, taskId, sectionsByCode, payload.sectionConfig);
    }

    if (incidentId) {
      const plannedPayload = {
        ...payload,
        type: taskType || current.task_type,
        assignedTo,
        description,
        dueDate: dueDateValue || current.due_date,
        status,
        priority
      };
      const incidentUpdate = await request(tx)
        .input("incidentId", sql.UniqueIdentifier, incidentId)
        .input("taskId", sql.UniqueIdentifier, taskId)
        .input("plannedDetails", sql.NVarChar(sql.MAX), JSON.stringify(plannedDetailsForTask(taskId, plannedPayload, req.user.id)))
        .input("userId", sql.UniqueIdentifier, req.user.id)
        .input("canManageUsers", sql.Bit, Boolean(req.user.canManageUsers))
        .query(`
          update incident
          set status = N'Planificada',
              task_id = @taskId,
              planned_details = @plannedDetails,
              updated_at = sysdatetimeoffset()
          from dbo.maintenance_incidents incident
          join dbo.establishments establishment on establishment.id = incident.establishment_id
          where incident.id = @incidentId
            and establishment.id = (select establishment_id from dbo.tasks where id = @taskId)
            and (
              @canManageUsers = 1
              or exists (
                select 1
                from dbo.profile_branches pb
                where pb.profile_id = @userId
                  and pb.branch_id = establishment.branch_id
              )
              or exists (
                select 1
                from dbo.profiles p
                where p.id = @userId
                  and p.branch_id = establishment.branch_id
              )
            )
        `);
      if (!incidentUpdate.rowsAffected?.[0]) throw httpError(404, "Incidencia no encontrada o sin permisos para consolidarla.");
    }
  });

  notifyTaskToTechnician(taskId).catch((error) => {
    console.warn("La tarea fue actualizada, pero no se pudo enviar la notificacion push al tecnico.", error.message);
  });
  if (incidentId) {
    notifyIncidentStatusToReporter(incidentId, "Planificada", taskId).catch((error) => {
      console.warn("La incidencia fue consolidada, pero no se pudo notificar al prevencionista.", error.message);
    });
  }

  ok(res, await taskResponseById(taskId));
}));

router.patch("/incidents/by-task/:taskId/resolve", requireAuth, asyncHandler(async (req, res) => {
  const taskId = req.params.taskId;
  if (!isUuid(taskId)) throw httpError(400, "Tarea invalida.");
  const rows = await queryRows(`
    declare @updated table (id uniqueidentifier);

    update dbo.maintenance_incidents
    set status = N'Resuelta',
        updated_at = sysdatetimeoffset()
    output inserted.id into @updated
    where task_id = @taskId
      and status <> N'Resuelta';

    select id from @updated;
  `, { taskId: [sql.UniqueIdentifier, taskId] });
  if (rows[0]?.id) {
    notifyIncidentStatusToReporter(rows[0].id, "Resuelta", taskId).catch((error) => {
      console.warn("La incidencia fue resuelta, pero no se pudo notificar al prevencionista.", error.message);
    });
  }
  ok(res, { resolved: true });
}));

router.get("/maintenance-alerts", requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.canAssignTasks && !req.user.canManageUsers && !req.user.canViewNationalData) {
    throw httpError(403, "No tienes permisos para ver alertas de mantencion.");
  }

  const db = await pool();
  const tableExists = await db.request().query("select existsFlag = case when object_id(N'dbo.maintenance_alerts', N'U') is null then 0 else 1 end");
  if (!tableExists.recordset[0]?.existsFlag) {
    ok(res, []);
    return;
  }

  const includeResolved = ["1", "true", "all"].includes(String(req.query.includeResolved || req.query.status || "").toLowerCase());
  const rows = await queryRows(`
    select
      alert.id,
      alert.alert_type,
      alert.status,
      alert.severity,
      alert.title,
      alert.body,
      alert.due_date,
      alert.days_to_expire,
      alert.replacement_expiration_date,
      alert.resolved_days_to_expire,
      alert.created_at,
      alert.updated_at,
      alert.resolved_at,
      alert.resolved_by,
      alert.task_id,
      alert.submission_id,
      alert.reported_by,
      reporter.full_name as reported_by_name,
      branch.id as branch_id,
      branch.name as branch_name,
      establishment.id as establishment_id,
      establishment.rbd,
      establishment.name as establishment_name,
      establishment.commune,
      alert.metadata
    from dbo.maintenance_alerts alert
    join dbo.branches branch on branch.id = alert.branch_id
    join dbo.establishments establishment on establishment.id = alert.establishment_id
    left join dbo.profiles reporter on reporter.id = alert.reported_by
    where (@includeResolved = 1 or lower(isnull(alert.status, N'')) in (N'pendiente', N'abierta'))
      and (
        @canManageUsers = 1
        or @canViewNationalData = 1
        or (
          @canAssignTasks = 1
          and (
            alert.branch_id = @branchId
            or exists (
              select 1
              from dbo.profile_branches pb
              where pb.profile_id = @userId
                and pb.branch_id = alert.branch_id
            )
          )
        )
      )
    order by
      case when alert.alert_type = N'extinguisher_expired' then 0 else 1 end,
      alert.created_at desc
  `, {
    includeResolved: [sql.Bit, includeResolved],
    canManageUsers: [sql.Bit, Boolean(req.user.canManageUsers)],
    canViewNationalData: [sql.Bit, Boolean(req.user.canViewNationalData)],
    canAssignTasks: [sql.Bit, Boolean(req.user.canAssignTasks)],
    branchId: [sql.UniqueIdentifier, req.user.branchId || null],
    userId: [sql.UniqueIdentifier, req.user.id]
  });

  ok(res, rows.map(maintenanceAlertRow));
}));

router.patch("/maintenance-alerts/:id/resolve", requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.canAssignTasks && !req.user.canManageUsers && !req.user.canViewNationalData) {
    throw httpError(403, "No tienes permisos para gestionar alertas de mantencion.");
  }
  const alertId = req.params.id;
  if (!isUuid(alertId)) throw httpError(400, "Alerta invalida.");
  const replacementExpirationDate = isoDateOnly(
    req.body?.extinguisherExpirationDate
    || req.body?.replacementExpirationDate
    || req.body?.expirationDate
  );
  if (!replacementExpirationDate) {
    throw httpError(400, "Debes ingresar la fecha de vencimiento del nuevo extintor.");
  }
  if (replacementExpirationDate < localTodayIso()) {
    throw httpError(400, "La fecha del nuevo extintor no puede estar vencida.");
  }
  const resolvedDaysToExpire = daysUntilIsoDate(replacementExpirationDate);

  const db = await pool();
  const tableExists = await db.request().query("select existsFlag = case when object_id(N'dbo.maintenance_alerts', N'U') is null then 0 else 1 end");
  if (!tableExists.recordset[0]?.existsFlag) throw httpError(404, "La tabla de alertas no existe.");

  const updated = await transaction(async (tx) => {
    const selected = await request(tx)
      .input("alertId", sql.UniqueIdentifier, alertId)
      .input("userId", sql.UniqueIdentifier, req.user.id)
      .input("canManageUsers", sql.Bit, Boolean(req.user.canManageUsers))
      .input("canViewNationalData", sql.Bit, Boolean(req.user.canViewNationalData))
      .input("canAssignTasks", sql.Bit, Boolean(req.user.canAssignTasks))
      .input("branchId", sql.UniqueIdentifier, req.user.branchId || null)
      .query(`
        select top 1
          alert.id,
          alert.alert_type,
          alert.status,
          alert.submission_id,
          alert.metadata
        from dbo.maintenance_alerts alert with (updlock, holdlock)
        where alert.id = @alertId
          and lower(isnull(alert.status, N'')) in (N'pendiente', N'abierta')
          and (
            @canManageUsers = 1
            or @canViewNationalData = 1
            or (
              @canAssignTasks = 1
              and (
                alert.branch_id = @branchId
                or exists (
                  select 1
                  from dbo.profile_branches pb
                  where pb.profile_id = @userId
                    and pb.branch_id = alert.branch_id
                )
              )
            )
          )
      `);
    const alert = selected.recordset[0];
    if (!alert) throw httpError(404, "Alerta no encontrada o ya gestionada.");
    if (!String(alert.alert_type || "").startsWith("extinguisher_")) {
      throw httpError(400, "Esta alerta no corresponde a un extintor.");
    }
    if (!alert.submission_id) {
      throw httpError(409, "La alerta no tiene bitacora asociada para actualizar el extintor.");
    }

    const metadata = parseJsonObject(alert.metadata);
    const itemIndex = Number(metadata.itemIndex);
    if (!Number.isFinite(itemIndex) || itemIndex <= 0) {
      throw httpError(409, "La alerta no tiene el indice del extintor asociado.");
    }

    const itemRows = await request(tx)
      .input("submissionId", sql.UniqueIdentifier, alert.submission_id)
      .input("itemIndex", sql.Int, Math.trunc(itemIndex))
      .query(`
        select top 1 ri.id as response_item_id, ri.section_id
        from dbo.response_items ri
        join dbo.form_sections section on section.id = ri.section_id
        where ri.submission_id = @submissionId
          and ri.item_index = @itemIndex
          and section.code = N'infrastructure'
      `);
    const item = itemRows.recordset[0];
    if (!item) throw httpError(409, "No se encontro el registro de infraestructura asociado a la alerta.");

    const updateDate = await request(tx)
      .input("submissionId", sql.UniqueIdentifier, alert.submission_id)
      .input("responseItemId", sql.UniqueIdentifier, item.response_item_id)
      .input("replacementExpirationDate", sql.Date, replacementExpirationDate)
      .query(`
        update answer
        set answer_type = N'date',
            answer_text = null,
            answer_number = null,
            answer_date = @replacementExpirationDate,
            answer_boolean = null,
            answer_json = null
        from dbo.form_answers answer
        join dbo.form_questions question on question.id = answer.question_id
        where answer.submission_id = @submissionId
          and answer.response_item_id = @responseItemId
          and question.code in (
            N'extinguisherexpirationdate',
            N'extinguisher_expiration_date',
            N'fecha_vencimiento_extintor',
            N'vencimiento_extintor'
          )
      `);
    const updateExpired = await request(tx)
      .input("submissionId", sql.UniqueIdentifier, alert.submission_id)
      .input("responseItemId", sql.UniqueIdentifier, item.response_item_id)
      .query(`
        update answer
        set answer_type = N'boolean',
            answer_text = null,
            answer_number = null,
            answer_date = null,
            answer_boolean = 0,
            answer_json = null
        from dbo.form_answers answer
        join dbo.form_questions question on question.id = answer.question_id
        where answer.submission_id = @submissionId
          and answer.response_item_id = @responseItemId
          and question.code in (
            N'extinguisherexpired',
            N'extinguisher_expired',
            N'extintor_vencido'
          )
      `);
    if (!updateDate.rowsAffected[0]) {
      throw httpError(409, "No se encontro la fecha de vencimiento del extintor para actualizar.");
    }
    if (!updateExpired.rowsAffected[0]) {
      throw httpError(409, "No se encontro el estado vencido del extintor para actualizar.");
    }

    metadata.replacementExpirationDate = replacementExpirationDate;
    metadata.resolvedDaysToExpire = resolvedDaysToExpire;
    metadata.resolvedBy = req.user.id;

    await request(tx)
      .input("alertId", sql.UniqueIdentifier, alertId)
      .input("userId", sql.UniqueIdentifier, req.user.id)
      .input("replacementExpirationDate", sql.Date, replacementExpirationDate)
      .input("resolvedDaysToExpire", sql.Int, resolvedDaysToExpire)
      .input("metadata", sql.NVarChar(sql.MAX), JSON.stringify(metadata))
      .query(`
        update dbo.maintenance_alerts
        set status = N'gestionada',
            severity = N'normal',
            due_date = @replacementExpirationDate,
            days_to_expire = @resolvedDaysToExpire,
            replacement_expiration_date = @replacementExpirationDate,
            resolved_days_to_expire = @resolvedDaysToExpire,
            metadata = @metadata,
            resolved_by = @userId,
            resolved_at = sysdatetimeoffset(),
            updated_at = sysdatetimeoffset()
        where id = @alertId
      `);

    const rows = await request(tx)
      .input("alertId", sql.UniqueIdentifier, alertId)
      .query(`
        select
          alert.id,
          alert.alert_type,
          alert.status,
          alert.severity,
          alert.title,
          alert.body,
          alert.due_date,
          alert.days_to_expire,
          alert.replacement_expiration_date,
          alert.resolved_days_to_expire,
          alert.created_at,
          alert.updated_at,
          alert.resolved_at,
          alert.resolved_by,
          alert.task_id,
          alert.submission_id,
          alert.reported_by,
          reporter.full_name as reported_by_name,
          branch.id as branch_id,
          branch.name as branch_name,
          establishment.id as establishment_id,
          establishment.rbd,
          establishment.name as establishment_name,
          establishment.commune,
          alert.metadata
        from dbo.maintenance_alerts alert
        join dbo.branches branch on branch.id = alert.branch_id
        join dbo.establishments establishment on establishment.id = alert.establishment_id
        left join dbo.profiles reporter on reporter.id = alert.reported_by
        where alert.id = @alertId
      `);
    return rows.recordset;
  });
  if (!updated[0]) throw httpError(404, "Alerta no encontrada o ya gestionada.");
  ok(res, maintenanceAlertRow(updated[0]));
}));

router.post("/scheduled-notifications/run", requireAuth, asyncHandler(async (req, res) => {
  if (!req.user.canManageUsers && !req.user.canViewNationalData) throw httpError(403, "No autorizado.");
  const result = await runScheduledNotificationsOnce(Boolean(req.body?.force ?? true));
  ok(res, result);
}));

router.post("/device-push-tokens", requireAuth, asyncHandler(async (req, res) => {
  const token = String(req.body?.token || "").trim();
  if (!token) throw httpError(400, "Token push requerido.");

  const db = await pool();
  await db.request()
    .input("userId", sql.UniqueIdentifier, req.user.id)
    .input("token", sql.NVarChar(1000), token)
    .query(`
      if exists (select 1 from dbo.device_push_tokens where token = @token)
      begin
        update dbo.device_push_tokens
        set user_id = @userId,
            is_active = 1,
            updated_at = sysdatetimeoffset()
        where token = @token
      end
      else
      begin
        insert into dbo.device_push_tokens (user_id, token, is_active)
        values (@userId, @token, 1)
      end
    `);

  ok(res, { registered: true });
}));

router.get("/establishments", requireAuth, asyncHandler(async (req, res) => {
  const search = String(req.query.search || "").trim();
  const branchId = String(req.query.branchId || "").trim();
  const rows = await queryRows(`
    select top 100 e.id, e.rbd, e.name, e.commune, e.institution_type, e.address, e.branch_id, b.name as branch_name, e.latitude, e.longitude
    from dbo.establishments e
    left join dbo.branches b on b.id = e.branch_id
    where (@branchId = '' or convert(nvarchar(36), e.branch_id) = @branchId)
      and (
        @search = ''
        or e.rbd like '%' + @search + '%'
        or e.name like '%' + @search + '%'
      )
    order by
      case
        when @search <> '' and e.rbd = @search then 0
        when @search <> '' and e.rbd like @search + '%' then 1
        else 2
      end,
      e.name
  `, {
    search: [sql.NVarChar(120), search],
    branchId: [sql.NVarChar(36), branchId]
  });
  ok(res, rows);
}));

router.get("/establishments/:rbd/latest-rbd-checkers", requireAuth, asyncHandler(async (req, res) => {
  const rbd = String(req.params.rbd || "").trim();
  const excludeTaskId = isUuid(req.query.excludeTaskId) ? String(req.query.excludeTaskId).trim() : null;
  if (!rbd) throw httpError(400, "RBD invalido.");

  const latestRows = await queryRows(`
    select top 1
      fs.id as submission_id,
      fs.folio,
      fs.submitted_at,
      t.id as task_id
    from dbo.form_submissions fs
    join dbo.tasks t on t.id = fs.task_id
    join dbo.establishments e on e.id = t.establishment_id
    where e.rbd = @rbd
      and (@excludeTaskId is null or t.id <> @excludeTaskId)
      and lower(isnull(t.status, N'')) in (N'completada', N'completado', N'finalizada', N'finalizado')
      and (
        @canSeeAll = 1
        or t.assigned_to = @userId
        or exists (
          select 1
          from dbo.profile_branches pb
          where pb.profile_id = @userId
            and pb.branch_id = e.branch_id
        )
        or exists (
          select 1
          from dbo.profiles p
          where p.id = @userId
            and p.branch_id = e.branch_id
        )
      )
    order by fs.submitted_at desc, t.updated_at desc
  `, {
    rbd: [sql.NVarChar(40), rbd],
    excludeTaskId: [sql.UniqueIdentifier, excludeTaskId],
    canSeeAll: [sql.Bit, Boolean(req.user.canManageUsers || req.user.canViewNationalData)],
    userId: [sql.UniqueIdentifier, req.user.id]
  });

  const latest = latestRows[0];
  if (!latest) {
    ok(res, { submissionId: null, folio: null, submittedAt: null, taskId: null, singleAnswerRows: [] });
    return;
  }

  const singleAnswers = await queryRows(`
    select fa.response_item_id, fa.section_id, fa.answer_text, fa.answer_number, fa.answer_date, fa.answer_boolean, fa.answer_json,
      fq.code as question_code, fs.code as section_code
    from dbo.form_answers fa
    join dbo.form_questions fq on fq.id = fa.question_id
    join dbo.form_sections fs on fs.id = fa.section_id
    where fa.submission_id = @submissionId
      and fa.response_item_id is null
      and fs.code = N'rbd-checkers'
  `, { submissionId: [sql.UniqueIdentifier, latest.submission_id] });

  ok(res, {
    submissionId: latest.submission_id,
    folio: latest.folio,
    submittedAt: latest.submitted_at,
    taskId: latest.task_id,
    singleAnswerRows: singleAnswers.map((row) => ({
      ...row,
      form_questions: { code: row.question_code },
      form_sections: { code: row.section_code }
    }))
  });
}));

router.get("/establishments/:rbd/latest-infrastructure", requireAuth, asyncHandler(async (req, res) => {
  const rbd = String(req.params.rbd || "").trim();
  const excludeTaskId = isUuid(req.query.excludeTaskId) ? String(req.query.excludeTaskId).trim() : null;
  if (!rbd) throw httpError(400, "RBD invalido.");

  const latestRows = await queryRows(`
    select top 1
      fs.id as submission_id,
      fs.folio,
      fs.submitted_at,
      t.id as task_id
    from dbo.form_submissions fs
    join dbo.tasks t on t.id = fs.task_id
    join dbo.establishments e on e.id = t.establishment_id
    where e.rbd = @rbd
      and (@excludeTaskId is null or t.id <> @excludeTaskId)
      and lower(isnull(t.status, N'')) in (N'completada', N'completado', N'finalizada', N'finalizado')
      and exists (
        select 1
        from dbo.response_items ri
        join dbo.form_sections section on section.id = ri.section_id
        where ri.submission_id = fs.id
          and section.code = N'infrastructure'
      )
      and (
        @canSeeAll = 1
        or t.assigned_to = @userId
        or exists (
          select 1
          from dbo.profile_branches pb
          where pb.profile_id = @userId
            and pb.branch_id = e.branch_id
        )
        or exists (
          select 1
          from dbo.profiles p
          where p.id = @userId
            and p.branch_id = e.branch_id
        )
      )
    order by fs.submitted_at desc, t.updated_at desc
  `, {
    rbd: [sql.NVarChar(40), rbd],
    excludeTaskId: [sql.UniqueIdentifier, excludeTaskId],
    canSeeAll: [sql.Bit, Boolean(req.user.canManageUsers || req.user.canViewNationalData)],
    userId: [sql.UniqueIdentifier, req.user.id]
  });

  const latest = latestRows[0];
  if (!latest) {
    ok(res, { submissionId: null, folio: null, submittedAt: null, taskId: null, itemRows: [], answerRows: [] });
    return;
  }

  const items = await queryRows(`
    select ri.id, ri.section_id, ri.item_index, ri.item_label, section.code as section_code
    from dbo.response_items ri
    join dbo.form_sections section on section.id = ri.section_id
    where ri.submission_id = @submissionId
      and section.code = N'infrastructure'
    order by ri.item_index
  `, { submissionId: [sql.UniqueIdentifier, latest.submission_id] });

  const answers = await queryRows(`
    select fa.response_item_id, fa.section_id, fa.answer_text, fa.answer_number, fa.answer_date, fa.answer_boolean, fa.answer_json,
      question.code as question_code, section.code as section_code
    from dbo.form_answers fa
    join dbo.form_questions question on question.id = fa.question_id
    join dbo.form_sections section on section.id = fa.section_id
    where fa.submission_id = @submissionId
      and fa.response_item_id is not null
      and section.code = N'infrastructure'
  `, { submissionId: [sql.UniqueIdentifier, latest.submission_id] });

  ok(res, {
    submissionId: latest.submission_id,
    folio: latest.folio,
    submittedAt: latest.submitted_at,
    taskId: latest.task_id,
    itemRows: items.map((row) => ({ ...row, form_sections: { code: row.section_code } })),
    answerRows: answers.map((row) => ({ ...row, form_questions: { code: row.question_code }, form_sections: { code: row.section_code } }))
  });
}));

router.get("/establishments/:rbd/latest-operational-sections", requireAuth, asyncHandler(async (req, res) => {
  const rbd = String(req.params.rbd || "").trim();
  const excludeTaskId = isUuid(req.query.excludeTaskId) ? String(req.query.excludeTaskId).trim() : null;
  if (!rbd) throw httpError(400, "RBD invalido.");

  const latestRows = await queryRows(`
    select top 1
      fs.id as submission_id,
      fs.folio,
      fs.submitted_at,
      t.id as task_id
    from dbo.form_submissions fs
    join dbo.tasks t on t.id = fs.task_id
    join dbo.establishments e on e.id = t.establishment_id
    where e.rbd = @rbd
      and (@excludeTaskId is null or t.id <> @excludeTaskId)
      and lower(isnull(t.status, N'')) in (N'completada', N'completado', N'finalizada', N'finalizado')
      and (
        @canSeeAll = 1
        or t.assigned_to = @userId
        or exists (
          select 1
          from dbo.profile_branches pb
          where pb.profile_id = @userId
            and pb.branch_id = e.branch_id
        )
        or exists (
          select 1
          from dbo.profiles p
          where p.id = @userId
            and p.branch_id = e.branch_id
        )
      )
    order by fs.submitted_at desc, t.updated_at desc
  `, {
    rbd: [sql.NVarChar(40), rbd],
    excludeTaskId: [sql.UniqueIdentifier, excludeTaskId],
    canSeeAll: [sql.Bit, Boolean(req.user.canManageUsers || req.user.canViewNationalData)],
    userId: [sql.UniqueIdentifier, req.user.id]
  });

  const latest = latestRows[0];
  if (!latest) {
    ok(res, { submissionId: null, folio: null, submittedAt: null, taskId: null, itemRows: [], answerRows: [], singleAnswerRows: [] });
    return;
  }

  const [items, answers, singleAnswers] = await Promise.all([
    queryRows(`
      select ri.id, ri.section_id, ri.item_index, ri.item_label, section.code as section_code
      from dbo.response_items ri
      join dbo.form_sections section on section.id = ri.section_id
      where ri.submission_id = @submissionId
        and section.code = N'infrastructure'
      order by ri.item_index
    `, { submissionId: [sql.UniqueIdentifier, latest.submission_id] }),
    queryRows(`
      select fa.response_item_id, fa.section_id, fa.answer_text, fa.answer_number, fa.answer_date, fa.answer_boolean, fa.answer_json,
        question.code as question_code, section.code as section_code
      from dbo.form_answers fa
      join dbo.form_questions question on question.id = fa.question_id
      join dbo.form_sections section on section.id = fa.section_id
      where fa.submission_id = @submissionId
        and fa.response_item_id is not null
        and section.code = N'infrastructure'
    `, { submissionId: [sql.UniqueIdentifier, latest.submission_id] }),
    queryRows(`
      select fa.response_item_id, fa.section_id, fa.answer_text, fa.answer_number, fa.answer_date, fa.answer_boolean, fa.answer_json,
        question.code as question_code, section.code as section_code
      from dbo.form_answers fa
      join dbo.form_questions question on question.id = fa.question_id
      join dbo.form_sections section on section.id = fa.section_id
      where fa.submission_id = @submissionId
        and fa.response_item_id is null
        and section.code in (N'mpa', N'service-yard', N'rbd-checkers')
    `, { submissionId: [sql.UniqueIdentifier, latest.submission_id] })
  ]);

  ok(res, {
    submissionId: latest.submission_id,
    folio: latest.folio,
    submittedAt: latest.submitted_at,
    taskId: latest.task_id,
    itemRows: items.map((row) => ({ ...row, form_sections: { code: row.section_code } })),
    answerRows: answers.map((row) => ({ ...row, form_questions: { code: row.question_code }, form_sections: { code: row.section_code } })),
    singleAnswerRows: singleAnswers.map((row) => ({ ...row, form_questions: { code: row.question_code }, form_sections: { code: row.section_code } }))
  });
}));

router.get("/submissions/:id/detail", requireAuth, asyncHandler(async (req, res) => {
  const submissionId = req.params.id;
  if (!isUuid(submissionId)) throw httpError(400, "submissionId invalido.");
  const [items, answers, singleAnswers, attachments] = await Promise.all([
    queryRows(`
      select ri.id, ri.section_id, ri.item_index, ri.item_label, fs.code as section_code
      from dbo.response_items ri
      join dbo.form_sections fs on fs.id = ri.section_id
      where ri.submission_id = @submissionId
      order by ri.item_index
    `, { submissionId: [sql.UniqueIdentifier, submissionId] }),
    queryRows(`
      select fa.response_item_id, fa.section_id, fa.answer_text, fa.answer_number, fa.answer_date, fa.answer_boolean, fa.answer_json,
        fq.code as question_code, fs.code as section_code
      from dbo.form_answers fa
      join dbo.form_questions fq on fq.id = fa.question_id
      join dbo.form_sections fs on fs.id = fa.section_id
      where fa.submission_id = @submissionId and fa.response_item_id is not null
    `, { submissionId: [sql.UniqueIdentifier, submissionId] }),
    queryRows(`
      select fa.response_item_id, fa.section_id, fa.answer_text, fa.answer_number, fa.answer_date, fa.answer_boolean, fa.answer_json,
        fq.code as question_code, fs.code as section_code
      from dbo.form_answers fa
      join dbo.form_questions fq on fq.id = fa.question_id
      join dbo.form_sections fs on fs.id = fa.section_id
      where fa.submission_id = @submissionId and fa.response_item_id is null
    `, { submissionId: [sql.UniqueIdentifier, submissionId] }),
    queryRows(`
      select id, file_kind, file_name, storage_path, external_url, external_id, metadata, created_at
      from dbo.form_attachments
      where submission_id = @submissionId and file_kind in ('signature', 'onedrive_photo')
      order by created_at
    `, { submissionId: [sql.UniqueIdentifier, submissionId] })
  ]);
  ok(res, {
    itemRows: items.map((row) => ({ ...row, form_sections: { code: row.section_code } })),
    answerRows: answers.map((row) => ({ ...row, form_questions: { code: row.question_code }, form_sections: { code: row.section_code } })),
    singleAnswerRows: singleAnswers.map((row) => ({ ...row, form_questions: { code: row.question_code }, form_sections: { code: row.section_code } })),
    attachmentRows: attachments.map((row) => ({ ...row, metadata: parseJsonObject(row.metadata) }))
  });
}));

module.exports = { router };
