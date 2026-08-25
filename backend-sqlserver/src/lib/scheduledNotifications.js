const { pool, sql } = require("./db");
const { sendPushToUserIds } = require("./push");

let schedulerTimer = null;
let schedulerRunning = false;

function boolEnv(name, fallback = false) {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "si", "sÃ­"].includes(value);
}

function envText(name, fallback) {
  return String(process.env[name] || fallback).trim();
}

function currentChileParts() {
  const timeZone = envText("SCHEDULED_NOTIFICATIONS_TIMEZONE", "America/Santiago");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    weekday: values.weekday
  };
}

function normalizeTime(value, fallback) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function isBusinessDay(weekday = "") {
  return !["Sat", "Sun", "sáb", "sáb.", "dom", "dom."].includes(String(weekday).trim());
}

function technicianWhereClause() {
  return `
    p.deleted_at is null
    and lower(isnull(p.status, 'activo')) in ('activo', 'active')
    and (
      r.name like N'%Tecnico%'
      or r.name like N'%TÃ©cnico%'
      or r.name like N'%Multifuncional%'
      or p.full_name like N'Tecnico%'
      or p.full_name like N'TÃ©cnico%'
    )
  `;
}

function maintenanceManagerWhereClause() {
  return `
    p.deleted_at is null
    and lower(isnull(p.status, 'activo')) in ('activo', 'active')
    and isnull(r.can_assign_tasks, 0) = 1
    and isnull(r.can_view_notifications, 0) = 1
    and isnull(r.can_manage_users, 0) = 0
    and isnull(r.can_view_national_data, 0) = 0
  `;
}

async function eventAlreadyLogged(db, eventType, date, userId = null) {
  const result = await db.request()
    .input("eventType", sql.NVarChar(80), eventType)
    .input("date", sql.NVarChar(10), date)
    .input("userId", sql.UniqueIdentifier, userId)
    .query(`
      select top 1 id
      from dbo.sync_events
      where event_type = @eventType
        and json_value(metadata, '$.date') = @date
        and (
          (@userId is null and user_id is null)
          or user_id = @userId
        )
    `);
  return Boolean(result.recordset[0]);
}

async function logScheduledEvent(db, eventType, date, metadata = {}, userId = null) {
  await db.request()
    .input("userId", sql.UniqueIdentifier, userId)
    .input("eventType", sql.NVarChar(80), eventType)
    .input("metadata", sql.NVarChar(sql.MAX), JSON.stringify({ ...metadata, date }))
    .query(`
      insert into dbo.sync_events (user_id, event_type, metadata)
      values (@userId, @eventType, @metadata)
    `);
}

function firstName(fullName = "") {
  const cleaned = String(fullName || "").trim().replace(/\s+/g, " ");
  return cleaned.split(" ")[0] || "equipo";
}

function renderTemplate(template, values = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_match, key) => String(values[key] ?? ""));
}

async function technicianRows(db) {
  const result = await db.request().query(`
    select distinct p.id, p.full_name
    from dbo.profiles p
    left join dbo.roles r on r.id = p.role_id
    where ${technicianWhereClause()}
  `);
  return result.recordset.filter((row) => row.id);
}

async function maintenanceManagerRows(db) {
  const result = await db.request().query(`
    select distinct p.id, p.full_name
    from dbo.profiles p
    left join dbo.roles r on r.id = p.role_id
    where ${maintenanceManagerWhereClause()}
  `);
  return result.recordset.filter((row) => row.id);
}

async function sendLoginReminder(db, date) {
  if (!boolEnv("LOGIN_REMINDER_ENABLED", true)) return { skipped: "Recordatorio de inicio desactivado" };
  if (await eventAlreadyLogged(db, "scheduled_login_reminder", date)) return { skipped: "Ya enviado hoy" };

  const recipients = await technicianRows(db);
  if (!recipients.length) {
    await logScheduledEvent(db, "scheduled_login_reminder", date, { skipped: "Sin tecnicos activos" });
    return { skipped: "Sin tecnicos activos" };
  }

  const title = envText("LOGIN_REMINDER_TITLE", "Datacora");
  const body = envText("LOGIN_REMINDER_BODY", "Hola, no olvides iniciar sesion antes de salir a terreno!");
  const result = await sendPushToUserIds(db, recipients.map((row) => row.id), {
    title,
    body,
    data: {
      type: "login_reminder",
      route: "login"
    }
  });
  await logScheduledEvent(db, "scheduled_login_reminder", date, {
    recipients: recipients.length,
    sent: result.sent,
    failed: result.failed,
    tokenCount: result.tokenCount
  });
  return { ...result, recipients: recipients.length };
}

