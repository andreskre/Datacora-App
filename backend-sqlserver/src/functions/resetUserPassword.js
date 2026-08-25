const express = require("express");
const { pool, sql } = require("../lib/db");
const { asyncHandler, httpError, ok } = require("../lib/http");
const { requireAuth, requireUserManager } = require("../middleware/auth");
const { generateTemporaryPassword, normalizeEmail, isValidPassword, hashPassword } = require("../lib/security");

const router = express.Router();

async function authorize(req, res, next) {
  const setupSecret = process.env.SETUP_ADMIN_SECRET || process.env.SETUP;
  if (setupSecret && req.headers["x-setup-secret"] === setupSecret) return next();
  return requireAuth(req, res, (error) => {
    if (error) return next(error);
    return requireUserManager(req, res, next);
  });
}

router.post("/", authorize, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password ? String(req.body.password) : generateTemporaryPassword();
  const generatedTemporaryPassword = !req.body?.password;
  const requirePasswordChange = req.body?.requirePasswordChange ?? true;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, "Correo invalido.");
  if (!isValidPassword(password)) throw httpError(400, "La contrasena debe tener 8 caracteres, mayuscula, minuscula, numero y caracter especial.");

  const db = await pool();
  const user = await db.request()
    .input("email", sql.NVarChar(320), email)
    .query("select id from dbo.profiles where email = @email and deleted_at is null");
  if (!user.recordset.length) throw httpError(404, "Usuario no encontrado.");

  await db.request()
    .input("email", sql.NVarChar(320), email)
    .input("passwordHash", sql.NVarChar(255), await hashPassword(password))
    .input("requirePasswordChange", sql.Bit, Boolean(requirePasswordChange))
    .query(`
      update dbo.profiles
      set password_hash = @passwordHash,
          require_password_change = @requirePasswordChange,
          updated_at = sysdatetimeoffset()
      where email = @email and deleted_at is null
    `);

  ok(res, {
    id: user.recordset[0].id,
    email,
    updated: true,
    temporaryPassword: generatedTemporaryPassword ? password : undefined,
    requirePasswordChange
  });
}));

module.exports = { router };
