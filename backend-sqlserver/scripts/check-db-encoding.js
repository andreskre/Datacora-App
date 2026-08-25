require("dotenv").config();

const { pool } = require("../src/lib/db");

async function printQuery(db, title, query) {
  const result = await db.request().query(query);
  console.log(`--- ${title}`);
  result.recordset.forEach((row) => console.log(Object.values(row).join(" | ")));
}

async function main() {
  const db = await pool();
  await printQuery(db, "branches", "select name from dbo.branches order by name");
  await printQuery(db, "roles", "select name from dbo.roles order by name");
  await printQuery(db, "groups", "select name from dbo.groups order by name");
  await printQuery(db, "sections", "select title from dbo.form_sections group by title order by title");
  await printQuery(db, "templates", "select title, visit_type from dbo.form_templates order by title");
  await printQuery(db, "bad-counts", `
    select 'branches' as table_name, count(*) as total from dbo.branches where name like N'%Ã%' or name like N'%Â%'
    union all select 'roles', count(*) from dbo.roles where name like N'%Ã%' or name like N'%Â%'
    union all select 'groups', count(*) from dbo.groups where name like N'%Ã%' or name like N'%Â%'
    union all select 'profiles', count(*) from dbo.profiles where full_name like N'%Ã%' or full_name like N'%Â%'
    union all select 'establishments', count(*) from dbo.establishments where name like N'%Ã%' or name like N'%Â%' or commune like N'%Ã%' or commune like N'%Â%' or address like N'%Ã%' or address like N'%Â%'
    union all select 'form_sections', count(*) from dbo.form_sections where title like N'%Ã%' or title like N'%Â%'
    union all select 'form_templates', count(*) from dbo.form_templates where title like N'%Ã%' or visit_type like N'%Ã%' or title like N'%Â%' or visit_type like N'%Â%'
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
