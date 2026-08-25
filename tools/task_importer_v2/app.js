const API_BASE = "http://190.151.96.148:8081";
const TASK_TYPES = ["Plan Preventivo Mantención", "DT", "Mutualidad", "Emergencia", "Acta", "Seremi", "SEC"];

const state = {
  token: "",
  user: null,
  requirePasswordChange: false,
  passwordChangeError: "",
  users: [],
  tasks: [],
  establishments: [],
  branches: [],
  taskBranchId: "",
  route: "bulk",
  selectedFileName: "",
  selectedFileBase64: "",
  bulkRows: [],
  bulkMessage: "",
  bulkMessageType: "",
  bulkBusy: false,
  expandedPendingTechnicianId: "",
  draft: {
    type: "Plan Preventivo Mantención",
    title: "Plan de Mantención - Agosto 2026",
    description: "Mantención preventiva según plan establecido.",
    start: new Date().toISOString().slice(0, 10),
    due: new Date().toISOString().slice(0, 10),
    priority: "media"
  },
  individual: {
    type: "Plan Preventivo Mantención",
    title: "Plan de Mantención - Agosto 2026",
    description: "Mantención preventiva según plan establecido.",
    due: new Date().toISOString().slice(0, 10),
    priority: "media",
    technicianId: "",
    establishmentId: "",
    message: "",
    messageType: ""
  },
  error: ""
};

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function idKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

function sameId(a, b) {
  return idKey(a) && idKey(a) === idKey(b);
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
  return data;
}

function branchId() {
  return state.user?.branchId || state.user?.branch_id || "";
}

function currentUserProfile() {
  const currentId = state.user?.id;
  const currentEmail = normalize(state.user?.email);
  return state.users.find((user) => (currentId && sameId(user.id, currentId)) || (currentEmail && normalize(user.email) === currentEmail)) || null;
}

function userBranchIds(user = state.user) {
  const ids = new Set();
  if (user?.branchId) ids.add(idKey(user.branchId));
  if (user?.branch_id) ids.add(idKey(user.branch_id));
  if (user === state.user) {
    const profile = currentUserProfile();
    if (profile?.branchId) ids.add(idKey(profile.branchId));
    if (profile?.branch_id) ids.add(idKey(profile.branch_id));
    if (profile?.branches?.id) ids.add(idKey(profile.branches.id));
    (profile?.profile_branches || []).forEach((entry) => {
      const id = entry?.branch_id || entry?.branchId || entry?.branches?.id;
      if (id) ids.add(idKey(id));
    });
  }
  (user?.profile_branches || []).forEach((entry) => {
    const id = entry?.branch_id || entry?.branchId || entry?.branches?.id;
    if (id) ids.add(idKey(id));
  });
  return Array.from(ids);
}

function visibleBranches() {
  const assigned = new Set(userBranchIds());
  const canSeeAll = state.user?.canManageUsers || state.user?.canViewNationalData || state.user?.can_view_national_data || state.user?.roles?.can_view_national_data;
  const fromCatalog = state.branches.length ? state.branches : [];
  const branches = canSeeAll ? fromCatalog : fromCatalog.filter((branch) => assigned.has(idKey(branch.id)));
  if (branches.length) return branches;
  const fallback = [];
  const addBranch = (branch) => {
    if (branch?.id && !fallback.some((item) => sameId(item.id, branch.id))) {
      fallback.push({ id: branch.id, name: branch.name || branch.branch_name || branch.id });
    }
  };
  const currentProfile = currentUserProfile();
  addBranch(state.user?.branches);
  addBranch(currentProfile?.branches);
  (currentProfile?.profile_branches || []).forEach((entry) => addBranch(entry?.branches || { id: entry?.branch_id || entry?.branchId, name: entry?.branch_name }));
  (state.user?.profile_branches || []).forEach((entry) => addBranch(entry?.branches || { id: entry?.branch_id || entry?.branchId, name: entry?.branch_name }));
  state.users.forEach((user) => {
    addBranch(user?.branches);
  });
  state.establishments.forEach((item) => {
    addBranch({ id: item?.branch_id || item?.branchId, name: item?.branch_name });
  });
  return canSeeAll ? fallback : fallback.filter((branch) => assigned.has(idKey(branch.id)));
}

function selectedBranchId() {
  const branches = visibleBranches();
  if (state.taskBranchId && branches.some((branch) => sameId(branch.id, state.taskBranchId))) return state.taskBranchId;
  const primaryBranchId = branchId();
  if (primaryBranchId && branches.some((branch) => sameId(branch.id, primaryBranchId))) return primaryBranchId;
  return branches[0]?.id || "";
}

function selectedBranchName() {
  const id = selectedBranchId();
  return visibleBranches().find((branch) => sameId(branch.id, id))?.name || state.establishments[0]?.branch_name || branchName();
}

function branchName() {
  return state.establishments[0]?.branch_name || state.user?.branchName || "Zona asignada";
}

function roleName() {
  if (state.user?.canManageUsers) return "Administrador";
  if (state.user?.canAssignTasks) return "Jefe de Mantención";
  return "Usuario";
}