async function sendDailyTechnicianReminder(db, date) {
  if (!boolEnv("DAILY_TECH_REMINDER_ENABLED", true)) return { skipped: "Recordatorio diario desactivado" };
  if (await eventAlreadyLogged(db, "scheduled_daily_technician_reminder", date)) return { skipped: "Ya enviado hoy" };

  const recipients = await technicianRows(db);
  if (!recipients.length) {
    await logScheduledEvent(db, "scheduled_daily_technician_reminder", date, { skipped: "Sin tecnicos activos" });
    return { skipped: "Sin tecnicos activos" };
  }

  const personalizedTitleTemplate = envText("DAILY_TECH_REMINDER_TITLE", "Buen dia, {nombre}");
  const personalizedBodyTemplate = envText(
    "DAILY_TECH_REMINDER_BODY",
    "Recuerda realizar tus visitas y responder los formularios mediante la app, animo para esta nueva jornada!"
  );
  let personalizedSent = 0;
  let personalizedFailed = 0;
  let personalizedTokenCount = 0;

  for (const recipient of recipients) {
    const nombre = firstName(recipient.full_name);
    const result = await sendPushToUserIds(db, [recipient.id], {
      title: renderTemplate(personalizedTitleTemplate, { nombre, nombreCompleto: recipient.full_name || "" }),
      body: renderTemplate(personalizedBodyTemplate, { nombre, nombreCompleto: recipient.full_name || "" }),
      data: {
        type: "daily_technician_reminder",
        route: "tasks"
      }
    });
    personalizedSent += result.sent || 0;
    personalizedFailed += result.failed || 0;
    personalizedTokenCount += result.tokenCount || 0;
  }

  await logScheduledEvent(db, "scheduled_daily_technician_reminder", date, {
    recipients: recipients.length,
    sent: personalizedSent,
    failed: personalizedFailed,
    tokenCount: personalizedTokenCount
  });
  return {
    sent: personalizedSent,
    failed: personalizedFailed,
    tokenCount: personalizedTokenCount,
    recipients: recipients.length
  };

}

async function sendDailyMaintenanceManagerReminder(db, date) {
  if (!boolEnv("DAILY_JM_REMINDER_ENABLED", true)) return { skipped: "Recordatorio JM desactivado" };
  if (await eventAlreadyLogged(db, "scheduled_daily_jm_reminder", date)) return { skipped: "Ya enviado hoy" };

  const recipients = await maintenanceManagerRows(db);
  if (!recipients.length) {
    await logScheduledEvent(db, "scheduled_daily_jm_reminder", date, { skipped: "Sin jefes de mantencion activos" });
    return { skipped: "Sin jefes de mantencion activos" };
  }

  const personalizedTitleTemplate = envText("DAILY_JM_REMINDER_TITLE", "Datacora");
  const personalizedBodyTemplate = envText(
    "DAILY_JM_REMINDER_BODY",
    "Buen dia {nombre}, Te deseamos una excelente jornada liderando al equipo!"
  );
  let personalizedSent = 0;
  let personalizedFailed = 0;
  let personalizedTokenCount = 0;

  for (const recipient of recipients) {
    const nombre = firstName(recipient.full_name);
    const result = await sendPushToUserIds(db, [recipient.id], {
      title: renderTemplate(personalizedTitleTemplate, { nombre, nombreCompleto: recipient.full_name || "" }),
      body: renderTemplate(personalizedBodyTemplate, { nombre, nombreCompleto: recipient.full_name || "" }),
      data: {
        type: "daily_jm_reminder",
        route: "jm-notifications"
      }
    });
    personalizedSent += result.sent || 0;
    personalizedFailed += result.failed || 0;
    personalizedTokenCount += result.tokenCount || 0;
  }

  await logScheduledEvent(db, "scheduled_daily_jm_reminder", date, {
    recipients: recipients.length,
    sent: personalizedSent,
    failed: personalizedFailed,
    tokenCount: personalizedTokenCount
  });
  return {
    sent: personalizedSent,
    failed: personalizedFailed,
    tokenCount: personalizedTokenCount,
    recipients: recipients.length
  };
}

