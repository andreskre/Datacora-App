require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { router: authRouter } = require("./functions/auth");
const { router: createUserRouter } = require("./functions/createUser");
const { router: deleteUserRouter } = require("./functions/deleteUser");
const { router: resetPasswordRouter } = require("./functions/resetUserPassword");
const { router: submitFormRouter } = require("./functions/submitForm");
const { router: taskNotificationRouter } = require("./functions/sendTaskNotification");
const { router: uploadOneDriveRouter } = require("./functions/uploadOneDrivePdf");
const { router: apiRouter } = require("./routes/api");
const { startScheduledNotifications } = require("./lib/scheduledNotifications");

const app = express();
const port = Number(process.env.PORT || 8081);

app.use(cors({
  origin: "*",
  allowedHeaders: ["authorization", "content-type", "x-setup-secret"],
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
}));
app.use(express.json({ limit: "35mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "datacora-sqlserver-backend" });
});

app.use("/auth", authRouter);
app.use("/api", apiRouter);
app.use("/functions/create-user", createUserRouter);
app.use("/functions/delete-user", deleteUserRouter);
app.use("/functions/reset-user-password", resetPasswordRouter);
app.use("/functions/submit-form", submitFormRouter);
app.use("/functions/send-task-notification", taskNotificationRouter);
app.use("/functions/upload-onedrive-pdf", uploadOneDriveRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  const message = err.message || "Error interno.";
  res.status(err.status || 500).json({
    error: message,
    message,
    ...(err.details && typeof err.details === "object" ? err.details : {})
  });
});

app.listen(port, () => {
  console.log(`Datacora SQL Server backend escuchando en http://localhost:${port}`);
  startScheduledNotifications();
});