function initials(name) {
  return String(name || "DT").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function isCompleted(task) {
  return ["completada", "completed"].includes(normalize(task.status));
}

function isUrgent(task) {
  return normalize(task.status) === "urgente" || normalize(task.priority) === "alta" || normalize(task.task_type).includes("emergencia");
}

function activeTasks() {
  return visibleTasks().filter((task) => !isCompleted(task));
}

function technicians() {
  return state.users.filter((user) => normalize(user.roles?.name).startsWith("tecnico"));
}

function technicianBelongsToBranch(user, branchIdValue = selectedBranchId()) {
  if (!branchIdValue) return true;
  return userBranchIds(user).includes(idKey(branchIdValue));
}

function activeTechnicians(branchIdValue = selectedBranchId()) {
  return technicians().filter((user) => normalize(user.status) === "activo" && technicianBelongsToBranch(user, branchIdValue));
}

function filteredEstablishments(branchIdValue = selectedBranchId()) {
  if (!branchIdValue) return state.establishments;
  return state.establishments.filter((item) => sameId(item.branch_id || item.branchId, branchIdValue));
}

function taskBranchId(task) {
  if (task.branch_id) return task.branch_id;
  if (task.branchId) return task.branchId;
  if (task.establishments?.branch_id) return task.establishments.branch_id;
  if (task.establishments?.branchId) return task.establishments.branchId;
  const rbd = String(task.rbd || task.establishments?.rbd || "").trim();
  if (!rbd) return "";
  return state.establishments.find((item) => String(item.rbd || "").trim() === rbd)?.branch_id || "";
}

function visibleTasks(branchIdValue = selectedBranchId()) {
  if (!branchIdValue) return state.tasks;
  const visibleRbd = new Set(filteredEstablishments(branchIdValue).map((item) => String(item.rbd || "").trim()).filter(Boolean));
  return state.tasks.filter((task) => {
    const directBranchId = taskBranchId(task);
    if (directBranchId) return sameId(directBranchId, branchIdValue);
    const rbd = String(task.rbd || task.establishments?.rbd || "").trim();
    return rbd && visibleRbd.has(rbd);
  });
}

function technicianName(user) {
  return user?.full_name || user?.fullName || user?.email || "";
}

function selectedTechnician() {
  const techs = activeTechnicians();
  return techs.find((user) => user.id === state.individual.technicianId) || null;
}

function selectedEstablishment() {
  const establishments = filteredEstablishments();
  return establishments.find((item) => item.id === state.individual.establishmentId) || null;
}

function metrics() {
  const active = activeTasks();
  const tasks = visibleTasks();
  return {
    pending: active.filter((task) => !isUrgent(task)).length,
    active: active.length,
    urgent: active.filter(isUrgent).length,
    completed: tasks.filter(isCompleted).length,
    technicians: activeTechnicians().length,
    total: tasks.length
  };
}

function parseDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function daysBetween(start, end) {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate || endDate < startDate) return null;
  return Math.round(((endDate - startDate) / 86400000) * 10) / 10;
}

function monthLabel(value) {
  const date = parseDate(value);
  if (!date) return "Sin fecha";
  return date.toLocaleDateString("es-CL", { month: "short", year: "numeric" }).replace(".", "");
}

function pct(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

function average(values) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return null;
  return Math.round((clean.reduce((sum, value) => sum + value, 0) / clean.length) * 10) / 10;
}

function technicianIdForTask(task) {
  return task.assigned_to || task.assignedTo || "";
}

function technicianTasks(technician) {
  return visibleTasks().filter((task) => technicianIdForTask(task) === technician.id);
}

function taskDateKey(task) {
  const date = parseDate(task.due_date || task.scheduled_date || task.assigned_at || task.submitted_at || task.completed_at || task.created_at);
  return date ? date.toISOString().slice(0, 10) : "";
}

function visitDate(task) {
  return parseDate(task.submitted_at || task.completed_at || task.updated_at);
}

function sameMonth(date, reference = new Date()) {
  return date && date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}

function businessDaysElapsed(reference = new Date()) {
  let days = 0;
  const cursor = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day >= 1 && day <= 5) days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.max(days, 1);
}

function averageDailyVisits(completedTasks) {
  const currentMonthCompleted = completedTasks.filter((task) => sameMonth(visitDate(task)));
  return Math.round((currentMonthCompleted.length / businessDaysElapsed()) * 10) / 10;
}

function pendingTasksForTechnician(technician) {
  return technicianTasks(technician).filter((task) => !isCompleted(task));
}

function technicianPerformanceRows() {
  return technicians().map((technician) => {
    const tasks = technicianTasks(technician);
    const completed = tasks.filter(isCompleted);
    const urgent = tasks.filter(isUrgent);
    const resolutionTimes = completed.map((task) => daysBetween(task.assigned_at, task.submitted_at || task.completed_at || task.updated_at));
    const avgDays = average(resolutionTimes);
    const lastActivity = completed
      .map((task) => parseDate(task.submitted_at || task.updated_at || task.assigned_at))
      .filter(Boolean)
      .sort((a, b) => b - a)[0];
    const byType = {};
    tasks.forEach((task) => {
      const key = task.task_type || "Sin tipo";
      byType[key] = (byType[key] || 0) + 1;
    });
    return {
      technician,
      name: technicianName(technician),
      email: technician.email || "",
      status: technician.status || "",
      branch: technician.branches?.name || branchName(),
      total: tasks.length,
      active: tasks.filter((task) => !isCompleted(task)).length,
      pendingTasks: pendingTasksForTechnician(technician),
      completed: completed.length,
      urgent: urgent.length,
      completionRate: pct(completed.length, tasks.length),
      avgDays,
      avgDailyVisits: averageDailyVisits(completed),
      lastActivity,
      mainType: Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] || "Sin tareas"
    };
  }).sort((a, b) => b.total - a.total || b.completionRate - a.completionRate || a.name.localeCompare(b.name));
}

function teamPerformance() {
  const rows = technicianPerformanceRows();
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const completed = rows.reduce((sum, row) => sum + row.completed, 0);
  const urgent = rows.reduce((sum, row) => sum + row.urgent, 0);
  const avgDays = average(rows.map((row) => row.avgDays));
  const completedCurrentMonth = visibleTasks().filter((task) => isCompleted(task) && sameMonth(visitDate(task))).length;
  const avgDailyVisits = Math.round((completedCurrentMonth / businessDaysElapsed()) * 10) / 10;
  return {
    rows,
    total,
    completed,
    urgent,
    active: rows.reduce((sum, row) => sum + row.active, 0),
    completionRate: pct(completed, total),
    avgDays,
    avgDailyVisits,
    techniciansWithResolution: rows.filter((row) => row.avgDays !== null).length
  };
}

function technicianMonthlyRows() {
  const months = new Map();
  visibleTasks().forEach((task) => {
    if (!isCompleted(task)) return;
    const completedAt = visitDate(task);
    if (!completedAt) return;
    const key = monthLabel(completedAt);
    if (!months.has(key)) months.set(key, { month: key, total: 0, completed: 0, urgent: 0 });
    const row = months.get(key);
    row.total += 1;
    row.completed += 1;
    if (isUrgent(task)) row.urgent += 1;
  });
  return [...months.values()].map((row) => ({
    ...row,
    completionRate: pct(row.completed, row.total)
  }));
}