async function overdueTechnicianRows(db, date) {
  const result = await db.request()
    .input("today", sql.Date, date)
    .query(`
      select
        p.id,
        p.full_name,
        count(*) as overdue_count
      from dbo.tasks t
      join dbo.profiles p on p.id = t.assigned_to
      left join dbo.roles r on r.id = p.role_id
      where ${technicianWhereClause()}
        and t.due_date is not null
        and t.due_date < @today
        and lower(isnull(t.status, 'pendiente')) in ('pendiente', 'urgente')
      group by p.id, p.full_name
    `);
  return result.recordset;
}

async function sendOverdueTaskAlerts(db, date) {
  if (!boolEnv("OVERDUE_TASK_ALERT_ENABLED", true)) return { skipped: "Alertas de atrasadas desactivadas" };

  const rows = await overdueTechnicianRows(db, date);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    if (await eventAlreadyLogged(db, "scheduled_overdue_task_alert", date, row.id)) {
      skipped += 1;
      continue;
    }
    const count = Number(row.overdue_count || 0);
    const body = count === 1
      ? "Tienes 1 visita atrasada. RevÃ­sala en Mis tareas."
      : `Tienes ${count} visitas atrasadas. RevÃ­salas en Mis tareas.`;
    const result = await sendPushToUserIds(db, [row.id], {
      title: "Visitas atrasadas pendientes",
      body,
      data: {
        type: "overdue_tasks_alert",
        route: "tasks",
        filter: "overdue",
        overdueCount: String(count)
      }
    });
    sent += result.sent || 0;
    failed += result.failed || 0;
    await logScheduledEvent(db, "scheduled_overdue_task_alert", date, {
      overdueCount: count,
      sent: result.sent,
      failed: result.failed
    }, row.id);
  }

  return { sent, failed, skipped, technicians: rows.length };
}

async function runScheduledNotificationsOnce(force = false) {
  if (schedulerRunning) return { skipped: "Proceso ya en ejecuciÃ³n" };
  schedulerRunning = true;
  try {
    const now = currentChileParts();
    if (!force && !isBusinessDay(now.weekday)) {
      return { date: now.date, time: now.time, weekday: now.weekday, skipped: "Fuera de lunes a viernes" };
    }
    const loginReminderTime = normalizeTime(process.env.LOGIN_REMINDER_TIME, "07:25");
    const jmReminderTime = normalizeTime(process.env.DAILY_JM_REMINDER_TIME, "07:30");
    const reminderTime = normalizeTime(process.env.DAILY_TECH_REMINDER_TIME, "07:40");
    const overdueTime = normalizeTime(process.env.OVERDUE_TASK_ALERT_TIME, "07:45");
    const db = await pool();
    const results = {};

    if (force || now.time === loginReminderTime) {
      results.loginReminder = await sendLoginReminder(db, now.date);
    }
    if (force || now.time === jmReminderTime) {
      results.dailyJmReminder = await sendDailyMaintenanceManagerReminder(db, now.date);
    }
    if (force || now.time === reminderTime) {
      results.dailyReminder = await sendDailyTechnicianReminder(db, now.date);
    }
    if (force || now.time === overdueTime) {
      results.overdueAlerts = await sendOverdueTaskAlerts(db, now.date);
    }

    return { date: now.date, time: now.time, weekday: now.weekday, results };
  } finally {
    schedulerRunning = false;
  }
}

function startScheduledNotifications() {
  if (!boolEnv("SCHEDULED_NOTIFICATIONS_ENABLED", true)) {
    console.log("Notificaciones programadas desactivadas por variable de entorno.");
    return null;
  }
  if (schedulerTimer) return schedulerTimer;
  schedulerTimer = setInterval(() => {
    runScheduledNotificationsOnce().catch((error) => {
      console.warn("No se pudieron ejecutar notificaciones programadas.", error.message);
    });
  }, 60 * 1000);
  runScheduledNotificationsOnce().catch((error) => {
    console.warn("No se pudieron revisar notificaciones programadas al iniciar.", error.message);
  });
  console.log("Notificaciones programadas activas.");
  return schedulerTimer;
}

module.exports = {
  runScheduledNotificationsOnce,
  startScheduledNotifications
};
