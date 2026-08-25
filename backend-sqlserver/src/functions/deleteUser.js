const express = require("express");
const { pool, sql, transaction, request } = require("../lib/db");
const { asyncHandler, httpError, ok } = require("../lib/http");
const { requireAuth, requireUserManager } = require("../middleware/auth");

const router = express.Router();

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

async function countDependency(db, table, column, userId) {
  const allowed = new Set(["tasks.assigned_to", "tasks.assigned_by", "form_submissions.technician_id", "sync_events.user_id"]);
  if (!allowed.has(`${table}.${column}`)) throw new Error("Dependencia no permitida.");
  const result = await db.request()
    .input("userId", sql.UniqueIdentifier, userId)
    .query(`select count(1) as count from dbo.${table} where ${column} = @userId`);
  return Number(result.recordset[0]?.count || 0);
}

router.post("/", requireAuth, requireUserManager, asyncHandler(async (req, res) => {
  const userId = String(req.body?.userId || "").trim();
  if (!isUuid(userId)) throw httpError(400, "Usuario invalido.");
  if (userId === req.user.id) throw httpError(400, "No puedes eliminar tu propio usuario administrador.");

  const db = await pool();
  const target = await db.request()
    .input("id", sql.UniqueIdentifier, userId)
    .query("select id, email, full_name from dbo.profiles where id = @id and deleted_at is null");
  if (!target.recordset.length) throw httpError(404, "Usuario no encontrado.");

  const dependencies = [
    ["tasks", "assigned_to", await countDependency(db, "tasks", "assigned_to", userId)],
    ["tasks", "assigned_by", await countDependency(db, "tasks", "assigned_by", userId)],
    ["form_submissions", "technician_id", await countDependency(db, "form_submissions", "technician_id", userId)],
    ["sync_events", "user_id", await countDependency(db, "sync_events", "user_id", userId)]
  ].filter(([, , count]) => count > 0);

  if (dependencies.length) {
    throw httpError(409, "No se puede eliminar un usuario con tareas, formularios o eventos asociados. Dejalo inactivo para mantener la trazabilidad.", dependencies.map(([table, column, count]) => ({ table, column, count })));
  }

  await transaction(async (tx) => {
    await request(tx).input("id", sql.UniqueIdentifier, userId).query("delete from dbo.profile_branches where profile_id = @id");
    await request(tx).input("id", sql.UniqueIdentifier, userId).query("update dbo.profiles set deleted_at = sysdatetimeoffset(), updated_at = sysdatetimeoffset() where id = @id");
  });

  ok(res, { id: userId, email: target.recordset[0].email, deleted: true });
}));

module.exports = { router };