function progressBar(value) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return `<div class="progress"><span style="width:${safe}%"></span></div>`;
}

function taskTitle(task) {
  return task.title || task.task_type || "Tarea sin titulo";
}

function taskEstablishment(task) {
  return task.establishments?.name || task.establishment_name || task.establishmentName || `RBD ${task.rbd || task.establishment_rbd || ""}`.trim();
}

function taskDateLabel(task) {
  const key = taskDateKey(task);
  return key || "Sin fecha";
}

function pendingTaskList(row, force = false) {
  if (!force && state.expandedPendingTechnicianId !== row.technician.id) return "";
  const items = row.pendingTasks.length ? row.pendingTasks.map((task) => `
    <li>
      <strong>${escapeHtml(taskTitle(task))}</strong>
      <span>${escapeHtml(taskEstablishment(task))} · ${escapeHtml(taskDateLabel(task))} · ${escapeHtml(task.priority || task.status || "Pendiente")}</span>
    </li>
  `).join("") : `<li><strong>Sin pendientes</strong><span>Este tecnico no tiene tareas abiertas.</span></li>`;
  return `
    <div class="pending-detail">
      <div><b>Detalle de pendientes</b><span>${row.pendingTasks.length} tareas abiertas</span></div>
      <ul>${items}</ul>
    </div>
  `;
}

function previewDraft() {
  return state.route === "single"
    ? {
        title: state.individual.title,
        type: state.individual.type,
        start: new Date().toISOString().slice(0, 10),
        due: state.individual.due,
        priority: state.individual.priority
      }
    : state.draft;
}

function renderLogin() {
  $("#app").innerHTML = `
    <main class="login-shell">
      <section class="login-card">
        <div class="brand-mark"><span class="brand-d"></span><span>DATÁCORA</span></div>
        <h1>Carga masiva de tareas</h1>
        <p>Acceso exclusivo para Jefes de Mantención y Administradores.</p>
        <form id="loginForm">
          <label class="field">Correo
            <input name="email" type="email" autocomplete="username" placeholder="Correo">
          </label>
          <label class="field">Contraseña
            <input name="password" type="password" autocomplete="current-password">
          </label>
          <button class="button primary" type="submit">Ingresar</button>
          <div class="error">${escapeHtml(state.error)}</div>
        </form>
      </section>
    </main>
  `;
  $("#loginForm").addEventListener("submit", login);
}

function isValidPassword(value) {
  const text = String(value || "");
  return text.length >= 8 && /[A-Z]/.test(text) && /[a-z]/.test(text) && /\d/.test(text) && /[^A-Za-z0-9]/.test(text);
}

function renderChangePassword() {
  const name = state.user?.fullName || state.user?.full_name || state.user?.email || "Usuario";
  $("#app").innerHTML = `
    <main class="login-shell">
      <section class="login-card">
        <div class="brand-mark"><span class="brand-d"></span><span>DATÁCORA</span></div>
        <h1>Cambiar contraseña</h1>
        <p>Hola, ${escapeHtml(name)}. Por seguridad debes crear una contraseña nueva antes de continuar.</p>
        <form id="changePasswordForm">
          <label class="field">Nueva contraseña
            <input name="newPassword" type="password" autocomplete="new-password" placeholder="Nueva contraseña">
          </label>
          <label class="field">Confirmar contraseña
            <input name="confirmPassword" type="password" autocomplete="new-password" placeholder="Repite la contraseña">
          </label>
          <p class="password-hint">Mínimo 8 caracteres, con mayúscula, minúscula, número y carácter especial.</p>
          <button class="button primary" type="submit">Guardar contraseña</button>
          <button class="button ghost full" type="button" data-action="logout">Volver al login</button>
          <div class="error">${escapeHtml(state.passwordChangeError)}</div>
        </form>
      </section>
    </main>
  `;
  $("#changePasswordForm").addEventListener("submit", changePassword);
  document.querySelectorAll("[data-action='logout']").forEach((button) => button.addEventListener("click", logout));
}

async function login(event) {
  event.preventDefault();
  state.error = "";
  const form = new FormData(event.currentTarget);
  try {
    const session = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") })
    });
    if (!session.user?.canAssignTasks && !session.user?.canManageUsers) {
      throw new Error("El usuario no tiene permisos para crear tareas.");
    }
    state.token = session.access_token;
    state.user = session.user;
    state.requirePasswordChange = Boolean(session.user?.requirePasswordChange || session.user?.require_password_change);
    if (state.requirePasswordChange) {
      state.passwordChangeError = "";
      renderChangePassword();
      return;
    }
    await loadData();
    renderApp();
  } catch (error) {
    state.error = error.message;
    renderLogin();
  }
}

async function changePassword(event) {
  event.preventDefault();
  state.passwordChangeError = "";
  const form = new FormData(event.currentTarget);
  const newPassword = String(form.get("newPassword") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");
  if (newPassword !== confirmPassword) {
    state.passwordChangeError = "Las contraseñas no coinciden.";
    renderChangePassword();
    return;
  }
  if (!isValidPassword(newPassword)) {
    state.passwordChangeError = "La contraseña debe tener 8 caracteres, mayúscula, minúscula, número y carácter especial.";
    renderChangePassword();
    return;
  }
  try {
    await api("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ password: newPassword })
    });
    state.requirePasswordChange = false;
    if (state.user) {
      state.user.requirePasswordChange = false;
      state.user.require_password_change = false;
    }
    await loadData();
    renderApp();
  } catch (error) {
    state.passwordChangeError = error.message || "No se pudo cambiar la contraseña.";
    renderChangePassword();
  }
}

function logout() {
  state.token = "";
  state.user = null;
  state.requirePasswordChange = false;
  state.passwordChangeError = "";
  state.error = "";
  renderLogin();
}

