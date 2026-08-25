require("dotenv").config();

const sql = require("mssql");

const folio = Number(process.argv[2] || 12);

if (!Number.isInteger(folio) || folio <= 0) {
  console.error("Uso: node scripts/ensure-extinguisher-alert-folio.js <folio>");
  process.exit(1);
}

const config = {
  server: process.env.SQLSERVER_HOST || "127.0.0.1",
  port: Number(process.env.SQLSERVER_PORT || 1433),
  database: process.env.SQLSERVER_DATABASE || "DBDATACORA",
  user: process.env.SQLSERVER_USER,
  password: process.env.SQLSERVER_PASSWORD,
  options: {
    encrypt: String(process.env.SQLSERVER_ENCRYPT).toLowerCase() === "true",
    trustServerCertificate: String(process.env.SQLSERVER_TRUST_CERT ?? "true").toLowerCase() === "true"
  }
};

function dateOnlyUtc(value) {
  const iso = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function localTodayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
}

function sqlDateToIso(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function daysUntil(value) {
  const target = dateOnlyUtc(value);
  const today = dateOnlyUtc(localTodayIso());
  if (!target || !today) return null;
  return Math.floor((target.getTime() - today.getTime()) / 86400000);
}

async function main() {
  const pool = await sql.connect(config);
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    const data = await new sql.Request(tx)
      .input("folio", sql.Int, folio)
      .query(`
        select top 1
          fs.id as submission_id,
          fs.task_id,
          fs.technician_id,
          fs.folio,
          branch.id as branch_id,
          est.id as establishment_id,
          est.rbd,
          est.name as establishment_name,
          ri.id as response_item_id,
          ri.item_label,
          fa.answer_date as expiration_date
        from dbo.form_submissions fs
        join dbo.tasks task on task.id = fs.task_id
        join dbo.establishments est on est.id = task.establishment_id
        join dbo.branches branch on branch.id = est.branch_id
        join dbo.response_items ri on ri.submission_id = fs.id
        join dbo.form_answers fa on fa.response_item_id = ri.id
        join dbo.form_questions fq on fq.id = fa.question_id
        join dbo.form_sections sec on sec.id = fa.section_id
        where fs.folio = @folio
          and sec.code in (N'infrastructure', N'infraestructura')
          and lower(fq.code) = N'extinguisherexpirationdate'
        order by ri.item_index;
      `);

    const row = data.recordset[0];
    if (!row) throw new Error(`No encontré vencimiento de extintor para folio ${folio}.`);

    const expirationDate = sqlDateToIso(row.expiration_date);
    const daysToExpire = daysUntil(expirationDate);
    if (!Number.isFinite(daysToExpire)) throw new Error(`Fecha inválida para folio ${folio}: ${expirationDate}`);
    if (daysToExpire >= 30) {
      console.log(`Folio ${folio}: el extintor vence en ${daysToExpire} días. No corresponde alerta.`);
      await tx.rollback();
      return;
    }

    const alertType = daysToExpire < 0 ? "extinguisher_expired" : "extinguisher_expiring";
    const severity = daysToExpire < 0 ? "alta" : "media";
    const establishmentText = `${row.establishment_name || "establecimiento"} RBD ${row.rbd}`;
    const title = daysToExpire < 0
      ? `Extintor en establecimiento ${establishmentText} está vencido`
      : `Extintor en establecimiento ${establishmentText} vence en ${daysToExpire} día${daysToExpire === 1 ? "" : "s"}`;

    const existing = await new sql.Request(tx)
      .input("submissionId", sql.UniqueIdentifier, row.submission_id)
      .input("alertType", sql.NVarChar(80), alertType)
      .query(`
        select top 1 id, status, title
        from dbo.maintenance_alerts
        where submission_id = @submissionId
          and alert_type = @alertType
          and lower(isnull(status, N'')) in (N'pendiente', N'abierta');
      `);

    if (existing.recordset[0]) {
      console.table(existing.recordset);
      console.log(`Folio ${folio}: ya existe una alerta abierta.`);
      await tx.rollback();
      return;
    }

    const id = crypto.randomUUID();
    await new sql.Request(tx)
      .input("id", sql.UniqueIdentifier, id)
      .input("alertType", sql.NVarChar(80), alertType)
      .input("severity", sql.NVarChar(40), severity)
      .input("branchId", sql.UniqueIdentifier, row.branch_id)
      .input("establishmentId", sql.UniqueIdentifier, row.establishment_id)
      .input("taskId", sql.UniqueIdentifier, row.task_id)
      .input("submissionId", sql.UniqueIdentifier, row.submission_id)
      .input("reportedBy", sql.UniqueIdentifier, row.technician_id)
      .input("title", sql.NVarChar(250), title)
      .input("body", sql.NVarChar(sql.MAX), title)
      .input("dueDate", sql.Date, expirationDate)
      .input("daysToExpire", sql.Int, daysToExpire)
      .input("metadata", sql.NVarChar(sql.MAX), JSON.stringify({
        section: "infrastructure",
        itemLabel: row.item_label,
        extinguisherExpirationDate: expirationDate,
        extinguisherExpired: daysToExpire < 0,
        generatedFromScript: true
      }))
      .query(`
        insert into dbo.maintenance_alerts (
          id, alert_type, severity, branch_id, establishment_id, task_id, submission_id,
          reported_by, title, body, due_date, days_to_expire, metadata
        )
        values (
          @id, @alertType, @severity, @branchId, @establishmentId, @taskId, @submissionId,
          @reportedBy, @title, @body, @dueDate, @daysToExpire, @metadata
        );
      `);

    await tx.commit();
    console.log(`Folio ${folio}: alerta creada (${title}).`);
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
