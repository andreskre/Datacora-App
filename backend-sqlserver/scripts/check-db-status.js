require("dotenv").config();

const { pool } = require("../src/lib/db");

const requiredTables = [
  "branches",
  "roles",
  "profiles",
  "establishments",
  "tasks",
  "form_templates",
  "form_sections",
  "form_questions",
  "form_submissions",
  "response_items",
  "form_answers",
  "form_attachments",
  "form_email_recipients",
  "article_catalog"
];

async function main() {
  const db = await pool();
  const tablesResult = await db.request().query(`
    select table_name
    from information_schema.tables
    where table_schema = 'dbo'
      and table_type = 'BASE TABLE'
    order by table_name
  `);

  const tableNames = tablesResult.recordset.map((row) => row.table_name);
  console.log(`database=${process.env.SQLSERVER_DATABASE || "DBDATACORA"}`);
  console.log(`tables=${tableNames.length}`);
  console.log(`missing=${requiredTables.filter((name) => !tableNames.includes(name)).join(",") || "none"}`);

  for (const tableName of requiredTables.filter((name) => tableNames.includes(name))) {
    const countResult = await db.request().query(`select count(*) as total from dbo.${tableName}`);
    console.log(`${tableName}=${countResult.recordset[0].total}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