async function loadData() {
  const catalogsPromise = api("/api/catalogs").catch(() => ({ branches: [] }));
  const [users, tasks, catalogs] = await Promise.all([
    api("/api/users"),
    api("/api/tasks"),
    catalogsPromise
  ]);
  state.users = users;
  state.tasks = tasks;
  state.branches = catalogs.branches || [];
  if (!state.taskBranchId) state.taskBranchId = selectedBranchId();
  await loadEstablishmentsForSelectedBranch();
  ensureSelectionsForBranch();
}

async function loadEstablishmentsForSelectedBranch() {
  const branch = selectedBranchId();
  state.establishments = await api(`/api/establishments?branchId=${encodeURIComponent(branch)}`);
}

function ensureSelectionsForBranch() {
  const techs = activeTechnicians();
  const establishments = filteredEstablishments();
  if (state.individual.technicianId && !techs.some((user) => user.id === state.individual.technicianId)) {
    state.individual.technicianId = "";
  }
  if (state.individual.establishmentId && !establishments.some((item) => item.id === state.individual.establishmentId)) {
    state.individual.establishmentId = "";
  }
}

function navButton(id, label, icon) {
  return `<button class="${state.route === id ? "active" : ""}" data-route="${id}"><span>${icon}</span>${label}</button>`;
}

function navSubButton(id, label) {
  return `<button class="${state.route === id ? "active" : ""}" data-route="${id}">${label}</button>`;
}

function shell(content) {
  const name = state.user?.fullName || state.user?.full_name || state.user?.email || "Usuario";
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand-mark"><span class="brand-d"></span><span>DATÁCORA</span></div>
        <section class="user-card">
          <div class="avatar">${escapeHtml(initials(name))}</div>
          <div class="user-name">${escapeHtml(name)}</div>
          <div class="user-role">${escapeHtml(roleName())}</div>
          <span class="zone-pill">${escapeHtml(branchName())}</span>
        </section>
        <nav class="nav">
          ${navButton("summary", "Resumen", "⌂")}
          <div class="nav-group">
            <button class="${state.route === "tasks" ? "active" : ""}" data-route="tasks"><span>☑</span>Tareas</button>
            <div class="nav-sub">
              ${navSubButton("single", "Crear tarea individual")}
              ${navSubButton("bulk", "Crear tarea masiva")}
            </div>
          </div>
          ${navButton("technicians", "Técnicos", "👥")}
          ${navButton("establishments", "Establecimientos", "▥")}
          ${navButton("reports", "Reportes", "▤")}
          ${navButton("settings", "Configuración", "⚙")}
        </nav>
        <section class="shortcut">
          <strong>Atajos</strong>
          <button data-action="template">▧ Plantilla de tareas</button>
          <button data-route="technicians">👥 Técnicos activos</button>
          <button data-route="establishments">▥ RBD de mi zona</button>
        </section>
        <div class="soser">SOSER</div>
      </aside>
      <section class="content">
        <header class="topbar">
          <label class="search"><input id="globalSearch" placeholder="Buscar (Ctrl + K)"></label>
          <div class="bell">♧<span>${metrics().urgent}</span></div>
          <div class="initials">${escapeHtml(initials(name))}</div>
        </header>
        ${content}
      </section>
    </div>
  `;
}

function page(title, subtitle, body) {
  return `
    <main class="page">
      <header class="page-head">
        <div><h1>${escapeHtml(title)}</h1><div class="page-sub">${escapeHtml(subtitle)}</div></div>
        <button class="button secondary" data-action="logout">Cerrar sesión</button>
      </header>
      ${body}
    </main>
  `;
}

function steps() {
  const rows = [
    ["1", "Información", "Detalles de la tarea"],
    ["2", "Asignación", "Excel de técnicos"],
    ["3", "Establecimientos", "RBDs de mi zona"],
    ["4", "Revisión", "Confirma y crea"]
  ];
  return `<section class="card steps">${rows.map((row, index) => `
    <div class="step ${index === 0 ? "active" : ""}">
      <div class="step-no">${row[0]}</div>
      <div><strong>${row[1]}</strong><span>${row[2]}</span></div>
    </div>`).join("")}</section>`;
}

function stat(label, value) {
  return `<div class="stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function sidePanels() {
  const m = metrics();
  const tech = selectedTechnician();
  const establishment = selectedEstablishment();
  const preview = previewDraft();
  return `
    <aside class="stack">
      <section class="card">
        <h2>Vista previa de la tarea</h2>
        <div class="preview">
          <div class="preview-title">
            <div class="iconbox">☑</div>
            <div>
              <strong>${escapeHtml(preview.title)}</strong><br>
              <span class="tag">${escapeHtml(preview.type)}</span>
            </div>
          </div>
          <dl>
            <dt>Inicio:</dt><dd>${escapeHtml(preview.start)}</dd>
            <dt>Límite:</dt><dd>${escapeHtml(preview.due)}</dd>
            <dt>Prioridad:</dt><dd>${escapeHtml(preview.priority)}</dd>
            <dt>Zona:</dt><dd>${escapeHtml(selectedBranchName())}</dd>
            <dt>Técnico:</dt><dd>${escapeHtml(technicianName(tech) || "Por seleccionar")}</dd>
            <dt>RBD:</dt><dd>${escapeHtml(establishment?.rbd || "Por seleccionar")}</dd>
          </dl>
        </div>
      </section>
      <section class="card">
        <h2>Estado actual</h2>
        <div class="stats-grid">
          ${stat("Pendientes", m.pending)}
          ${stat("Activas", m.active)}
          ${stat("Urgencias", m.urgent)}
          ${stat("Técnicos activos", m.technicians)}
          ${stat("Completadas", m.completed)}
          ${stat("Total tareas", m.total)}
        </div>
      </section>
      <section class="notice"><strong>Creación masiva</strong><br>Se creará una tarea individual por cada fila válida de la planilla.</section>
    </aside>
  `;
}

