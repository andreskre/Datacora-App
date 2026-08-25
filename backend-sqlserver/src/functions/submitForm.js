const express = require("express");
const crypto = require("crypto");
const { sql, pool, transaction, request } = require("../lib/db");
const { asyncHandler, httpError, ok } = require("../lib/http");
const { requireAuth } = require("../middleware/auth");
const { sendPushToUserIds } = require("../lib/push");

const router = express.Router();

async function notifyIncidentResolvedByTask(taskId) {
  if (!isUuid(taskId)) return;
  const db = await pool();
  const result = await db.request()
    .input("taskId", sql.UniqueIdentifier, taskId)
    .query(`
      select
        incident.id,
        incident.title,
        incident.reported_by,
        establishment.rbd,
        establishment.name as establishment_name
      from dbo.maintenance_incidents incident
      join dbo.establishments establishment on establishment.id = incident.establishment_id
      where incident.task_id = @taskId
    `);
  const incident = result.recordset[0];
  if (!incident?.reported_by) return;

  const shortId = String(incident.id).slice(0, 8).toUpperCase();
  return sendPushToUserIds(db, [incident.reported_by], {
    title: `Tu incidencia N° ${shortId} ha sido resuelta`,
    body: incident.rbd
      ? `RBD ${incident.rbd} - ${incident.establishment_name || incident.title || "establecimiento"}`
      : incident.title || "Revisa el detalle en Datacora.",
    data: {
      type: "incident_resolved",
      incidentId: String(incident.id),
      taskId: String(taskId),
      rbd: String(incident.rbd || ""),
      route: "incidents"
    }
  });
}

function isUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value).trim());
}

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "respuesta";
}

function taskStatus(value) {
  const normalized = normalizeCode(value || "");
  if (normalized === "urgente") return "urgente";
  if (normalized === "completada") return "completada";
  if (normalized === "cancelada") return "cancelada";
  return "pendiente";
}

function taskPriority(value) {
  const normalized = normalizeCode(value || "");
  if (normalized === "alta") return "alta";
  if (normalized === "baja") return "baja";
  return "media";
}

function answerType(answer) {
  if (answer.type) return answer.type;
  if (typeof answer.value === "number") return "number";
  if (typeof answer.value === "boolean") return "boolean";
  if (typeof answer.value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(answer.value)) return "date";
  if (typeof answer.value === "object" && answer.value !== null) return "observation";
  return "text";
}

function answerSqlColumns(answer) {
  const value = answer.value;
  const requestedType = answerType(answer);
  const type = requestedType === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? "text" : requestedType;
  return {
    answerType: type,
    answerText: type === "text" || type === "single_choice" || type === "observation"
      ? (typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? ""))
      : null,
    answerNumber: type === "number" ? Number(value) : null,
    answerDate: type === "date" ? String(value) : null,
    answerBoolean: type === "boolean" ? Boolean(value) : null,
    answerJson: typeof value === "object" && value !== null ? JSON.stringify(value) : "{}"
  };
}

function submissionCompletedAtFromPayload(payload) {
  for (const section of payload.sections || []) {
    for (const answer of section.answers || []) {
      if (normalizeCode(answer.code || answer.label) !== "submit_captured_at") continue;
      const date = new Date(String(answer.value || ""));
      if (!Number.isNaN(date.getTime())) return date;
    }
    for (const item of section.items || []) {
      for (const answer of item.answers || []) {
        if (normalizeCode(answer.code || answer.label) !== "submit_captured_at") continue;
        const date = new Date(String(answer.value || ""));
        if (!Number.isNaN(date.getTime())) return date;
      }
    }
  }
  return new Date();
}

function textIncludesExtinguisher(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("extintor");
}

function answerKey(answer = {}) {
  return normalizeCode(answer.code || answer.label);
}

function answerValue(answer = {}) {
  if (answer.value && typeof answer.value === "object") {
    return answer.value.name || answer.value.label || answer.value.title || answer.value.value || JSON.stringify(answer.value);
  }
  return answer.value;
}

