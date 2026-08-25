require("dotenv").config();

const sql = require("mssql");
const { signSession } = require("../src/lib/security");

const email = String(process.argv[2] || "pruebajm@soser.cl").toLowerCase();

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
  const result = await pool.request()
    .input("email", sql.NVarChar(320), email)
    .query(`
      select top 1
        p.id,
        p.full_name as fullName,
        p.email,
        p.branch_id as branchId,
        p.group_id as groupId,
        p.role_id as roleId,
        p.status,
        r.can_manage_users as canManageUsers,
        r.can_assign_tasks as canAssignTasks,
        r.can_view_notifications as canViewNotifications,
        r.can_view_national_data as canViewNationalData,
        r.name as roleName
      from dbo.profiles p
      left join dbo.roles r on r.id = p.role_id
      where lower(p.email) = @email
        and p.deleted_at is null;
    `);
  const user = result.recordset[0];
  if (!user) throw new Error(`No encontré usuario ${email}.`);

  const token = signSession(user);
  const response = await fetch("http://127.0.0.1:8081/api/maintenance-alerts", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const text = await response.text();
  console.log(`HTTP ${response.status}`);
  console.log(text);
  await pool.close();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