function bulkPage() {
  const validRows = state.bulkRows.filter((row) => !(row.errors || []).length);
  const invalidRows = state.bulkRows.filter((row) => (row.errors || []).length);
  const body = `
    <div class="layout">
      <div class="stack">
        <section class="card bulk-card">
          <h2>Carga masiva de tareas</h2>
          <p class="muted">Usa la plantilla oficial, completa las filas en Excel y vuelve a cargarla aquí.</p>
          <label class="field">Zona
            <select data-task-branch>
              ${branchOptions()}
            </select>
          </label>
          <div class="bulk-choice-grid">
            <button class="bulk-choice" data-action="template">
              <span>⇩</span>
              <strong>Descargar plantilla</strong>
              <small>Formato compatible con la app móvil.</small>
            </button>
            <label class="bulk-choice file-choice">
              <span>⇧</span>
              <strong>Cargar plantilla</strong>
              <small>${state.selectedFileName ? escapeHtml(state.selectedFileName) : "Selecciona un archivo XLSX."}</small>
              <input class="hidden" type="file" accept=".xlsx" data-action="file">
            </label>
          </div>
          ${state.bulkMessage ? `<div class="message ${state.bulkMessageType === "error" ? "error-message" : ""}">${escapeHtml(state.bulkMessage)}</div>` : ""}
          ${invalidRows.length ? bulkErrorSummary(invalidRows) : ""}
          ${state.selectedFileName ? `<div class="actions"><button class="button ghost" data-action="clear-file">Quitar archivo</button><button class="button primary" data-action="validate-bulk" ${state.bulkBusy ? "disabled" : ""}>${state.bulkBusy ? "Validando..." : "Validar plantilla"}</button>${validRows.length ? `<button class="button primary" data-action="create-bulk" ${state.bulkBusy ? "disabled" : ""}>Crear ${validRows.length} tareas</button>` : ""}</div>` : ""}
        </section>
        ${state.bulkRows.length ? `<section class="card"><h2>Resultado de validaciÃ³n</h2>${bulkRowsTable(state.bulkRows)}</section>` : ""}
        <section class="card">
          <h2>Últimas tareas visibles</h2>
          ${taskTable(visibleTasks().slice(0, 8))}
        </section>
      </div>
      ${sidePanels()}
    </div>
  `;
  return page("Crear tarea masiva", "Descarga o carga la plantilla oficial de tareas.", body);
}

function bulkErrorSummary(rows) {
  return `
    <div class="bulk-error-summary">
      <strong>Errores encontrados</strong>
      <ul>
        ${rows.slice(0, 8).map((row) => `
          <li>
            <span>Fila ${escapeHtml(row.number || "")}</span>
            <p>${escapeHtml((row.errors || []).join(" · "))}</p>
          </li>
        `).join("")}
      </ul>
      ${rows.length > 8 ? `<small>Hay ${rows.length - 8} fila(s) adicionales con error. Revisa el detalle de validación.</small>` : ""}
    </div>
  `;
}

function bulkRowsTable(rows) {
  return table(["Fila", "Estado", "RBD", "Establecimiento", "TÃ©cnico", "Fecha", "Tipo", "Prioridad", "Observación", "Detalle"], rows.map((row) => [
    row.number || "",
    (row.errors || []).length ? "Error" : "Valida",
    row.rbd || "",
    row.establishment || "",
    row.technician || "",
    row.dueDate || "",
    row.type || "",
    row.priority || "",
    row.description || row.payload?.description || "",
    (row.errors || []).join(" | ")
  ]));
}

function options(rows, selectedValue, labelFn) {
  return rows.map((row) => `<option value="${escapeHtml(row.id)}" ${row.id === selectedValue ? "selected" : ""}>${escapeHtml(labelFn(row))}</option>`).join("");
}

function branchOptions() {
  const branches = visibleBranches();
  if (!branches.length) return `<option value="">Zona asignada</option>`;
  return branches.map((branch) => `<option value="${escapeHtml(branch.id)}" ${sameId(branch.id, selectedBranchId()) ? "selected" : ""}>${escapeHtml(branch.name)}</option>`).join("");
}

