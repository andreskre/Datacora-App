const { pool, sql } = require("../lib/db");
const { httpError } = require("../lib/http");
const { verifySession } = require("../lib/security");

async function requireAuth(req, _res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw httpError(401, "Sesion requerida.");

    const claims = verifySession(token);
    const db = await pool();
    const result = await db.request()
      .input("id", sql.UniqueIdentifier, claims.sub)
      .query(`
        select
          p.id,
          p.full_name as fullName,
          p.email,
          p.rut,
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
        where p.id = @id and p.deleted_at is null
      `);

    const user = result.recordset[0];
    if (!user) throw httpError(401, "Sesion invalida.");
    req.user = user;
    next();
  } catch (error) {
    next(error.status ? error : httpError(401, "Sesion invalida."));
  }
}

function requireUserManager(req, _res, next) {
  if (!req.user?.canManageUsers) return next(httpError(403, "No tienes permisos para gestionar usuarios."));
  next();
}

module.exports = { requireAuth, requireUserManager };
