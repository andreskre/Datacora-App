const express = require("express");
const { pool, sql } = require("../lib/db");
const { asyncHandler, httpError, ok } = require("../lib/http");
const { normalizeEmail, comparePassword, hashPassword, isValidPassword, signSession } = require("../lib/security");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/login", asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  if (!email || !password) throw httpError(400, "Correo y contrasena requeridos.");

  const db = await pool();
  const result = await db.request()
    .input("email", sql.NVarChar(320), email)
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
        p.password_hash as passwordHash,
        p.require_password_change as requirePasswordChange,
        r.can_manage_users as canManageUsers,
        r.can_assign_tasks as canAssignTasks,
        r.can_view_national_data as canViewNationalData
      from dbo.profiles p
      left join dbo.roles r on r.id = p.role_id
      where p.email = @email and p.deleted_at is null
    `);

  const user = result.recordset[0];
  if (!user || user.status !== "activo") throw httpError(401, "Credenciales invalidas.");
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw httpError(401, "Credenciales invalidas.");

  const loginAt = new Date();
  await db.request()
    .input("id", sql.UniqueIdentifier, user.id)
    .input("loginAt", sql.DateTimeOffset, loginAt)
    .query(`
      update dbo.profiles
      set last_login_at = @loginAt,
          updated_at = sysdatetimeoffset()
      where id = @id and deleted_at is null
    `);

  const token = signSession(user);
  delete user.passwordHash;
  user.lastLoginAt = loginAt.toISOString();
  ok(res, { access_token: token, token_type: "bearer", user });
}));

router.post("/change-password", requireAuth, asyncHandler(async (req, res) => {
  const newPassword = String(req.body?.newPassword || req.body?.password || "");
  if (!isValidPassword(newPassword)) {
    throw httpError(400, "La contrasena debe tener 8 caracteres, mayuscula, minuscula, numero y caracter especial.");
  }

  const db = await pool();
  await db.request()
    .input("id", sql.UniqueIdentifier, req.user.id)
    .input("passwordHash", sql.NVarChar(255), await hashPassword(newPassword))
    .query(`
      update dbo.profiles
      set password_hash = @passwordHash,
          require_password_change = 0,
          updated_at = sysdatetimeoffset()
      where id = @id and deleted_at is null
    `);

  ok(res, { updated: true, requirePasswordChange: false });
}));

module.exports = { router };