function singlePage() {
  const techs = activeTechnicians();
  const establishments = filteredEstablishments();
  const body = `
    <div class="layout">
      <div class="stack">
        ${steps()}
        <section class="card">
          <h2>Asignar tarea individual</h2>
          ${state.individual.message ? `<div class="message ${state.individual.messageType === "error" ? "error-message" : ""}">${escapeHtml(state.individual.message)}</div>` : ""}
          <label class="field">Zona
            <select data-task-branch>
              ${branchOptions()}
            </select>
          </label>
          <div class="form-grid">
            <label class="field">Tipo de tarea
              <select data-individual="type">${TASK_TYPES.map((type) => `<option ${state.individual.type === type ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}</select>
            </label>
            <label class="field">Fecha límite
              <input data-individual="due" type="date" value="${escapeHtml(state.individual.due)}">
            </label>
            <label class="field">Prioridad
              <select data-individual="priority">
                ${["baja", "media", "alta"].map((item) => `<option ${state.individual.priority === item ? "selected" : ""}>${item}</option>`).join("")}
              </select>
            </label>
          </div>
          <label class="field">Título de la tarea
            <input data-individual="title" value="${escapeHtml(state.individual.title)}">
          </label>
          <div class="form-grid">
            <label class="field">Técnico
              <select data-individual="technicianId">
                <option value="">Selecciona técnico</option>
                ${options(techs, state.individual.technicianId, (user) => `${technicianName(user)} · ${user.email || ""}`)}
              </select>
            </label>
            <label class="field">Establecimiento / RBD
              <select data-individual="establishmentId">
                <option value="">Selecciona RBD</option>
                ${options(establishments, state.individual.establishmentId, (item) => `${item.rbd} · ${item.name}`)}
              </select>
            </label>
            <label class="field">Estado
              <input readonly value="Pendiente">
            </label>
          </div>
          <label class="field">Descripción
            <textarea data-individual="description">${escapeHtml(state.individual.description)}</textarea>
          </label>
          <div class="actions">
            <button class="button ghost" data-route="tasks">Cancelar</button>
            <button class="button primary" data-action="create-single">Crear tarea</button>
          </div>
        </section>
        <section class="card">
          <h2>Tareas recientes</h2>
          ${taskTable(visibleTasks().slice(0, 8))}
        </section>
      </div>
      ${sidePanels()}
    </div>
  `;
  return page("Crear tarea individual", "Asigna una tarea a un técnico y establecimiento de tu zona.", body);
}

function taskTable(rows) {
  return table(["Estado", "Prioridad", "RBD", "Establecimiento", "Técnico", "Fecha", "Tipo"], rows.map((task) => [
    task.status || "",
    task.priority || "",
    task.rbd || "",
    task.establishment_name || "",
    task.assigned_to_full_name || "",
    task.due_date || "",
    task.task_type || ""
  ]));
}

function table(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${
    rows.length ? rows.map((row) => `<tr>${row.map((cell, index) => `<td class="${index === 0 ? "status" : ""}">${escapeHtml(cell)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}" class="muted">Sin datos para mostrar.</td></tr>`
  }</tbody></table></div>`;
}

function technicianPerformanceTable(rows) {
  const headers = ["Nombre", "Correo", "Estado", "Total", "Pendientes", "Completadas", "% completadas", "Prom. visitas diarias", "Urgencias", "Tipo mas frecuente"];
  const tableRows = rows.map((row) => {
    const isOpen = state.expandedPendingTechnicianId === row.technician.id;
    const pendingButton = `
      <button class="table-link ${isOpen ? "active" : ""}" data-action="toggle-pending" data-technician-id="${escapeHtml(row.technician.id)}">
        ${escapeHtml(row.active)}
      </button>
    `;
    const detail = isOpen ? `
      <tr class="detail-row">
        <td colspan="${headers.length}">${pendingTaskList(row, true)}</td>
      </tr>
    ` : "";
    return `
      <tr>
        <td class="status">${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.email)}</td>
        <td>${escapeHtml(row.status)}</td>
        <td>${escapeHtml(row.total)}</td>
        <td>${pendingButton}</td>
        <td>${escapeHtml(row.completed)}</td>
        <td>${escapeHtml(`${row.completionRate}%`)}</td>
        <td>${escapeHtml(`${row.avgDailyVisits} visitas/dia`)}</td>
        <td>${escapeHtml(row.urgent)}</td>
        <td>${escapeHtml(row.mainType)}</td>
      </tr>
      ${detail}
    `;
  }).join("");
  return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${tableRows || `<tr><td colspan="${headers.length}" class="muted">Sin datos para mostrar.</td></tr>`}</tbody></table></div>`;
}

function summaryPage() {
  const m = metrics();
  const body = `
    <div class="stack">
      <section class="card"><h2>Indicadores de operación</h2><div class="stats-grid">
        ${stat("Pendientes", m.pending)}${stat("Activas", m.active)}${stat("Urgencias", m.urgent)}
        ${stat("Completadas", m.completed)}${stat("Técnicos activos", m.technicians)}${stat("Establecimientos zona", state.establishments.length)}
      </div></section>
      <section class="card"><h2>Tareas recientes</h2>${taskTable(visibleTasks())}</section>
    </div>`;
  return page("Resumen", "Vista rápida de tu zona y carga operativa actual.", body);
}

function tasksPage() {
  return page("Tareas", "Listado de tareas visibles para el perfil conectado.", `<section class="card"><h2>Tareas actuales</h2>${taskTable(visibleTasks())}</section>`);
}

function techniciansPage() {
  const rows = activeTechnicians().map((user) => [user.full_name, user.email, user.roles?.name, user.status, user.branches?.name]);
  return page("Técnicos", "Equipo técnico disponible para asignación.", `<section class="card"><h2>Técnicos</h2>${table(["Nombre", "Correo", "Perfil", "Estado", "Zona"], rows)}</section>`);
}

function establishmentsPage() {
  const rows = state.establishments.map((item) => [item.rbd, item.name, item.commune, item.institution_type, item.branch_name]);
  return page("Establecimientos", `Establecimientos disponibles para ${branchName()}.`, `<section class="card"><h2>RBD de mi zona</h2>${table(["RBD", "Establecimiento", "Comuna", "Tipo", "Zona"], rows)}</section>`);
}

function reportsPage() {
  const byStatus = {};
  const byType = {};
  visibleTasks().forEach((task) => {
    byStatus[task.status || "Sin estado"] = (byStatus[task.status || "Sin estado"] || 0) + 1;
    byType[task.task_type || "Sin tipo"] = (byType[task.task_type || "Sin tipo"] || 0) + 1;
  });
  const rows = [...Object.entries(byStatus).map(([key, value]) => ["Estado", key, value]), ...Object.entries(byType).map(([key, value]) => ["Tipo", key, value])];
  return page("Reportes", "Resumen agrupado para seguimiento operativo.", `<section class="card"><h2>Resumen</h2>${table(["Categoría", "Detalle", "Cantidad"], rows)}</section>`);
}

function settingsPage() {
  return page("Configuración", "Parámetros internos de conexión y sesión.", `<section class="card"><h2>Conexión</h2><p class="muted">La URL del backend se mantiene interna en la aplicación y no se muestra al usuario final.</p><button class="button secondary" data-action="refresh">Actualizar datos</button></section>`);
}

