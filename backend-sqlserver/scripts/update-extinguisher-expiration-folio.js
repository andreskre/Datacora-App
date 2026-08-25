require("dotenv").config();

const sql = require("mssql");

const folio = Number(process.argv[2] || 12);
const expirationDate = String(process.argv[3] || "2026-09-01").slice(0, 10);
const shouldApply = process.argv.includes("--apply");

if (!Number.isInteger(folio) || folio <= 0) {
  console.error("Uso: node scripts/update-extinguisher-expiration-folio.js <folio> <yyyy-mm-dd> [--apply]");
  process.exit(1);
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(expirationDate)) {
  console.error("La fecha debe venir en formato yyyy-mm-dd.");
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

async function main() {
  const pool = await sql.connect(config);
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    const lookup = await new sql.Request(tx)
      .input("folio", sql.Int, folio)
      .query(`
        select
          fs.id as submission_id,
          fs.folio,
          ri.id as response_item_id,
          ri.item_label as item_label,
          fq.code as question_code,
          fq.label as question_label,
          fa.id as answer_id,
          fa.answer_date,
          fa.answer_boolean,
          fa.answer_text
        from dbo.form_submissions fs
        join dbo.response_items ri on ri.submission_id = fs.id
        join dbo.form_answers fa on fa.response_item_id = ri.id
        join dbo.form_questions fq on fq.id = fa.question_id
        join dbo.form_sections sec on sec.id = fa.section_id
        where fs.folio = @folio
          and sec.code in (N'infrastructure', N'infraestructura')
          and (
            lower(fq.code) in (N'extinguisherexpirationdate', N'extinguisherexpired')
            or lower(fq.label) like N'%extintor%'
          )
        order by ri.id, fq.code;
      `);

    console.table(lookup.recordset.map((row) => ({
      folio: row.folio,
      item: row.item_label,
      question_code: row.question_code,
      question_label: row.question_label,
      answer_date: row.answer_date,
      answer_boolean: row.answer_boolean,
      answer_text: row.answer_text
    })));

    const dateAnswers = lookup.recordset.filter((row) => String(row.question_code || "").toLowerCase() === "extinguisherexpirationdate");
    const expiredAnswers = lookup.recordset.filter((row) => String(row.question_code || "").toLowerCase() === "extinguisherexpired");

    if (!dateAnswers.length) {
      throw new Error(`No encontré respuesta de fecha de vencimiento de extintor para folio ${folio}.`);
    }

    if (!shouldApply) {
      await tx.rollback();
      console.log(`Revision solamente. Para aplicar: node scripts/update-extinguisher-expiration-folio.js ${folio} ${expirationDate} --apply`);
      return;
    }

    const today = new Date().toLocaleDateString("en-CA");
    const expired = expirationDate < today;

    for (const row of dateAnswers) {
      await new sql.Request(tx)
        .input("answerId", sql.UniqueIdentifier, row.answer_id)
        .input("expirationDate", sql.Date, expirationDate)
        .query(`
          update dbo.form_answers
          set answer_date = @expirationDate,
              answer_text = null,
              answer_number = null,
              answer_boolean = null,
              answer_json = null
          where id = @answerId;
        `);
    }

    for (const row of expiredAnswers) {
      await new sql.Request(tx)
        .input("answerId", sql.UniqueIdentifier, row.answer_id)
        .input("expired", sql.Bit, expired)
        .query(`
          update dbo.form_answers
          set answer_boolean = @expired,
              answer_text = null,
              answer_number = null,
              answer_date = null,
              answer_json = null
          where id = @answerId;
        `);
    }

    await tx.commit();
    console.log(`Folio ${folio} actualizado: vencimiento extintor = ${expirationDate}, vencido = ${expired ? "Si" : "No"}.`);
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