function findAnswer(answers = [], keys = []) {
  const keySet = new Set(keys);
  return answers.find((answer) => keySet.has(answerKey(answer)));
}

function upsertAnswer(answers, code, label, type, value) {
  const keys = new Set([normalizeCode(code), normalizeCode(label)]);
  const existing = answers.find((answer) => keys.has(answerKey(answer)));
  if (existing) {
    existing.code = code;
    existing.label = label;
    existing.type = type;
    existing.value = value;
    return;
  }
  answers.push({ code, label, type, value });
}

function normalizeInfrastructureExtinguishers(payload) {
  const todayValue = new Date().toLocaleDateString("en-CA");
  const elementKeys = ["element", "elemento", "elemento_infraestructura", "infraestructura"];
  const expirationKeys = [
    "extinguisherexpirationdate",
    "extinguisher_expiration_date",
    "fecha_vencimiento_extintor",
    "vencimiento_extintor"
  ];

  for (const section of payload.sections || []) {
    const sectionCode = normalizeCode(section.code || section.title);
    if (sectionCode !== "infrastructure" && sectionCode !== "infraestructura") continue;

    for (const item of section.items || []) {
      item.answers = Array.isArray(item.answers) ? item.answers : [];
      const elementAnswer = findAnswer(item.answers, elementKeys);
      const isExtinguisher = textIncludesExtinguisher(item.label) || textIncludesExtinguisher(answerValue(elementAnswer));
      if (!isExtinguisher) continue;

      const expirationAnswer = findAnswer(item.answers, expirationKeys);
      const expirationDate = String(answerValue(expirationAnswer) || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expirationDate)) {
        throw httpError(400, "La fecha de vencimiento del extintor es obligatoria.");
      }

      upsertAnswer(item.answers, "extinguisherExpirationDate", "Fecha vencimiento extintor", "date", expirationDate);
      upsertAnswer(item.answers, "extinguisherExpired", "Extintor vencido", "boolean", expirationDate < todayValue);
    }
  }
}