function techniciansPage() {
  const performance = teamPerformance();
  const rows = performance.rows;
  const monthlyRows = technicianMonthlyRows().map((row) => [
    row.month,
    row.total,
    row.completed,
    row.urgent,
    `${row.completionRate}%`
  ]);
  const cards = rows.length ? rows.map((row) => `
    <article class="tech-card">
      <div class="tech-card-head">
        <div class="avatar small">${escapeHtml(initials(row.name))}</div>
        <div>
          <strong>${escapeHtml(row.name)}</strong>
          <span>${escapeHtml(row.email)}</span>
        </div>
      </div>
      <div class="tech-card-metrics">
        <div><b>${escapeHtml(row.total)}</b><span>Tareas</span></div>
        <button class="metric-button ${state.expandedPendingTechnicianId === row.technician.id ? "active" : ""}" data-action="toggle-pending" data-technician-id="${escapeHtml(row.technician.id)}">
          <b>${escapeHtml(row.active)}</b><span>Pendientes</span>
        </button>
        <div><b>${escapeHtml(row.avgDailyVisits)}</b><span>Visitas/dia</span></div>
      </div>
      ${pendingTaskList(row)}
      <div class="tech-progress">
        <div><span>Cumplimiento</span><b>${row.completionRate}%</b></div>
        ${progressBar(row.completionRate)}
      </div>
      <p>${escapeHtml(row.mainType)} · ${escapeHtml(row.branch || "Zona asignada")}</p>
    </article>
  `).join("") : `<div class="muted">Sin tecnicos para mostrar.</div>`;
  const body = `
    <div class="stack">
      <section class="card">
        <h2>Desempeno del equipo tecnico</h2>
        <div class="stats-grid analytics-grid">
          ${stat("Tecnicos activos", activeTechnicians().length)}
          ${stat("Tareas asignadas", performance.total)}
          ${stat("Completadas", performance.completed)}
          ${stat("% cumplimiento", `${performance.completionRate}%`)}
          ${stat("Prom. visitas diarias", performance.avgDailyVisits)}
          ${stat("Urgencias", performance.urgent)}
        </div>
      </section>
      <section class="tech-grid">
        ${cards}
      </section>
      <section class="card">
        <h2>Ranking y detalle por tecnico</h2>
        ${technicianPerformanceTable(rows)}
      </section>
      <section class="card">
        <h2>Desempeno por mes</h2>
        ${table(["Mes", "Formularios contestados", "Completadas", "Urgencias", "% cumplimiento"], monthlyRows)}
      </section>
    </div>
  `;
  return page("Tecnicos", "Desempeno, carga de trabajo y tiempos de resolucion por tecnico.", body);
}

function renderApp() {
  const routes = {
    summary: summaryPage,
    tasks: tasksPage,
    single: singlePage,
    bulk: bulkPage,
    technicians: techniciansPage,
    establishments: establishmentsPage,
    reports: reportsPage,
    settings: settingsPage
  };
  $("#app").innerHTML = shell(routes[state.route]());
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      state.route = button.dataset.route;
      renderApp();
    });
  });
  document.querySelectorAll("[data-action='logout']").forEach((button) => button.addEventListener("click", logout));
  document.querySelectorAll("[data-action='template']").forEach((button) => button.addEventListener("click", downloadBulkTemplate));
  document.querySelectorAll("[data-draft]").forEach((input) => input.addEventListener("input", () => {
    state.draft[input.dataset.draft] = input.value;
    renderApp();
  }));
  document.querySelectorAll("[data-individual]").forEach((input) => input.addEventListener("input", () => {
    state.individual[input.dataset.individual] = input.value;
    state.individual.message = "";
    renderApp();
  }));
  document.querySelectorAll("[data-task-branch]").forEach((input) => input.addEventListener("change", async () => {
    state.taskBranchId = input.value;
    state.individual.technicianId = "";
    state.individual.establishmentId = "";
    state.individual.message = "";
    state.bulkRows = [];
    state.bulkMessage = "";
    await loadEstablishmentsForSelectedBranch();
    ensureSelectionsForBranch();
    renderApp();
  }));
  const file = document.querySelector("[data-action='file']");
  if (file) file.addEventListener("change", async () => {
    const selected = file.files[0];
    state.selectedFileName = selected?.name || "";
    state.selectedFileBase64 = "";
    state.bulkRows = [];
    state.bulkMessage = "";
    if (selected) {
      const buffer = await selected.arrayBuffer();
      state.selectedFileBase64 = arrayBufferToBase64(buffer);
    }
    renderApp();
  });
  document.querySelectorAll("[data-action='clear-file']").forEach((button) => button.addEventListener("click", () => {
    state.selectedFileName = "";
    state.selectedFileBase64 = "";
    state.bulkRows = [];
    state.bulkMessage = "";
    renderApp();
  }));
  document.querySelectorAll("[data-action='validate-placeholder']").forEach((button) => button.addEventListener("click", () => {
    alert("La interfaz 2.0 ya está conectada. El siguiente paso es portar la validación XLSX y creación masiva desde el importador actual.");
  }));
  document.querySelectorAll("[data-action='validate-bulk']").forEach((button) => button.addEventListener("click", validateBulkTemplate));
  document.querySelectorAll("[data-action='create-bulk']").forEach((button) => button.addEventListener("click", createBulkTasks));
  document.querySelectorAll("[data-action='refresh']").forEach((button) => button.addEventListener("click", async () => {
    await loadData();
    renderApp();
  }));
  document.querySelectorAll("[data-action='toggle-pending']").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.technicianId || "";
    state.expandedPendingTechnicianId = state.expandedPendingTechnicianId === id ? "" : id;
    renderApp();
  }));
  document.querySelectorAll("[data-action='create-single']").forEach((button) => button.addEventListener("click", createSingleTask));
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

async function validateBulkTemplate() {
  if (!state.selectedFileBase64) {
    state.bulkMessage = "Selecciona una planilla XLSX.";
    state.bulkMessageType = "error";
    renderApp();
    return;
  }
  state.bulkBusy = true;
  state.bulkMessage = "Validando planilla...";
  state.bulkMessageType = "success";
  renderApp();
  try {
    const response = await fetch("/local/validate-xlsx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileBase64: state.selectedFileBase64,
        users: activeTechnicians(),
        establishments: filteredEstablishments()
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No se pudo validar la planilla.");
    state.bulkRows = data.rows || [];
    state.bulkMessage = `Validacion lista: ${data.valid || 0} validas, ${data.invalid || 0} con errores.`;
    state.bulkMessageType = data.invalid ? "error" : "success";
  } catch (error) {
    state.bulkRows = [];
    state.bulkMessage = error.message || "No se pudo validar la planilla.";
    state.bulkMessageType = "error";
  } finally {
    state.bulkBusy = false;
    renderApp();
  }
}

async function createBulkTasks() {
  const rows = state.bulkRows.filter((row) => !(row.errors || []).length);
  if (!rows.length) {
    state.bulkMessage = "No hay filas validas para crear.";
    state.bulkMessageType = "error";
    renderApp();
    return;
  }
  state.bulkBusy = true;
  state.bulkMessage = `Creando ${rows.length} tareas...`;
  state.bulkMessageType = "success";
  renderApp();
  let created = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const result = await api("/api/tasks", { method: "POST", body: JSON.stringify(row.payload) });
      row.createdId = result.id || "";
      row.status = "Creada";
      row.errors = [];
      created += 1;
    } catch (error) {
      row.status = "Error";
      row.errors = [error.message || "No se pudo crear la tarea."];
      failed += 1;
    }
  }
  state.bulkBusy = false;
  state.bulkMessage = `Carga terminada: ${created} creadas, ${failed} con error.`;
  state.bulkMessageType = failed ? "error" : "success";
  await loadData();
  renderApp();
}

