const express = require("express");
const { pool, sql } = require("../lib/db");
const { asyncHandler, httpError, ok } = require("../lib/http");
const { requireAuth } = require("../middleware/auth");
const { sendPushToUserIds } = require("../lib/push");

const router = express.Router();

router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const taskId = String(req.body?.taskId || "").trim();
  if (!taskId) throw httpError(400, "taskId requerido");

  const db = await pool();
  const taskResult = await db.request()
    .input("taskId", sql.UniqueIdentifier, taskId)
    .query(`
      select t.id, t.task_type, t.priority, t.assigned_to, e.rbd, e.name, e.commune
      from dbo.tasks t
      join dbo.establishments e on e.id = t.establishment_id
      where t.id = @taskId
    `);
  const task = taskResult.recordset[0];
  if (!task) throw httpError(404, "Tarea no encontrada");

  const visitType = String(task.task_type || "").trim() || "Tarea";
  const isEmergencyVisit = visitType.toLowerCase().includes("emergencia");
  const title = isEmergencyVisit ? "Nueva emergencia asignada" : "Nueva tarea asignada";
  const body = task.rbd
    ? `${visitType} · RBD ${task.rbd} - ${task.name || "establecimiento"}`
    : `${visitType} disponible en Mis tareas.`;
  const result = await sendPushToUserIds(db, [task.assigned_to], {
    title,
    body,
    data: { type: "task_assigned", taskId: String(task.id), rbd: String(task.rbd || ""), route: "tasks" }
  });

  ok(res, result);
}));

module.exports = { router };
