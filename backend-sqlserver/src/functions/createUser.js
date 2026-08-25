const express = require("express");
const { sql, transaction, request } = require("../lib/db");
const { asyncHandler, httpError, ok } = require("../lib/http");
const {
  generateTemporaryPassword,
  normalizeEmail,
  formatRut,
  isValidRut,
  hashPassword
} = require("../lib/security");
const { requireAuth, requireUserManager } = require("../middleware/auth");

const router = express.Router();

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function validatePayload(payload) {
  const errors = [];
  const email = normalizeEmail(payload.email);
  const rut = formatRut(payload.rut);
  if (!String(payload.fullName || "").trim()) errors.push("Nombre requerido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Correo invalido.");
  if (!rut || !isValidRut(rut)) errors.push("RUT invalido.");
  if (!isUuid(payload.branchId)) errors.push("Sucursal invalida.");
  if (payload.branchIds && (!Array.isArray(payload.branchIds) || payload.branchIds.some((id) => !isUuid(id)))) errors.push("Sucursales invalidas.");
  if (!isUuid(payload.groupId)) errors.push("Grupo invalido.");
  if (!isUuid(payload.roleId)) errors.push("Cargo invalido.");
  if (payload.status && !["activo", "inactivo"].includes(payload.status)) errors.push("Estado invalido.");
  return errors;
}

router.post("/", requireAuth, requireUserManager, asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const errors = validatePayload(payload);
  if (errors.length) throw httpError(400, "Datos invalidos.", errors);

  const userId = require("crypto").randomUUID();
  const email = normalizeEmail(payload.email);
  const rut = formatRut(payload.rut);
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const branchIds = Array.from(new Set([payload.branchId, ...(payload.branchIds || [])]));

  await transaction(async (tx) => {
    const duplicate = await request(tx)
      .input("email", sql.NVarChar(320), email)
      .query("select id from dbo.profiles where email = @email and deleted_at is null");
    if (duplicate.recordset.length) throw httpError(409, "Ya existe un usuario con ese correo.");

    await request(tx)
      .input("id", sql.UniqueIdentifier, userId)
      .input("fullName", sql.NVarChar(200), String(payload.fullName).trim())
      .input("email", sql.NVarChar(320), email)
      .input("rut", sql.NVarChar(20), rut)
      .input("branchId", sql.UniqueIdentifier, payload.branchId)
      .input("groupId", sql.UniqueIdentifier, payload.groupId)
      .input("roleId", sql.UniqueIdentifier, payload.roleId)
      .input("status", sql.NVarChar(30), payload.status || "activo")
      .input("statusReason", sql.NVarChar(200), String(payload.statusReason || "Disponible").trim())
      .input("passwordHash", sql.NVarChar(255), passwordHash)
      .query(`
        insert into dbo.profiles (
          id, full_name, email, rut, branch_id, group_id, role_id, status, status_reason,
          password_hash, require_password_change, created_at, updated_at
        )
        values (
          @id, @fullName, @email, @rut, @branchId, @groupId, @roleId, @status, @statusReason,
          @passwordHash, 1, sysdatetimeoffset(), sysdatetimeoffset()
        )
      `);

    for (const branchId of branchIds) {
      await request(tx)
        .input("profileId", sql.UniqueIdentifier, userId)
        .input("branchId", sql.UniqueIdentifier, branchId)
        .query("insert into dbo.profile_branches (profile_id, branch_id) values (@profileId, @branchId)");
    }
  });

  ok(res, { id: userId, email, temporaryPassword, requirePasswordChange: true });
}));

module.exports = { router };