function dateOnlyUtc(value) {
  const iso = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysUntilDate(value, todayValue = new Date().toLocaleDateString("en-CA")) {
  const target = dateOnlyUtc(value);
  const today = dateOnlyUtc(todayValue);
  if (!target || !today) return null;
  return Math.floor((target.getTime() - today.getTime()) / 86400000);
}

function collectExtinguisherAlerts(payload, establishment = {}) {
  const alerts = [];
  const todayValue = new Date().toLocaleDateString("en-CA");
  const elementKeys = ["element", "elemento", "elemento_infraestructura", "infraestructura"];
  const expirationKeys = [
    "extinguisherexpirationdate",
    "extinguisher_expiration_date",
    "fecha_vencimiento_extintor",
    "vencimiento_extintor"
  ];
  const seen = new Set();

  for (const section of payload.sections || []) {
    const sectionCode = normalizeCode(section.code || section.title);
    if (sectionCode !== "infrastructure" && sectionCode !== "infraestructura") continue;

    for (const [itemIndex, item] of (section.items || []).entries()) {
      const answers = Array.isArray(item.answers) ? item.answers : [];
      const elementAnswer = findAnswer(answers, elementKeys);
      const isExtinguisher = textIncludesExtinguisher(item.label) || textIncludesExtinguisher(answerValue(elementAnswer));
      if (!isExtinguisher) continue;

      const expirationAnswer = findAnswer(answers, expirationKeys);
      const expirationDate = String(answerValue(expirationAnswer) || "").slice(0, 10);
      const daysToExpire = daysUntilDate(expirationDate, todayValue);
      if (!Number.isFinite(daysToExpire)) continue;
      if (daysToExpire >= 30) continue;

      const key = `${itemIndex}:${expirationDate}:${item.label || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const establishmentText = `${establishment.name || "establecimiento"}${establishment.rbd ? ` RBD ${establishment.rbd}` : ""}`;
      const expired = daysToExpire < 0;
      const title = expired
        ? `Extintor en establecimiento ${establishmentText} esta vencido`
        : `Extintor en establecimiento ${establishmentText} vence en ${daysToExpire} dia${daysToExpire === 1 ? "" : "s"}`;

      alerts.push({
        alertType: expired ? "extinguisher_expired" : "extinguisher_expiring",
        severity: expired ? "alta" : "media",
        title,
        body: title,
        dueDate: expirationDate,
        daysToExpire,
        metadata: {
          section: sectionCode,
          itemIndex: itemIndex + 1,
          itemLabel: item.label || "",
          extinguisherExpirationDate: expirationDate,
          extinguisherExpired: expired
        }
      });
    }
  }

  return alerts;
}

async function insertMaintenanceAlerts(tx, context, alerts = []) {
  if (!alerts.length) return [];
  const tableExists = await scalar(tx, "select existsFlag = case when object_id(N'dbo.maintenance_alerts', N'U') is null then 0 else 1 end");
  if (!tableExists?.existsFlag) return [];

  const created = [];
  for (const alert of alerts) {
    const id = crypto.randomUUID();
    await request(tx)
      .input("id", sql.UniqueIdentifier, id)
      .input("alertType", sql.NVarChar(80), alert.alertType)
      .input("severity", sql.NVarChar(40), alert.severity)
      .input("branchId", sql.UniqueIdentifier, context.branchId)
      .input("establishmentId", sql.UniqueIdentifier, context.establishmentId)
      .input("taskId", sql.UniqueIdentifier, context.taskId)
      .input("submissionId", sql.UniqueIdentifier, context.submissionId)
      .input("reportedBy", sql.UniqueIdentifier, context.reportedBy)
      .input("title", sql.NVarChar(250), alert.title)
      .input("body", sql.NVarChar(sql.MAX), alert.body)
      .input("dueDate", sql.Date, alert.dueDate)
      .input("daysToExpire", sql.Int, alert.daysToExpire)
      .input("metadata", sql.NVarChar(sql.MAX), JSON.stringify(alert.metadata || {}))
      .query(`
        insert into dbo.maintenance_alerts (
          id, alert_type, severity, branch_id, establishment_id, task_id, submission_id,
          reported_by, title, body, due_date, days_to_expire, metadata
        )
        values (
          @id, @alertType, @severity, @branchId, @establishmentId, @taskId, @submissionId,
          @reportedBy, @title, @body, @dueDate, @daysToExpire, @metadata
        )
      `);
    created.push({ id, branchId: context.branchId, ...alert });
  }
  return created;
}

async function notifyMaintenanceAlertsToManagers(alerts = [], branchId = "") {
  if (!alerts.length || !branchId) return;
  const db = await pool();
  const managers = await db.request()
    .input("branchId", sql.UniqueIdentifier, branchId)
    .query(`
      select distinct p.id
      from dbo.profiles p
      join dbo.roles r on r.id = p.role_id
      left join dbo.profile_branches pb on pb.profile_id = p.id
      where p.deleted_at is null
        and p.status = N'activo'
        and isnull(r.can_assign_tasks, 0) = 1
        and isnull(r.can_view_notifications, 0) = 1
        and isnull(r.can_manage_users, 0) = 0
        and (p.branch_id = @branchId or pb.branch_id = @branchId)
    `);
  const userIds = managers.recordset.map((row) => row.id).filter(Boolean);
  if (!userIds.length) return;

  for (const alert of alerts) {
    await sendPushToUserIds(db, userIds, {
      title: alert.alertType === "extinguisher_expired" ? "Extintor vencido" : "Extintor por vencer",
      body: alert.title,
      data: {
        type: "maintenance_alert",
        alertType: alert.alertType,
        alertId: String(alert.id || ""),
        route: "jm-notifications"
      }
    });
  }
}

async function scalar(tx, query, inputs = {}) {
  const req = request(tx);
  Object.entries(inputs).forEach(([key, [type, value]]) => req.input(key, type, value));
  const result = await req.query(query);
  return result.recordset[0];
}

async function ensureSection(tx, templateId, section, sortOrder, cache) {
  if (cache.has(section.code)) return cache.get(section.code);
  let row = await scalar(tx, `
    select id, code from dbo.form_sections
    where template_id = @templateId and code = @code
  `, {
    templateId: [sql.UniqueIdentifier, templateId],
    code: [sql.NVarChar(80), section.code]
  });

  if (!row) {
    const id = crypto.randomUUID();
    await request(tx)
      .input("id", sql.UniqueIdentifier, id)
      .input("templateId", sql.UniqueIdentifier, templateId)
      .input("code", sql.NVarChar(80), section.code)
      .input("title", sql.NVarChar(200), section.title)
      .input("sortOrder", sql.Int, sortOrder)
      .query(`
        insert into dbo.form_sections (id, template_id, code, title, sort_order)
        values (@id, @templateId, @code, @title, @sortOrder)
      `);
    row = { id, code: section.code };
  }
  cache.set(section.code, row);
  return row;
}

async function ensureQuestion(tx, sectionId, answer, sortOrder, cache) {
  const code = normalizeCode(answer.code || answer.label);
  const cacheKey = `${sectionId}:${code}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let row = await scalar(tx, `
    select id, answer_type as answerType from dbo.form_questions
    where section_id = @sectionId and code = @code
  `, {
    sectionId: [sql.UniqueIdentifier, sectionId],
    code: [sql.NVarChar(80), code]
  });

  if (!row) {
    const id = crypto.randomUUID();
    await request(tx)
      .input("id", sql.UniqueIdentifier, id)
      .input("sectionId", sql.UniqueIdentifier, sectionId)
      .input("code", sql.NVarChar(80), code)
      .input("label", sql.NVarChar(300), answer.label || code)
      .input("answerType", sql.NVarChar(40), answerType(answer))
      .input("sortOrder", sql.Int, sortOrder)
      .query(`
        insert into dbo.form_questions (id, section_id, code, label, answer_type, sort_order, is_required)
        values (@id, @sectionId, @code, @label, @answerType, @sortOrder, 0)
      `);
    row = { id, answerType: answerType(answer) };
  }
  cache.set(cacheKey, row);
  return row;
}

async function insertAnswer(tx, submissionId, sectionId, itemId, answer, sortOrder, questionCache) {
  const question = await ensureQuestion(tx, sectionId, answer, sortOrder, questionCache);
  const columns = answerSqlColumns(answer);
  await request(tx)
    .input("id", sql.UniqueIdentifier, crypto.randomUUID())
    .input("submissionId", sql.UniqueIdentifier, submissionId)
    .input("responseItemId", sql.UniqueIdentifier, itemId)
    .input("sectionId", sql.UniqueIdentifier, sectionId)
    .input("questionId", sql.UniqueIdentifier, question.id)
    .input("answerType", sql.NVarChar(40), columns.answerType)
    .input("answerText", sql.NVarChar(sql.MAX), columns.answerText)
    .input("answerNumber", sql.Decimal(18, 4), columns.answerNumber)
    .input("answerDate", sql.Date, columns.answerDate)
    .input("answerBoolean", sql.Bit, columns.answerBoolean)
    .input("answerJson", sql.NVarChar(sql.MAX), columns.answerJson)
    .query(`
      insert into dbo.form_answers (
        id, submission_id, response_item_id, section_id, question_id, answer_type,
        answer_text, answer_number, answer_date, answer_boolean, answer_json
      )
      values (
        @id, @submissionId, @responseItemId, @sectionId, @questionId, @answerType,
        @answerText, @answerNumber, @answerDate, @answerBoolean, @answerJson
      )
    `);
}

router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const payload = req.body || {};
  if (!payload.task?.rbd || !payload.task?.type || !Array.isArray(payload.sections)) {
    throw httpError(400, "Payload de formulario incompleto.");
  }
  normalizeInfrastructureExtinguishers(payload);

  const result = await transaction(async (tx) => {
    const establishment = await scalar(tx, "select id, rbd, name, branch_id as branchId from dbo.establishments where rbd = @rbd", {
      rbd: [sql.NVarChar(30), String(payload.task.rbd)]
    });
    if (!establishment) throw httpError(404, `RBD ${payload.task.rbd} no existe en SQL Server.`);

    const template = await scalar(tx, "select top 1 id, code, visit_type from dbo.form_templates where visit_type = @visitType order by created_at", {
      visitType: [sql.NVarChar(120), payload.task.type]
    });
    if (!template) throw httpError(404, `No existe plantilla para ${payload.task.type}.`);

    let taskId = isUuid(payload.task.id) ? payload.task.id : "";
    if (!taskId) {
      taskId = crypto.randomUUID();
      await request(tx)
        .input("id", sql.UniqueIdentifier, taskId)
        .input("taskType", sql.NVarChar(120), payload.task.type)
        .input("establishmentId", sql.UniqueIdentifier, establishment.id)
        .input("assignedTo", sql.UniqueIdentifier, req.user.id)
        .input("assignedBy", sql.UniqueIdentifier, req.user.id)
        .input("templateId", sql.UniqueIdentifier, template.id)
        .input("description", sql.NVarChar(500), payload.task.description || "Formulario enviado desde Datacora.")
        .input("dueDate", sql.Date, payload.task.dueDate || new Date())
        .input("status", sql.NVarChar(40), taskStatus(payload.task.priority) === "urgente" ? "urgente" : "pendiente")
        .input("priority", sql.NVarChar(40), taskPriority(payload.task.priority))
        .query(`
          insert into dbo.tasks (
            id, task_type, establishment_id, assigned_to, assigned_by, form_template_id,
            description, due_date, status, priority, sync_state, created_at, updated_at
          )
          values (
            @id, @taskType, @establishmentId, @assignedTo, @assignedBy, @templateId,
            @description, @dueDate, @status, @priority, 'pending', sysdatetimeoffset(), sysdatetimeoffset()
          )
        `);
    }

    const localUuid = isUuid(payload.localUuid) ? payload.localUuid : crypto.randomUUID();
    const existing = await scalar(tx, `
      select id, task_id as taskId, submitted_at as submittedAt, folio
      from dbo.form_submissions
      where local_uuid = @localUuid
    `, { localUuid: [sql.UniqueIdentifier, localUuid] });
    if (existing) {
      const counts = await scalar(tx, "select count(1) as answerCount from dbo.form_answers where submission_id = @id", {
        id: [sql.UniqueIdentifier, existing.id]
      });
      return {
        ok: true,
        duplicate: true,
        submissionId: existing.id,
        folio: existing.folio,
        taskId: existing.taskId,
        submittedAt: existing.submittedAt,
        answerCount: counts?.answerCount || 1,
        itemCount: 0,
        attachmentCount: 0,
        warnings: []
      };
    }

    const submissionId = crypto.randomUUID();
    const completedAt = submissionCompletedAtFromPayload(payload);
    const inserted = await scalar(tx, `
      insert into dbo.form_submissions (
        id, task_id, technician_id, status, local_uuid, submitted_at, synced_at
      )
      output inserted.id, inserted.folio, inserted.submitted_at as submittedAt
      values (@id, @taskId, @technicianId, 'submitted', @localUuid, @submittedAt, sysdatetimeoffset())
    `, {
      id: [sql.UniqueIdentifier, submissionId],
      taskId: [sql.UniqueIdentifier, taskId],
      technicianId: [sql.UniqueIdentifier, req.user.id],
      localUuid: [sql.UniqueIdentifier, localUuid],
      submittedAt: [sql.DateTimeOffset, completedAt]
    });

    const sectionCache = new Map();
    const questionCache = new Map();
    let itemCount = 0;
    let answerCount = 0;
    let attachmentCount = 0;
    const warnings = [];

    for (const [sectionIndex, section] of payload.sections.entries()) {
      const sectionRow = await ensureSection(tx, template.id, section, sectionIndex + 1, sectionCache);
      let sortOrder = 1;

      for (const answer of section.answers || []) {
        if (answer.value === "" || answer.value === null || answer.value === undefined) continue;
        await insertAnswer(tx, submissionId, sectionRow.id, null, answer, sortOrder++, questionCache);
        answerCount += 1;
      }

      for (const [itemIndex, item] of (section.items || []).entries()) {
        const responseItemId = crypto.randomUUID();
        await request(tx)
          .input("id", sql.UniqueIdentifier, responseItemId)
          .input("submissionId", sql.UniqueIdentifier, submissionId)
          .input("sectionId", sql.UniqueIdentifier, sectionRow.id)
          .input("itemIndex", sql.Int, itemIndex + 1)
          .input("itemLabel", sql.NVarChar(300), item.label || `${section.title} ${itemIndex + 1}`)
          .query(`
            insert into dbo.response_items (id, submission_id, section_id, item_index, item_label)
            values (@id, @submissionId, @sectionId, @itemIndex, @itemLabel)
          `);
        itemCount += 1;

        for (const answer of item.answers || []) {
          if (answer.value === "" || answer.value === null || answer.value === undefined) continue;
          await insertAnswer(tx, submissionId, sectionRow.id, responseItemId, answer, sortOrder++, questionCache);
          answerCount += 1;
        }
      }
    }

    for (const signature of payload.signatures || []) {
      if (!signature.dataUrl) continue;
      try {
        await request(tx)
          .input("id", sql.UniqueIdentifier, crypto.randomUUID())
          .input("submissionId", sql.UniqueIdentifier, submissionId)
          .input("fileKind", sql.NVarChar(40), "signature")
          .input("storageProvider", sql.NVarChar(40), "inline")
          .input("storagePath", sql.NVarChar(500), `inline-signature/${submissionId}/${signature.kind}.png`)
          .input("mimeType", sql.NVarChar(100), "image/png")
          .input("fileName", sql.NVarChar(255), `${signature.kind}.png`)
          .input("metadata", sql.NVarChar(sql.MAX), JSON.stringify({ label: signature.label, data_url: signature.dataUrl }))
          .query(`
            insert into dbo.form_attachments (
              id, submission_id, file_kind, storage_provider, storage_path, mime_type, file_name, metadata
            )
            values (@id, @submissionId, @fileKind, @storageProvider, @storagePath, @mimeType, @fileName, @metadata)
          `);
        attachmentCount += 1;
      } catch (error) {
        warnings.push(`No se pudo guardar firma ${signature.kind}: ${error.message}`);
      }
    }

    await request(tx)
      .input("taskId", sql.UniqueIdentifier, taskId)
      .query(`
        update dbo.tasks
        set status = 'completada',
            sync_state = 'synced',
            updated_at = sysdatetimeoffset()
        where id = @taskId
      `);

    await request(tx)
      .input("taskId", sql.UniqueIdentifier, taskId)
      .query(`
        if object_id(N'dbo.maintenance_incidents', N'U') is not null
        begin
          update dbo.maintenance_incidents
          set status = N'Resuelta',
              updated_at = sysdatetimeoffset()
          where task_id = @taskId
        end
      `);

    const maintenanceAlerts = await insertMaintenanceAlerts(tx, {
      branchId: establishment.branchId,
      establishmentId: establishment.id,
      taskId,
      submissionId,
      reportedBy: req.user.id
    }, collectExtinguisherAlerts(payload, establishment));

    return {
      submissionId: inserted.id,
      folio: inserted.folio,
      taskId,
      submittedAt: inserted.submittedAt,
      sectionCount: payload.sections.length,
      itemCount,
      answerCount,
      attachmentCount,
      maintenanceAlertCount: maintenanceAlerts.length,
      maintenanceAlerts,
      warnings,
      submitted: true
    };
  });

  notifyIncidentResolvedByTask(result.taskId).catch((error) => {
    console.warn("La incidencia fue resuelta, pero no se pudo notificar al prevencionista.", error.message);
  });
  notifyMaintenanceAlertsToManagers(result.maintenanceAlerts, result.maintenanceAlerts?.[0]?.branchId || null).catch((error) => {
    console.warn("La bitacora fue guardada, pero no se pudo notificar alertas de extintor al JM.", error.message);
  });

  ok(res, result);
}));

module.exports = { router };
