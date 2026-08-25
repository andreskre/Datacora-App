require("dotenv").config();

const { pool, sql } = require("../src/lib/db");

function fixMojibake(value) {
  if (value === null || value === undefined) return value;
  const text = String(value);
  if (!/[ÃÂ]/.test(text)) return text;
  return Buffer.from(text, "latin1").toString("utf8");
}

async function updateTextColumns(db, tableName, keyColumn, textColumns) {
  const result = await db.request().query(`
    select ${[keyColumn, ...textColumns].map((column) => `[${column}]`).join(", ")}
    from dbo.${tableName}
  `);

  let updated = 0;
  for (const row of result.recordset) {
    const changes = textColumns
      .map((column) => ({ column, oldValue: row[column], newValue: fixMojibake(row[column]) }))
      .filter((change) => change.oldValue !== change.newValue);

    if (!changes.length) continue;

    const request = db.request().input("id", sql.UniqueIdentifier, row[keyColumn]);
    const setters = changes.map((change, index) => {
      request.input(`value${index}`, sql.NVarChar(sql.MAX), change.newValue);
      return `[${change.column}] = @value${index}`;
    });

    await request.query(`update dbo.${tableName} set ${setters.join(", ")} where [${keyColumn}] = @id`);
    updated += 1;
  }

  return updated;
}

async function mergeDuplicateBranches(db) {
  const result = await db.request().query("select id, name from dbo.branches order by created_at, name");
  const byFixedName = new Map();
  let merged = 0;

  for (const branch of result.recordset) {
    const fixedName = fixMojibake(branch.name);
    if (!byFixedName.has(fixedName)) byFixedName.set(fixedName, []);
    byFixedName.get(fixedName).push({ ...branch, fixedName });
  }

  for (const [fixedName, branches] of byFixedName.entries()) {
    const target = branches.find((branch) => branch.name === fixedName) || branches[0];

    if (target.name !== fixedName) {
      await db.request()
        .input("id", sql.UniqueIdentifier, target.id)
        .input("name", sql.NVarChar(120), fixedName)
        .query("update dbo.branches set name = @name where id = @id");
    }

    for (const branch of branches.filter((item) => item.id !== target.id)) {
      await db.request()
        .input("sourceId", sql.UniqueIdentifier, branch.id)
        .input("targetId", sql.UniqueIdentifier, target.id)
        .query(`
          update dbo.profiles set branch_id = @targetId where branch_id = @sourceId;
          update dbo.establishments set branch_id = @targetId where branch_id = @sourceId;

          insert into dbo.profile_branches (profile_id, branch_id)
          select source.profile_id, @targetId
          from dbo.profile_branches source
          where source.branch_id = @sourceId
            and not exists (
              select 1
              from dbo.profile_branches existing
              where existing.profile_id = source.profile_id
                and existing.branch_id = @targetId
            );

          delete from dbo.profile_branches where branch_id = @sourceId;
          delete from dbo.branches where id = @sourceId;
        `);
      merged += 1;
    }
  }

  return merged;
}

async function main() {
  const db = await pool();
  const branchMerges = await mergeDuplicateBranches(db);

  const updated = {};
  updated.groups = await updateTextColumns(db, "groups", "id", ["name"]);
  updated.roles = await updateTextColumns(db, "roles", "id", ["name"]);
  updated.profiles = await updateTextColumns(db, "profiles", "id", ["full_name", "status_reason"]);
  updated.establishments = await updateTextColumns(db, "establishments", "id", ["name", "commune", "institution_type", "address"]);
  updated.form_templates = await updateTextColumns(db, "form_templates", "id", ["code", "title", "visit_type"]);
  updated.form_sections = await updateTextColumns(db, "form_sections", "id", ["title"]);
  updated.article_catalog = await updateTextColumns(db, "article_catalog", "id", ["name"]);
  updated.form_email_recipients = await updateTextColumns(db, "form_email_recipients", "id", ["recipient_kind", "source_name"]);

  console.log(`branch_merges=${branchMerges}`);
  Object.entries(updated).forEach(([table, count]) => console.log(`${table}=${count}`));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