async function createSingleTask() {
  const tech = selectedTechnician();
  const establishment = selectedEstablishment();
  if (!tech || !establishment) {
    state.individual.message = "Selecciona un técnico activo y un establecimiento.";
    state.individual.messageType = "error";
    renderApp();
    return;
  }
  try {
    const created = await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        type: state.individual.type,
        description: state.individual.description,
        dueDate: state.individual.due,
        priority: state.individual.priority,
        status: "pendiente",
        assignedTo: tech.id,
        establishmentId: establishment.id,
        rbd: establishment.rbd
      })
    });
    state.individual.message = `Tarea creada correctamente${created.id ? `: ${created.id}` : "."}`;
    state.individual.messageType = "success";
    await loadData();
    state.route = "tasks";
    renderApp();
  } catch (error) {
    state.individual.message = error.message || "No se pudo crear la tarea.";
    state.individual.messageType = "error";
    renderApp();
  }
}

function columnName(index) {
  let name = "";
  while (index > 0) {
    const mod = (index - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    index = Math.floor((index - mod) / 26);
  }
  return name;
}

function escapeXml(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function xmlCell(rowIndex, colIndex, value) {
  return `<c r="${columnName(colIndex)}${rowIndex}" t="inlineStr"><is><t>${escapeXml(value ?? "")}</t></is></c>`;
}

function worksheetXml(rows, validations = "") {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, colIndex) => xmlCell(rowIndex + 1, colIndex + 1, value)).join("")}</row>`).join("")}</sheetData>${validations}</worksheet>`;
}

function crc32(bytes) {
  if (!crc32.table) {
    crc32.table = Array.from({ length: 256 }, (_, index) => {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      return value >>> 0;
    });
  }
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crc32.table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(bytes, value) { bytes.push(value & 0xff, (value >>> 8) & 0xff); }
function writeUint32(bytes, value) { bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff); }

function createStoredZip(files) {
  const encoder = new TextEncoder();
  const output = [];
  const centralDirectory = [];
  let offset = 0;
  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const checksum = crc32(contentBytes);
    writeUint32(output, 0x04034b50); writeUint16(output, 20); writeUint16(output, 0); writeUint16(output, 0); writeUint16(output, 0); writeUint16(output, 0);
    writeUint32(output, checksum); writeUint32(output, contentBytes.length); writeUint32(output, contentBytes.length); writeUint16(output, nameBytes.length); writeUint16(output, 0);
    output.push(...nameBytes, ...contentBytes);
    const central = [];
    writeUint32(central, 0x02014b50); writeUint16(central, 20); writeUint16(central, 20); writeUint16(central, 0); writeUint16(central, 0); writeUint16(central, 0); writeUint16(central, 0);
    writeUint32(central, checksum); writeUint32(central, contentBytes.length); writeUint32(central, contentBytes.length); writeUint16(central, nameBytes.length); writeUint16(central, 0); writeUint16(central, 0); writeUint16(central, 0); writeUint16(central, 0); writeUint32(central, 0); writeUint32(central, offset);
    central.push(...nameBytes);
    centralDirectory.push(...central);
    offset = output.length;
  });
  const centralOffset = output.length;
  output.push(...centralDirectory);
  writeUint32(output, 0x06054b50); writeUint16(output, 0); writeUint16(output, 0); writeUint16(output, files.length); writeUint16(output, files.length); writeUint32(output, centralDirectory.length); writeUint32(output, centralOffset); writeUint16(output, 0);
  return new Blob([new Uint8Array(output)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function downloadBulkTemplate() {
  const techs = activeTechnicians().map((user) => user.full_name || user.email).filter(Boolean);
  const priorities = ["media", "alta", "baja"];
  const dataRows = [["Fecha planificada", "Nombre TÃ©cnico", "RBD", "Tipo Visita", "Prioridad", "Observación"], ["", "", "", "", "media", ""], ["", "", "", "", "media", ""]];
  const listRows = [["TÃ©cnicos", "Tipos de visita", "Prioridades"]];
  for (let i = 0; i < Math.max(techs.length, TASK_TYPES.length, priorities.length); i += 1) listRows.push([techs[i] || "", TASK_TYPES[i] || "", priorities[i] || ""]);
  const validations = `<dataValidations count="3"><dataValidation type="list" allowBlank="1" sqref="B2:B200"><formula1>Listas!$A$2:$A$${Math.max(2, techs.length + 1)}</formula1></dataValidation><dataValidation type="list" allowBlank="1" sqref="D2:D200"><formula1>Listas!$B$2:$B$${Math.max(2, TASK_TYPES.length + 1)}</formula1></dataValidation><dataValidation type="list" allowBlank="1" sqref="E2:E200"><formula1>Listas!$C$2:$C$${Math.max(2, priorities.length + 1)}</formula1></dataValidation></dataValidations>`;
  const files = [
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Tareas" sheetId="1" r:id="rId1"/><sheet name="Listas" sheetId="2" state="hidden" r:id="rId2"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>` },
    { name: "xl/worksheets/sheet1.xml", content: worksheetXml(dataRows, validations) },
    { name: "xl/worksheets/sheet2.xml", content: worksheetXml(listRows) }
  ];
  const link = document.createElement("a");
  link.href = URL.createObjectURL(createStoredZip(files));
  link.download = `plantilla-carga-masiva-${normalize(selectedBranchName()).replace(/\s+/g, "-") || "datacora"}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1200);
}
renderLogin();

