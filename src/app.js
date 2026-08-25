(function () {
const rootEl = document.querySelector("#app");
const datacoraData = window.DatacoraData;
const articleCatalog = window.DatacoraArticles ?? [];
const supabaseConfig = window.DatacoraSupabaseConfig ?? {};
const apiConfig = window.DatacoraApiConfig ?? {};
const MAX_EVIDENCE_PHOTOS_PER_ELEMENT = 3;

if (!datacoraData) {
  rootEl.innerHTML = `
    <main class="screen">
      <section class="empty-state">
        <h2>No se pudo iniciar Datácora</h2>
        <p>Revisa que el archivo src/data.js esté cargando correctamente.</p>
      </section>
    </main>
  `;
  throw new Error("DatacoraData is not available");
}

const { establishments, formBlueprints, taskHistory, tasks, users } = datacoraData;

function isNativePlatform() {
  const capacitor = window.Capacitor;
  if (!capacitor) return false;
  if (typeof capacitor.isNativePlatform === "function") return capacitor.isNativePlatform();
  if (typeof capacitor.getPlatform === "function") {
    return ["android", "ios"].includes(capacitor.getPlatform());
  }
  return Boolean(capacitor.Plugins);
}

const state = {
  isAuthenticated: false,
  route: "tasks",
  filter: "Pendientes",
  technicianTaskSearch: "",
  technicianRbdSearch: "",
  technicianSelectedRbd: "",
  technicianOverdueCriticality: "",
  jmOverdueCriticality: "",
  selectedTaskId: tasks[0]?.id,
  currentUser: null,
  loginError: "",
  loginMessage: "",
  passwordChangeError: "",
  generatedPassword: "",
  generatedPasswords: [],
  passwordResetBusyUserId: "",
  userCreateDraft: {
    nombre: "",
    usuario: "",
    rut: "",
    grupo: "Mantenimiento",
    cargo: "",
    sucursales: ["Santiago"]
  },
  userCreateError: "",
  userCreateBusy: false,
  formSubmitBusy: false,
  pdfUploadBusy: false,
  jmPdfDownloadBusy: false,
  pdfPreviewBusy: false,
  pdfPreviewHtml: "",
  pdfPreviewError: "",
  pdfPreviewZoom: 1,
  fieldErrorRoles: [],
  lastLocalSaveAt: "",
  inlineFormStatus: "",
  connectionDiagnosticBusy: false,
  connectionDiagnostic: null,
  permissionCheckBusy: false,
  permissionCheckMessage: "",
  locationCheckBusy: false,
  locationGateTaskIds: {},
  locationEvidenceByTask: {},
  remoteLocationEvidenceByTask: {},
  syncBusy: false,
  taskRefreshUiBusy: false,
  incidentRefreshUiBusy: false,
  messageRefreshUiBusy: false,
  submissionDetailBusy: false,
  submissionDetailError: "",
  submissionDetailLoadedIds: {},
  submissionPhotoLoadAttempts: {},
  submissionPhotoWarnings: {},
  imagePreview: null,
  articlePicker: null,
  lastSyncAt: "",
  networkOnline: navigator.onLine,
  supabaseSession: null,
  supabaseCatalogs: {
    branches: [],
    groups: [],
    roles: []
  },
  expandedUserId: "",
  expandedGroup: "",
  expandedJmZone: "",
  jmCompletedFilters: {
    search: "",
    rbd: "",
    folio: "",
    technician: "",
    branch: "",
    submittedFrom: "",
    submittedTo: ""
  },
  assignTechnician: "",
  assignBranch: "",
  assignRbdSearch: "",
  assignSelectedRbd: "",
  assignType: "",
  assignPriority: "",
  assignDueAt: "",
  assignDescription: "",
  assignRequiredSections: [],
  assignCriticalSections: [],
  assignSectionMinimums: {},
  assignEditingTaskId: "",
  assignConflictTaskId: "",
  assignConflictDraft: null,
  bulkImportErrors: [],
  bulkImportSummary: "",
  appMessages: [],
  sentAppMessages: [],
  maintenanceAlerts: [],
  maintenanceAlertRefreshBusy: false,
  maintenanceAlertResolveBusyId: "",
  maintenanceAlertResolutionDates: {},
  maintenanceAlertsLastRefreshAt: 0,
  messageDraft: {
    title: "",
    body: "",
    recipientId: ""
  },
  messageSendBusy: false,
  messageError: "",
  selectedMessageId: "",
  selectedMessageDetail: null,
  messageDetailBusy: false,
  messageDetailError: "",
  messageReplyDraft: "",
  messageReplyBusy: false,
  procedures: [],
  procedureSearch: "",
  procedureRefreshBusy: false,
  procedureError: "",
  procedureUploadDraft: {
    title: "",
    description: "",
    category: "",
    externalUrl: "",
    fileName: "",
    fileMime: "",
    fileBase64: "",
    targetRoles: ["technician", "jm"]
  },
  procedureUploadBusy: false,
  procedureUploadError: "",
  procedureDownloadBusyId: "",
  procedureEditingId: "",
  procedureDeleteBusyId: "",
  procedureAudienceById: {},
  procedureAudienceLoadingId: "",
  procedureAudienceErrorById: {},
  expandedProcedureAudienceId: "",
  activeFormSection: "",
  formValidationMessages: [],
  heatDraft: {
    element: "",
    site: "",
    otherSite: "",
    quantity: "1",
    action: "",
    observation: "",
    articleId: "",
    articleName: "",
    articleQuantity: "1",
    installedArticles: [],
    evidenceName: "",
    evidencePreview: "",
    evidencePhotos: [],
    hasSecSeal: "",
    flexibleHasExpiration: "",
    flexibleExpirationDate: "",
    flexibleHasQr: ""
  },
  heatRecords: [],
  heatRecordsByTask: {},
  editingHeatIndex: -1,
  heatError: "",
  electricityDraft: {
    element: "",
    site: "",
    otherSite: "",
    quantity: "1",
    action: "",
    observation: "",
    articleId: "",
    articleName: "",
    articleQuantity: "1",
    installedArticles: [],
    evidenceName: "",
    distributionBoxType: "",
    distributionBoxLocation: "",
    distributionBoxOtherLocation: "",
    sealedProtection: "",
    evidencePreview: "",
    evidencePhotos: []
  },
  electricityRecordsByTask: {},
  editingElectricityIndex: -1,
  electricityError: "",
  coldDraft: {
    element: "",
    site: "",
    otherSite: "",
    quantity: "1",
    action: "",
    observation: "",
    articleId: "",
    articleName: "",
    articleQuantity: "1",
    installedArticles: [],
    evidenceName: "",
    evidencePreview: "",
    evidencePhotos: []
  },
  coldRecordsByTask: {},
  editingColdIndex: -1,
  coldError: "",
  waterDraft: {
    element: "",
    site: "",
    otherSite: "",
    quantity: "1",
    action: "",
    observation: "",
    articleId: "",
    articleName: "",
    articleQuantity: "1",
    installedArticles: [],
    evidenceName: "",
    evidencePreview: "",
    evidencePhotos: []
  },
  waterRecordsByTask: {},
  editingWaterIndex: -1,
  waterError: "",
  infrastructureDraft: {
    element: "",
    site: "",
    otherSite: "",
    achsSignage: "",
    extinguisherExpirationDate: "",
    extinguisherExpired: "",
    quantity: "1",
    action: "",
    observation: "",
    articleId: "",
    articleName: "",
    articleQuantity: "1",
    installedArticles: [],
    evidenceName: "",
    evidencePreview: "",
    evidencePhotos: []
  },
  infrastructureRecordsByTask: {},
  editingInfrastructureIndex: -1,
  infrastructureError: "",
  infrastructurePrefillNotice: "",
  infrastructurePrefillLoadedTaskIds: {},
  mpaDraft: {
    hasDressingRoom: "",
    dressingRoomLocation: "",
    hasLockers: "",
    lockersFitStaff: "",
    lockersGoodState: "",
    hasShower: "",
    showerExclusive: "",
    hasBathroom: "",
    bathroomExclusive: ""
  },
  mpaError: "",
  serviceYardDraft: {
    exclusiveProgram: ""
  },
  serviceYardError: "",
  rbdCheckersDraft: {
    pestControlUpToDate: "",
    pestControlDate: "",
    hasSanitaryResolution: "",
    sanitaryResolutionNumber: "",
    hasGreenSeal: "",
    greenSealCode: "",
    greenSealExpiration: "",
    greenSealExpired: "",
    hasMaintenanceCover: "",
    hasPaintCertificate: ""
  },
  rbdCheckersError: "",
  rbdCheckersPrefillNotice: "",
  rbdCheckersPrefillLoadedTaskIds: {},
  operationalPrefillLoadedTaskIds: {},
  paeManagerDraft: {
    name: "",
    rut: "",
    role: ""
  },
  paeManagerError: "",
  paeSignatureData: "",
  paeSignatureError: "",
  paeSignatureModalOpen: false,
  technicianSignatureData: "",
  technicianSignatureError: "",
  technicianSignatureModalOpen: false,
  vectorsDraft: {
    element: "",
    site: "",
    quantity: "1",
    action: "",
    observation: "",
    articleId: "",
    articleName: "",
    articleQuantity: "1",
    installedArticles: [],
    evidenceName: "",
    evidencePreview: "",
    evidencePhotos: []
  },
  vectorsRecordsByTask: {},
  editingVectorsIndex: -1,
  vectorsError: "",
  usedItemsDraft: {
    articleId: "",
    articleName: "",
    quantity: "1",
    observation: ""
  },
  usedItemsRecordsByTask: {},
  editingUsedItemIndex: -1,
  usedItemsError: "",
  incidents: [],
  incidentDraft: {
    branch: "Santiago",
    rbdSearch: "",
    selectedRbd: "",
    severity: "Alta",
    type: "Emergencia (inmediata)",
    title: "",
    description: "",
    photos: []
  },
  incidentStep: 1,
  lastIncident: null,
  incidentError: "",
  incidentSubmitting: false,
  selectedIncidentId: "",
  incidentPlanLoadingId: "",
  incidentPlanLoadedIds: {},
  incidentPlanError: "",
  groups: ["Administradores", "Mantenimiento", "Emergencias", "Jefatura Mantención"],
  actionMessage: "",
  actionToast: null
};

let toastTimer = null;
let formProgressTimer = null;
let taskRefreshTimer = null;
let taskRefreshBusy = false;
let incidentRefreshBusy = false;
let messageDetailRefreshTimer = null;
let messageDetailRefreshBusy = false;
let formStorageWarningShown = false;
let realtimeSocket = null;
let realtimeHeartbeatTimer = null;
let realtimeReconnectTimer = null;
let realtimeRefreshTimer = null;
let realtimeRef = 1;
let pushNotificationsReady = false;
let lastRegisteredPushToken = "";

let gpsDebugWatchId = null;
let gpsDebugMonitorStartedAt = 0;
let gpsDebugCallbackCount = 0;
let gpsDebugLastPosition = null;
let gpsDebugLastError = "";
let gpsDebugStatus = "Inactivo";
let gpsDebugUiTimer = null;
let gpsDebugPanelVisible = false;
let gpsDebugLocationRequiredError = "";
const pdfAutoBackupInFlight = new Set();
const taskRefreshIntervalMs = 30000;
const messageDetailRefreshIntervalMs = 5000;
const formProgressStorageKey = "datacora.formProgress.v1";
const pendingSubmissionsStorageKey = "datacora.pendingSubmissions.v1";
const dailyAuthStorageKey = "datacora.dailyAuth.v1";
const dailyMessageSummaryStorageKey = "datacora.dailyMessageSummary.v1";
const offlineTasksStorageKey = "datacora.offlineTasks.v1";
const incidentsStorageKey = "datacora.incidents.v1";

function hasSupabaseConfig() {
  if (hasSqlServerApiConfig()) return true;
  return Boolean(
    supabaseConfig.url
    && supabaseConfig.anonKey
    && !String(supabaseConfig.anonKey).startsWith("REEMPLAZA")
  );
}

function hasSqlServerApiConfig() {
  return Boolean(apiConfig.enabled && apiConfig.baseUrl);
}

function remoteBackendLabel() {
  return hasSqlServerApiConfig() ? "SQL Server" : "Supabase";
}

function sqlServerApiUrl(path) {
  return `${String(apiConfig.baseUrl).replace(/\/$/, "")}${path}`;
}

function supabaseUrl(path) {
  return `${String(supabaseConfig.url).replace(/\/$/, "")}${path}`;
}

function supabaseRealtimeUrl() {
  const baseUrl = String(supabaseConfig.url).replace(/\/$/, "");
  const realtimeUrl = baseUrl.replace(/^http/i, "ws");
  return `${realtimeUrl}/realtime/v1/websocket?apikey=${encodeURIComponent(supabaseConfig.anonKey)}&vsn=1.0.0`;
}

function nativePlugin(name) {
  return window.Capacitor?.Plugins?.[name] ?? window.Capacitor?.[name] ?? null;
}

function isNativeApp() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

function parseJsonBody(value) {
  if (!value || typeof value !== "string") return value ?? undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function nativeHttpRequest(url, options, headers, timeoutMs) {
  const CapacitorHttp = nativePlugin("CapacitorHttp");
  if (!isNativeApp() || !CapacitorHttp?.request) return null;
  const method = String(options.method || "GET").toUpperCase();
  const response = await CapacitorHttp.request({
    method,
    url,
    headers,
    data: parseJsonBody(options.body),
    connectTimeout: timeoutMs,
    readTimeout: timeoutMs
  });
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    statusText: String(response.status || ""),
    text: async () => typeof response.data === "string" ? response.data : JSON.stringify(response.data ?? null)
  };
}

async function apiRequest(path, options = {}) {
  const timeoutMs = options.timeoutMs ?? 45000;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers ?? {})
  };

  if (!headers.Authorization && state.supabaseSession?.access_token) {
    headers.Authorization = `Bearer ${state.supabaseSession.access_token}`;
  }

  let response;
  try {
    const { timeoutMs: _timeoutMs, ...fetchOptions } = options;
    const url = sqlServerApiUrl(path);
    response = await nativeHttpRequest(url, fetchOptions, headers, timeoutMs)
      || await fetch(url, { ...fetchOptions, headers, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("El backend SQL Server no respondió a tiempo. Revisa la conexión o los logs del servicio.");
    }
    throw new Error(`No se pudo conectar al servidor (${String(apiConfig.baseUrl).replace(/\/$/, "")}). Si ya tienes tareas cargadas, puedes seguir trabajando y sincronizar cuando vuelva la conexión. Revisa internet, puerto 8081 y disponibilidad del backend. Detalle técnico: ${error.message || "Failed to fetch"}`);
  } finally {
    window.clearTimeout(timeoutId);
  }

  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }

  if (!response.ok) {
    const rawMessage = body?.error_description
      || body?.msg
      || body?.message
      || body?.error;
    const message = typeof rawMessage === "object" && rawMessage !== null
      ? JSON.stringify(rawMessage)
      : rawMessage
      || `${response.status} ${response.statusText}`
      || "Solicitud al backend SQL Server fallida.";
    throw new Error(message);
  }

  return body;
}

async function supabaseRequest(path, options = {}) {
  if (hasSqlServerApiConfig()) {
    throw new Error(`Modo SQL Server activo: llamada Supabase bloqueada (${path}).`);
  }

  const timeoutMs = options.timeoutMs ?? 45000;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    apikey: supabaseConfig.anonKey,
    "Content-Type": "application/json",
    ...(options.headers ?? {})
  };

  if (!headers.Authorization) {
    headers.Authorization = state.supabaseSession?.access_token
      ? `Bearer ${state.supabaseSession.access_token}`
      : `Bearer ${supabaseConfig.anonKey}`;
  }

  let response;
  try {
    const { timeoutMs: _timeoutMs, ...fetchOptions } = options;
    response = await fetch(supabaseUrl(path), { ...fetchOptions, headers, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Supabase no respondió a tiempo. Revisa la conexión o los logs de la función submit-form.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }

  if (!response.ok) {
    const rawMessage = body?.error_description
      || body?.msg
      || body?.message
      || body?.error;
    const message = typeof rawMessage === "object" && rawMessage !== null
      ? JSON.stringify(rawMessage)
      : rawMessage
      || `${response.status} ${response.statusText}`
      || "Solicitud Supabase fallida.";
    throw new Error(message);
  }

  return body;
}

async function signInWithSupabase(email, password) {
  if (hasSqlServerApiConfig()) {
    const response = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    const expiresIn = Number(response.expiresIn || response.expires_in || 14 * 60 * 60);
    return {
      access_token: response.access_token,
      token_type: response.token_type || "bearer",
      expires_in: expiresIn,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      refresh_token: "",
      user: {
        id: response.user?.id,
        email: response.user?.email || email,
        user_metadata: {
          full_name: response.user?.fullName || response.user?.full_name || "",
          rut: response.user?.rut || "",
          require_password_change: Boolean(response.user?.requirePasswordChange || response.user?.require_password_change)
        }
      }
    };
  }

  return supabaseRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

function jwtExpiresSoon(session = state.supabaseSession, marginSeconds = 90) {
  if (!session?.access_token) return true;
  const expiresAt = Number(session.expires_at);
  if (Number.isFinite(expiresAt) && expiresAt > 0) {
    return expiresAt <= Math.floor(Date.now() / 1000) + marginSeconds;
  }

  try {
    const [, payload] = String(session.access_token).split(".");
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return Number(decoded.exp) <= Math.floor(Date.now() / 1000) + marginSeconds;
  } catch {
    return false;
  }
}

async function refreshSupabaseSession() {
  if (!hasSupabaseConfig()) return null;
  if (hasSqlServerApiConfig()) return state.supabaseSession;
  const refreshToken = state.supabaseSession?.refresh_token;
  if (!refreshToken) return state.supabaseSession;

  const refreshed = await supabaseRequest("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    headers: { Authorization: `Bearer ${supabaseConfig.anonKey}` },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  const nextSession = {
    ...state.supabaseSession,
    ...refreshed,
    user: refreshed.user ?? state.supabaseSession?.user ?? null
  };
  Object.assign(state, { supabaseSession: nextSession });
  persistDailyAuthState();
  return nextSession;
}

async function ensureValidSupabaseSession() {
  if (!hasSupabaseConfig()) return null;
  if (!state.supabaseSession?.access_token) throw new Error("Inicia sesión nuevamente para sincronizar formularios pendientes.");
  if (!jwtExpiresSoon()) return state.supabaseSession;
  return refreshSupabaseSession();
}

async function fetchSupabaseProfile(session, catalogs = state.supabaseCatalogs) {
  if (hasSqlServerApiConfig()) {
    const profile = await apiRequest("/api/me", {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (!profile?.id) throw new Error("El usuario existe en Auth, pero no tiene perfil en Datácora.");
    return mapSupabaseProfile(profile, session, catalogs);
  }

  const profileRows = await supabaseRequest(`/rest/v1/profiles?id=eq.${session.user.id}&select=id,full_name,email,rut,status,status_reason,branch_id,group_id,role_id,profile_branches(branches(id,name))`, {
    headers: { Authorization: `Bearer ${session.access_token}` }
  });
  const profile = profileRows?.[0];
  if (!profile) throw new Error("El usuario existe en Auth, pero no tiene perfil en Datácora.");
  return mapSupabaseProfile(profile, session, catalogs);
}

async function fetchSupabaseCatalogs(accessToken) {
  if (hasSqlServerApiConfig()) {
    return apiRequest("/api/catalogs", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  const headers = { Authorization: `Bearer ${accessToken}` };
  const results = await Promise.allSettled([
    supabaseRequest("/rest/v1/branches?select=id,name&is_active=eq.true&order=name.asc", { headers }),
    supabaseRequest("/rest/v1/groups?select=id,name&order=name.asc", { headers }),
    supabaseRequest("/rest/v1/roles?select=id,name,can_manage_users,can_assign_tasks,can_view_notifications,can_view_national_data&order=name.asc", { headers })
  ]);
  const [branches, groups, roles] = results.map((result) => result.status === "fulfilled" ? result.value : []);

  return { branches, groups, roles };
}

async function fetchSupabaseProfiles(accessToken, catalogs = state.supabaseCatalogs) {
  if (hasSqlServerApiConfig()) {
    const rows = await apiRequest("/api/users", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return rows.map((profile) => profileToUser(profile, null, catalogs));
  }

  const rows = await supabaseRequest("/rest/v1/profiles?select=id,full_name,email,rut,status,status_reason,branch_id,group_id,role_id,profile_branches(branches(id,name))&order=full_name.asc", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  return rows.map((profile) => profileToUser(profile, null, catalogs));
}

function profileToUser(profile, session = null, catalogs = state.supabaseCatalogs) {
  const role = profile.roles ?? catalogs.roles.find((item) => item.id === profile.role_id) ?? {};
  const branch = profile.branches ?? catalogs.branches.find((item) => item.id === profile.branch_id) ?? {};
  const group = profile.groups ?? catalogs.groups.find((item) => item.id === profile.group_id) ?? {};
  const authUser = session?.user ?? {};
  const requiresPasswordChange = [
    authUser.user_metadata?.require_password_change,
    authUser.app_metadata?.require_password_change,
    authUser.raw_user_meta_data?.require_password_change,
    profile.require_password_change,
    profile.requirePasswordChange
  ].some((value) => value === true || value === "true" || value === 1 || value === "1");
  const extraBranches = (profile.profile_branches ?? [])
    .map((item) => item.branches?.name)
    .filter(Boolean);
  const sucursales = uniqueNormalizedNames([branch.name, ...extraBranches]);

  return {
    id: profile.id,
    nombre: profile.full_name,
    usuario: profile.email,
    rut: profile.rut ?? "",
    password: "",
    requirePasswordChange: Boolean(requiresPasswordChange && authUser.id === profile.id),
    sucursal: sucursales[0] ?? "Santiago",
    sucursales: sucursales.length ? sucursales : [normalizeMojibakeText(branch.name ?? "Santiago")],
    grupo: normalizeMojibakeText(group.name ?? "Sin grupo"),
    cargo: normalizeMojibakeText(role.name ?? "Técnico Multifuncional"),
    estado: profile.status ?? "activo",
    motivoEstado: profile.status_reason ?? "Disponible",
    ultimaConexion: profile.last_login_at || profile.lastLoginAt || "",
    permisos: {
      gestionarUsuarios: Boolean(role.can_manage_users),
      asignarTareas: Boolean(role.can_assign_tasks),
      verNotificaciones: Boolean(role.can_view_notifications),
      verDatosNacionales: Boolean(role.can_view_national_data)
    }
  };
}

function mapSupabaseProfile(profile, session, catalogs = state.supabaseCatalogs) {
  const user = profileToUser(profile, session, catalogs);
  const localIndex = users.findIndex((item) => item.usuario.toLowerCase() === user.usuario.toLowerCase());
  if (localIndex >= 0) users[localIndex] = { ...users[localIndex], ...user };
  else users.unshift(user);

  return user;
}

function catalogIdByName(kind, name) {
  const targetName = normalizeMojibakeText(name);
  return state.supabaseCatalogs[kind]?.find((item) => normalizeMojibakeText(item.name) === targetName)?.id ?? "";
}

function statusFromSupabase(value) {
  const statuses = {
    pendiente: "Pendiente",
    urgente: "Urgente",
    completada: "Completada",
    cancelada: "Cancelada"
  };
  return statuses[String(value ?? "").toLowerCase()] ?? "Pendiente";
}

function statusToSupabase(value) {
  const normalized = statusClass(value);
  if (normalized === "urgente") return "urgente";
  if (normalized === "completada") return "completada";
  if (normalized === "cancelada") return "cancelada";
  return "pendiente";
}

function priorityToSupabase(value) {
  const normalized = statusClass(value);
  if (normalized === "alta") return "alta";
  if (normalized === "baja") return "baja";
  return "media";
}

function priorityFromSupabase(value) {
  const priorities = { alta: "Alta", baja: "Baja", media: "Media" };
  return priorities[String(value ?? "").toLowerCase()] ?? "Media";
}

function mapSupabaseTask(row) {
  const establishment = Array.isArray(row.establishments) ? row.establishments[0] : row.establishments;
  const assignedByProfile = Array.isArray(row.assigned_by_profile) ? row.assigned_by_profile[0] : row.assigned_by_profile;
  const assignedToProfile = Array.isArray(row.assigned_to_profile) ? row.assigned_to_profile[0] : row.assigned_to_profile;
  const localEstablishment = establishmentByRbd(establishment?.rbd);
  const assignedTo = users.find((user) => user.id === row.assigned_to);
  const assignedBy = users.find((user) => user.id === row.assigned_by);
  const type = row.task_type || "Plan Preventivo Mantención";
  const blueprintKey = blueprintKeyForTaskType(type) || "maintenance_plan";
  const latitude = Number(establishment?.latitude);
  const longitude = Number(establishment?.longitude);
  const coordinates = Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { lat: latitude, lng: longitude }
    : localEstablishment?.coordinates;

  return {
    id: row.id,
    supabaseId: row.id,
    type,
    rbd: establishment?.rbd ?? "",
    establishment: establishment?.name ?? localEstablishment?.name ?? "Establecimiento",
    establishmentMeta: {
      comuna: establishment?.commune ?? localEstablishment?.comuna,
      tipoInstitucion: establishment?.institution_type ?? localEstablishment?.institutionType,
      direccion: establishment?.address ?? localEstablishment?.address,
      sucursal: localEstablishment?.branch,
      coordinates
    },
    description: row.description ?? "",
    assignedBy: assignedByProfile?.full_name ?? assignedBy?.nombre ?? "Sin asignador",
    assignedTo: assignedToProfile?.email ?? assignedTo?.usuario ?? row.assigned_to,
    assignedAt: formatDateLabel(String(row.assigned_at ?? "").slice(0, 10)),
    dueAt: formatDateLabel(normalizeIsoDate(row.due_date)),
    dueDateIso: normalizeIsoDate(row.due_date),
    status: statusFromSupabase(row.status),
    priority: priorityFromSupabase(row.priority),
    syncStatus: row.sync_state === "pending" ? "pending" : "synced",
    submissionId: row.submissionId ?? "",
    folio: row.folio ?? "",
    submittedAt: row.submittedAt ?? "",
    pdfUrl: row.pdfUrl ?? "",
    pdfFileName: row.pdfFileName ?? "",
    pdfExternalId: row.pdfExternalId ?? "",
    pdfFileKind: row.pdfFileKind ?? "",
    remoteSectionCounts: row.remoteSectionCounts ?? {},
    form: {
      blueprintKey,
      requiredSections: row.requiredSections ?? [],
      criticalSections: row.criticalSections ?? [],
      sectionMinimums: row.sectionMinimums ?? {}
    }
  };
}

function sectionCodeFromEmbedded(row) {
  const section = Array.isArray(row.form_sections) ? row.form_sections[0] : row.form_sections;
  return section?.code ?? "";
}

async function fetchSupabaseSubmissionSummaries(accessToken) {
  let submissions = [];
  try {
    submissions = await supabaseRequest("/rest/v1/form_submissions?select=id,task_id,folio,submitted_at&order=folio.desc", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  } catch {
    return new Map();
  }

  const submissionIds = submissions.map((row) => row.id).filter(Boolean);
  const bySubmission = new Map(submissions.map((row) => [row.id, { ...row, sectionCounts: {} }]));

  if (submissionIds.length) {
    try {
      const encodedIds = submissionIds.map(encodeURIComponent).join(",");
      const itemRows = await supabaseRequest(`/rest/v1/response_items?submission_id=in.(${encodedIds})&select=submission_id,section_id`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const answerRows = await supabaseRequest(`/rest/v1/form_answers?submission_id=in.(${encodedIds})&select=submission_id,section_id,response_item_id`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const sectionIds = Array.from(new Set([
        ...itemRows.map((row) => row.section_id),
        ...answerRows.map((row) => row.section_id)
      ].filter(Boolean)));
      const sectionRows = sectionIds.length
        ? await supabaseRequest(`/rest/v1/form_sections?id=in.(${sectionIds.map(encodeURIComponent).join(",")})&select=id,code`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        : [];
      const codeBySectionId = new Map(sectionRows.map((row) => [row.id, row.code]));

      itemRows.forEach((row) => {
        const summary = bySubmission.get(row.submission_id);
        const code = codeBySectionId.get(row.section_id);
        if (summary && code) summary.sectionCounts[code] = (summary.sectionCounts[code] ?? 0) + 1;
      });

      const answeredSingleSections = new Set();
      answerRows.forEach((row) => {
        const code = codeBySectionId.get(row.section_id);
        if (row.submission_id && !row.response_item_id && code) answeredSingleSections.add(`${row.submission_id}:${code}`);
      });
      answeredSingleSections.forEach((key) => {
        const [submissionId, code] = key.split(":");
        const summary = bySubmission.get(submissionId);
        if (summary && !summary.sectionCounts[code]) summary.sectionCounts[code] = 1;
      });

      const attachmentRows = await supabaseRequest(`/rest/v1/form_attachments?submission_id=in.(${encodedIds})&file_kind=in.(onedrive_pdf,onedrive_bitacora_pdf,onedrive_internal_pdf)&select=submission_id,file_kind,external_url,file_name,external_id,created_at&order=created_at.desc`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      attachmentRows.forEach((row) => {
        const summary = bySubmission.get(row.submission_id);
        if (!summary || summary.pdfUrl || row.file_kind !== "onedrive_bitacora_pdf") return;
        summary.pdfUrl = row.external_url || "";
        summary.pdfFileName = row.file_name || "";
        summary.pdfExternalId = row.external_id || "";
        summary.pdfFileKind = row.file_kind || "";
      });
    } catch {
      // Keep folio/date/submission loaded even if count details are unavailable.
    }
  }

  return new Map(submissions.filter((row) => row.task_id).map((row) => {
    const summary = bySubmission.get(row.id) ?? row;
    return [row.task_id, summary];
  }));
}

async function fetchSupabaseTaskSectionRequirements(accessToken) {
  try {
    const rows = await supabaseRequest("/rest/v1/task_required_sections?select=task_id,is_required,is_critical,min_required,form_sections(code)&order=task_id.asc", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return rows.reduce((byTask, row) => {
      const section = Array.isArray(row.form_sections) ? row.form_sections[0] : row.form_sections;
      const code = section?.code;
      if (!row.task_id || !code) return byTask;

      if (!byTask.has(row.task_id)) {
        byTask.set(row.task_id, { requiredSections: [], criticalSections: [], sectionMinimums: {} });
      }

      const config = byTask.get(row.task_id);
      if (row.is_required) config.requiredSections.push(code);
      if (row.is_critical) config.criticalSections.push(code);
      const minimum = Number(row.min_required);
      if (Number.isFinite(minimum) && minimum > 0) config.sectionMinimums[code] = Math.trunc(minimum);
      return byTask;
    }, new Map());
  } catch {
    return new Map();
  }
}

async function fetchSupabaseTasks(accessToken) {
  if (hasSqlServerApiConfig()) {
    const rows = await apiRequest("/api/tasks", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return rows.map(mapSupabaseTask);
  }

  const rows = await supabaseRequest("/rest/v1/tasks?select=id,task_type,description,due_date,status,priority,sync_state,assigned_at,assigned_to,assigned_by,assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name,email),assigned_by_profile:profiles!tasks_assigned_by_fkey(full_name,email),establishments(rbd,name,commune,institution_type,address,latitude,longitude)&order=created_at.desc", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const [submissionsByTask, requirementsByTask] = await Promise.all([
    fetchSupabaseSubmissionSummaries(accessToken),
    fetchSupabaseTaskSectionRequirements(accessToken)
  ]);

  return rows.map((row) => {
    const submission = submissionsByTask.get(row.id);
    const requirements = requirementsByTask.get(row.id);
    return mapSupabaseTask({
      ...row,
      submissionId: submission?.id ?? "",
      folio: submission?.folio ?? "",
      submittedAt: submission?.submitted_at ?? "",
      pdfUrl: submission?.pdfUrl ?? "",
      pdfFileName: submission?.pdfFileName ?? "",
      pdfExternalId: submission?.pdfExternalId ?? "",
      pdfFileKind: submission?.pdfFileKind ?? "",
      remoteSectionCounts: submission?.sectionCounts ?? {},
      requiredSections: requirements?.requiredSections ?? [],
      criticalSections: requirements?.criticalSections ?? [],
      sectionMinimums: requirements?.sectionMinimums ?? {}
    });
  });
}

function mapSupabaseIncident(row) {
  const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
  const establishment = Array.isArray(row.establishments) ? row.establishments[0] : row.establishments;
  const reporter = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    branch: branch?.name ?? "",
    rbd: establishment?.rbd ?? "",
    establishment: establishment?.name ?? "",
    commune: establishment?.commune ?? "",
    severity: row.severity ?? "Alta",
    type: row.incident_type ?? "Emergencia (inmediata)",
    title: row.title ?? "Incidencia",
    description: row.description ?? "",
    photos: Array.isArray(row.photos) ? row.photos : [],
    status: row.status ?? "En revisión",
    taskId: row.task_id ?? "",
    plannedTask: row.planned_details ?? null,
    createdBy: reporter?.email ?? "",
    createdByName: reporter?.full_name ?? "Prevencionista",
    createdAt: row.created_at ?? "",
    createdLabel: row.created_at ? formatDateLabel(row.created_at.slice(0, 10)) : todayDateLabel(),
    source: hasSqlServerApiConfig() ? "sqlserver" : "supabase"
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? ""));
}

async function fetchSupabaseIncidentTaskMap(taskIds, accessToken = state.supabaseSession?.access_token) {
  const uniqueIds = Array.from(new Set(taskIds.filter(isUuid)));
  if (!uniqueIds.length || !hasSupabaseConfig() || !accessToken) return new Map();
  if (hasSqlServerApiConfig()) {
    const rows = await apiRequest("/api/tasks", { headers: { Authorization: `Bearer ${accessToken}` } });
    return new Map(rows.map(mapSupabaseTask).filter((task) => uniqueIds.includes(task.id)).map((task) => [task.id, task]));
  }
  const rows = await supabaseRequest(`/rest/v1/tasks?id=in.(${uniqueIds.map(encodeURIComponent).join(",")})&select=id,task_type,description,due_date,status,priority,sync_state,assigned_at,assigned_to,assigned_by,assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name,email),assigned_by_profile:profiles!tasks_assigned_by_fkey(full_name,email),establishments(rbd,name,commune,institution_type,address,latitude,longitude)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return new Map(rows.map((row) => {
    const task = mapSupabaseTask(row);
    return [task.id, task];
  }));
}

async function fetchSupabaseTaskById(taskId, accessToken = state.supabaseSession?.access_token) {
  if (!isUuid(taskId) || !hasSupabaseConfig() || !accessToken) return null;
  if (hasSqlServerApiConfig()) {
    const rows = await apiRequest("/api/tasks", { headers: { Authorization: `Bearer ${accessToken}` } });
    return rows.map(mapSupabaseTask).find((task) => task.id === taskId) ?? null;
  }
  const rows = await supabaseRequest(`/rest/v1/tasks?id=eq.${encodeURIComponent(taskId)}&select=id,task_type,description,due_date,status,priority,sync_state,assigned_at,assigned_to,assigned_by,assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name,email),assigned_by_profile:profiles!tasks_assigned_by_fkey(full_name,email),establishments(rbd,name,commune,institution_type,address,latitude,longitude)&limit=1`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return rows?.[0] ? mapSupabaseTask(rows[0]) : null;
}

async function loadSelectedIncidentPlanDetail() {
  const incidentId = state.selectedIncidentId;
  if (
    state.route !== "incident-detail"
    || !incidentId
    || !hasSupabaseConfig()
    || !state.supabaseSession?.access_token
    || !isNetworkOnline()
    || state.incidentPlanLoadingId === incidentId
    || state.incidentPlanLoadedIds?.[incidentId]
  ) return;

  const currentIncident = state.incidents.find((incident) => incident.id === incidentId);
  if (incidentTaskFor(currentIncident)) {
    setState({
      incidentPlanLoadedIds: { ...state.incidentPlanLoadedIds, [incidentId]: true },
      incidentPlanError: ""
    });
    return;
  }

  try {
    setState({ incidentPlanLoadingId: incidentId, incidentPlanError: "" });
    let rows = [];
    if (hasSqlServerApiConfig() && isUuid(incidentId)) {
      const remote = await apiRequest(`/api/incidents/${encodeURIComponent(incidentId)}`, {
        headers: { Authorization: `Bearer ${state.supabaseSession.access_token}` }
      });
      rows = [remote];
    } else if (isUuid(incidentId)) {
      try {
        rows = await supabaseRequest(`/rest/v1/maintenance_incidents?id=eq.${encodeURIComponent(incidentId)}&select=id,status,task_id,planned_details&limit=1`, {
          headers: { Authorization: `Bearer ${state.supabaseSession.access_token}` }
        });
      } catch (error) {
        rows = await supabaseRequest(`/rest/v1/maintenance_incidents?id=eq.${encodeURIComponent(incidentId)}&select=id,status,task_id&limit=1`, {
          headers: { Authorization: `Bearer ${state.supabaseSession.access_token}` }
        });
      }
    }

    const remoteIncident = rows?.[0];
    const remoteTaskId = remoteIncident?.task_id || currentIncident?.taskId || "";
    const plannedTask = remoteIncident?.planned_details || await fetchSupabaseTaskById(remoteTaskId, state.supabaseSession.access_token);

    state.incidents = state.incidents.map((incident) => incident.id === incidentId
      ? {
        ...incident,
        status: remoteIncident?.status ?? incident.status,
        taskId: remoteTaskId || incident.taskId,
        plannedTask: plannedTask || incident.plannedTask || null
      }
      : incident);
    persistIncidents();
    setState({
      incidents: state.incidents,
      incidentPlanLoadingId: "",
      incidentPlanLoadedIds: { ...state.incidentPlanLoadedIds, [incidentId]: true },
      incidentPlanError: plannedTask ? "" : "No se encontró una tarea vinculada a esta incidencia en Supabase."
    });
  } catch (error) {
    setState({
      incidentPlanLoadingId: "",
      incidentPlanLoadedIds: { ...state.incidentPlanLoadedIds, [incidentId]: true },
      incidentPlanError: error.message || "No se pudo cargar la planificación."
    });
  }
}

async function fetchSupabaseIncidents(accessToken = state.supabaseSession?.access_token) {
  if (!hasSupabaseConfig() || !accessToken) return [];
  if (hasSqlServerApiConfig()) {
    const rows = await apiRequest("/api/incidents", { headers: { Authorization: `Bearer ${accessToken}` } });
    return rows.map(mapSupabaseIncident);
  }
  let rows;
  try {
    rows = await supabaseRequest("/rest/v1/maintenance_incidents?select=id,title,description,photos,severity,incident_type,status,task_id,planned_details,created_at,branches(name),establishments(rbd,name,commune),profiles(full_name,email)&order=created_at.desc", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  } catch (error) {
    rows = await supabaseRequest("/rest/v1/maintenance_incidents?select=id,title,description,photos,severity,status,task_id,created_at,branches(name),establishments(rbd,name,commune),profiles(full_name,email)&order=created_at.desc", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }
  const incidents = rows.map(mapSupabaseIncident);
  const missingPlanTaskIds = incidents
    .filter((incident) => incident.taskId && !incident.plannedTask)
    .map((incident) => incident.taskId);
  if (!missingPlanTaskIds.length) return incidents;

  try {
    const taskMap = await fetchSupabaseIncidentTaskMap(missingPlanTaskIds, accessToken);
    return incidents.map((incident) => incident.plannedTask || !incident.taskId
      ? incident
      : { ...incident, plannedTask: taskMap.get(incident.taskId) ?? null });
  } catch (error) {
    console.warn("No se pudo cargar el detalle de planificación de incidencias.", error);
    return incidents;
  }
}

async function refreshSupabaseIncidents(options = {}) {
  const silent = options.silent ?? true;
  const manual = options.manual ?? false;
  const render = options.render ?? !silent;

  if (incidentRefreshBusy) return;
  if (!state.isAuthenticated || !hasSupabaseConfig() || !state.supabaseSession?.access_token) {
    if (!silent) showErrorToast("No se pudo actualizar", "Inicia sesión para actualizar incidencias.");
    return;
  }
  if (!isNetworkOnline()) {
    if (!silent) showErrorToast("Sin conexión", "No se pudieron consultar las incidencias en este momento.");
    return;
  }

  incidentRefreshBusy = true;
  if (manual) setState({ incidentRefreshUiBusy: true });
  try {
    const session = await ensureValidSupabaseSession();
    const remoteIncidents = await fetchSupabaseIncidents(session.access_token);
    state.incidents = remoteIncidents;
    persistIncidents();
    if (render) {
      setState({ incidents: remoteIncidents, lastSyncAt: new Date().toLocaleString("es-CL") });
      if (manual) showSuccessToast("Incidencias actualizadas", "Se consultó nuevamente la base de datos.");
    }
  } catch (error) {
    console.warn(`No se pudieron cargar incidencias desde ${hasSqlServerApiConfig() ? "SQL Server" : "Supabase"}.`, error);
    if (!silent) showErrorToast("No se pudieron actualizar incidencias", error.message);
  } finally {
    incidentRefreshBusy = false;
    if (manual) setState({ incidentRefreshUiBusy: false });
  }
}

function mapMaintenanceAlert(row = {}) {
  return {
    id: row.id || "",
    type: row.type || row.alert_type || "",
    status: row.status || "pendiente",
    severity: row.severity || "",
    title: normalizeMojibakeText(row.title || ""),
    body: normalizeMojibakeText(row.body || ""),
    dueDate: row.dueDate || row.due_date || "",
    daysToExpire: row.daysToExpire ?? row.days_to_expire ?? null,
    replacementExpirationDate: row.replacementExpirationDate || row.replacement_expiration_date || "",
    resolvedDaysToExpire: row.resolvedDaysToExpire ?? row.resolved_days_to_expire ?? null,
    createdAt: row.createdAt || row.created_at || "",
    taskId: row.taskId || row.task_id || "",
    submissionId: row.submissionId || row.submission_id || "",
    branchName: normalizeMojibakeText(row.branchName || row.branch_name || ""),
    rbd: String(row.rbd || ""),
    establishmentName: normalizeMojibakeText(row.establishmentName || row.establishment_name || ""),
    commune: normalizeMojibakeText(row.commune || ""),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {}
  };
}

async function fetchMaintenanceAlerts(accessToken = state.supabaseSession?.access_token) {
  if (!hasSqlServerApiConfig() || !accessToken) return [];
  const rows = await apiRequest("/api/maintenance-alerts", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return (Array.isArray(rows) ? rows : rows?.data || rows?.alerts || []).map(mapMaintenanceAlert);
}

async function refreshMaintenanceAlerts(options = {}) {
  const silent = options.silent ?? true;
  const manual = options.manual ?? false;
  if (!state.isAuthenticated || !hasSqlServerApiConfig() || !state.supabaseSession?.access_token) return;
  if (!canAssignTasks() && !isAdmin()) return;
  if (!isNetworkOnline()) return;
  if (manual) setState({ maintenanceAlertRefreshBusy: true });
  try {
    const session = await ensureValidSupabaseSession();
    const alerts = await fetchMaintenanceAlerts(session.access_token);
    setState({ maintenanceAlerts: alerts, maintenanceAlertsLastRefreshAt: Date.now() });
    if (manual) showSuccessToast("Alertas actualizadas", "Se revisaron los avisos pendientes.");
  } catch (error) {
    if (!silent) showErrorToast("No se pudieron actualizar alertas", error.message);
    else console.warn("No se pudieron actualizar alertas de mantencion.", error);
  } finally {
    if (manual) setState({ maintenanceAlertRefreshBusy: false });
  }
}

function scheduleMaintenanceAlertsRefresh() {
  if (!state.isAuthenticated || !hasSqlServerApiConfig() || !state.supabaseSession?.access_token) return;
  if (!canAssignTasks() && !isAdmin()) return;
  if (!isNetworkOnline() || state.maintenanceAlertRefreshBusy) return;
  const lastRefresh = Number(state.maintenanceAlertsLastRefreshAt || 0);
  if (Date.now() - lastRefresh < 30000) return;
  state.maintenanceAlertsLastRefreshAt = Date.now();
  window.setTimeout(() => refreshMaintenanceAlerts({ silent: true }), 0);
}

async function resolveMaintenanceAlert(alertId) {
  if (!isUuid(alertId) || state.maintenanceAlertResolveBusyId) return;
  const input = Array.from(rootEl.querySelectorAll('[data-role="maintenance-alert-resolution-date"]'))
    .find((item) => item.dataset.alertId === alertId);
  const replacementExpirationDate = normalizeIsoDate(input?.value || state.maintenanceAlertResolutionDates?.[alertId] || "");
  if (!replacementExpirationDate) {
    showErrorToast("Fecha requerida", "Ingresa la fecha de vencimiento del nuevo extintor.");
    input?.focus();
    return;
  }
  if (isIsoDateBefore(replacementExpirationDate)) {
    showErrorToast("Fecha no válida", "El nuevo extintor debe quedar con una fecha vigente.");
    input?.focus();
    return;
  }
  setState({ maintenanceAlertResolveBusyId: alertId });
  try {
    await apiRequest(`/api/maintenance-alerts/${encodeURIComponent(alertId)}/resolve`, {
      method: "PATCH",
      body: JSON.stringify({ extinguisherExpirationDate: replacementExpirationDate })
    });
    const nextResolutionDates = { ...state.maintenanceAlertResolutionDates };
    delete nextResolutionDates[alertId];
    setState({
      maintenanceAlerts: state.maintenanceAlerts.filter((alert) => alert.id !== alertId),
      maintenanceAlertResolveBusyId: "",
      maintenanceAlertResolutionDates: nextResolutionDates,
      infrastructurePrefillLoadedTaskIds: {}
    });
    showSuccessToast("Alerta gestionada", "Se actualizó el vencimiento del extintor para próximas visitas.");
  } catch (error) {
    setState({ maintenanceAlertResolveBusyId: "" });
    showErrorToast("No se pudo cerrar la alerta", error.message);
  }
}

function mapAppMessage(row = {}) {
  return {
    id: row.id || "",
    title: normalizeMojibakeText(row.title || ""),
    body: normalizeMojibakeText(row.body || ""),
    scope: row.scope || "",
    branchId: row.branch_id || row.branchId || "",
    branchName: normalizeMojibakeText(row.branch_name || row.branchName || ""),
    senderName: normalizeMojibakeText(row.sender_name || row.senderName || ""),
    senderEmail: row.sender_email || row.senderEmail || "",
    recipientCount: Number(row.recipient_count ?? row.recipientCount ?? 0),
    readCount: Number(row.read_count ?? row.readCount ?? 0),
    readAt: row.read_at || row.readAt || "",
    createdAt: row.created_at || row.createdAt || ""
  };
}

function mapAppMessageReply(row = {}) {
  return {
    id: row.id || "",
    messageId: row.message_id || row.messageId || "",
    senderId: row.sender_id || row.senderId || "",
    senderName: normalizeMojibakeText(row.sender_name || row.senderName || ""),
    senderEmail: row.sender_email || row.senderEmail || "",
    body: normalizeMojibakeText(row.body || ""),
    createdAt: row.created_at || row.createdAt || ""
  };
}

function mapProcedure(row = {}) {
  return {
    id: row.id || "",
    title: normalizeMojibakeText(row.title || ""),
    description: normalizeMojibakeText(row.description || ""),
    category: normalizeMojibakeText(row.category || ""),
    fileName: normalizeMojibakeText(row.file_name || row.fileName || ""),
    fileMime: row.file_mime || row.fileMime || "",
    fileBase64: row.file_base64 || row.fileBase64 || "",
    externalUrl: row.external_url || row.externalUrl || "",
    targetRoles: Array.isArray(row.target_roles || row.targetRoles) ? (row.target_roles || row.targetRoles) : [],
    authorName: normalizeMojibakeText(row.author_name || row.authorName || ""),
    authorEmail: row.author_email || row.authorEmail || "",
    createdAt: row.created_at || row.createdAt || "",
    updatedAt: row.updated_at || row.updatedAt || "",
    hasFile: Boolean(row.has_file ?? row.hasFile ?? row.file_base64 ?? row.fileBase64)
  };
}

function emptyProcedureUploadDraft() {
  return {
    title: "",
    description: "",
    category: "",
    externalUrl: "",
    fileName: "",
    fileMime: "",
    fileBase64: "",
    targetRoles: ["technician", "jm"]
  };
}

const PROCEDURE_TARGET_OPTIONS = [
  { id: "technician", label: "Técnicos Multifuncional / SEC" },
  { id: "jm", label: "JM" },
  { id: "prevention", label: "Prevención" },
  { id: "admin", label: "Admin / Jefe nacional" }
];

function procedureTargetLabel(role) {
  return PROCEDURE_TARGET_OPTIONS.find((option) => option.id === role)?.label || role;
}

async function fetchProcedures() {
  if (!hasSqlServerApiConfig() || !state.supabaseSession?.access_token) return [];
  const response = await apiRequest("/api/procedures");
  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.procedures)
        ? response.procedures
        : Array.isArray(response?.rows)
          ? response.rows
          : [];
  return (rows || []).map(mapProcedure);
}

async function refreshProcedures(options = {}) {
  const manual = options.manual ?? false;
  const silent = options.silent ?? true;
  if (!state.isAuthenticated || !hasSqlServerApiConfig() || !state.supabaseSession?.access_token) return;
  if (!isNetworkOnline()) {
    if (!silent) showErrorToast("Sin conexión", "No se pudieron consultar los procedimientos.");
    return;
  }
  if (manual) setState({ procedureRefreshBusy: true });
  try {
    await ensureValidSupabaseSession();
    const rows = await fetchProcedures();
    setState({
      procedures: rows,
      procedureError: "",
      lastSyncAt: new Date().toLocaleString("es-CL")
    });
    if (manual) showSuccessToast("Procedimientos actualizados", "Se consultaron los documentos disponibles.");
  } catch (error) {
    if (!silent) showErrorToast("No se pudieron actualizar procedimientos", error.message);
    else console.warn("No se pudieron actualizar procedimientos.", error);
    if (manual || state.route === "procedures") setState({ procedureError: error.message || "No se pudieron cargar los procedimientos." });
  } finally {
    if (manual) setState({ procedureRefreshBusy: false });
  }
}

function filteredProcedures() {
  const search = normalizeSearch(state.procedureSearch || "");
  if (!search) return state.procedures;
  return state.procedures.filter((procedure) => {
    const haystack = normalizeSearch([
      procedure.title,
      procedure.description,
      procedure.category,
      procedure.fileName,
      procedure.authorName,
      ...(procedure.targetRoles || []).map(procedureTargetLabel)
    ].join(" "));
    return haystack.includes(search);
  });
}

function procedureDateLabel(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(value).slice(0, 10);
  }
}

function procedureDateTimeLabel(value) {
  if (!value) return "Pendiente";
  try {
    return new Date(value).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(value);
  }
}

function mapProcedureAudience(row = {}) {
  const recipients = Array.isArray(row.recipients) ? row.recipients : [];
  return {
    procedureId: row.procedure_id || row.procedureId || "",
    title: normalizeMojibakeText(row.title || ""),
    targetRoles: Array.isArray(row.target_roles || row.targetRoles) ? (row.target_roles || row.targetRoles) : [],
    total: Number(row.total ?? recipients.length) || 0,
    viewed: Number(row.viewed ?? recipients.filter((item) => item.has_viewed || item.hasViewed).length) || 0,
    downloaded: Number(row.downloaded ?? recipients.filter((item) => item.has_downloaded || item.hasDownloaded).length) || 0,
    recipients: recipients.map((item) => ({
      userId: item.user_id || item.userId || "",
      fullName: normalizeMojibakeText(item.full_name || item.fullName || ""),
      email: item.email || "",
      roleName: normalizeMojibakeText(item.role_name || item.roleName || ""),
      branchName: normalizeMojibakeText(item.branch_name || item.branchName || ""),
      viewedAt: item.viewed_at || item.viewedAt || "",
      downloadedAt: item.downloaded_at || item.downloadedAt || "",
      hasViewed: Boolean(item.has_viewed ?? item.hasViewed ?? item.viewed_at ?? item.viewedAt),
      hasDownloaded: Boolean(item.has_downloaded ?? item.hasDownloaded ?? item.downloaded_at ?? item.downloadedAt)
    }))
  };
}

async function registerProcedureEvent(procedureId, action) {
  if (!hasSqlServerApiConfig() || !state.supabaseSession?.access_token || !isUuid(procedureId)) return;
  try {
    await apiRequest(`/api/procedures/${encodeURIComponent(procedureId)}/events`, {
      method: "POST",
      body: JSON.stringify({ action })
    });
  } catch (error) {
    console.warn("No se pudo registrar evento de procedimiento.", error);
  }
}

async function loadProcedureAudience(procedureId, options = {}) {
  if (!canManageProcedures() || !isUuid(procedureId)) return;
  const force = Boolean(options.force);
  if (!force && state.procedureAudienceById[procedureId]) {
    setState({
      expandedProcedureAudienceId: state.expandedProcedureAudienceId === procedureId ? "" : procedureId
    });
    return;
  }

  setState({
    expandedProcedureAudienceId: procedureId,
    procedureAudienceLoadingId: procedureId,
    procedureAudienceErrorById: {
      ...state.procedureAudienceErrorById,
      [procedureId]: ""
    }
  });

  try {
    await ensureValidSupabaseSession();
    const audience = mapProcedureAudience(await apiRequest(`/api/procedures/${encodeURIComponent(procedureId)}/audience`));
    setState({
      procedureAudienceById: {
        ...state.procedureAudienceById,
        [procedureId]: audience
      },
      procedureAudienceLoadingId: "",
      procedureAudienceErrorById: {
        ...state.procedureAudienceErrorById,
        [procedureId]: ""
      }
    });
  } catch (error) {
    setState({
      procedureAudienceLoadingId: "",
      procedureAudienceErrorById: {
        ...state.procedureAudienceErrorById,
        [procedureId]: error.message || "No se pudo cargar el seguimiento."
      }
    });
  }
}

function base64ToBlob(base64, mimeType = "application/octet-stream") {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

async function openProcedure(procedureId) {
  const cached = state.procedures.find((procedure) => procedure.id === procedureId);
  if (!cached) return;
  if (cached.externalUrl && !cached.hasFile) {
    window.open(cached.externalUrl, "_blank", "noopener");
    registerProcedureEvent(procedureId, "downloaded");
    return;
  }
  if (!hasSqlServerApiConfig()) {
    showErrorToast("Backend requerido", "La descarga de procedimientos requiere conexión al backend SQL Server.");
    return;
  }
  if (!isNetworkOnline()) {
    showErrorToast("Sin conexión", "Conéctate a internet para descargar este procedimiento.");
    return;
  }
  setState({ procedureDownloadBusyId: procedureId });
  try {
    await ensureValidSupabaseSession();
    const detail = mapProcedure(await apiRequest(`/api/procedures/${encodeURIComponent(procedureId)}`));
    if (detail.fileBase64) {
      const blob = base64ToBlob(detail.fileBase64, detail.fileMime || "application/octet-stream");
      await downloadGeneratedFile(blob, detail.fileName || `${detail.title || "procedimiento"}.pdf`, detail.fileMime || "application/octet-stream");
      await registerProcedureEvent(procedureId, "downloaded");
      if (canManageProcedures() && state.procedureAudienceById[procedureId]) loadProcedureAudience(procedureId, { force: true });
      return;
    }
    if (detail.externalUrl) {
      window.open(detail.externalUrl, "_blank", "noopener");
      await registerProcedureEvent(procedureId, "downloaded");
      if (canManageProcedures() && state.procedureAudienceById[procedureId]) loadProcedureAudience(procedureId, { force: true });
      return;
    }
    throw new Error("El procedimiento no tiene archivo ni enlace asociado.");
  } catch (error) {
    showErrorToast("No se pudo abrir el procedimiento", error.message);
  } finally {
    setState({ procedureDownloadBusyId: "" });
  }
}

function startEditProcedure(procedureId) {
  if (!canManageProcedures()) return;
  const procedure = state.procedures.find((item) => item.id === procedureId);
  if (!procedure) return;
  setState({
    procedureEditingId: procedure.id,
    procedureUploadDraft: {
      title: procedure.title || "",
      description: procedure.description || "",
      category: procedure.category || "",
      externalUrl: procedure.externalUrl || "",
      fileName: procedure.fileName || "",
      fileMime: procedure.fileMime || "",
      fileBase64: "",
      targetRoles: Array.isArray(procedure.targetRoles) && procedure.targetRoles.length
        ? procedure.targetRoles
        : ["technician", "jm"]
    },
    procedureUploadError: "",
    route: "procedure-upload"
  });
}

async function deleteProcedure(procedureId) {
  if (!canManageProcedures() || !procedureId) return;
  const procedure = state.procedures.find((item) => item.id === procedureId);
  const confirmed = window.confirm(`¿Eliminar el procedimiento "${procedure?.title || "seleccionado"}"?`);
  if (!confirmed) return;
  setState({ procedureDeleteBusyId: procedureId, procedureUploadError: "" });
  try {
    await ensureValidSupabaseSession();
    await apiRequest(`/api/procedures/${encodeURIComponent(procedureId)}`, { method: "DELETE" });
    showSuccessToast("Procedimiento eliminado", "Ya no estará disponible para los usuarios.");
    setState({
      procedures: state.procedures.filter((item) => item.id !== procedureId),
      procedureDeleteBusyId: ""
    });
  } catch (error) {
    setState({ procedureDeleteBusyId: "" });
    showErrorToast("No se pudo eliminar", error.message || "Intenta nuevamente.");
  }
}

async function submitProcedure() {
  if (!canManageProcedures()) {
    setState({ procedureUploadError: "Tu perfil no tiene permisos para subir procedimientos." });
    return;
  }
  const editingId = state.procedureEditingId || "";
  const draft = {
    ...state.procedureUploadDraft,
    title: String(rootEl.querySelector('[data-procedure-upload="title"]')?.value || "").trim(),
    category: String(rootEl.querySelector('[data-procedure-upload="category"]')?.value || "").trim(),
    description: String(rootEl.querySelector('[data-procedure-upload="description"]')?.value || "").trim(),
    externalUrl: String(rootEl.querySelector('[data-procedure-upload="externalUrl"]')?.value || "").trim(),
    targetRoles: Array.from(rootEl.querySelectorAll('[data-role="procedure-target-role"]:checked')).map((item) => item.value)
  };
  if (!draft.title) {
    setState({ procedureUploadDraft: draft, procedureUploadError: "Ingresa el título del procedimiento." });
    return;
  }
  if (!draft.fileBase64 && !draft.externalUrl && !(editingId && draft.fileName)) {
    setState({ procedureUploadDraft: draft, procedureUploadError: "Adjunta un archivo o ingresa un enlace al procedimiento." });
    return;
  }
  if (draft.externalUrl && !/^https?:\/\//i.test(draft.externalUrl)) {
    setState({ procedureUploadDraft: draft, procedureUploadError: "El enlace debe comenzar con http o https." });
    return;
  }
  if (!draft.targetRoles.length) {
    setState({ procedureUploadDraft: draft, procedureUploadError: "Selecciona al menos un cargo destinatario." });
    return;
  }

  setState({ procedureUploadDraft: draft, procedureUploadBusy: true, procedureUploadError: "" });
  try {
    await ensureValidSupabaseSession();
    await apiRequest(editingId ? `/api/procedures/${encodeURIComponent(editingId)}` : "/api/procedures", {
      method: editingId ? "PATCH" : "POST",
      body: JSON.stringify({
        title: draft.title,
        description: draft.description,
        category: draft.category,
        externalUrl: draft.externalUrl,
        fileName: draft.fileName,
        fileMime: draft.fileMime,
        fileBase64: draft.fileBase64,
        targetRoles: draft.targetRoles
      })
    });
    showSuccessToast(editingId ? "Procedimiento actualizado" : "Procedimiento publicado", "Quedó disponible para los cargos seleccionados.");
    setState({
      procedureUploadDraft: emptyProcedureUploadDraft(),
      procedureUploadBusy: false,
      procedureUploadError: "",
      procedureEditingId: "",
      route: "procedures"
    });
    refreshProcedures({ silent: true });
  } catch (error) {
    setState({
      procedureUploadBusy: false,
      procedureUploadError: error.message || (editingId ? "No se pudo actualizar el procedimiento." : "No se pudo publicar el procedimiento.")
    });
  }
}

async function fetchAppMessages(accessToken = state.supabaseSession?.access_token) {
  if (!hasSqlServerApiConfig() || !accessToken) return { inbox: [], sent: [] };
  const inbox = await apiRequest("/api/app-messages", { headers: { Authorization: `Bearer ${accessToken}` } });
  let sent = [];
  if (canSendAppMessages()) {
    sent = await apiRequest("/api/app-messages?sent=1", { headers: { Authorization: `Bearer ${accessToken}` } });
  }
  return {
    inbox: (inbox || []).map(mapAppMessage),
    sent: (sent || []).map(mapAppMessage)
  };
}

function maybeShowDailyMessageSummary(messages = state.appMessages) {
  const unread = messages.filter((message) => !message.readAt).length;
  if (!unread) return;
  const userId = loggedUser()?.id || loggedUser()?.usuario || "anon";
  const today = localDateKey();
  let stored = {};
  try {
    stored = JSON.parse(window.localStorage.getItem(dailyMessageSummaryStorageKey) || "{}") || {};
  } catch {
    stored = {};
  }
  if (stored[userId] === today) return;
  try {
    window.localStorage.setItem(dailyMessageSummaryStorageKey, JSON.stringify({ ...stored, [userId]: today }));
  } catch {
    // Si localStorage falla, solo evitamos bloquear el flujo de mensajes.
  }
  showSuccessToast(
    "Mensajes pendientes",
    `Tienes ${unread} mensaje${unread === 1 ? "" : "s"} sin leer.`
  );
}

async function refreshAppMessages(options = {}) {
  const silent = options.silent ?? true;
  const manual = options.manual ?? false;
  const dailySummary = options.dailySummary ?? false;
  if (!state.isAuthenticated || !hasSqlServerApiConfig() || !state.supabaseSession?.access_token) return;
  if (!isNetworkOnline()) {
    if (!silent) showErrorToast("Sin conexión", "No se pudieron consultar los mensajes.");
    return;
  }
  if (manual) setState({ messageRefreshUiBusy: true });
  try {
    const session = await ensureValidSupabaseSession();
    const result = await fetchAppMessages(session.access_token);
    setState({
      appMessages: result.inbox,
      sentAppMessages: result.sent,
      messageError: "",
      lastSyncAt: new Date().toLocaleString("es-CL")
    });
    if (manual) showSuccessToast("Mensajes actualizados", "Se consultaron los comunicados disponibles.");
    if (dailySummary && !manual) maybeShowDailyMessageSummary(result.inbox);
  } catch (error) {
    if (!silent) showErrorToast("No se pudieron actualizar mensajes", error.message);
    else console.warn("No se pudieron actualizar mensajes.", error);
  } finally {
    if (manual) setState({ messageRefreshUiBusy: false });
  }
}

async function markAppMessageAsRead(messageId) {
  if (!hasSqlServerApiConfig() || !state.supabaseSession?.access_token || !isUuid(messageId)) return;
  const message = state.appMessages.find((item) => item.id === messageId);
  if (!message || message.readAt) return;
  try {
    await apiRequest(`/api/app-messages/${encodeURIComponent(messageId)}/read`, { method: "PATCH" });
    setState({
      appMessages: state.appMessages.map((item) => item.id === messageId
        ? { ...item, readAt: new Date().toISOString(), readCount: 1 }
        : item)
    });
  } catch (error) {
    console.warn("No se pudo marcar el mensaje como leido.", error);
  }
}

function appMessageDetailSignature(message) {
  if (!message) return "";
  const replies = Array.isArray(message.replies) ? message.replies : [];
  return JSON.stringify({
    id: message.id,
    readAt: message.readAt || "",
    replyCount: replies.length,
    lastReplyId: replies[replies.length - 1]?.id || "",
    lastReplyAt: replies[replies.length - 1]?.createdAt || ""
  });
}

async function refreshSelectedAppMessageDetail(options = {}) {
  const messageId = options.messageId || state.selectedMessageId;
  const silent = options.silent ?? true;
  const force = options.force ?? false;
  if (!isUuid(messageId) || !hasSqlServerApiConfig() || !state.supabaseSession?.access_token || !isNetworkOnline()) return;
  if (messageDetailRefreshBusy && !force) return;

  messageDetailRefreshBusy = true;
  try {
    await ensureValidSupabaseSession();
    const detail = await apiRequest(`/api/app-messages/${encodeURIComponent(messageId)}`);
    const nextDetail = {
      ...mapAppMessage(detail),
      replies: Array.isArray(detail?.replies) ? detail.replies.map(mapAppMessageReply) : []
    };
    const currentSignature = appMessageDetailSignature(state.selectedMessageDetail);
    const nextSignature = appMessageDetailSignature(nextDetail);
    if (force || currentSignature !== nextSignature || state.messageDetailBusy) {
      setState({
        selectedMessageId: messageId,
        selectedMessageDetail: nextDetail,
        messageDetailBusy: false,
        messageDetailError: ""
      });
    }
  } catch (error) {
    if (!silent) {
      setState({
        messageDetailBusy: false,
        messageDetailError: error.message || "No se pudo cargar el mensaje."
      });
    } else {
      console.warn("No se pudo actualizar el hilo de mensajes.", error);
    }
  } finally {
    messageDetailRefreshBusy = false;
  }
}

async function openAppMessage(messageId) {
  if (!isUuid(messageId)) return;
  const cached = state.appMessages.find((item) => item.id === messageId)
    || state.sentAppMessages.find((item) => item.id === messageId)
    || null;
  setState({
    selectedMessageId: messageId,
    selectedMessageDetail: cached ? { ...cached, replies: [] } : null,
    messageDetailBusy: true,
    messageDetailError: "",
    messageReplyDraft: "",
    route: "message-detail"
  });
  await markAppMessageAsRead(messageId);
  refreshSelectedAppMessageDetail({ messageId, silent: false, force: true });
}

async function sendAppMessage() {
  if (!canSendAppMessages()) {
    setState({ messageError: "Tu perfil no tiene permisos para enviar comunicados." });
    return;
  }
  if (!hasSqlServerApiConfig()) {
    setState({ messageError: "Esta función requiere conexión al backend SQL Server." });
    return;
  }
  if (!isNetworkOnline()) {
    setState({ messageError: "Sin conexión. Intenta enviar el comunicado cuando tengas internet." });
    return;
  }

  const draft = {
    title: String(state.messageDraft.title || "").trim(),
    body: String(state.messageDraft.body || "").trim(),
    recipientId: String(state.messageDraft.recipientId || "").trim()
  };
  if (!draft.title || !draft.body) {
    setState({ messageDraft: draft, messageError: "Completa título y mensaje antes de enviar." });
    return;
  }

  if (draft.recipientId && !isUuid(draft.recipientId)) {
    setState({ messageDraft: draft, messageError: "Selecciona un Jefe de Mantención válido." });
    return;
  }

  setState({ messageDraft: draft, messageError: "", messageSendBusy: true });
  try {
    await ensureValidSupabaseSession();
    const created = await apiRequest("/api/app-messages", {
      method: "POST",
      body: JSON.stringify({
        title: draft.title,
        body: draft.body,
        recipientId: draft.recipientId || null
      })
    });
    const recipientCount = Number(created?.recipientCount ?? 0);
    showSuccessToast("Comunicado enviado", `${recipientCount} Jefe(s) de Mantención notificado(s).`);
    setState({
      messageDraft: { title: "", body: "", recipientId: "" },
      messageError: "",
      messageSendBusy: false
    });
    refreshAppMessages({ silent: true });
  } catch (error) {
    setState({
      messageSendBusy: false,
      messageError: error.message || "No se pudo enviar el comunicado."
    });
  }
}

async function sendAppMessageReply() {
  const messageId = state.selectedMessageId;
  const body = String(state.messageReplyDraft || "").trim();
  if (!isUuid(messageId)) return;
  if (!body) {
    setState({ messageDetailError: "Escribe una respuesta antes de enviar." });
    return;
  }
  if (!isNetworkOnline()) {
    setState({ messageDetailError: "Sin conexión. Intenta responder cuando tengas internet." });
    return;
  }

  setState({ messageReplyDraft: body, messageReplyBusy: true, messageDetailError: "" });
  try {
    await ensureValidSupabaseSession();
    const reply = await apiRequest(`/api/app-messages/${encodeURIComponent(messageId)}/replies`, {
      method: "POST",
      body: JSON.stringify({ body })
    });
    const nextReply = mapAppMessageReply(reply);
    setState({
      selectedMessageDetail: {
        ...(state.selectedMessageDetail || {}),
        replies: [...(state.selectedMessageDetail?.replies || []), nextReply]
      },
      messageReplyDraft: "",
      messageReplyBusy: false,
      messageDetailError: ""
    });
    showSuccessToast("Respuesta enviada", "El comentario quedó registrado en el comunicado.");
  } catch (error) {
    setState({
      messageReplyBusy: false,
      messageDetailError: error.message || "No se pudo enviar la respuesta."
    });
  }
}

function isOpenScheduledTask(task) {
  if (!task) return false;
  const status = statusClass(task.status || "");
  return !["completada", "cancelada"].includes(status);
}

function openScheduledTaskForRbd(rbd, excludeTaskId = "") {
  const targetRbd = String(rbd || "").trim();
  if (!targetRbd) return null;

  return tasks.find((task) => (
    String(task.rbd || "").trim() === targetRbd
    && task.id !== excludeTaskId
    && isOpenScheduledTask(task)
  )) || null;
}

function assignmentDraftSnapshot() {
  const formState = currentAssignFormState();
  const technician = rootEl.querySelector('[data-role="assign-technician"]')?.value || state.assignTechnician || "";
  return {
    branch: formState.assignBranch ?? state.assignBranch,
    technician,
    type: formState.assignType ?? state.assignType,
    priority: formState.assignPriority ?? state.assignPriority,
    dueAt: formState.assignDueAt ?? state.assignDueAt,
    description: formState.assignDescription ?? state.assignDescription,
    requiredSections: formState.assignRequiredSections ?? state.assignRequiredSections,
    criticalSections: formState.assignCriticalSections ?? state.assignCriticalSections,
    sectionMinimums: formState.assignSectionMinimums ?? state.assignSectionMinimums
  };
}

function combinedAssignmentDescription(existingDescription = "", incomingDescription = "") {
  const existing = String(existingDescription || "").trim();
  const incoming = String(incomingDescription || "").trim();

  if (!existing) return incoming;
  if (!incoming || normalizeSearch(existing).includes(normalizeSearch(incoming))) return existing;

  return `${existing}

--- Nueva contingencia incorporada ---
${incoming}`;
}

function beginEditingScheduledTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    setState({ assignConflictTaskId: "", assignConflictDraft: null });
    return;
  }

  const incoming = state.assignConflictDraft || assignmentDraftSnapshot();
  const existingRequired = Array.isArray(task.form?.requiredSections) ? task.form.requiredSections : [];
  const existingCritical = Array.isArray(task.form?.criticalSections) ? task.form.criticalSections : [];
  const existingMinimums = task.form?.sectionMinimums || {};
  const incomingRequired = Array.isArray(incoming.requiredSections) ? incoming.requiredSections : [];
  const incomingCritical = Array.isArray(incoming.criticalSections) ? incoming.criticalSections : [];
  const incomingMinimums = incoming.sectionMinimums || {};
  const establishment = establishments.find((item) => item.rbd === String(task.rbd));
  const establishmentBranch = establishment?.branch || task.establishmentMeta?.sucursal || incoming.branch || selectedAssignBranch(loggedUser());

  setState({
    assignEditingTaskId: task.id,
    assignConflictTaskId: "",
    assignConflictDraft: null,
    assignBranch: establishmentBranch,
    assignTechnician: task.assignedTo || incoming.technician || "",
    assignSelectedRbd: String(task.rbd),
    assignRbdSearch: establishmentLabel(establishment),
    assignType: incoming.type || task.type,
    assignPriority: (incoming.priority === "Alta" || task.priority === "Alta")
      ? "Alta"
      : (incoming.priority || task.priority || "Media"),
    assignDueAt: task.dueDateIso || isoDateFromTaskLabel(task.dueAt) || incoming.dueAt || "",
    assignDescription: combinedAssignmentDescription(task.description, incoming.description),
    assignRequiredSections: Array.from(new Set([...existingRequired, ...incomingRequired])),
    assignCriticalSections: Array.from(new Set([...existingCritical, ...incomingCritical])),
    assignSectionMinimums: { ...existingMinimums, ...incomingMinimums },
    actionMessage: "Editando la visita programada existente para evitar duplicar el RBD."
  });
}

function cancelAssignmentConflict() {
  setState({ assignConflictTaskId: "", assignConflictDraft: null });
}

async function updateRemoteScheduledTask(task, technician, sectionConfig) {
  const taskId = task.supabaseId || task.id;
  if (!taskId) throw new Error("La visita existente no tiene un identificador remoto válido.");

  if (hasSqlServerApiConfig()) {
    await apiRequest(`/api/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        type: task.type,
        assignedTo: technician.id,
        description: task.description,
        dueDate: task.dueDateIso,
        dueDateIso: task.dueDateIso,
        status: statusToSupabase(task.status),
        priority: priorityToSupabase(task.priority),
        sectionConfig,
        incidentId: state.selectedIncidentId || ""
      })
    });
    return;
  }

  const headers = {
    Authorization: `Bearer ${state.supabaseSession.access_token}`,
    Prefer: "return=representation"
  };

  const templateRows = await supabaseRequest(
    `/rest/v1/form_templates?visit_type=eq.${encodeURIComponent(task.type)}&select=id&limit=1`,
    { headers }
  );
  const templateId = templateRows?.[0]?.id;
  if (!templateId) throw new Error(`No existe plantilla para ${task.type}.`);

  await supabaseRequest(`/rest/v1/tasks?id=eq.${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      task_type: task.type,
      assigned_to: technician.id,
      form_template_id: templateId,
      description: task.description,
      due_date: task.dueDateIso,
      status: statusToSupabase(task.status),
      priority: priorityToSupabase(task.priority),
      sync_state: "synced"
    })
  });

  await supabaseRequest(`/rest/v1/task_required_sections?task_id=eq.${encodeURIComponent(taskId)}`, {
    method: "DELETE",
    headers
  });

  const configuredCodes = Array.from(new Set([
    ...sectionConfig.requiredSections,
    ...sectionConfig.criticalSections,
    ...Object.keys(sectionConfig.sectionMinimums || {})
  ]));

  if (!configuredCodes.length) return;

  const sectionRows = await supabaseRequest(
    `/rest/v1/form_sections?template_id=eq.${templateId}&code=in.(${configuredCodes.map(encodeURIComponent).join(",")})&select=id,code`,
    { headers }
  );

  const requiredRows = sectionRows.map((section) => ({
    task_id: taskId,
    section_id: section.id,
    is_required: sectionConfig.requiredSections.includes(section.code),
    is_critical: sectionConfig.criticalSections.includes(section.code),
    min_required: sectionConfig.sectionMinimums?.[section.code] ?? null
  }));

  if (requiredRows.length) {
    await supabaseRequest("/rest/v1/task_required_sections", {
      method: "POST",
      headers,
      body: JSON.stringify(requiredRows)
    });
  }
}

function assignmentConflictOverlay() {
  const conflict = tasks.find((task) => task.id === state.assignConflictTaskId);
  if (!conflict) return "";

  const technician = users.find((user) => user.usuario === conflict.assignedTo);
  const incoming = state.assignConflictDraft || {};
  const existingSections = Array.isArray(conflict.form?.requiredSections)
    ? conflict.form.requiredSections
    : [];

  return `
    <section class="assignment-conflict-backdrop" role="dialog" aria-modal="true" aria-label="Visita ya programada">
      <article class="assignment-conflict-modal">
        <div class="assignment-conflict-icon">!</div>
        <h2>Ya existe una visita programada</h2>
        <p>
          El RBD <strong>${escapeHtml(conflict.rbd)}</strong> ya tiene una visita pendiente.
          Para evitar dos visitas al mismo establecimiento, puedes editar la planificación existente
          e incorporar la nueva necesidad.
        </p>

        <div class="assignment-conflict-summary">
          <div><span>Visita actual</span><strong>${escapeHtml(conflict.type || "Visita")}</strong></div>
          <div><span>Fecha</span><strong>${escapeHtml(conflict.dueAt || conflict.dueDateIso || "Sin fecha")}</strong></div>
          <div><span>Técnico</span><strong>${escapeHtml(technician?.nombre || conflict.assignedTo || "Sin técnico")}</strong></div>
          <div><span>Prioridad</span><strong>${escapeHtml(conflict.priority || "Media")}</strong></div>
        </div>

        ${incoming.type ? `
          <div class="assignment-conflict-incoming">
            <span>Nueva solicitud</span>
            <strong>${escapeHtml(incoming.type)}</strong>
            ${incoming.description ? `<p>${escapeHtml(incoming.description)}</p>` : ""}
          </div>
        ` : ""}

        ${existingSections.length ? `
          <p class="assignment-conflict-note">
            La visita existente ya tiene ${existingSections.length}
            aspecto${existingSections.length === 1 ? "" : "s"} obligatorio${existingSections.length === 1 ? "" : "s"}.
            Se conservarán al editar.
          </p>
        ` : ""}

        <div class="assignment-conflict-actions">
          <button class="button secondary" type="button" data-action="cancel-assignment-conflict">Cancelar</button>
          <button class="button primary" type="button" data-action="edit-existing-assignment" data-task-id="${escapeAttribute(conflict.id)}">
            Editar visita existente
          </button>
        </div>
      </article>

      <style>
        .assignment-conflict-backdrop{
          position:fixed;inset:0;z-index:1000010;background:rgba(12,24,32,.48);
          display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)
        }
        .assignment-conflict-modal{
          width:min(520px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:20px;
          padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.28);color:#162b38
        }
        .assignment-conflict-icon{
          width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#fff2d8;
          color:#a96900;font-weight:800;font-size:24px;margin-bottom:12px
        }
        .assignment-conflict-modal h2{margin:0 0 8px;font-size:22px}
        .assignment-conflict-modal>p{margin:0 0 16px;line-height:1.45;color:#526573}
        .assignment-conflict-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
        .assignment-conflict-summary>div{background:#f3f8f6;border-radius:12px;padding:10px}
        .assignment-conflict-summary span,.assignment-conflict-incoming span{
          display:block;font-size:11px;color:#6e7e88;margin-bottom:3px
        }
        .assignment-conflict-summary strong{font-size:13px}
        .assignment-conflict-incoming{
          border:1px solid #d9eee6;background:#f7fcfa;border-radius:12px;padding:11px;margin:10px 0
        }
        .assignment-conflict-incoming p{
          margin:5px 0 0;font-size:12px;color:#526573;white-space:pre-line
        }
        .assignment-conflict-note{
          font-size:12px!important;background:#f5f6f8;padding:10px;border-radius:10px
        }
        .assignment-conflict-actions{
          display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px
        }
        @media(max-width:520px){
          .assignment-conflict-summary,.assignment-conflict-actions{grid-template-columns:1fr}
        }
      </style>
    </section>
  `;
}

async function createSupabaseTaskFromAssignment(task, technician, selectedEstablishment, sectionConfig) {
  if (hasSqlServerApiConfig()) {
    const created = await apiRequest("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        type: task.type,
        rbd: selectedEstablishment.rbd,
        assignedTo: technician.id,
        description: task.description,
        dueDate: task.dueDateIso,
        dueDateIso: task.dueDateIso,
        status: statusToSupabase(task.status),
        priority: priorityToSupabase(task.priority),
        sectionConfig,
        incidentId: state.selectedIncidentId || "",
        consolidateOpenTask: true
      })
    });
    if (!created?.id) throw new Error("El backend SQL Server no devolvió el ID de la tarea creada.");
    return created.id;
  }

  const headers = {
    Authorization: `Bearer ${state.supabaseSession.access_token}`,
    Prefer: "return=representation"
  };

  const establishmentRows = await supabaseRequest(`/rest/v1/establishments?rbd=eq.${encodeURIComponent(selectedEstablishment.rbd)}&select=id`, { headers });
  const establishmentId = establishmentRows?.[0]?.id;
  if (!establishmentId) throw new Error(`El RBD ${selectedEstablishment.rbd} no existe en Supabase.`);

  const templateRows = await supabaseRequest(`/rest/v1/form_templates?visit_type=eq.${encodeURIComponent(task.type)}&select=id&limit=1`, { headers });
  const templateId = templateRows?.[0]?.id;
  if (!templateId) throw new Error(`No existe plantilla para ${task.type}.`);

  const insertedRows = await supabaseRequest("/rest/v1/tasks?select=id", {
    method: "POST",
    headers,
    body: JSON.stringify({
      task_type: task.type,
      establishment_id: establishmentId,
      assigned_to: technician.id,
      assigned_by: loggedUser().id,
      form_template_id: templateId,
      description: task.description,
      due_date: task.dueDateIso,
      status: statusToSupabase(task.status),
      priority: priorityToSupabase(task.priority),
      sync_state: "synced"
    })
  });

  const insertedTask = insertedRows?.[0];
  if (!insertedTask?.id) throw new Error("Supabase no devolvió el ID de la tarea creada.");

  const configuredSectionIds = Array.from(new Set([
    ...sectionConfig.requiredSections,
    ...sectionConfig.criticalSections,
    ...Object.keys(sectionConfig.sectionMinimums)
  ]));

  if (configuredSectionIds.length) {
    let sectionRows = await supabaseRequest(`/rest/v1/form_sections?template_id=eq.${templateId}&code=in.(${configuredSectionIds.map(encodeURIComponent).join(",")})&select=id,code`, { headers });
    const existingSectionCodes = new Set(sectionRows.map((section) => section.code));
    const missingSections = configuredSectionIds
      .filter((code) => !existingSectionCodes.has(code))
      .map((code) => {
        const definitionIndex = formSectionDefinitions.findIndex((section) => section.id === code);
        const definition = formSectionDefinitions[definitionIndex];
        return {
          template_id: templateId,
          code,
          title: definition?.title ?? code,
          sort_order: definitionIndex >= 0 ? definitionIndex + 1 : 99,
          is_base_required: Boolean(definition?.baseRequired),
          is_base_critical: Boolean(definition?.baseCritical),
          fixed_min_required: definition?.minimum ?? null
        };
      });

    if (missingSections.length) {
      const insertedSections = await supabaseRequest("/rest/v1/form_sections?select=id,code", {
        method: "POST",
        headers,
        body: JSON.stringify(missingSections)
      });
      sectionRows = [...sectionRows, ...insertedSections];
    }

    const requiredRows = sectionRows.map((section) => ({
      task_id: insertedTask.id,
      section_id: section.id,
      is_required: sectionConfig.requiredSections.includes(section.code),
      is_critical: sectionConfig.criticalSections.includes(section.code),
      min_required: sectionConfig.sectionMinimums[section.code] ?? null
    }));

    if (requiredRows.length) {
      await supabaseRequest("/rest/v1/task_required_sections", {
        method: "POST",
        headers,
        body: JSON.stringify(requiredRows)
      });
    }
  }

  notifyTaskAssigned(insertedTask.id);
  return insertedTask.id;
}

const allowedRoles = [
  "Jefe Mantención",
  "Administrador Aplicación",
  "Jefe Nacional",
  "Técnico Multifuncional",
  "Técnico Multifuncional SEC"
];

const allowedBranches = [
  "Los Ángeles",
  "Cañete",
  "Lautaro",
  "Rancagua",
  "San Fernando",
  "Santiago",
  "Talca",
  "Paillaco"
];

function normalizeMojibakeText(value) {
  const text = String(value ?? "").trim();
  if (!/[ÃÂ]/.test(text)) return text;

  try {
    const bytes = Uint8Array.from(Array.from(text, (char) => char.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes).trim();
    return decoded || text;
  } catch {
    return text
      .replaceAll("Ã¡", "á")
      .replaceAll("Ã©", "é")
      .replaceAll("Ã­", "í")
      .replaceAll("Ã³", "ó")
      .replaceAll("Ãº", "ú")
      .replaceAll("Ã±", "ñ")
      .replaceAll("Ã", "Á")
      .replaceAll("Ã‰", "É")
      .replaceAll("Ã", "Í")
      .replaceAll("Ã“", "Ó")
      .replaceAll("Ãš", "Ú")
      .replaceAll("Ã‘", "Ñ")
      .replaceAll("Â°", "°")
      .replaceAll("Âº", "º")
      .trim();
  }
}

function uniqueNormalizedNames(values) {
  const seen = new Set();
  return values
    .map(normalizeMojibakeText)
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLocaleLowerCase("es-CL");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const icons = {
  tasks: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>',
  history: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v6h6M12 7v6l4 2"/></svg>',
  sync: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-15.3 6.4M3 12A9 9 0 0 1 18.3 5.6M18 3v5h-5M6 21v-5h5"/></svg>',
  profile: '<svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>',
  user: '<svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><path d="M12 17v-5M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>',
  alert: '<svg viewBox="0 0 24 24"><path d="m12 3 10 18H2L12 3ZM12 9v5M12 17h.01"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4V5Zm0 2 8 6 8-6"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><path d="M7 10V8a5 5 0 0 1 10 0v2M5 10h14v11H5V10Z"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M5 7h3l2-3h4l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24"><path d="M9 4h6l1 2h3v15H5V6h3l1-2Z"/><path d="M9 4v3h6V4M8 12h8M8 16h6"/></svg>',
  thermometer: '<svg viewBox="0 0 24 24"><path d="M14 14.8V5a4 4 0 0 0-8 0v9.8a6 6 0 1 0 8 0Z"/><path d="M10 7v8"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="m13 2-9 12h7l-1 8 10-13h-7l0-7Z"/></svg>',
  snowflake: '<svg viewBox="0 0 24 24"><path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1 19.1 4.9M8 2l4 4 4-4M8 22l4-4 4 4"/></svg>',
  bug: '<svg viewBox="0 0 24 24"><path d="M8 8a4 4 0 0 1 8 0v7a4 4 0 0 1-8 0V8ZM3 13h5M16 13h5M5 7l3 2M19 7l-3 2M5 19l3-2M19 19l-3-2M12 4V2"/></svg>',
  droplet: '<svg viewBox="0 0 24 24"><path d="M12 2s7 7.1 7 12a7 7 0 0 1-14 0c0-4.9 7-12 7-12Z"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11 12 3l9 8M5 10v11h14V10M9 21v-6h6v6"/></svg>',
  utensils: '<svg viewBox="0 0 24 24"><path d="M4 3v8M7 3v8M10 3v8M7 11v10M17 3v18M14 3h6v8h-6V3Z"/></svg>',
  checkSquare: '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4V4Z"/><path d="m8 12 3 3 5-6"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24"><path d="M10 6V4h4v2M4 7h16v13H4V7Z"/><path d="M4 12h16"/></svg>',
  signature: '<svg viewBox="0 0 24 24"><path d="M4 18c4-8 5-12 7-12 3 0-1 12 3 12 2 0 3-2 5-5M4 21h16"/></svg>',
  branch: '<svg viewBox="0 0 24 24"><path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-7h6v7M8 10h.01M12 10h.01M16 10h.01"/></svg>',
  location: '<svg viewBox="0 0 24 24"><path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z"/><path d="M12 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>',
  groupBadge: '<svg viewBox="0 0 24 24"><path d="M7 19a5 5 0 0 1 10 0M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M19 8h2v4M5 8H3v4"/></svg>',
  statusCheck: '<svg viewBox="0 0 24 24"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="m8.5 12.5 2.2 2.2 4.8-5.4"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 3 20 6v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-5"/></svg>',
  group: '<svg viewBox="0 0 24 24"><path d="M16 19a4 4 0 0 0-8 0M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM22 19a3.5 3.5 0 0 0-5-3.2M17 11a2.5 2.5 0 1 0 0-5M2 19a3.5 3.5 0 0 1 5-3.2M7 11a2.5 2.5 0 1 1 0-5"/></svg>',
  message: '<svg viewBox="0 0 24 24"><path d="M4 5h16v12H7l-3 3V5Z"/><path d="m5 7 7 5 7-5"/></svg>',
  clipboardCheck: '<svg viewBox="0 0 24 24"><path d="M9 4h6l1 2h3v15H5V6h3l1-2Z"/><path d="M9 14l2 2 4-5M9 4v3h6V4"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
  logo: '<img src="./src/logo/Icono_Datacora.png" alt="" />'
};

function setState(nextState) {
  Object.assign(state, nextState);
  persistDailyAuthState();
  render();
}

function setStateSilently(nextState) {
  Object.assign(state, nextState);
  persistDailyAuthState();
}

function localDateKey(date = new Date()) {
  return date.toLocaleDateString("en-CA");
}

function readDailyAuthState() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(dailyAuthStorageKey) || "null");
    if (!stored || stored.dateKey !== localDateKey()) return null;
    return stored;
  } catch {
    return null;
  }
}

function persistDailyAuthState() {
  if (!state.isAuthenticated || !state.currentUser) return;
  try {
    window.localStorage.setItem(dailyAuthStorageKey, JSON.stringify({
      dateKey: localDateKey(),
      savedAt: new Date().toISOString(),
      route: state.route,
      selectedTaskId: state.selectedTaskId,
      filter: state.filter,
      currentUser: state.currentUser,
      supabaseSession: state.supabaseSession,
      supabaseCatalogs: state.supabaseCatalogs,
      users,
      tasks
    }));
  } catch {
    // If local storage is full, the current in-memory session still works.
  }
}

function clearDailyAuthState() {
  try {
    window.localStorage.removeItem(dailyAuthStorageKey);
  } catch {
    // Ignore storage errors.
  }
}

function readStoredIncidents() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(incidentsStorageKey) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function persistIncidents() {
  try {
    window.localStorage.setItem(incidentsStorageKey, JSON.stringify(state.incidents));
  } catch {
    // The active session still keeps incidents in memory.
  }
}

function restoreDailyAuthState() {
  const stored = readDailyAuthState();
  if (!stored?.currentUser) return false;

  if (Array.isArray(stored.users) && stored.users.length) users.splice(0, users.length, ...stored.users);
  if (Array.isArray(stored.tasks)) {
    tasks.splice(0, tasks.length, ...stored.tasks);
    applyPendingSubmissionState();
  }

  const selectedTaskId = tasks.some((task) => task.id === stored.selectedTaskId)
    ? stored.selectedTaskId
    : tasks[0]?.id;

  Object.assign(state, {
    isAuthenticated: true,
    selectedTaskId,
    filter: stored.filter ?? state.filter,
    currentUser: stored.currentUser,
    supabaseSession: stored.supabaseSession ?? null,
    supabaseCatalogs: stored.supabaseCatalogs ?? state.supabaseCatalogs,
    loginError: "",
    loginMessage: "",
    passwordChangeError: "",
    route: stored.route || defaultRouteFor(stored.currentUser),
    incidents: Array.isArray(stored.incidents) ? stored.incidents : readStoredIncidents()
  });
  if (isPasswordChangeRequired()) state.route = "password-change";

  if (!tasks.length) restoreOfflineTaskCache({ silent: true });

  if (state.selectedTaskId) {
    Object.assign(state, formProgressStateForTask(state.selectedTaskId));
  }

  return true;
}

function readStoredFormProgress() {
  try {
    return JSON.parse(window.localStorage.getItem(formProgressStorageKey) || "{}");
  } catch (error) {
    return {};
  }
}

function writeStoredFormProgress(progress, options = {}) {
  try {
    window.localStorage.setItem(formProgressStorageKey, JSON.stringify(progress));
    formStorageWarningShown = false;
    return true;
  } catch (error) {
    if (!options.silent && !formStorageWarningShown) {
      formStorageWarningShown = true;
      showErrorToast("No se pudo guardar localmente", "El almacenamiento del dispositivo está lleno o las fotografías son muy pesadas.");
    }
    return false;
  }
}

function formProgressWithoutPhotoPreviews(snapshot) {
  const stripPhotos = (photos = []) => (Array.isArray(photos) ? photos : []).map((photo) => ({ ...photo, evidencePreview: "" }));
  const stripRecord = (record = {}) => ({ ...record, evidencePreview: "", evidencePhotos: stripPhotos(record.evidencePhotos) });
  const stripRecords = (records = []) => records.map(stripRecord);
  return {
    ...snapshot,
    heatDraft: stripRecord(snapshot.heatDraft ?? {}),
    electricityDraft: stripRecord(snapshot.electricityDraft ?? {}),
    coldDraft: stripRecord(snapshot.coldDraft ?? {}),
    waterDraft: stripRecord(snapshot.waterDraft ?? {}),
    infrastructureDraft: stripRecord(snapshot.infrastructureDraft ?? {}),
    vectorsDraft: stripRecord(snapshot.vectorsDraft ?? {}),
    heatRecords: stripRecords(snapshot.heatRecords),
    electricityRecords: stripRecords(snapshot.electricityRecords),
    coldRecords: stripRecords(snapshot.coldRecords),
    waterRecords: stripRecords(snapshot.waterRecords),
    infrastructureRecords: stripRecords(snapshot.infrastructureRecords),
    vectorsRecords: stripRecords(snapshot.vectorsRecords),
    paeSignatureData: "",
    technicianSignatureData: ""
  };
}

function readPendingSubmissions() {
  try {
    return JSON.parse(window.localStorage.getItem(pendingSubmissionsStorageKey) || "{}");
  } catch (error) {
    return {};
  }
}

function writePendingSubmissions(queue) {
  window.localStorage.setItem(pendingSubmissionsStorageKey, JSON.stringify(queue));
}

function offlineTaskCacheKey(user = loggedUser()) {
  const userKey = user?.usuario || user?.email || user?.id || "anonymous";
  return `${offlineTasksStorageKey}:${userKey}`;
}

function readOfflineTaskCache(user = loggedUser()) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(offlineTaskCacheKey(user)) || "null");
    if (!stored || !Array.isArray(stored.tasks)) return null;
    return stored;
  } catch {
    return null;
  }
}

function writeOfflineTaskCache(taskList, user = loggedUser()) {
  try {
    window.localStorage.setItem(offlineTaskCacheKey(user), JSON.stringify({
      savedAt: new Date().toISOString(),
      user: user?.usuario || user?.email || user?.id || "",
      tasks: taskList
    }));
  } catch {
    // If device storage is unavailable, online operation still works.
  }
}

function restoreOfflineTaskCache(options = {}) {
  const silent = options.silent ?? true;
  const cache = readOfflineTaskCache();
  if (!cache?.tasks?.length) return false;

  tasks.splice(0, tasks.length, ...cache.tasks);
  applyPendingSubmissionState();
  if (state.selectedTaskId && !tasks.some((task) => task.id === state.selectedTaskId)) {
    state.selectedTaskId = tasks[0]?.id;
  }
  setState({
    selectedTaskId: state.selectedTaskId,
    lastSyncAt: cache.savedAt
      ? `Copia offline: ${new Date(cache.savedAt).toLocaleString("es-CL")}`
      : state.lastSyncAt
  });
  if (!silent) {
    showSuccessToast("Modo offline", `Se cargaron ${cache.tasks.length} tarea${cache.tasks.length === 1 ? "" : "s"} guardada${cache.tasks.length === 1 ? "" : "s"} en este dispositivo.`);
  }
  return true;
}

function pendingSubmissionEntries() {
  return Object.entries(readPendingSubmissions());
}

function pendingSubmissionCount() {
  return pendingSubmissionEntries().length;
}

function removePendingSubmission(taskId) {
  const queue = readPendingSubmissions();
  delete queue[taskId];
  writePendingSubmissions(queue);
}

function isNetworkOnline() {
  return Boolean(state.networkOnline);
}

function isOfflineSubmissionError(error) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return !isNetworkOnline()
    || message.includes("failed to fetch")
    || message.includes("networkerror")
    || message.includes("load failed")
    || message.includes("no respondió a tiempo");
}

function isSupabaseAuthTokenError(error) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return message.includes("invalid jwt")
    || message.includes("session_id claim")
    || message.includes("session from session_id")
    || message.includes("session does not exist")
    || message.includes("jwt expired")
    || message.includes("invalid token")
    || message.includes("token is expired")
    || message.includes("unauthorized");
}

function returnToLogin(message = "") {
  stopTaskAutoRefresh();
  stopTaskRealtime();
  stopGpsDebugMonitor();
  clearDailyAuthState();
  setState({
    isAuthenticated: false,
    currentUser: null,
    supabaseSession: null,
    loginError: "",
    loginMessage: message,
    technicianTaskSearch: "",
    technicianRbdSearch: "",
    technicianSelectedRbd: "",
    technicianOverdueCriticality: "",
    passwordChangeError: "",
    actionMessage: "",
    route: "tasks"
  });
}

function applyPendingSubmissionState() {
  const queue = readPendingSubmissions();
  tasks.forEach((task) => {
    if (!queue[task.id]) {
      if (task.syncStatus === "pending" && isTaskCompleted(task)) {
        task.syncStatus = "synced";
        if (/^Pendiente de sincronización con (Supabase|SQL Server)\.$/.test(task.syncWarning || "")) task.syncWarning = "";
      }
      return;
    }
    task.status = "Completada";
    task.syncStatus = "pending";
    task.syncWarning = `Pendiente de sincronización con ${remoteBackendLabel()}.`;
  });
}

function mergeSupabaseTasks(remoteTasks, options = {}) {
  const notify = options.notify ?? false;
  const user = options.user ?? loggedUser();
  const pendingQueue = readPendingSubmissions();
  const existingById = new Map(tasks.map((task) => [task.id, task]));
  const existingIds = new Set(tasks.map((task) => task.id));
  const newAssignedTasks = [];

  const mergedTasks = remoteTasks.map((remoteTask) => {
    const localTask = existingById.get(remoteTask.id);
    if (pendingQueue[remoteTask.id] && localTask?.syncStatus === "pending" && isTaskCompleted(localTask)) {
      return { ...remoteTask, ...localTask };
    }

    if (
      notify
      && user
      && !existingIds.has(remoteTask.id)
      && remoteTask.assignedTo === user.usuario
      && !isTaskCompleted(remoteTask)
    ) {
      newAssignedTasks.push(remoteTask);
    }

    return remoteTask;
  });

  tasks.splice(0, tasks.length, ...mergedTasks);
  applyPendingSubmissionState();
  writeOfflineTaskCache(tasks, user);

  if (state.selectedTaskId && !tasks.some((task) => task.id === state.selectedTaskId)) {
    state.selectedTaskId = tasks[0]?.id;
  }

  return newAssignedTasks;
}

async function refreshSupabaseTasks(options = {}) {
  const silent = options.silent ?? true;
  const notify = options.notify ?? false;
  const manual = options.manual ?? false;

  if (taskRefreshBusy) return;
  if (!manual && isFormProgressRoute()) return;
  if (!state.isAuthenticated || !hasSupabaseConfig() || !state.supabaseSession?.access_token) {
    if (!silent) showErrorToast("No se pudo actualizar", "Inicia sesión con Supabase para actualizar tareas.");
    return;
  }
  if (!isNetworkOnline()) {
    const restored = restoreOfflineTaskCache({ silent });
    if (!restored && !silent) showErrorToast("Sin conexión", "No hay tareas guardadas en este dispositivo. Sincroniza con internet antes de salir a terreno.");
    return;
  }

  taskRefreshBusy = true;
  if (manual) setState({ taskRefreshUiBusy: true });
  try {
    const session = await ensureValidSupabaseSession();
    const remoteTasks = await fetchSupabaseTasks(session.access_token);
    const newAssignedTasks = mergeSupabaseTasks(remoteTasks, { notify });
    setState({
      selectedTaskId: state.selectedTaskId,
      lastSyncAt: new Date().toLocaleString("es-CL")
    });

    if (newAssignedTasks.length) {
      showSuccessToast(
        "Nueva tarea asignada",
        newAssignedTasks.length === 1
          ? `RBD ${newAssignedTasks[0].rbd} quedó disponible en Mis tareas.`
          : `${newAssignedTasks.length} tareas nuevas quedaron disponibles en Mis tareas.`
      );
    } else if (!silent) {
      showSuccessToast("Tareas actualizadas", "No hay tareas nuevas por ahora.");
    }
  } catch (error) {
    const restored = restoreOfflineTaskCache({ silent });
    if (!restored && !silent) showErrorToast("No se pudieron actualizar tareas", error.message);
  } finally {
    taskRefreshBusy = false;
    if (manual) setState({ taskRefreshUiBusy: false });
  }
}

function startTaskAutoRefresh() {
  if (taskRefreshTimer || !hasSupabaseConfig()) return;
  taskRefreshTimer = window.setInterval(() => {
    refreshSupabaseTasks({ silent: true, notify: true });
  }, taskRefreshIntervalMs);
}

function stopTaskAutoRefresh() {
  if (!taskRefreshTimer) return;
  window.clearInterval(taskRefreshTimer);
  taskRefreshTimer = null;
}

function startMessageDetailAutoRefresh() {
  if (messageDetailRefreshTimer || state.route !== "message-detail" || !isUuid(state.selectedMessageId)) return;
  messageDetailRefreshTimer = window.setInterval(() => {
    if (state.route !== "message-detail") {
      stopMessageDetailAutoRefresh();
      return;
    }
    refreshSelectedAppMessageDetail({ silent: true });
  }, messageDetailRefreshIntervalMs);
}

function stopMessageDetailAutoRefresh() {
  if (!messageDetailRefreshTimer) return;
  window.clearInterval(messageDetailRefreshTimer);
  messageDetailRefreshTimer = null;
}

function realtimeSend(topic, event, payload = {}) {
  if (!realtimeSocket || realtimeSocket.readyState !== WebSocket.OPEN) return;
  realtimeSocket.send(JSON.stringify({
    topic,
    event,
    payload,
    ref: String(realtimeRef++)
  }));
}

function scheduleRealtimeTaskRefresh() {
  if (realtimeRefreshTimer) window.clearTimeout(realtimeRefreshTimer);
  realtimeRefreshTimer = window.setTimeout(() => {
    realtimeRefreshTimer = null;
    refreshSupabaseTasks({ silent: true, notify: true });
  }, 1200);
}

function clearRealtimeTimers() {
  if (realtimeHeartbeatTimer) {
    window.clearInterval(realtimeHeartbeatTimer);
    realtimeHeartbeatTimer = null;
  }
  if (realtimeReconnectTimer) {
    window.clearTimeout(realtimeReconnectTimer);
    realtimeReconnectTimer = null;
  }
  if (realtimeRefreshTimer) {
    window.clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = null;
  }
}

function stopTaskRealtime() {
  clearRealtimeTimers();
  if (realtimeSocket) {
    realtimeSocket.onopen = null;
    realtimeSocket.onmessage = null;
    realtimeSocket.onerror = null;
    realtimeSocket.onclose = null;
    try {
      realtimeSocket.close();
    } catch {
      // Ignore close errors.
    }
    realtimeSocket = null;
  }
}

function startTaskRealtime() {
  if (hasSqlServerApiConfig()) return;
  if (!hasSupabaseConfig() || !state.supabaseSession?.access_token || realtimeSocket) return;
  if (!isNetworkOnline()) return;
  if (!("WebSocket" in window)) return;

  try {
    realtimeSocket = new WebSocket(supabaseRealtimeUrl());
  } catch {
    realtimeSocket = null;
    return;
  }

  realtimeSocket.onopen = () => {
    realtimeHeartbeatTimer = window.setInterval(() => {
      realtimeSend("phoenix", "heartbeat", {});
    }, 25000);

    realtimeSend("realtime:public:tasks", "phx_join", {
      config: {
        broadcast: { self: false },
        presence: { key: "" },
        postgres_changes: [
          { event: "*", schema: "public", table: "tasks" },
          { event: "*", schema: "public", table: "task_required_sections" }
        ]
      },
      access_token: state.supabaseSession.access_token
    });
  };

  realtimeSocket.onmessage = (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }

    const postgresChanges = message?.event === "postgres_changes"
      || Array.isArray(message?.payload?.data)
      || Boolean(message?.payload?.ids);

    if (postgresChanges) {
      scheduleRealtimeTaskRefresh();
    }
  };

  realtimeSocket.onerror = () => {
    stopTaskRealtime();
    scheduleTaskRealtimeReconnect();
  };

  realtimeSocket.onclose = () => {
    realtimeSocket = null;
    clearRealtimeTimers();
    scheduleTaskRealtimeReconnect();
  };
}

function scheduleTaskRealtimeReconnect() {
  if (realtimeReconnectTimer || !state.isAuthenticated || !state.supabaseSession?.access_token || !isNetworkOnline()) return;
  realtimeReconnectTimer = window.setTimeout(() => {
    realtimeReconnectTimer = null;
    startTaskRealtime();
  }, 5000);
}

async function savePushToken(token) {
  if (!token || !hasSupabaseConfig() || !state.supabaseSession?.access_token || !loggedUser()?.id) return;
  lastRegisteredPushToken = token;

  try {
    if (hasSqlServerApiConfig()) {
      await apiRequest("/api/device-push-tokens", {
        method: "POST",
        body: JSON.stringify({
          token,
          platform: "android"
        })
      });
      return;
    }

    await supabaseRequest("/rest/v1/device_push_tokens?on_conflict=token", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        user_id: loggedUser().id,
        token,
        platform: "android",
        is_active: true,
        last_seen_at: new Date().toISOString()
      })
    });
  } catch (error) {
    console.warn("No se pudo registrar el token push.", error);
  }
}

async function registerPushNotifications() {
  const push = nativePlugin("PushNotifications");
  if (!push || !hasSupabaseConfig() || !state.supabaseSession?.access_token || !loggedUser()?.id) return;

  try {
    if (!pushNotificationsReady) {
      pushNotificationsReady = true;

      push.addListener("registration", (token) => {
        savePushToken(token?.value ?? token?.token ?? "");
      });

      push.addListener("registrationError", (error) => {
        console.warn("No se pudo activar notificaciones push.", error);
      });

      const notificationRoute = (notification) => {
        const data = notification?.data || {};
        if (data.route === "messages" || data.type === "app_message") return "messages";
        if (data.route === "procedures" || data.type === "procedure_created") return "procedures";
        if (data.route === "jm-notifications" || data.type === "maintenance_alert") return "jm-notifications";
        if (data.route === "incidents" || data.type === "incident_created") {
          return canAssignTasks() && canSeeNotifications() ? "jm-notifications" : "incidents";
        }
        return "tasks";
      };
      const notificationMessageId = (notification) => {
        const data = notification?.data || {};
        return String(data.messageId || data.message_id || "").trim();
      };

      push.addListener("pushNotificationReceived", (notification) => {
        const title = notification?.title || "Nueva tarea asignada";
        const body = notification?.body || "Actualiza tus tareas para verla.";
        const messageId = notificationMessageId(notification);
        if (notificationRoute(notification) === "messages") {
          refreshAppMessages({ silent: true, dailySummary: true });
          if (state.route === "message-detail" && (!messageId || messageId === state.selectedMessageId)) {
            refreshSelectedAppMessageDetail({ messageId: messageId || state.selectedMessageId, silent: true, force: true });
          }
        } else if (notificationRoute(notification) === "procedures") {
          showSuccessToast(title || "Nuevo procedimiento disponible", body || "Revísalo desde Perfil.");
          refreshProcedures({ silent: true });
        } else if (["incidents", "jm-notifications"].includes(notificationRoute(notification))) {
          showSuccessToast(title, body);
          refreshSupabaseIncidents({ silent: true });
          refreshMaintenanceAlerts({ silent: true });
        } else {
          showSuccessToast(title, body);
          refreshSupabaseTasks({ silent: true, notify: true });
        }
      });

      push.addListener("pushNotificationActionPerformed", (event) => {
        const route = notificationRoute(event?.notification);
        const messageId = notificationMessageId(event?.notification);
        setState({ route: route === "messages" && isUuid(messageId) ? "message-detail" : route, selectedMessageId: isUuid(messageId) ? messageId : state.selectedMessageId });
        if (route === "messages") {
          refreshAppMessages({ silent: true, manual: false });
          if (isUuid(messageId)) refreshSelectedAppMessageDetail({ messageId, silent: false, force: true });
        } else if (route === "procedures") {
          refreshProcedures({ silent: true });
        } else if (["incidents", "jm-notifications"].includes(route)) {
          refreshSupabaseIncidents({ silent: true });
          refreshMaintenanceAlerts({ silent: true });
        } else {
          refreshSupabaseTasks({ silent: true, notify: true });
        }
      });
    }

    let permission = await push.checkPermissions();
    if (permission.receive !== "granted") {
      permission = await push.requestPermissions();
    }
    if (permission.receive !== "granted") return;

    if (push.createChannel) {
      await push.createChannel({
        id: "datacora_tasks",
        name: "Tareas Datacora",
        description: "Avisos de nuevas tareas asignadas",
        importance: 5,
        visibility: 1,
        sound: "default"
      });
    }

    await push.register();
  } catch (error) {
    console.warn("No se pudo inicializar notificaciones push.", error);
  }
}

async function notifyTaskAssigned(taskId) {
  if (!taskId || !hasSupabaseConfig() || !state.supabaseSession?.access_token || !isNetworkOnline()) return;

  try {
    if (hasSqlServerApiConfig()) {
      await apiRequest("/functions/send-task-notification", {
        method: "POST",
        body: JSON.stringify({ taskId }),
        timeoutMs: 20000
      });
      return;
    }

    await supabaseRequest("/functions/v1/send-task-notification", {
      method: "POST",
      body: JSON.stringify({ taskId }),
      timeoutMs: 20000
    });
  } catch (error) {
    console.warn("La tarea fue creada, pero no se pudo enviar la notificación push.", error);
  }
}

function statusClass(value) {
  return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isTaskCompleted(task = selectedTask()) {
  return statusClass(task?.status) === "completada";
}

function selectedTask() {
  return tasks.find((task) => task.id === state.selectedTaskId) ?? tasks[0];
}

function loggedUser() {
  return state.currentUser;
}

function isAdmin(user = loggedUser()) {
  return Boolean(user?.permisos?.gestionarUsuarios);
}

function canAssignTasks(user = loggedUser()) {
  return isAdmin(user) || Boolean(user?.permisos?.asignarTareas);
}

function canSeeNotifications(user = loggedUser()) {
  return Boolean(user?.permisos?.verNotificaciones);
}

function canSendAppMessages(user = loggedUser()) {
  return isAdmin(user) || Boolean(user?.permisos?.verDatosNacionales);
}

function canManageProcedures(user = loggedUser()) {
  return isAdmin(user) || Boolean(user?.permisos?.verDatosNacionales);
}

function canSeeProcedures(user = loggedUser()) {
  return Boolean(user);
}

function isPreventionist(user = loggedUser()) {
  return statusClass(user?.cargo) === "prevencionista";
}

function userBranches(user = loggedUser()) {
  return Array.from(new Set((user?.sucursales?.length ? user.sucursales : [user?.sucursal]).filter(Boolean)));
}

function userHasBranch(user, branchName) {
  return isAdmin(user) || userBranches(user).includes(branchName);
}

function branchScopeLabel(user = loggedUser()) {
  const branches = userBranches(user);
  return branches.length > 1 ? branches.join(", ") : (branches[0] ?? "Sin zona");
}

function assignBranchOptions(actor = loggedUser()) {
  const branches = userBranches(actor);
  if (!isAdmin(actor)) return branches;
  return Array.from(new Set([
    ...branches,
    ...users.map((user) => user.sucursal).filter(Boolean),
    ...establishments.map((item) => item.branch).filter(Boolean)
  ])).sort((left, right) => left.localeCompare(right, "es"));
}

function selectedAssignBranch(actor = loggedUser()) {
  const branches = assignBranchOptions(actor);
  if (state.assignBranch && branches.includes(state.assignBranch)) return state.assignBranch;
  return branches[0] ?? "";
}

function assignableTechnicians(actor = loggedUser(), branchName = "") {
  return users.filter((user) => {
    const isActiveTechnician = user.estado === "activo" && !user.permisos?.gestionarUsuarios && user.cargo.startsWith("Técnico");
    if (!isActiveTechnician) return false;
    if (!userHasBranch(actor, user.sucursal)) return false;
    return branchName ? user.sucursal === branchName : true;
  });
}

function defaultRouteFor(user) {
  if (isAdmin(user)) return "actions";
  if (isPreventionist(user)) return "incidents";
  if (canAssignTasks(user) && canSeeNotifications(user)) return "jm-notifications";
  return "tasks";
}

function isLimitedManagerUser(user = loggedUser()) {
  return !isAdmin(user) && canAssignTasks(user) && canSeeNotifications(user);
}

function backRouteFor(route = state.route) {
  const user = loggedUser();
  const fallback = defaultRouteFor(user);
  const formRoutes = new Set([
    "form-heat",
    "form-electricity",
    "form-cold",
    "form-vectors",
    "form-water",
    "form-infrastructure",
    "form-pae-manager",
    "form-mpa",
    "form-service-yard",
    "form-rbd-checkers",
    "form-section",
    "technician-signature-preview"
  ]);

  if (formRoutes.has(route)) return "form";
  if (route === "pdf-preview") return "form-summary";
  if (route === "form" || route === "form-summary") return "detail";
  if (route === "detail") return "tasks";
  if (route === "incident-new") return "incidents";
  if (route === "message-detail") return "messages";
  if (route === "messages") return canAssignTasks(user) && canSeeNotifications(user) && !isAdmin(user) ? "jm-notifications" : "actions";
  if (["procedures", "procedure-upload"].includes(route)) return "profile";
  if (["history", "sync", "profile"].includes(route)) return fallback;
  if (route === "jm-bitacora-summary") return "jm-completed";
  if (route.startsWith("jm-") && route !== "jm-notifications") return "jm-notifications";
  if (["admin-assign", "bulk-assign"].includes(route) && canAssignTasks(user) && canSeeNotifications(user) && !isAdmin(user)) return "jm-notifications";
  if (route === "admin-user-create") return "admin-users";
  if (route.startsWith("admin-") || route === "bulk-assign") return "actions";
  if (route === "password-change") return "password-change";
  return route === fallback ? "" : fallback;
}

function navigateBack() {
  if (state.route === "password-change") {
    returnToLogin("Ingresa nuevamente para continuar.");
    return;
  }
  const targetRoute = backRouteFor();
  if (!isFormProgressRoute(targetRoute) && !confirmLeaveFormIfNeeded()) return;
  if (!targetRoute) {
    showSuccessToast("sesión activa", "Usa Cerrar sesión desde Perfil si deseas salir.");
    return;
  }
  if (state.route === "form" || state.route.startsWith("form-") || state.route === "technician-signature-preview") {
    if (targetRoute === "detail" || targetRoute === "tasks") clearTaskLocationGate();
  }
  setState({ route: targetRoute });
}

function topBar(title, options = {}) {
  const back = options.back
    ? `<button class="icon-button" data-action="back" data-route="${escapeAttribute(options.back)}" aria-label="Volver"><span>${icons.arrow}</span></button>`
    : `<span class="topbar-spacer"></span>`;
  const right = options.action
    ? `<button class="icon-button topbar-action-button" data-action="${options.action}" aria-label="${escapeAttribute(options.actionLabel || "Acción")}">${options.actionIcon || icons.plus}</button>`
    : options.info
    ? `<button class="icon-button info-button" data-action="none" aria-label="Información">${icons.info}</button>`
    : `<span class="topbar-spacer"></span>`;

  return `
    <header class="topbar">
      ${back}
      <h1>${title}</h1>
      ${right}
    </header>
  `;
}


function clearSectionButton(sectionId) {
  return `
    <button
      class="button secondary clear-section-button"
      type="button"
      data-action="clear-section-responses"
      data-section="${escapeAttribute(sectionId)}">
      Limpiar las respuestas
    </button>
  `;
}

function clearSectionButtonStyles() {
  return `
    <style>
      .clear-section-button {
        width: 100%;
        margin-top: 10px;
        border-color: #d8dee2;
        color: #5f6f78;
        background: #fff;
      }
      .clear-section-button:active {
        transform: translateY(1px);
      }
    </style>
  `;
}

function primaryButton(label, action) {
  return `<button class="button primary" type="button" data-action="${action}">${label}</button>`;
}

function secondaryButton(label, action, disabled = false) {
  return `<button class="button secondary" type="button" data-action="${action}" ${disabled ? "disabled" : ""}>${label}</button>`;
}

function statusPill(status) {
  return `<span class="pill ${statusClass(status)}">${status}</span>`;
}

function taskDisplayStatus(task) {
  if (taskIsOverdue(task)) return "Atrasada";
  return task?.status === "Completada" && task?.syncStatus === "pending"
    ? "Completada / sincronización pendiente"
    : task?.status || "Pendiente";
}

function taskDisplayStatusClass(task) {
  if (taskIsOverdue(task)) return "atrasada";
  return task?.status === "Completada" && task?.syncStatus === "pending"
    ? "completada sync-pending"
    : statusClass(task?.status);
}

function taskStatusPill(task) {
  return `<span class="pill ${taskDisplayStatusClass(task)}">${escapeHtml(taskDisplayStatus(task))}</span>`;
}

function taskTypeLabel(type) {
  return `<span class="task-type task-type-${statusClass(type)}">${type}</span>`;
}

function detailRow(icon, title, content) {
  return `
    <div class="detail-row">
      <span class="row-icon">${icons[icon]}</span>
      <div>
        <strong>${title}</strong>
        <p>${content}</p>
      </div>
    </div>
  `;
}

function shortTimeLabel(value) {
  if (!value) return "Sin guardado en esta sesión";
  try {
    return new Date(value).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Guardado reciente";
  }
}

function formContextBar(task = selectedTask()) {
  if (!task) return "";
  return `
    <section class="form-context-bar">
      <div>
        <strong>${escapeHtml(task.establishment)}</strong>
        <span>RBD ${escapeHtml(task.rbd)} · ${escapeHtml(task.type)}</span>
      </div>
      ${taskStatusPill(task)}
    </section>
  `;
}

function formSaveStatusBar() {
  const statusText = state.inlineFormStatus
    ? `${state.inlineFormStatus} · ${shortTimeLabel(state.lastLocalSaveAt)}`
    : shortTimeLabel(state.lastLocalSaveAt);
  return `
    <section class="form-save-bar">
      <div>
        <strong>Guardado local</strong>
        <span>${escapeHtml(statusText)}</span>
      </div>
    </section>
  `;
}

function formWorkHeader(task = selectedTask()) {
  return `${formContextBar(task)}${formSaveStatusBar()}`;
}

function permissionCheckCard() {
  if (isAdmin() || canAssignTasks() || isPreventionist()) return "";
  return `
    <section class="permission-check-card">
      <div>
        <strong>Permisos de trabajo</strong>
        <p>${escapeHtml(state.permissionCheckMessage || "Antes de iniciar pruebas, revisa ubicación, cámara y notificaciones del dispositivo.")}</p>
      </div>
      <button class="button secondary compact" type="button" data-action="check-permissions" ${state.permissionCheckBusy ? "disabled" : ""}>
        ${state.permissionCheckBusy ? "Revisando..." : "Revisar permisos"}
      </button>
    </section>
  `;
}

function connectionDiagnosticCard() {
  const diagnostic = state.connectionDiagnostic;
  return `
    <section class="diagnostic-card ${diagnostic?.status || ""}">
      <div>
        <strong>${escapeHtml(diagnostic?.title || "Modo diagnóstico")}</strong>
        <p>${escapeHtml(diagnostic?.detail || "Comprueba conexión con backend, SQL Server y sesión de la app antes de salir a terreno.")}</p>
      </div>
    </section>
  `;
}

function successToast() {
  if (!state.actionToast) return "";
  const toastType = state.actionToast.type === "error" ? "error" : "success";
  const details = Array.isArray(state.actionToast.details) ? state.actionToast.details : [state.actionToast.detail];
  const toastDuration = Number(state.actionToast.durationMs) || 5000;
  const toastAction = state.actionToast.action;
  return `
    <section class="success-toast-backdrop" aria-live="polite">
      <div class="success-toast ${toastType}" role="status" style="--toast-duration: ${toastDuration}ms">
        <button class="success-toast-close" type="button" data-action="close-toast" aria-label="Cerrar notificación">×</button>
        <div class="success-toast-icon">${toastType === "error" ? "!" : "✓"}</div>
        <div class="success-toast-copy">
          <strong>${state.actionToast.title}</strong>
          ${details.length > 1 ? `
            <ul>
              ${details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}
            </ul>
          ` : `<span>${escapeHtml(details[0] ?? "")}</span>`}
          ${toastAction ? `
            <button class="success-toast-action" type="button" data-action="${toastAction.name}">
              ${escapeHtml(toastAction.label)}
            </button>
          ` : ""}
        </div>
        <div class="success-toast-progress"></div>
      </div>
    </section>
  `;
}

function imagePreviewOverlay() {
  if (!state.imagePreview?.src) return "";
  return `
    <section class="image-preview-backdrop" data-action="close-image-preview">
      <div class="image-preview-modal" role="dialog" aria-modal="true" aria-label="Vista completa de fotografía" data-action="none">
        <div class="image-preview-head">
          <div>
            <strong>${escapeHtml(state.imagePreview.title || "Fotografía")}</strong>
            ${state.imagePreview.subtitle ? `<span>${escapeHtml(state.imagePreview.subtitle)}</span>` : ""}
          </div>
          <button type="button" class="icon-button" data-action="close-image-preview" aria-label="Cerrar vista de fotografía">×</button>
        </div>
        <div class="image-preview-body">
          <img src="${escapeAttribute(state.imagePreview.src)}" alt="${escapeAttribute(state.imagePreview.title || "Fotografía de evidencia")}" />
        </div>
      </div>
    </section>
  `;
}

function articlePickerOverlay() {
  const picker = state.articlePicker;
  if (!picker?.section) return "";
  const query = picker.query ?? "";
  const selectedDraft = currentDraftByArticleRole(picker.section);
  const selectedId = selectedDraft?.articleId || "";
  return `
    <section class="article-picker-backdrop" data-action="close-article-picker">
      <div class="article-picker-modal" role="dialog" aria-modal="true" aria-label="${escapeAttribute(picker.title || "Seleccionar artículo")}" data-action="none">
        <div class="article-picker-head">
          <div>
            <strong>${escapeHtml(picker.title || "Seleccionar artículo")}</strong>
            <span>${articleCatalog.length} artículos disponibles</span>
          </div>
          <button type="button" class="signature-close" data-action="close-article-picker" aria-label="Cerrar selector">×</button>
        </div>
        <div class="article-picker-search field-control">${icons.briefcase}
          <input
            data-role="article-picker-search"
            value="${escapeAttribute(query)}"
            placeholder="Buscar por código o nombre"
            autocomplete="off" />
        </div>
        <div class="article-picker-results" data-role="article-picker-results">
          ${articlePickerResultsHtml(picker.section, query, selectedId)}
        </div>
      </div>
    </section>
  `;
}

function focusArticlePickerSearch() {
  const input = rootEl.querySelector('[data-role="article-picker-search"]');
  if (!input) return;
  input.focus();
  const length = input.value.length;
  input.setSelectionRange(length, length);
}

function normalizedToastText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function shouldSuppressSuccessToast(title) {
  if (!isFormProgressRoute()) return false;
  const normalized = normalizedToastText(title);
  const allowedFinalMessages = [
    "formulario enviado correctamente",
    "formulario guardado sin conexion"
  ];
  if (allowedFinalMessages.includes(normalized)) return false;

  return [
    "guardad",
    "registrad",
    "seccion",
    "informacion",
    "firma",
    "ubicacion",
    "fotografia",
    "respuesta",
    "elemento eliminado",
    "consumo eliminado"
  ].some((pattern) => normalized.includes(pattern));
}

function showSuccessToast(title, detail, options = {}) {
  if (shouldSuppressSuccessToast(title)) {
    if (toastTimer) {
      window.clearTimeout(toastTimer);
      toastTimer = null;
    }
    if (state.actionToast?.type === "success") setStateSilently({ actionToast: null });
    return;
  }
  if (toastTimer) window.clearTimeout(toastTimer);
  const durationMs = Number(options.durationMs) || 5000;
  setState({ actionToast: { title, detail, type: "success", action: options.action, durationMs } });
  toastTimer = window.setTimeout(() => {
    toastTimer = null;
    if (state.actionToast?.title === title) setState({ actionToast: null });
  }, durationMs);
}

function showErrorToast(title, detail) {
  if (toastTimer) window.clearTimeout(toastTimer);
  const nextToast = Array.isArray(detail)
    ? { title, detail: detail[0] ?? "", details: detail, type: "error" }
    : { title, detail, type: "error" };
  setState({ actionToast: nextToast });
  toastTimer = window.setTimeout(() => {
    toastTimer = null;
    if (state.actionToast?.title === title) setState({ actionToast: null });
  }, 5000);
}

function closeSuccessToast() {
  if (toastTimer) {
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }
  setState({ actionToast: null });
}

function emptyState(title, text) {
  return `<div class="empty-state"><h2>${title}</h2><p>${text}</p></div>`;
}

function roleOptions(selectedRole = "") {
  const roles = state.supabaseCatalogs.roles.length
    ? uniqueNormalizedNames(state.supabaseCatalogs.roles.map((role) => role.name))
    : allowedRoles;
  const selected = normalizeMojibakeText(selectedRole);
  return roles
    .map((role) => `<option value="${role}" ${role === selected ? "selected" : ""}>${role}</option>`)
    .join("");
}

function branchOptions(selectedBranch = "") {
  const branches = state.supabaseCatalogs.branches.length
    ? uniqueNormalizedNames(state.supabaseCatalogs.branches.map((branch) => branch.name))
    : allowedBranches;
  const selected = normalizeMojibakeText(selectedBranch);
  return branches
    .map((branch) => `<option value="${branch}" ${branch === selected ? "selected" : ""}>${branch}</option>`)
    .join("");
}

function branchNames() {
  return state.supabaseCatalogs.branches.length
    ? uniqueNormalizedNames(state.supabaseCatalogs.branches.map((branch) => branch.name))
    : allowedBranches;
}

function normalizeSelectedBranches(values, fallback = []) {
  const validBranches = branchNames();
  const selected = uniqueNormalizedNames(values);
  const filtered = selected.filter((branch) => validBranches.includes(branch));
  if (filtered.length) return filtered;
  return uniqueNormalizedNames(fallback).filter((branch) => validBranches.includes(branch));
}

function branchIdsByNames(names) {
  return names
    .map((name) => catalogIdByName("branches", name))
    .filter(Boolean);
}

function branchCheckboxes(selectedBranches = [], inputName = "sucursales") {
  const selected = new Set(normalizeSelectedBranches(selectedBranches, ["Santiago"]));
  return `
    <div class="branch-checkbox-grid">
      ${branchNames().map((branch) => `
        <label class="checkbox-field branch-checkbox">
          <input name="${inputName}" type="checkbox" value="${escapeAttribute(branch)}" ${selected.has(branch) ? "checked" : ""} />
          <span>${branch}</span>
        </label>
      `).join("")}
    </div>
  `;
}

function groupOptions(selectedGroup = "") {
  const groups = state.supabaseCatalogs.groups.length
    ? state.supabaseCatalogs.groups.map((group) => group.name)
    : state.groups;
  return groups
    .map((group) => `<option value="${group}" ${group === selectedGroup ? "selected" : ""}>${group}</option>`)
    .join("");
}

function permissionsForRole(roleName) {
  const catalogRole = state.supabaseCatalogs.roles.find((role) => role.name === roleName);
  if (catalogRole) {
    return {
      gestionarUsuarios: Boolean(catalogRole.can_manage_users),
      asignarTareas: Boolean(catalogRole.can_assign_tasks),
      verNotificaciones: Boolean(catalogRole.can_view_notifications),
      verDatosNacionales: Boolean(catalogRole.can_view_national_data)
    };
  }

  return {
    gestionarUsuarios: roleName === "Administrador Aplicación",
    asignarTareas: ["Administrador Aplicación", "Jefe Nacional", "Jefe Mantención"].includes(roleName),
    verNotificaciones: ["Administrador Aplicación", "Jefe Nacional", "Jefe Mantención"].includes(roleName),
    verDatosNacionales: ["Administrador Aplicación", "Jefe Nacional"].includes(roleName)
  };
}

function establishmentsByBranch(branch) {
  return establishments
    .filter((establishment) => establishment.branch === branch)
    .sort((left, right) => Number(left.rbd) - Number(right.rbd));
}

function isCasaMatrizEstablishment(establishment = {}) {
  const searchable = [
    establishment.rbd,
    establishment.name,
    establishment.comuna,
    establishment.address
  ].map(normalizeSearch).join(" ");
  return /\bcasa\s+matriz\b/.test(searchable);
}

function operationalEstablishments(items = []) {
  return items.filter((establishment) => !isCasaMatrizEstablishment(establishment));
}

function establishmentsForUser(user = loggedUser(), options = {}) {
  const includeCasaMatriz = options.includeCasaMatriz ?? true;
  const source = includeCasaMatriz ? establishments : operationalEstablishments(establishments);
  if (isAdmin(user)) return [...source].sort((left, right) => Number(left.rbd) - Number(right.rbd));
  const branches = userBranches(user);
  return source
    .filter((establishment) => branches.includes(establishment.branch))
    .sort((left, right) => Number(left.rbd) - Number(right.rbd));
}

function establishmentByRbd(rbd) {
  return establishments.find((item) => item.rbd === String(rbd));
}

function taskEstablishmentMeta(task) {
  const source = task.establishmentMeta ?? establishmentByRbd(task.rbd);
  const local = establishmentByRbd(task.rbd);
  if (!source) return null;

  return {
    comuna: source.comuna ?? local?.comuna,
    tipoInstitucion: source.tipoInstitucion ?? source.institutionType ?? local?.institutionType,
    direccion: source.direccion ?? source.address ?? local?.address,
    sucursal: source.sucursal ?? source.branch ?? local?.branch,
    coordinates: hasValidCoordinates(source.coordinates) ? source.coordinates : local?.coordinates
  };
}

function hasValidCoordinates(coordinates) {
  return Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lng);
}

function distanceMetersBetween(left, right) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value) => value * Math.PI / 180;
  const lat1 = toRadians(left.lat);
  const lat2 = toRadians(right.lat);
  const deltaLat = toRadians(right.lat - left.lat);
  const deltaLng = toRadians(right.lng - left.lng);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(value) {
  const meters = Math.max(0, Math.round(Number(value) || 0));
  if (meters >= 1000) {
    const kilometers = meters / 1000;
    return `${kilometers >= 10 ? kilometers.toFixed(1) : kilometers.toFixed(2)} km`;
  }
  return `${meters} m`;
}


function gpsDebugFloatingPanel() {
  if (!state.isAuthenticated) return "";

  const position = gpsDebugLastPosition;
  const hasCoords = hasPositionCoords(position);
  const latitude = hasCoords ? Number(position.coords.latitude).toFixed(7) : "--";
  const longitude = hasCoords ? Number(position.coords.longitude).toFixed(7) : "--";
  const accuracy = hasCoords && Number.isFinite(Number(position.coords.accuracy))
    ? `${Math.round(Number(position.coords.accuracy))} m`
    : "--";
  const ageMs = hasCoords ? positionAgeMs(position) : null;
  const ageLabel = ageMs === null ? "--" : ageMs < 1000 ? "<1 s" : `${Math.round(ageMs / 1000)} s`;
  const elapsedMs = gpsDebugMonitorStartedAt ? Date.now() - gpsDebugMonitorStartedAt : 0;
  const elapsedLabel = `${Math.floor(elapsedMs / 60000)}:${String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, "0")}`;
  const freshClass = hasCoords && ageMs <= 10000 ? "fresh" : hasCoords ? "stale" : "waiting";
  const gpsOk = !gpsDebugLocationRequiredError;

  return `
    <button
      type="button"
      id="gps-debug-toggle"
      class="gps-debug-toggle ${freshClass} ${gpsOk ? "" : "error"}"
      data-action="toggle-gps-debug"
      aria-label="${gpsDebugPanelVisible ? "Ocultar detalle GPS" : "Mostrar detalle GPS"}">
      <span>📍</span>
      <strong>${gpsOk ? "GPS" : "GPS !"}</strong>
    </button>

    ${gpsDebugPanelVisible ? `
      <aside id="gps-debug-floating" class="gps-debug-floating ${freshClass}" aria-live="polite">
        <div class="gps-debug-head">
          <strong>GPS EN VIVO</strong>
          <span>${isNetworkOnline() ? "ONLINE" : "OFFLINE"}</span>
        </div>
        <div class="gps-debug-status">${escapeHtml(gpsDebugStatus)}</div>
        <div class="gps-debug-coords">
          <div><small>LAT</small><b>${latitude}</b></div>
          <div><small>LON</small><b>${longitude}</b></div>
        </div>
        <div class="gps-debug-meta">
          <span>Precisión: <b>${accuracy}</b></span>
          <span>Edad: <b>${ageLabel}</b></span>
          <span>Callbacks: <b>${gpsDebugCallbackCount}</b></span>
          <span>Espera: <b>${elapsedLabel}</b></span>
        </div>
        ${gpsDebugLastError ? `<div class="gps-debug-error">${escapeHtml(gpsDebugLastError)}</div>` : ""}
        ${gpsDebugLocationRequiredError ? `<div class="gps-debug-required">${escapeHtml(gpsDebugLocationRequiredError)}</div>` : ""}
      </aside>
    ` : ""}

    <style>
      .gps-debug-toggle {
        position: fixed;
        right: 12px;
        bottom: 78px;
        z-index: 1000000;
        display:flex;
        align-items:center;
        gap:6px;
        padding:8px 11px;
        border-radius:999px;
        border:2px solid #d7a700;
        background:#10202a;
        color:#fff;
        box-shadow:0 5px 18px rgba(0,0,0,.28);
        font-size:12px;
      }
      .gps-debug-toggle.fresh { border-color:#28c76f; }
      .gps-debug-toggle.stale { border-color:#ff9f43; }
      .gps-debug-toggle.error { border-color:#ea5455; background:#3c1618; }
      .gps-debug-toggle span { font-size:14px; }
      .gps-debug-floating {
        position: fixed;
        right: 10px;
        bottom: 126px;
        z-index: 999999;
        width: min(320px, calc(100vw - 20px));
        box-sizing: border-box;
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(12, 24, 32, .94);
        color: #fff;
        font-family: Arial, sans-serif;
        box-shadow: 0 8px 28px rgba(0,0,0,.34);
        border: 2px solid #d7a700;
        backdrop-filter: blur(8px);
      }
      .gps-debug-floating.fresh { border-color: #28c76f; }
      .gps-debug-floating.stale { border-color: #ff9f43; }
      .gps-debug-floating.waiting { border-color: #d7a700; }
      .gps-debug-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:5px; font-size:12px; letter-spacing:.4px; }
      .gps-debug-head span { padding:2px 7px; border-radius:999px; background:rgba(255,255,255,.14); font-size:10px; }
      .gps-debug-status { font-size:11px; opacity:.8; margin-bottom:7px; }
      .gps-debug-coords { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
      .gps-debug-coords div { background:rgba(255,255,255,.08); border-radius:8px; padding:6px 7px; min-width:0; }
      .gps-debug-coords small { display:block; opacity:.65; font-size:9px; margin-bottom:2px; }
      .gps-debug-coords b { display:block; font-family:Consolas, monospace; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .gps-debug-meta { display:grid; grid-template-columns:1fr 1fr; gap:3px 8px; margin-top:7px; font-size:10px; opacity:.86; }
      .gps-debug-error, .gps-debug-required { margin-top:6px; padding-top:6px; border-top:1px solid rgba(255,255,255,.15); font-size:10px; }
      .gps-debug-error { color:#ffd0d0; }
      .gps-debug-required { color:#ffd59b; font-weight:700; }
    </style>
  `;
}

function refreshGpsDebugFloatingPanel() {
  if (!state.isAuthenticated) return;

  const toggle = document.querySelector("#gps-debug-toggle");
  const position = gpsDebugLastPosition;
  const hasCoords = hasPositionCoords(position);
  const ageMs = hasCoords ? positionAgeMs(position) : null;
  const visualClass = hasCoords && ageMs <= 10000 ? "fresh" : hasCoords ? "stale" : "waiting";

  if (toggle) {
    toggle.classList.remove("fresh", "stale", "waiting", "error");
    toggle.classList.add(visualClass);
    if (gpsDebugLocationRequiredError) toggle.classList.add("error");
    const strong = toggle.querySelector("strong");
    if (strong) strong.textContent = gpsDebugLocationRequiredError ? "GPS !" : "GPS";
  }

  const current = document.querySelector("#gps-debug-floating");
  if (!current) return;

  const latitude = hasCoords ? Number(position.coords.latitude).toFixed(7) : "--";
  const longitude = hasCoords ? Number(position.coords.longitude).toFixed(7) : "--";
  const accuracy = hasCoords && Number.isFinite(Number(position.coords.accuracy))
    ? `${Math.round(Number(position.coords.accuracy))} m`
    : "--";
  const ageLabel = ageMs === null ? "--" : ageMs < 1000 ? "<1 s" : `${Math.round(ageMs / 1000)} s`;
  const elapsedMs = gpsDebugMonitorStartedAt ? Date.now() - gpsDebugMonitorStartedAt : 0;
  const elapsedLabel = `${Math.floor(elapsedMs / 60000)}:${String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, "0")}`;

  current.classList.remove("fresh", "stale", "waiting");
  current.classList.add(visualClass);

  const statusEl = current.querySelector(".gps-debug-status");
  if (statusEl) statusEl.textContent = gpsDebugStatus;

  const coordValues = current.querySelectorAll(".gps-debug-coords b");
  if (coordValues[0]) coordValues[0].textContent = latitude;
  if (coordValues[1]) coordValues[1].textContent = longitude;

  const metaValues = current.querySelectorAll(".gps-debug-meta b");
  if (metaValues[0]) metaValues[0].textContent = accuracy;
  if (metaValues[1]) metaValues[1].textContent = ageLabel;
  if (metaValues[2]) metaValues[2].textContent = String(gpsDebugCallbackCount);
  if (metaValues[3]) metaValues[3].textContent = elapsedLabel;

  const onlineBadge = current.querySelector(".gps-debug-head span");
  if (onlineBadge) onlineBadge.textContent = isNetworkOnline() ? "ONLINE" : "OFFLINE";

  let errorEl = current.querySelector(".gps-debug-error");
  if (gpsDebugLastError) {
    if (!errorEl) {
      errorEl = document.createElement("div");
      errorEl.className = "gps-debug-error";
      current.appendChild(errorEl);
    }
    errorEl.textContent = gpsDebugLastError;
  } else if (errorEl) {
    errorEl.remove();
  }

  let requiredEl = current.querySelector(".gps-debug-required");
  if (gpsDebugLocationRequiredError) {
    if (!requiredEl) {
      requiredEl = document.createElement("div");
      requiredEl.className = "gps-debug-required";
      current.appendChild(requiredEl);
    }
    requiredEl.textContent = gpsDebugLocationRequiredError;
  } else if (requiredEl) {
    requiredEl.remove();
  }
}

function toggleGpsDebugPanel() {
  gpsDebugPanelVisible = !gpsDebugPanelVisible;
  render();
}

async function startGpsDebugMonitor() {
  if (!state.isAuthenticated || gpsDebugWatchId !== null) return;

  gpsDebugMonitorStartedAt = Date.now();
  gpsDebugCallbackCount = 0;
  gpsDebugLastPosition = null;
  gpsDebugLastError = "";
  gpsDebugStatus = "Solicitando señal GPS...";

  if (!gpsDebugUiTimer) {
    gpsDebugUiTimer = window.setInterval(refreshGpsDebugFloatingPanel, 1000);
  }

  try {
    await ensureLocationPermissionAvailable();

    const nativeGeolocation = window.Capacitor?.Plugins?.Geolocation;

    if (isNativePlatform() && nativeGeolocation?.watchPosition) {
      gpsDebugStatus = "Esperando fix GNSS...";
      gpsDebugLocationRequiredError = "";
      refreshGpsDebugFloatingPanel();

      gpsDebugWatchId = await nativeGeolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
          minimumUpdateInterval: 1000,
          interval: 2000,
          enableLocationFallback: true
        },
        (position, error) => {
          gpsDebugCallbackCount += 1;

          if (error) {
            gpsDebugLastError = `${error.code ?? ""} ${error.message || error}`.trim();
            gpsDebugStatus = "GPS sin fix / error recuperable";
            if (shouldRejectGpsWatchError(error)) {
              gpsDebugLocationRequiredError = "GPS/ubicación no disponible. Activa la ubicación del dispositivo para continuar.";
            }
            refreshGpsDebugFloatingPanel();
            return;
          }

          if (!hasPositionCoords(position)) {
            gpsDebugStatus = "Callback sin coordenadas";
            refreshGpsDebugFloatingPanel();
            return;
          }

          gpsDebugLastPosition = position;
          gpsDebugLastError = "";
          gpsDebugLocationRequiredError = "";
          gpsDebugStatus = "Posición recibida";
          refreshGpsDebugFloatingPanel();

          console.log("[GPS DEBUG LIVE]", {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            ageMs: positionAgeMs(position),
            online: isNetworkOnline(),
            callbacks: gpsDebugCallbackCount
          });
        }
      );

      return;
    }

    if (navigator.geolocation?.watchPosition) {
      gpsDebugStatus = "Monitor GPS navegador activo";
      gpsDebugWatchId = navigator.geolocation.watchPosition(
        (position) => {
          gpsDebugCallbackCount += 1;
          gpsDebugLastPosition = position;
          gpsDebugLastError = "";
          gpsDebugStatus = "Posición recibida";
          refreshGpsDebugFloatingPanel();
        },
        (error) => {
          gpsDebugCallbackCount += 1;
          gpsDebugLastError = `${error.code ?? ""} ${error.message || error}`.trim();
          gpsDebugStatus = "GPS sin fix / error";
          refreshGpsDebugFloatingPanel();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
      return;
    }

    gpsDebugStatus = "Geolocalización no disponible";
    gpsDebugLastError = "El dispositivo no expone watchPosition.";
  } catch (error) {
    gpsDebugStatus = "No se pudo iniciar GPS";
    gpsDebugLastError = error?.message || String(error);
    gpsDebugLocationRequiredError = "GPS/ubicación no disponible. Activa la ubicación del dispositivo para continuar.";
  }

  refreshGpsDebugFloatingPanel();
}

async function stopGpsDebugMonitor() {
  const nativeGeolocation = window.Capacitor?.Plugins?.Geolocation;

  if (gpsDebugWatchId !== null) {
    try {
      if (isNativePlatform() && nativeGeolocation?.clearWatch) {
        await nativeGeolocation.clearWatch({ id: gpsDebugWatchId });
      } else if (navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(gpsDebugWatchId);
      }
    } catch (_) {
      // Limpieza best effort.
    }
  }

  gpsDebugWatchId = null;

  if (gpsDebugUiTimer) {
    window.clearInterval(gpsDebugUiTimer);
    gpsDebugUiTimer = null;
  }
}

async function ensureLocationPermissionAvailable() {
  const nativeGeolocation = window.Capacitor?.Plugins?.Geolocation;
  if (isNativePlatform() && nativeGeolocation?.requestPermissions) {
    try {
      const permission = await nativeGeolocation.requestPermissions({ permissions: ["location"] });
      const status = permission?.location || permission?.coarseLocation;
      if (status && status !== "granted") throw new Error("LOCATION_PERMISSION_DENIED");
      return;
    } catch (error) {
      if (error?.message === "LOCATION_PERMISSION_DENIED") throw error;
      throw error;
    }
  }

  if (!navigator.permissions?.query) return;

  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    if (permission.state === "denied") {
      throw new Error("LOCATION_PERMISSION_DENIED");
    }
  } catch (error) {
    if (error?.message === "LOCATION_PERMISSION_DENIED") throw error;
  }
}

function hasPositionCoords(position) {
  const latitude = Number(position?.coords?.latitude);
  const longitude = Number(position?.coords?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function positionAgeMs(position) {
  const timestamp = Number(position?.timestamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 0;
  return Math.max(0, Date.now() - timestamp);
}

function isFreshGpsPosition(position, maxAgeMs = 30000) {
  if (!hasPositionCoords(position)) return false;
  const age = positionAgeMs(position);
  return age === 0 || age <= maxAgeMs;
}

function shouldRejectGpsWatchError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return error?.code === 1
    || message.includes("permission")
    || message.includes("denied")
    || message.includes("disabled")
    || message.includes("location services");
}

function watchNativeGpsPosition(nativeGeolocation, timeoutMs, options = {}, initialError = null) {
  return new Promise(async (resolve, reject) => {
    let settled = false;
    let watchId = null;
    let bestPosition = null;
    let lastError = initialError;

    const online = isNetworkOnline();
    const maxAccuracyMeters = options.maxAccuracyMeters ?? (online ? 80 : 300);
    const watchAttemptTimeoutMs = options.watchAttemptTimeoutMs ?? 10000;

    const finish = async (handler, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(globalTimer);

      if (watchId !== null && nativeGeolocation.clearWatch) {
        try {
          await nativeGeolocation.clearWatch({ id: watchId });
        } catch (_) {
          // Limpieza best effort del observador GPS nativo.
        }
      }

      handler(value);
    };

    const saveBestPosition = (position) => {
      if (!hasPositionCoords(position)) return;

      if (!bestPosition) {
        bestPosition = position;
        return;
      }

      const currentAccuracy = Number(position?.coords?.accuracy);
      const bestAccuracy = Number(bestPosition?.coords?.accuracy);

      if (
        Number.isFinite(currentAccuracy)
        && (!Number.isFinite(bestAccuracy) || currentAccuracy < bestAccuracy)
      ) {
        bestPosition = position;
      }
    };

    const globalTimer = setTimeout(() => {
      if (bestPosition && isFreshGpsPosition(bestPosition, timeoutMs)) {
        console.warn("[GPS] Timeout global alcanzado. Se utilizará el mejor fix disponible.", {
          accuracy: bestPosition?.coords?.accuracy,
          ageMs: positionAgeMs(bestPosition)
        });
        finish(resolve, bestPosition);
        return;
      }

      finish(
        reject,
        lastError || initialError || new Error(online ? "GPS_TIMEOUT" : "GPS_TIMEOUT_OFFLINE")
      );
    }, timeoutMs);

    try {
      console.log("[GPS] Iniciando watchPosition.", {
        online,
        globalTimeoutMs: timeoutMs,
        maxAccuracyMeters
      });

      watchId = await nativeGeolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: watchAttemptTimeoutMs,
          maximumAge: 0,
          minimumUpdateInterval: 1000,
          interval: 2000,
          enableLocationFallback: true
        },
        (position, watchError) => {
          console.log("[GPS] callback watchPosition.", {
            online: isNetworkOnline(),
            hasPosition: Boolean(position),
            latitude: position?.coords?.latitude,
            longitude: position?.coords?.longitude,
            accuracy: position?.coords?.accuracy,
            timestamp: position?.timestamp,
            ageMs: position ? positionAgeMs(position) : null,
            errorCode: watchError?.code,
            errorMessage: watchError?.message || ""
          });

          if (watchError) {
            lastError = watchError;

            if (shouldRejectGpsWatchError(watchError)) {
              finish(reject, watchError);
            }

            // Timeouts y errores recuperables no detienen el watch.
            return;
          }

          if (!hasPositionCoords(position)) return;

          // En modo watch damos margen suficiente para que un cold start GNSS
          // pueda entregar una primera lectura y luego mejorarla.
          if (!isFreshGpsPosition(position, Math.max(timeoutMs, 120000))) {
            console.warn("[GPS] Posición descartada por antigüedad.", {
              ageMs: positionAgeMs(position)
            });
            return;
          }

          saveBestPosition(position);

          const accuracy = Number(position.coords.accuracy);

          if (
            options.acceptFirstWatchPosition
            || !Number.isFinite(accuracy)
            || accuracy <= maxAccuracyMeters
          ) {
            console.log("[GPS] Fix aceptado.", {
              accuracy,
              maxAccuracyMeters
            });
            finish(resolve, position);
          } else {
            console.log("[GPS] Fix recibido, esperando mejor precisión.", {
              accuracy,
              maxAccuracyMeters
            });
          }
        }
      );
    } catch (watchError) {
      console.error("[GPS] No se pudo iniciar watchPosition.", watchError);

      if (bestPosition && isFreshGpsPosition(bestPosition, timeoutMs)) {
        finish(resolve, bestPosition);
        return;
      }

      finish(
        reject,
        watchError || lastError || initialError || new Error("GPS_WATCH_ERROR")
      );
    }
  });
}

async function currentDevicePosition(options = {}) {
  await ensureLocationPermissionAvailable();

  const nativeGeolocation = window.Capacitor?.Plugins?.Geolocation;
  const online = isNetworkOnline();
  const timeoutMs = options.timeoutMs ?? (online ? 25000 : 120000);

  if (isNativePlatform() && nativeGeolocation) {
    // OFFLINE: iniciar GNSS inmediatamente mediante watchPosition.
    // Evita perder los primeros 30 segundos esperando getCurrentPosition.
    if (!online && nativeGeolocation.watchPosition) {
      console.log("[GPS] Modo offline: iniciando captura GNSS directa.");

      return watchNativeGpsPosition(
        nativeGeolocation,
        timeoutMs,
        {
          ...options,
          maxAccuracyMeters: options.maxAccuracyMeters ?? 300
        }
      );
    }

    // ONLINE: getCurrentPosition suele ser más rápido gracias a la ubicación asistida.
    if (nativeGeolocation.getCurrentPosition) {
      try {
        console.log("[GPS] Modo online: intentando getCurrentPosition.");

        const position = await nativeGeolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: Math.min(timeoutMs, 20000),
          maximumAge: 0,
          enableLocationFallback: true
        });

        console.log("[GPS] getCurrentPosition respondió.", {
          latitude: position?.coords?.latitude,
          longitude: position?.coords?.longitude,
          accuracy: position?.coords?.accuracy,
          timestamp: position?.timestamp,
          ageMs: position ? positionAgeMs(position) : null
        });

        if (!isFreshGpsPosition(position)) {
          throw new Error("GPS_STALE_POSITION");
        }

        return position;
      } catch (error) {
        console.warn("[GPS] getCurrentPosition falló; se usará watchPosition.", {
          code: error?.code,
          message: error?.message || String(error)
        });

        if (nativeGeolocation.watchPosition) {
          return watchNativeGpsPosition(
            nativeGeolocation,
            timeoutMs,
            options,
            error
          );
        }

        throw error;
      }
    }

    if (nativeGeolocation.watchPosition) {
      return watchNativeGpsPosition(
        nativeGeolocation,
        timeoutMs,
        options
      );
    }
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este dispositivo no permite obtener ubicación GPS desde la app."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge: 0
    });
  });
}

function locationErrorMessage(error) {
  const message = String(error?.message || error || "").toLowerCase();
  if (error?.message === "LOCATION_PERMISSION_DENIED") {
    return "La app no tiene permiso de ubicación. Actívalo en los permisos de Android para poder iniciar el formulario.";
  }
  if (message.includes("location services") || message.includes("disabled") || message.includes("location disabled")) {
    return "La ubicación/GPS del dispositivo está desactivada. Actívala en Android y vuelve a intentar.";
  }
  if (message.includes("timeout") || error?.message === "GPS_TIMEOUT_OFFLINE") {
    return "La ubicación tardó demasiado en responder. Sin internet puede demorar más: activa GPS, espera señal al aire libre y vuelve a intentar.";
  }
  if (error?.message === "GPS_STALE_POSITION") {
    return "El dispositivo entregó una ubicación antigua. Mantén el GPS activo y espera una lectura nueva antes de continuar.";
  }
  if (error?.code === 1) return "Permite el acceso a ubicación para iniciar el formulario.";
  if (error?.code === 2) return "La ubicación del dispositivo no está disponible. Activa la ubicación/GPS del equipo y vuelve a intentar.";
  if (error?.code === 3) return "La ubicación tardó demasiado en responder. Verifica que la ubicación/GPS esté activada e intenta nuevamente al aire libre.";
  return error?.message || "No se pudo validar la ubicación del dispositivo.";
}

function clearTaskLocationGate(taskId = state.selectedTaskId) {
  if (!taskId || !state.locationGateTaskIds?.[taskId]) return;
  const nextGate = { ...state.locationGateTaskIds };
  delete nextGate[taskId];
  state.locationGateTaskIds = nextGate;
}

function locationEvidenceForTask(taskId = state.selectedTaskId) {
  const remote = state.remoteLocationEvidenceByTask[taskId] ?? {};
  const local = state.locationEvidenceByTask[taskId] ?? {};
  return {
    ...remote,
    ...local,
    start: local.start || remote.start || null,
    submit: local.submit || remote.submit || null,
    startError: local.startError || remote.startError || "",
    submitError: local.submitError || remote.submitError || ""
  };
}

function gpsEvidenceAnswers(task = selectedTask()) {
  const evidence = locationEvidenceForTask(task?.id);
  const answers = [];
  const addPoint = (prefix, label, point) => {
    if (!point) return;
    answers.push(
      { code: `${prefix}_latitude`, label: `${label} - Latitud`, value: point.latitude, type: "number" },
      { code: `${prefix}_longitude`, label: `${label} - Longitud`, value: point.longitude, type: "number" },
      { code: `${prefix}_accuracy_meters`, label: `${label} - Precisión metros`, value: point.accuracyMeters, type: "number" },
      { code: `${prefix}_captured_at`, label: `${label} - Fecha/hora captura`, value: point.capturedAt, type: "text" },
      { code: `${prefix}_online`, label: `${label} - Con internet`, value: point.online ? "Sí" : "No", type: "text" }
    );
    if (Number.isFinite(point.distanceMeters)) {
      answers.push({ code: `${prefix}_distance_meters`, label: `${label} - Distancia al RBD metros`, value: point.distanceMeters, type: "number" });
    }
  };

  addPoint("start", "Inicio formulario", evidence.start);
  addPoint("submit", "Envío formulario", evidence.submit);
  if (evidence.startError) answers.push({ code: "start_error", label: "Inicio formulario - Error GPS", value: evidence.startError, type: "text" });
  if (evidence.submitError) answers.push({ code: "submit_error", label: "Envío formulario - Error GPS", value: evidence.submitError, type: "text" });
  return answers;
}

function updateTaskLocationEvidence(task, phase, nextPoint, errorMessage = "") {
  if (!task?.id) return;
  const currentEvidence = locationEvidenceForTask(task.id);
  const nextEvidence = {
    ...currentEvidence,
    [phase]: nextPoint || currentEvidence[phase] || null,
    [`${phase}Error`]: errorMessage
  };
  state.locationEvidenceByTask = {
    ...state.locationEvidenceByTask,
    [task.id]: nextEvidence
  };
  persistCurrentTaskProgress();
  persistDailyAuthState();
}

function gpsLiveServiceAvailable() {
  if (gpsDebugLocationRequiredError) return false;
  return gpsDebugWatchId !== null;
}

function requireGpsServiceForVisit() {
  if (gpsLiveServiceAvailable()) return true;

  showErrorToast(
    "GPS requerido",
    "Datácora necesita la ubicación/GPS activada para trabajar en terreno. Activa la ubicación del dispositivo y vuelve a intentar."
  );

  return false;
}

async function captureTaskLocationEvidence(task = selectedTask(), phase = "start", options = {}) {
  if (!task || isTaskCompleted(task)) return null;
  if (!requireGpsServiceForVisit()) return null;

  const meta = taskEstablishmentMeta(task);
  const target = meta?.coordinates;

  try {
    if (options.setBusy) setState({ locationCheckBusy: true });
    const position = await currentDevicePosition({
      timeoutMs: options.timeoutMs,
      acceptFirstWatchPosition: options.acceptFirstWatchPosition
    });
    const current = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    const distance = hasValidCoordinates(target) ? Math.round(distanceMetersBetween(current, target)) : null;
    const accuracy = Math.round(position.coords.accuracy || 0);
    const point = {
      latitude: current.lat,
      longitude: current.lng,
      accuracyMeters: accuracy || null,
      distanceMeters: Number.isFinite(distance) ? distance : null,
      establishmentLatitude: hasValidCoordinates(target) ? target.lat : null,
      establishmentLongitude: hasValidCoordinates(target) ? target.lng : null,
      capturedAt: new Date().toISOString(),
      online: isNetworkOnline()
    };
    updateTaskLocationEvidence(task, phase, point, "");
    if (options.showSuccess) {
      showSuccessToast("Ubicación registrada", `Precisión GPS: ${accuracy ? formatDistance(accuracy) : "sin dato"}.`);
    }
    return point;
  } catch (error) {
    const message = locationErrorMessage(error);
    updateTaskLocationEvidence(task, phase, null, message);
    if (options.showError) showErrorToast("Ubicación no registrada", message);
    return null;
  } finally {
    if (options.setBusy) setState({ locationCheckBusy: false });
  }
}

async function openTaskFormAfterLocationCheck() {
  if (isTaskCompleted()) {
    setState({ route: "form-summary" });
    return;
  }
  const task = selectedTask();
  if (!locationEvidenceForTask(task?.id).start) {
    const point = await captureTaskLocationEvidence(task, "start", {
      setBusy: true,
      showError: true,
      showSuccess: false,
      timeoutMs: isNetworkOnline() ? 25000 : 120000
    });
    if (!point) return;
  }
  await applyLatestOperationalDefaultsForTask(task);
  setState({ route: "form" });
}

async function openFormSectionAfterLocationCheck(sectionId) {
  const task = selectedTask();
  if (!locationEvidenceForTask(task?.id).start) {
    const point = await captureTaskLocationEvidence(task, "start", {
      setBusy: true,
      showError: true,
      showSuccess: false,
      timeoutMs: isNetworkOnline() ? 25000 : 120000
    });
    if (!point) return;
  }
  if (["infrastructure", "mpa", "service-yard", "rbd-checkers"].includes(sectionId)) {
    await applyLatestOperationalDefaultsForTask(task);
  }
  persistCurrentTaskProgress();
  const sectionRoutes = {
    heat: "form-heat",
    electricity: "form-electricity",
    cold: "form-cold",
    vectors: "form-vectors",
    water: "form-water",
    infrastructure: "form-infrastructure",
    "pae-manager": "form-pae-manager",
    mpa: "form-mpa",
    "service-yard": "form-service-yard",
    "rbd-checkers": "form-rbd-checkers"
  };
  const errorKeys = {
    heat: "heatError",
    electricity: "electricityError",
    cold: "coldError",
    vectors: "vectorsError",
    water: "waterError",
    infrastructure: "infrastructureError",
    "pae-manager": "paeManagerError",
    mpa: "mpaError",
    "service-yard": "serviceYardError",
    "rbd-checkers": "rbdCheckersError"
  };

  if (sectionRoutes[sectionId]) {
    setState({
      route: sectionRoutes[sectionId],
      [errorKeys[sectionId]]: "",
      formValidationMessages: []
    });
    return;
  }

  setState({ route: "form-section", activeFormSection: sectionId });
}

function mapsUrlForTask(task) {
  const meta = taskEstablishmentMeta(task);
  const lat = meta?.coordinates?.lat;
  const lng = meta?.coordinates?.lng;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  }

  const query = [meta?.direccion, meta?.comuna, task.establishment, "Chile"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function addressLinkForTask(task) {
  const meta = taskEstablishmentMeta(task);
  if (!meta?.direccion) return "";

  const label = [meta.direccion, meta.comuna].filter(Boolean).join(", ");
  return `<a class="maps-link" href="${mapsUrlForTask(task)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

const heatElementSites = {
  "Cocina 4 platos": ["Cocina"],
  "Calefont (caseta, ductos)": ["Patio", "Cocina", "Otro"],
  "Flexibles, filtraciones y conexiones de gas": ["Baño", "Patio", "Cocina", "Otro"],
  "Horno": ["Cocina"],
  "Cocinilla": ["Cocina"],
  "Baño María": ["Cocina"],
  "Fogón o Anafe": ["Cocina"],
  "Caseta De Gas": ["Patio", "Otro"]
};

const heatActions = ["Reparación", "Mantención", "Instalación"];
const electricityElementSites = {
  "Balanza Digital y Equipos de frío": ["Cocina", "Bodega"],
  "Extractor": ["Cocina", "Bodega", "Baño"],
  "Interruptor": ["Cocina", "Bodega", "Baño", "Patio", "Otro"],
  "Enchufes": ["Cocina", "Bodega", "Baño", "Patio", "Otro"],
  "Toma Corriente": ["Cocina", "Bodega", "Baño", "Patio", "Otro"],
  "Cajas de Distribución": ["Cocina", "Bodega", "Baño", "Patio", "Otro"],
  "Luminarias y protecciones": ["Cocina", "Bodega", "Baño", "Patio", "Otro"]
};
const electricityActions = ["Reparación", "Mantención", "Instalación"];
const distributionBoxTypes = ["Única de la cocina", "Compartida con el RBD"];
const distributionBoxLocations = ["Dentro de la cocina", "Afuera de la cocina", "En otro espacio en el RBD"];
const coldElementSites = {
  "Refrigerador": ["Cocina", "Bodega", "Otro"],
  "Salad Bar": ["Cocina", "Otro"],
  "Frigobar": ["Cocina", "Bodega", "Otro"],
  "Congelador": ["Cocina", "Bodega", "Otro"],
  "Visicooler": ["Cocina", "Bodega", "Otro"]
};
const coldActions = ["Reparación", "Mantención", "Instalación"];
const waterElementSites = {
  "Grifería": ["Cocina", "Baño", "Patio", "Otro"],
  "Filtraciones artefactos y elementos": ["Cocina", "Baño", "Patio", "Otro"],
  "Evacuación": ["Cocina", "Baño", "Patio", "Otro"],
  "Cámara Desgrasadora": ["Patio", "Otro"],
  "Sifón": ["Cocina", "Baño", "Patio", "Otro"]
};
const waterActions = ["Reparación", "Mantención", "Instalación"];
const infrastructureElementSites = {
  "Mesón de Preparación de Acero inoxidable": ["Cocina"],
  "Mueble para Artículos de aseo": ["Patio", "Cocina", "Bodega", "Baño", "Otro"],
  "Mueble para vajilla": ["Cocina", "Bodega", "Otro"],
  "Estantería de Bodega": ["Cocina", "Bodega"],
  "Lavafondos / Lavaplatos / Lavamanos": ["Cocina", "Bodega", "Baño", "Patio"],
  "Mesón de Desconche": ["Cocina"],
  "Ducto de Ventilación Campana y Calefont": ["Cocina", "Patio", "Otro"],
  "Extintor (soporte, vencimiento)": ["Cocina", "Otro"],
  "Campana (ductos, filtros)": ["Cocina"],
  "Dispensador, jabón y toalla": ["Cocina", "Baño"],
  "Botiquín": ["Cocina", "Bodega"],
  "Anclajes": ["Cocina", "Bodega", "Patio", "Otro"],
  "Señalética": ["Cocina", "Bodega", "Baño", "Patio", "Otro"],
  "Carro Transporte": ["Cocina"],
  "Basureros Cocina y Patio Servicios": ["Cocina", "Bodega", "Baño", "Patio", "Otro"],
  "Pintura": ["Cocina", "Bodega", "Baño", "Patio", "Otro"]
};
const infrastructureActions = ["Inspección", "Reparación", "Mantención", "Instalación"];
const dressingRoomLocations = ["Al interior cocina", "En el baño", "En la bodega", "En otro espacio cercano a la cocina"];
const vectorsElements = ["Mallas Mosquiteras Puertas-Ventanas Vidrios"];
const vectorsSites = ["Cocina", "Baño", "Patio"];
const vectorsActions = ["Reparación", "Mantención", "Instalación"];
const yesNoOptions = ["Sí", "No"];
const yesNoNotApplicableOptions = ["Sí", "No", "No Aplica"];
const formSectionDefinitions = [
  { id: "heat", title: "Calor", icon: "thermometer", tone: "heat", minimum: 2, baseCritical: true, baseRequired: true },
  { id: "electricity", title: "Electricidad", icon: "bolt", tone: "electric", minimum: 6, baseCritical: true, baseRequired: true },
  { id: "cold", title: "Frío", icon: "snowflake", tone: "cold" },
  { id: "vectors", title: "Vectores", icon: "bug", tone: "vectors" },
  { id: "water", title: "Agua", icon: "droplet", tone: "water" },
  { id: "pae-manager", title: "Encargado PAE", icon: "user", tone: "person", baseRequired: true },
  { id: "infrastructure", title: "Infraestructura", icon: "home", tone: "infra" },
  { id: "mpa", title: "MPA", icon: "clipboard", tone: "mpa" },
  { id: "service-yard", title: "Patio Servicio", icon: "utensils", tone: "patio" },
  { id: "rbd-checkers", title: "Verificadores RBD", icon: "checkSquare", tone: "check" }
];

function heatElements() {
  return Object.keys(heatElementSites);
}

function heatSitesForElement(element) {
  return heatElementSites[element] ?? [];
}

function electricityElements() {
  return Object.keys(electricityElementSites);
}

function electricitySitesForElement(element) {
  return electricityElementSites[element] ?? [];
}

function coldElements() {
  return Object.keys(coldElementSites);
}

function coldSitesForElement(element) {
  return coldElementSites[element] ?? [];
}

function waterElements() {
  return Object.keys(waterElementSites);
}

function waterSitesForElement(element) {
  return waterElementSites[element] ?? [];
}

function infrastructureElements() {
  return Object.keys(infrastructureElementSites);
}

function infrastructureSitesForElement(element) {
  return infrastructureElementSites[element] ?? [];
}

function optionList(options, selected, placeholder = "Selecciona una opción") {
  const placeholderState = selected ? "disabled hidden" : "disabled selected hidden";

  return `
    <option value="" ${placeholderState}>${escapeHtml(placeholder)}</option>
    ${options.map((option) => `<option value="${escapeHtml(option)}" ${option === selected ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
  `;
}

function articleSearchValue(articleId, articleName = "") {
  if (!articleId && !articleName) return "";
  const article = articleCatalog.find((item) => item.id === articleId);
  return article ? `${article.id} · ${article.name}` : [articleId, articleName].filter(Boolean).join(" · ");
}

function normalizeArticleLookup(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function articleSearchMatches(value, limit = 40) {
  const query = normalizeArticleLookup(value);
  if (!query) return articleCatalog.slice(0, limit);
  const parts = query.split(/\s+/).filter(Boolean);
  return articleCatalog
    .filter((article) => {
      const haystack = normalizeArticleLookup(`${article.id} ${article.name}`);
      return parts.every((part) => haystack.includes(part));
    })
    .slice(0, limit);
}

function articlePickerResultsHtml(section, query, selectedId = "") {
  const results = articleSearchMatches(query, 60);
  return results.length ? results.map((article) => `
    <button
      type="button"
      class="article-picker-option ${article.id === selectedId ? "selected" : ""}"
      data-action="select-article-option"
      data-section="${escapeAttribute(section)}"
      data-article-id="${escapeAttribute(article.id)}">
      <strong>${escapeHtml(article.id)}</strong>
      <span>${escapeHtml(article.name)}</span>
    </button>
  `).join("") : `<div class="article-picker-empty">Sin coincidencias</div>`;
}

function articleIdFromSearchValue(value) {
  const normalizedValue = normalizeSearch(value);
  if (!normalizedValue) return "";
  const exact = articleCatalog.find((article) => normalizeSearch(`${article.id} · ${article.name}`) === normalizedValue);
  if (exact) return exact.id;
  const byId = articleCatalog.find((article) => normalizeSearch(article.id) === normalizedValue);
  if (byId) return byId.id;
  return "";
}

function installedArticlesForDraft(draft) {
  const items = Array.isArray(draft.installedArticles) ? draft.installedArticles : [];
  const normalized = items
    .map((item) => {
      const article = articleCatalog.find((candidate) => candidate.id === item.id);
      const quantity = Math.max(1, Number.parseInt(item.quantity ?? "1", 10) || 1);
      return {
        id: item.id || article?.id || "",
        name: item.name || article?.name || "",
        quantity: String(quantity)
      };
    })
    .filter((item) => item.id && item.name);
  if (!normalized.length && draft.articleId && draft.articleName) {
    normalized.push({ id: draft.articleId, name: draft.articleName, quantity: String(Math.max(1, Number.parseInt(draft.articleQuantity ?? "1", 10) || 1)) });
  }
  return normalized.filter((item, index, source) => source.findIndex((candidate) => candidate.id === item.id) === index);
}

function installedArticlesAnswerValue(value) {
  if (typeof value === "string") return value;
  const items = Array.isArray(value) ? value : [];
  return items.map((item) => `${item.id} · ${item.name} (${Math.max(1, Number.parseInt(item.quantity ?? "1", 10) || 1)} un.)`).join(", ");
}

function installedArticlesDisplay(draft) {
  const items = installedArticlesForDraft(draft);
  if (!items.length) return "";
  return `
    <div class="installed-article-list">
      ${items.map((item) => `
        <div class="installed-article-row">
          <strong>${escapeHtml(`${item.id} · ${item.name}`)}</strong>
          <div class="installed-article-controls">
            <button type="button" data-action="decrease-installed-article" data-article-id="${escapeAttribute(item.id)}" aria-label="Disminuir cantidad de ${escapeAttribute(item.name)}">−</button>
            <em>${escapeHtml(`${item.quantity} un.`)}</em>
            <button type="button" data-action="increase-installed-article" data-article-id="${escapeAttribute(item.id)}" aria-label="Aumentar cantidad de ${escapeAttribute(item.name)}">+</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function installedArticleField(prefix, draft) {
  const catalogReady = articleCatalog.length > 0;
  const searchValue = articleSearchValue(draft.articleId, draft.articleName);
  return `
    <label class="field">
      <span>Artículo instalado</span>
      <div class="article-picker-field">
        <button
          class="article-picker-trigger"
          type="button"
          data-action="open-article-picker"
          data-section="${escapeAttribute(prefix)}"
          data-title="Artículo instalado"
          ${catalogReady ? "" : "disabled"}>
          ${icons.briefcase}
          <span>${searchValue ? escapeHtml(searchValue) : (catalogReady ? "Buscar por código o nombre" : "Catálogo de artículos no disponible")}</span>
        </button>
        <input type="hidden" name="${prefix}Article" data-role="${prefix}-article" value="${escapeAttribute(draft.articleId || "")}" />
      </div>
      <button class="button secondary article-add-button" type="button" data-action="add-installed-article" data-section="${escapeAttribute(prefix)}" ${draft.articleId ? "" : "disabled"}>Agregar artículo</button>
      ${installedArticlesDisplay(draft)}
      <small>Opcional para todas las acciones.</small>
    </label>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeRut(value) {
  return String(value).replace(/[^0-9Kk]/g, "").trim().toUpperCase();
}

function formatRut(value) {
  const normalized = normalizeRut(value).slice(0, 9);
  if (normalized.length <= 1) return normalized;

  const body = normalized.slice(0, -1);
  const checkDigit = normalized.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formattedBody}-${checkDigit}`;
}

function isValidRut(value) {
  const normalized = normalizeRut(value);
  if (!/^\d{7,8}[\dK]$/.test(normalized)) return false;

  const body = normalized.slice(0, -1);
  const checkDigit = normalized.slice(-1);
  let multiplier = 2;
  let sum = 0;

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedValue = 11 - (sum % 11);
  const expectedDigit = expectedValue === 11 ? "0" : expectedValue === 10 ? "K" : String(expectedValue);
  return checkDigit === expectedDigit;
}

function rutValidationMessage(value) {
  const normalized = normalizeRut(value);
  if (!normalized) return "";
  if (normalized.length < 8) return "El RUT está incompleto.";
  if (!/^\d{7,8}[\dK]$/.test(normalized)) return "Ingresa un RUT válido, por ejemplo 12.345.678-9.";
  if (!isValidRut(normalized)) return "El dígito verificador del RUT no corresponde.";
  return "";
}

function normalizeRutInputElement(element) {
  if (!element) return "";
  const formatted = formatRut(element.value);
  if (element.value !== formatted) element.value = formatted;
  return formatted;
}

function currentHeatDraftFromForm() {
  const form = rootEl.querySelector('[data-role="heat-form"]');
  if (!form) return state.heatDraft;
  const formData = new FormData(form);
  const articleId = String(formData.get("heatArticle") ?? state.heatDraft.articleId ?? "");
  const article = articleCatalog.find((item) => item.id === articleId);

  return {
    element: String(formData.get("heatElement") ?? state.heatDraft.element),
    site: String(formData.get("heatSite") ?? state.heatDraft.site),
    otherSite: String(formData.get("heatOtherSite") ?? state.heatDraft.otherSite),
    quantity: String(formData.get("heatQuantity") ?? state.heatDraft.quantity),
    action: String(formData.get("heatAction") ?? state.heatDraft.action),
    observation: String(formData.get("heatObservation") ?? state.heatDraft.observation),
    articleId,
    articleName: articleId ? (article?.name ?? state.heatDraft.articleName ?? "") : "",
    articleQuantity: String(formData.get("heatArticleQuantity") ?? state.heatDraft.articleQuantity ?? "1"),
    installedArticles: installedArticlesForDraft(state.heatDraft),
    evidenceName: state.heatDraft.evidenceName,
    evidencePreview: state.heatDraft.evidencePreview,
    evidenceFilePath: state.heatDraft.evidenceFilePath,
    evidenceFileUri: state.heatDraft.evidenceFileUri,
    evidenceMime: state.heatDraft.evidenceMime,
    evidencePhotos: evidencePhotosForRecord(state.heatDraft),
    hasSecSeal: String(formData.get("hasSecSeal") ?? state.heatDraft.hasSecSeal),
    flexibleHasExpiration: String(formData.get("flexibleHasExpiration") ?? state.heatDraft.flexibleHasExpiration),
    flexibleExpirationDate: String(formData.get("flexibleExpirationDate") ?? state.heatDraft.flexibleExpirationDate),
    flexibleHasQr: String(formData.get("flexibleHasQr") ?? state.heatDraft.flexibleHasQr)
  };
}

function currentElectricityDraftFromForm() {
  const form = rootEl.querySelector('[data-role="electricity-form"]');
  if (!form) return state.electricityDraft;
  const formData = new FormData(form);
  const articleId = String(formData.get("electricityArticle") ?? state.electricityDraft.articleId ?? "");
  const article = articleCatalog.find((item) => item.id === articleId);

  return {
    element: String(formData.get("electricityElement") ?? state.electricityDraft.element),
    site: String(formData.get("electricitySite") ?? state.electricityDraft.site),
    otherSite: String(formData.get("electricityOtherSite") ?? state.electricityDraft.otherSite),
    quantity: String(formData.get("electricityQuantity") ?? state.electricityDraft.quantity),
    action: String(formData.get("electricityAction") ?? state.electricityDraft.action),
    observation: String(formData.get("electricityObservation") ?? state.electricityDraft.observation),
    articleId,
    articleName: articleId ? (article?.name ?? state.electricityDraft.articleName ?? "") : "",
    articleQuantity: String(formData.get("electricityArticleQuantity") ?? state.electricityDraft.articleQuantity ?? "1"),
    installedArticles: installedArticlesForDraft(state.electricityDraft),
    evidenceName: state.electricityDraft.evidenceName,
    evidencePreview: state.electricityDraft.evidencePreview,
    evidenceFilePath: state.electricityDraft.evidenceFilePath,
    evidenceFileUri: state.electricityDraft.evidenceFileUri,
    evidenceMime: state.electricityDraft.evidenceMime,
    evidencePhotos: evidencePhotosForRecord(state.electricityDraft),
    distributionBoxType: String(formData.get("distributionBoxType") ?? state.electricityDraft.distributionBoxType),
    distributionBoxLocation: String(formData.get("distributionBoxLocation") ?? state.electricityDraft.distributionBoxLocation),
    distributionBoxOtherLocation: String(formData.get("distributionBoxOtherLocation") ?? state.electricityDraft.distributionBoxOtherLocation),
    sealedProtection: String(formData.get("sealedProtection") ?? state.electricityDraft.sealedProtection)
  };
}

function currentColdDraftFromForm() {
  const form = rootEl.querySelector('[data-role="cold-form"]');
  if (!form) return state.coldDraft;
  const formData = new FormData(form);
  const articleId = String(formData.get("coldArticle") ?? state.coldDraft.articleId ?? "");
  const article = articleCatalog.find((item) => item.id === articleId);

  return {
    element: String(formData.get("coldElement") ?? state.coldDraft.element),
    site: String(formData.get("coldSite") ?? state.coldDraft.site),
    otherSite: String(formData.get("coldOtherSite") ?? state.coldDraft.otherSite),
    quantity: String(formData.get("coldQuantity") ?? state.coldDraft.quantity),
    action: String(formData.get("coldAction") ?? state.coldDraft.action),
    observation: String(formData.get("coldObservation") ?? state.coldDraft.observation),
    articleId,
    articleName: articleId ? (article?.name ?? state.coldDraft.articleName ?? "") : "",
    articleQuantity: String(formData.get("coldArticleQuantity") ?? state.coldDraft.articleQuantity ?? "1"),
    installedArticles: installedArticlesForDraft(state.coldDraft),
    evidenceName: state.coldDraft.evidenceName,
    evidencePreview: state.coldDraft.evidencePreview,
    evidenceFilePath: state.coldDraft.evidenceFilePath,
    evidenceFileUri: state.coldDraft.evidenceFileUri,
    evidenceMime: state.coldDraft.evidenceMime,
    evidencePhotos: evidencePhotosForRecord(state.coldDraft)
  };
}

function currentWaterDraftFromForm() {
  const form = rootEl.querySelector('[data-role="water-form"]');
  if (!form) return state.waterDraft;
  const formData = new FormData(form);
  const articleId = String(formData.get("waterArticle") ?? state.waterDraft.articleId ?? "");
  const article = articleCatalog.find((item) => item.id === articleId);

  return {
    element: String(formData.get("waterElement") ?? state.waterDraft.element),
    site: String(formData.get("waterSite") ?? state.waterDraft.site),
    otherSite: String(formData.get("waterOtherSite") ?? state.waterDraft.otherSite),
    quantity: String(formData.get("waterQuantity") ?? state.waterDraft.quantity),
    action: String(formData.get("waterAction") ?? state.waterDraft.action),
    observation: String(formData.get("waterObservation") ?? state.waterDraft.observation),
    articleId,
    articleName: articleId ? (article?.name ?? state.waterDraft.articleName ?? "") : "",
    articleQuantity: String(formData.get("waterArticleQuantity") ?? state.waterDraft.articleQuantity ?? "1"),
    installedArticles: installedArticlesForDraft(state.waterDraft),
    evidenceName: state.waterDraft.evidenceName,
    evidencePreview: state.waterDraft.evidencePreview,
    evidenceFilePath: state.waterDraft.evidenceFilePath,
    evidenceFileUri: state.waterDraft.evidenceFileUri,
    evidenceMime: state.waterDraft.evidenceMime,
    evidencePhotos: evidencePhotosForRecord(state.waterDraft)
  };
}

function currentInfrastructureDraftFromForm() {
  const form = rootEl.querySelector('[data-role="infrastructure-form"]');
  if (!form) return state.infrastructureDraft;
  const formData = new FormData(form);
  const articleId = String(formData.get("infrastructureArticle") ?? state.infrastructureDraft.articleId ?? "");
  const article = articleCatalog.find((item) => item.id === articleId);

  return {
    element: String(formData.get("infrastructureElement") ?? state.infrastructureDraft.element),
    site: String(formData.get("infrastructureSite") ?? state.infrastructureDraft.site),
    otherSite: String(formData.get("infrastructureOtherSite") ?? state.infrastructureDraft.otherSite),
    achsSignage: String(formData.get("infrastructureAchsSignage") ?? state.infrastructureDraft.achsSignage),
    extinguisherExpirationDate: normalizeIsoDate(
      formData.get("infrastructureExtinguisherExpirationDate")
      ?? state.infrastructureDraft.extinguisherExpirationDate
    ),
    extinguisherExpired: "",
    quantity: String(formData.get("infrastructureQuantity") ?? state.infrastructureDraft.quantity),
    action: String(formData.get("infrastructureAction") ?? state.infrastructureDraft.action),
    observation: String(formData.get("infrastructureObservation") ?? state.infrastructureDraft.observation),
    articleId,
    articleName: articleId ? (article?.name ?? state.infrastructureDraft.articleName ?? "") : "",
    articleQuantity: String(formData.get("infrastructureArticleQuantity") ?? state.infrastructureDraft.articleQuantity ?? "1"),
    installedArticles: installedArticlesForDraft(state.infrastructureDraft),
    evidenceName: state.infrastructureDraft.evidenceName,
    evidencePreview: state.infrastructureDraft.evidencePreview,
    evidenceFilePath: state.infrastructureDraft.evidenceFilePath,
    evidenceFileUri: state.infrastructureDraft.evidenceFileUri,
    evidenceMime: state.infrastructureDraft.evidenceMime,
    evidencePhotos: evidencePhotosForRecord(state.infrastructureDraft)
  };
}

function currentVectorsDraftFromForm() {
  const form = rootEl.querySelector('[data-role="vectors-form"]');
  if (!form) return state.vectorsDraft;
  const formData = new FormData(form);
  const articleId = String(formData.get("vectorsArticle") ?? state.vectorsDraft.articleId ?? "");
  const article = articleCatalog.find((item) => item.id === articleId);

  return {
    element: String(formData.get("vectorsElement") ?? state.vectorsDraft.element),
    site: String(formData.get("vectorsSite") ?? state.vectorsDraft.site),
    quantity: String(formData.get("vectorsQuantity") ?? state.vectorsDraft.quantity),
    action: String(formData.get("vectorsAction") ?? state.vectorsDraft.action),
    observation: String(formData.get("vectorsObservation") ?? state.vectorsDraft.observation),
    articleId,
    articleName: articleId ? (article?.name ?? state.vectorsDraft.articleName ?? "") : "",
    articleQuantity: String(formData.get("vectorsArticleQuantity") ?? state.vectorsDraft.articleQuantity ?? "1"),
    installedArticles: installedArticlesForDraft(state.vectorsDraft),
    evidenceName: state.vectorsDraft.evidenceName,
    evidencePreview: state.vectorsDraft.evidencePreview,
    evidenceFilePath: state.vectorsDraft.evidenceFilePath,
    evidenceFileUri: state.vectorsDraft.evidenceFileUri,
    evidenceMime: state.vectorsDraft.evidenceMime,
    evidencePhotos: evidencePhotosForRecord(state.vectorsDraft)
  };
}

function currentUsedItemsDraftFromForm() {
  const form = rootEl.querySelector('[data-role="used-items-form"]');
  if (!form) return state.usedItemsDraft;
  const formData = new FormData(form);
  const articleId = String(formData.get("usedItemArticle") ?? state.usedItemsDraft.articleId);
  const article = articleCatalog.find((item) => item.id === articleId);

  return {
    articleId,
    articleName: articleId ? (article?.name ?? state.usedItemsDraft.articleName) : "",
    quantity: String(formData.get("usedItemQuantity") ?? state.usedItemsDraft.quantity),
    observation: String(formData.get("usedItemObservation") ?? state.usedItemsDraft.observation)
  };
}

function selectedArticleDraftFields(articleId) {
  const article = articleCatalog.find((item) => item.id === articleId);
  return {
    articleId,
    articleName: article?.name ?? ""
  };
}

function draftWithSelectedInstalledArticle(draft) {
  const selectedQuantity = String(Math.max(1, Number.parseInt(draft.articleQuantity ?? "1", 10) || 1));
  const selected = draft.articleId && draft.articleName ? [{ id: draft.articleId, name: draft.articleName, quantity: selectedQuantity }] : [];
  const installedById = new Map();
  [...installedArticlesForDraft(draft), ...selected]
    .filter((item) => item.id && item.name)
    .forEach((item) => {
      const previous = installedById.get(item.id);
      const quantity = Math.max(1, Number.parseInt(item.quantity ?? "1", 10) || 1);
      installedById.set(item.id, {
        id: item.id,
        name: item.name,
        quantity: String((previous ? Number.parseInt(previous.quantity, 10) || 1 : 0) + quantity)
      });
    });
  const installedArticles = Array.from(installedById.values());
  return {
    ...draft,
    installedArticles,
    articleId: "",
    articleName: "",
    articleQuantity: "1"
  };
}

function updateArticleDraftByRole(role, articleId) {
  const fields = selectedArticleDraftFields(articleId);
  if (role === "heat") updateHeatDraft({ ...currentHeatDraftFromForm(), ...fields });
  if (role === "electricity") updateElectricityDraft({ ...currentElectricityDraftFromForm(), ...fields });
  if (role === "cold") updateColdDraft({ ...currentColdDraftFromForm(), ...fields });
  if (role === "vectors") updateVectorsDraft({ ...currentVectorsDraftFromForm(), ...fields });
  if (role === "water") updateWaterDraft({ ...currentWaterDraftFromForm(), ...fields });
  if (role === "infrastructure") updateInfrastructureDraft({ ...currentInfrastructureDraftFromForm(), ...fields });
  if (role === "used-item") updateUsedItemsDraft({ ...currentUsedItemsDraftFromForm(), ...fields });
}

function currentDraftByArticleSection(section) {
  if (section === "heat") return currentHeatDraftFromForm();
  if (section === "electricity") return currentElectricityDraftFromForm();
  if (section === "cold") return currentColdDraftFromForm();
  if (section === "vectors") return currentVectorsDraftFromForm();
  if (section === "water") return currentWaterDraftFromForm();
  if (section === "infrastructure") return currentInfrastructureDraftFromForm();
  return null;
}

function currentDraftByArticleRole(role) {
  if (role === "used-item") return currentUsedItemsDraftFromForm();
  return currentDraftByArticleSection(role);
}

function openArticlePicker(section, title = "Seleccionar artículo") {
  const draft = currentDraftByArticleRole(section) || {};
  setState({
    articlePicker: {
      section,
      title,
      query: draft.articleId ? articleSearchValue(draft.articleId, draft.articleName) : ""
    }
  });
  window.setTimeout(focusArticlePickerSearch, 0);
}

function updateArticlePickerQuery(query) {
  if (!state.articlePicker) return;
  state.articlePicker.query = query;
  const resultsEl = rootEl.querySelector('[data-role="article-picker-results"]');
  if (!resultsEl) return;
  const selectedDraft = currentDraftByArticleRole(state.articlePicker.section);
  resultsEl.innerHTML = articlePickerResultsHtml(state.articlePicker.section, query, selectedDraft?.articleId || "");
}

function closeArticlePicker() {
  setState({ articlePicker: null });
}

function selectArticleOption(role, articleId) {
  const article = articleCatalog.find((item) => item.id === articleId);
  const hiddenInput = rootEl.querySelector(`[data-role="${role}-article"]`);
  if (hiddenInput) hiddenInput.value = article?.id || "";
  updateArticleDraftByRole(role, article?.id || "");
  setState({ articlePicker: null });
}

function updateDraftByArticleSection(section, draft) {
  if (section === "heat") updateHeatDraft(draft);
  if (section === "electricity") updateElectricityDraft(draft);
  if (section === "cold") updateColdDraft(draft);
  if (section === "vectors") updateVectorsDraft(draft);
  if (section === "water") updateWaterDraft(draft);
  if (section === "infrastructure") updateInfrastructureDraft(draft);
}

function addInstalledArticleToDraft(section) {
  const draft = currentDraftByArticleSection(section);
  if (!draft?.articleId || !draft.articleName) return;
  updateDraftByArticleSection(section, draftWithSelectedInstalledArticle(draft));
}

function removeInstalledArticleFromDraft(articleId) {
  const section = (state.route || "").replace(/^form-/, "");
  const draft = currentDraftByArticleSection(section);
  if (!draft) return;
  const installedArticles = installedArticlesForDraft(draft).filter((item) => item.id !== articleId);
  updateDraftByArticleSection(section, {
    ...draft,
    installedArticles,
    articleId: draft.articleId === articleId ? "" : draft.articleId,
    articleName: draft.articleId === articleId ? "" : draft.articleName,
    articleQuantity: draft.articleId === articleId ? "1" : draft.articleQuantity
  });
}

function adjustInstalledArticleQuantity(articleId, delta) {
  const section = (state.route || "").replace(/^form-/, "");
  const draft = currentDraftByArticleSection(section);
  if (!draft) return;
  const sourceArticles = Array.isArray(draft.installedArticles) ? draft.installedArticles : installedArticlesForDraft(draft);
  const installedArticles = sourceArticles
    .map((item) => item.id === articleId
      ? { ...item, quantity: String((Number.parseInt(item.quantity ?? "1", 10) || 1) + delta) }
      : item)
    .filter((item) => (Number.parseInt(item.quantity ?? "0", 10) || 0) > 0);
  updateDraftByArticleSection(section, {
    ...draft,
    installedArticles,
    articleId: draft.articleId === articleId && !installedArticles.some((item) => item.id === articleId) ? "" : draft.articleId,
    articleName: draft.articleId === articleId && !installedArticles.some((item) => item.id === articleId) ? "" : draft.articleName,
    articleQuantity: draft.articleId === articleId && !installedArticles.some((item) => item.id === articleId) ? "1" : draft.articleQuantity
  });
}


function clearResponsesForSection(sectionId) {
  if (!sectionId) return;

  const confirmed = window.confirm(
    "¿Limpiar las respuestas de esta sección? Se borrarán los datos parciales que aún no quieras registrar."
  );

  if (!confirmed) return;

  const taskId = state.selectedTaskId;

  if (sectionId === "heat") {
    state.heatDraft = emptyHeatDraft();
    state.editingHeatIndex = -1;
    state.heatError = "";
  }

  if (sectionId === "electricity") {
    state.electricityDraft = emptyElectricityDraft();
    state.editingElectricityIndex = -1;
    state.electricityError = "";
  }

  if (sectionId === "cold") {
    state.coldDraft = emptyColdDraft();
    state.editingColdIndex = -1;
    state.coldError = "";
  }

  if (sectionId === "water") {
    state.waterDraft = emptyWaterDraft();
    state.editingWaterIndex = -1;
    state.waterError = "";
  }

  if (sectionId === "infrastructure") {
    state.infrastructureDraft = emptyInfrastructureDraft();
    state.editingInfrastructureIndex = -1;
    state.infrastructureError = "";
    state.infrastructurePrefillNotice = "";
  }

  if (sectionId === "vectors") {
    state.vectorsDraft = emptyVectorsDraft();
    state.editingVectorsIndex = -1;
    state.vectorsError = "";
  }

  if (sectionId === "pae-manager") {
    state.paeManagerDraft = emptyPaeManagerDraft();
    state.paeManagerError = "";
  }

  if (sectionId === "mpa") {
    state.mpaDraft = emptyMpaDraft();
    state.mpaError = "";
  }

  if (sectionId === "service-yard") {
    state.serviceYardDraft = emptyServiceYardDraft();
    state.serviceYardError = "";
  }

  if (sectionId === "rbd-checkers") {
    state.rbdCheckersDraft = emptyRbdCheckersDraft();
    state.rbdCheckersError = "";
    state.rbdCheckersPrefillNotice = "";
  }

  if (sectionId === "used-items") {
    state.usedItemsDraft = emptyUsedItemsDraft();
    state.editingUsedItemIndex = -1;
    state.usedItemsError = "";
  }

  // Persistir inmediatamente el borrado local.
  if (taskId) {
    persistCurrentTaskProgress();
  }

  setState({
    inlineFormStatus: "Respuestas de la sección limpiadas",
    formValidationMessages: []
  });
}

function emptyHeatDraft() {
  return {
    element: "",
    site: "",
    otherSite: "",
    quantity: "1",
    action: "",
    observation: "",
    articleId: "",
    articleName: "",
    articleQuantity: "1",
    installedArticles: [],
    evidenceName: "",
    evidencePreview: "",
    hasSecSeal: "",
    flexibleHasExpiration: "",
    flexibleExpirationDate: "",
    flexibleHasQr: ""
  };
}

function emptyElectricityDraft() {
  return {
    element: "",
    site: "",
    otherSite: "",
    quantity: "1",
    action: "",
    observation: "",
    articleId: "",
    articleName: "",
    articleQuantity: "1",
    installedArticles: [],
    evidenceName: "",
    distributionBoxType: "",
    distributionBoxLocation: "",
    distributionBoxOtherLocation: "",
    sealedProtection: "",
    evidencePreview: ""
  };
}

function emptyColdDraft() {
  return {
    element: "",
    site: "",
    otherSite: "",
    quantity: "1",
    action: "",
    observation: "",
    articleId: "",
    articleName: "",
    articleQuantity: "1",
    installedArticles: [],
    evidenceName: "",
    evidencePreview: ""
  };
}

function emptyWaterDraft() {
  return {
    element: "",
    site: "",
    otherSite: "",
    quantity: "1",
    action: "",
    observation: "",
    articleId: "",
    articleName: "",
    articleQuantity: "1",
    installedArticles: [],
    evidenceName: "",
    evidencePreview: ""
  };
}

function emptyInfrastructureDraft() {
  return {
    element: "",
    site: "",
    otherSite: "",
    achsSignage: "",
    extinguisherExpirationDate: "",
    extinguisherExpired: "",
    quantity: "1",
    action: "",
    observation: "",
    articleId: "",
    articleName: "",
    articleQuantity: "1",
    installedArticles: [],
    evidenceName: "",
    evidencePreview: ""
  };
}

function emptyMpaDraft() {
  return {
    hasDressingRoom: "",
    dressingRoomLocation: "",
    hasLockers: "",
    lockersFitStaff: "",
    lockersGoodState: "",
    hasShower: "",
    showerExclusive: "",
    hasBathroom: "",
    bathroomExclusive: ""
  };
}

function emptyServiceYardDraft() {
  return {
    exclusiveProgram: ""
  };
}

function emptyRbdCheckersDraft() {
  return {
    pestControlUpToDate: "",
    pestControlDate: "",
    hasSanitaryResolution: "",
    sanitaryResolutionNumber: "",
    hasGreenSeal: "",
    greenSealCode: "",
    greenSealExpiration: "",
    greenSealExpired: "",
    hasMaintenanceCover: "",
    hasPaintCertificate: ""
  };
}

function emptyUsedItemsDraft() {
  return {
    articleId: "",
    articleName: "",
    quantity: "1",
    observation: ""
  };
}

function emptyPaeManagerDraft() {
  return {
    name: "",
    rut: "",
    role: ""
  };
}

function emptyVectorsDraft() {
  return {
    element: "",
    site: "",
    quantity: "1",
    action: "",
    observation: "",
    articleId: "",
    articleName: "",
    articleQuantity: "1",
    installedArticles: [],
    evidenceName: "",
    evidencePreview: ""
  };
}

function normalizeIsoDate(value) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return "";

  let year = "";
  let month = "";
  let day = "";
  const isoDateTimeMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]/);
  const isoMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const chileanMatch = rawValue.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);

  if (isoDateTimeMatch) {
    [, year, month, day] = isoDateTimeMatch;
  } else if (isoMatch) {
    [, year, month, day] = isoMatch;
  } else if (chileanMatch) {
    [, day, month, year] = chileanMatch;
    day = day.padStart(2, "0");
    month = month.padStart(2, "0");
  } else {
    return "";
  }

  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  const parsedDay = Number(day);
  const date = new Date(parsedYear, parsedMonth - 1, parsedDay);

  if (
    parsedYear < 1900 ||
    parsedYear > 2100 ||
    date.getFullYear() !== parsedYear ||
    date.getMonth() !== parsedMonth - 1 ||
    date.getDate() !== parsedDay
  ) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function todayIsoDate() {
  return localDateKey();
}

function isIsoDateAfter(value, reference = todayIsoDate()) {
  const date = normalizeIsoDate(value);
  const compareTo = normalizeIsoDate(reference);
  return Boolean(date && compareTo && date > compareTo);
}

function isIsoDateBefore(value, reference = todayIsoDate()) {
  const date = normalizeIsoDate(value);
  const compareTo = normalizeIsoDate(reference);
  return Boolean(date && compareTo && date < compareTo);
}

function greenSealExpiredValue(draft = state.rbdCheckersDraft) {
  return draft.hasGreenSeal === "Sí" && isIsoDateBefore(draft.greenSealExpiration) ? "Sí" : "";
}

function isExtinguisherElement(element = "") {
  return normalizeSearch(element).includes("extintor");
}

function extinguisherExpiredValue(draft = state.infrastructureDraft) {
  if (!isExtinguisherElement(draft.element)) return "";
  const expirationDate = normalizeIsoDate(draft.extinguisherExpirationDate);
  if (!expirationDate) return "";
  return isIsoDateBefore(expirationDate) ? "Sí" : "No";
}

function sanitizedInfrastructureDraft(draft = {}) {
  const normalizedDraft = {
    ...emptyInfrastructureDraft(),
    ...draft,
    extinguisherExpirationDate: normalizeIsoDate(draft.extinguisherExpirationDate)
  };

  if (!isExtinguisherElement(normalizedDraft.element)) {
    normalizedDraft.extinguisherExpirationDate = "";
    normalizedDraft.extinguisherExpired = "";
    return normalizedDraft;
  }

  normalizedDraft.extinguisherExpired = extinguisherExpiredValue(normalizedDraft);
  return normalizedDraft;
}

function sanitizedRbdCheckersDraft(draft = {}) {
  const normalizedDraft = {
    ...emptyRbdCheckersDraft(),
    ...draft,
    pestControlDate: normalizeIsoDate(draft.pestControlDate),
    greenSealExpiration: normalizeIsoDate(draft.greenSealExpiration)
  };
  normalizedDraft.greenSealExpired = greenSealExpiredValue(normalizedDraft);
  return {
    ...normalizedDraft
  };
}

function currentFormProgressSnapshot() {
  return {
    heatDraft: state.heatDraft,
    heatRecords: heatRecordsForTask(),
    electricityDraft: state.electricityDraft,
    electricityRecords: electricityRecordsForTask(),
    coldDraft: state.coldDraft,
    coldRecords: coldRecordsForTask(),
    waterDraft: state.waterDraft,
    waterRecords: waterRecordsForTask(),
    infrastructureDraft: sanitizedInfrastructureDraft(state.infrastructureDraft),
    infrastructureRecords: infrastructureRecordsForTask(),
    vectorsDraft: state.vectorsDraft,
    vectorsRecords: vectorsRecordsForTask(),
    usedItemsDraft: state.usedItemsDraft,
    usedItemsRecords: usedItemsRecordsForTask(),
    paeManagerDraft: state.paeManagerDraft,
    paeSignatureData: state.paeSignatureData,
    technicianSignatureData: state.technicianSignatureData,
    mpaDraft: state.mpaDraft,
    serviceYardDraft: state.serviceYardDraft,
    rbdCheckersDraft: sanitizedRbdCheckersDraft(state.rbdCheckersDraft),
    locationEvidence: state.locationEvidenceByTask[state.selectedTaskId] ?? {}
  };
}

function formProgressStateForTask(taskId) {
  const progress = readStoredFormProgress()[taskId] ?? {};

  return {
    heatDraft: { ...emptyHeatDraft(), ...(progress.heatDraft ?? {}) },
    electricityDraft: { ...emptyElectricityDraft(), ...(progress.electricityDraft ?? {}) },
    coldDraft: { ...emptyColdDraft(), ...(progress.coldDraft ?? {}) },
    waterDraft: { ...emptyWaterDraft(), ...(progress.waterDraft ?? {}) },
    infrastructureDraft: sanitizedInfrastructureDraft(progress.infrastructureDraft),
    vectorsDraft: { ...emptyVectorsDraft(), ...(progress.vectorsDraft ?? {}) },
    usedItemsDraft: { ...emptyUsedItemsDraft(), ...(progress.usedItemsDraft ?? {}) },
    heatRecordsByTask: { ...state.heatRecordsByTask, [taskId]: Array.isArray(progress.heatRecords) ? progress.heatRecords : heatRecordsForTask(taskId) },
    electricityRecordsByTask: { ...state.electricityRecordsByTask, [taskId]: Array.isArray(progress.electricityRecords) ? progress.electricityRecords : electricityRecordsForTask(taskId) },
    coldRecordsByTask: { ...state.coldRecordsByTask, [taskId]: Array.isArray(progress.coldRecords) ? progress.coldRecords : coldRecordsForTask(taskId) },
    waterRecordsByTask: { ...state.waterRecordsByTask, [taskId]: Array.isArray(progress.waterRecords) ? progress.waterRecords : waterRecordsForTask(taskId) },
    infrastructureRecordsByTask: { ...state.infrastructureRecordsByTask, [taskId]: Array.isArray(progress.infrastructureRecords) ? progress.infrastructureRecords : infrastructureRecordsForTask(taskId) },
    vectorsRecordsByTask: { ...state.vectorsRecordsByTask, [taskId]: Array.isArray(progress.vectorsRecords) ? progress.vectorsRecords : vectorsRecordsForTask(taskId) },
    usedItemsRecordsByTask: { ...state.usedItemsRecordsByTask, [taskId]: Array.isArray(progress.usedItemsRecords) ? progress.usedItemsRecords : usedItemsRecordsForTask(taskId) },
    paeManagerDraft: { ...emptyPaeManagerDraft(), ...(progress.paeManagerDraft ?? {}) },
    paeSignatureData: progress.paeSignatureData ?? "",
    technicianSignatureData: progress.technicianSignatureData ?? "",
    mpaDraft: { ...emptyMpaDraft(), ...(progress.mpaDraft ?? {}) },
    serviceYardDraft: { ...emptyServiceYardDraft(), ...(progress.serviceYardDraft ?? {}) },
    rbdCheckersDraft: sanitizedRbdCheckersDraft(progress.rbdCheckersDraft),
    locationEvidenceByTask: {
      ...state.locationEvidenceByTask,
      [taskId]: progress.locationEvidence ?? state.locationEvidenceByTask[taskId] ?? {}
    }
  };
}

function persistCurrentTaskProgress() {
  const taskId = state.selectedTaskId;
  if (!taskId) return;
  state.rbdCheckersDraft = sanitizedRbdCheckersDraft(state.rbdCheckersDraft);
  const snapshot = currentFormProgressSnapshot();
  const saved = writeStoredFormProgress({
    ...readStoredFormProgress(),
    [taskId]: snapshot
  }, { silent: true });
  if (saved) {
    state.lastLocalSaveAt = new Date().toISOString();
    state.inlineFormStatus = "Guardado actualizado";
    return true;
  }

  const savedCurrentOnly = writeStoredFormProgress({ [taskId]: snapshot }, { silent: true });
  if (savedCurrentOnly) {
    state.lastLocalSaveAt = new Date().toISOString();
    state.inlineFormStatus = "Guardado optimizado";
    return true;
  }

  const compactSnapshot = formProgressWithoutPhotoPreviews(snapshot);
  const savedWithoutPhotos = writeStoredFormProgress({ [taskId]: compactSnapshot }, { silent: true });
  if (savedWithoutPhotos) {
    state.lastLocalSaveAt = new Date().toISOString();
    state.inlineFormStatus = "Respuestas guardadas sin fotos";
    showErrorToast("Fotos no guardadas localmente", "Se conservaron las respuestas, pero el dispositivo no permitió guardar las imágenes.");
    return true;
  }

  writeStoredFormProgress({ [taskId]: compactSnapshot });
  return false;
}

function isFormProgressRoute(route = state.route) {
  return route === "form"
    || route === "form-summary"
    || route.startsWith("form-")
    || route === "technician-signature-preview";
}

function setNetworkOnlineStatus(connected) {
  const nextOnline = Boolean(connected);
  if (state.networkOnline === nextOnline) return;
  if (isFormProgressRoute()) {
    setStateSilently({ networkOnline: nextOnline });
    return;
  }
  setState({ networkOnline: nextOnline });
}

function captureActiveFormDraftFromDom() {
  if (!state.isAuthenticated || !isFormProgressRoute()) return;

  if (state.route === "form-heat") state.heatDraft = currentHeatDraftFromForm();
  if (state.route === "form-electricity") state.electricityDraft = currentElectricityDraftFromForm();
  if (state.route === "form-cold") state.coldDraft = currentColdDraftFromForm();
  if (state.route === "form-vectors") state.vectorsDraft = currentVectorsDraftFromForm();
  if (state.route === "form-used-items") state.usedItemsDraft = currentUsedItemsDraftFromForm();
  if (state.route === "form-water") state.waterDraft = currentWaterDraftFromForm();
  if (state.route === "form-infrastructure") state.infrastructureDraft = currentInfrastructureDraftFromForm();
  if (state.route === "form-pae-manager") state.paeManagerDraft = currentPaeManagerDraftFromForm();
}

function persistActiveFormProgressNow() {
  if (!state.isAuthenticated || !isFormProgressRoute()) return;
  if (formProgressTimer) {
    window.clearTimeout(formProgressTimer);
    formProgressTimer = null;
  }
  captureActiveFormDraftFromDom();
  persistCurrentTaskProgress();
  persistDailyAuthState();
}

function scheduleActiveFormProgressSave() {
  if (!state.isAuthenticated || !isFormProgressRoute()) return;
  if (formProgressTimer) window.clearTimeout(formProgressTimer);
  formProgressTimer = window.setTimeout(() => {
    formProgressTimer = null;
    persistActiveFormProgressNow();
  }, 250);
}

function confirmLeaveFormIfNeeded() {
  if (!isFormProgressRoute() || state.route === "form-summary") return true;
  persistActiveFormProgressNow();
  return window.confirm("Tu avance está guardado localmente. ¿Deseas salir del formulario?");
}

function saveFormProgressManually() {
  persistActiveFormProgressNow();
  setState({ inlineFormStatus: "Avance guardado manualmente" });
}

async function checkRequiredPermissions() {
  if (state.permissionCheckBusy) return;
  setState({ permissionCheckBusy: true });
  const messages = [];
  try {
    await ensureLocationPermissionAvailable();
    messages.push("Ubicación disponible.");
  } catch (error) {
    messages.push(locationErrorMessage(error));
  }

  try {
    await registerPushNotifications();
    messages.push("Notificaciones revisadas.");
  } catch (error) {
    messages.push("No se pudieron revisar las notificaciones. Puedes activarlas desde permisos de Android.");
  }

  messages.push("La cámara se solicitará al tomar la primera fotografía.");
  setState({
    permissionCheckBusy: false,
    permissionCheckMessage: messages.join(" ")
  });
}

async function runConnectionDiagnostic() {
  if (state.connectionDiagnosticBusy) return;
  const startedAt = Date.now();
  setState({
    connectionDiagnosticBusy: true,
    connectionDiagnostic: {
      status: "running",
      title: "Probando conexión",
      detail: "Consultando backend y sesión..."
    }
  });

  try {
    const health = hasSqlServerApiConfig()
      ? await apiRequest("/health", { timeoutMs: 15000 })
      : await supabaseRequest("/rest/v1/", { timeoutMs: 15000 });
    const elapsed = Date.now() - startedAt;
    setState({
      connectionDiagnosticBusy: false,
      connectionDiagnostic: {
        status: "ok",
        title: "Conexión operativa",
        detail: `${remoteBackendLabel()} respondió en ${(elapsed / 1000).toFixed(1)} s. ${health?.service ? `Servicio: ${health.service}.` : ""}`
      }
    });
  } catch (error) {
    setState({
      connectionDiagnosticBusy: false,
      connectionDiagnostic: {
        status: "error",
        title: "Conexión con problemas",
        detail: error.message || "No se pudo comprobar el backend."
      }
    });
  }
}

function heatRecordsForTask(taskId = state.selectedTaskId) {
  return state.heatRecordsByTask[taskId] ?? [];
}

function electricityRecordsForTask(taskId = state.selectedTaskId) {
  return state.electricityRecordsByTask[taskId] ?? [];
}

function coldRecordsForTask(taskId = state.selectedTaskId) {
  return state.coldRecordsByTask[taskId] ?? [];
}

function waterRecordsForTask(taskId = state.selectedTaskId) {
  return state.waterRecordsByTask[taskId] ?? [];
}

function infrastructureRecordsForTask(taskId = state.selectedTaskId) {
  return state.infrastructureRecordsByTask[taskId] ?? [];
}

function isMpaComplete(draft = state.mpaDraft) {
  if (!draft.hasDressingRoom) return false;
  if (draft.hasDressingRoom === "Sí" && !draft.dressingRoomLocation) return false;
  if (!draft.hasLockers) return false;
  if (draft.hasLockers === "Sí" && (!draft.lockersFitStaff || !draft.lockersGoodState)) return false;
  if (!draft.hasShower) return false;
  if (draft.hasShower === "Sí" && !draft.showerExclusive) return false;
  if (!draft.hasBathroom) return false;
  if (draft.hasBathroom === "Sí" && !draft.bathroomExclusive) return false;
  return true;
}

function isServiceYardComplete(draft = state.serviceYardDraft) {
  return Boolean(draft.exclusiveProgram);
}

function isRbdCheckersComplete(draft = state.rbdCheckersDraft) {
  if (!draft.pestControlUpToDate) return false;
  if (!draft.pestControlDate) return false;
  if (draft.pestControlUpToDate === "Sí" && isIsoDateAfter(draft.pestControlDate)) return false;
  if (!draft.hasSanitaryResolution) return false;
  if (draft.hasSanitaryResolution === "Sí" && !draft.sanitaryResolutionNumber.trim()) return false;
  if (!draft.hasGreenSeal) return false;
  if (draft.hasGreenSeal === "Sí" && (!draft.greenSealCode.trim() || !draft.greenSealExpiration)) return false;
  if (!draft.hasMaintenanceCover) return false;
  if (!draft.hasPaintCertificate) return false;
  return true;
}

const paeManagerRoleOptions = [
  "Director/a",
  "Encargado/a PAE",
  "Representante del establecimiento"
];

function normalizePaeManagerRole(value = "") {
  const current = String(value ?? "").trim();
  if (paeManagerRoleOptions.includes(current)) return current;
  const normalized = normalizeSearch(current);
  if (!normalized) return "";
  if (normalized.includes("director")) return "Director/a";
  if (normalized.includes("representante") || normalized.includes("establecimiento")) return "Representante del establecimiento";
  if (normalized.includes("encargado") || normalized.includes("pae")) return "Encargado/a PAE";
  return "";
}

function paeManagerRoleOptionsHtml(selectedRole = "") {
  const selected = normalizePaeManagerRole(selectedRole);
  return [
    `<option value="">Selecciona cargo</option>`,
    ...paeManagerRoleOptions.map((role) => (
      `<option value="${escapeAttribute(role)}" ${role === selected ? "selected" : ""}>${escapeHtml(role)}</option>`
    ))
  ].join("");
}

function isPaeManagerComplete(draft = state.paeManagerDraft) {
  return Boolean(draft.name.trim() && draft.rut.trim() && isValidRut(draft.rut) && normalizePaeManagerRole(draft.role));
}

function isPaeSignatureComplete() {
  return Boolean(state.paeSignatureData);
}

function vectorsRecordsForTask(taskId = state.selectedTaskId) {
  return state.vectorsRecordsByTask[taskId] ?? [];
}

function usedItemsRecordsForTask(taskId = state.selectedTaskId) {
  return state.usedItemsRecordsByTask[taskId] ?? [];
}

function sectionCodeFromAnswerRow(row) {
  const section = Array.isArray(row.form_sections) ? row.form_sections[0] : row.form_sections;
  return section?.code ?? row.section_code ?? "";
}

function questionCodeFromAnswerRow(row) {
  const question = Array.isArray(row.form_questions) ? row.form_questions[0] : row.form_questions;
  return question?.code ?? row.question_code ?? "";
}

function normalizeFieldKey(key) {
  return String(key ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function canonicalFieldKey(key) {
  const aliases = {
    element: "element",
    itemlabel: "item_label",
    site: "site",
    othersite: "otherSite",
    quantity: "quantity",
    action: "action",
    observation: "observation",
    evidencename: "evidenceName",
    evidencepreview: "evidencePreview",
    hassecseal: "hasSecSeal",
    flexiblehasexpiration: "flexibleHasExpiration",
    flexibleexpirationdate: "flexibleExpirationDate",
    flexiblehasqr: "flexibleHasQr",
    distributionboxtype: "distributionBoxType",
    distributionboxlocation: "distributionBoxLocation",
    distributionboxotherlocation: "distributionBoxOtherLocation",
    sealedprotection: "sealedProtection",
    achssignage: "achsSignage",
    hasachssignage: "hasAchsSignage",
    extinguisherexpirationdate: "extinguisherExpirationDate",
    extinguisherexpired: "extinguisherExpired",
    hasdressingroom: "hasDressingRoom",
    dressingroomlocation: "dressingRoomLocation",
    haslockers: "hasLockers",
    lockersfitstaff: "lockersFitStaff",
    lockersgoodstate: "lockersGoodState",
    hasshower: "hasShower",
    showerexclusive: "showerExclusive",
    hasbathroom: "hasBathroom",
    bathroomexclusive: "bathroomExclusive",
    exclusiveprogram: "exclusiveProgram",
    pestcontroluptodate: "pestControlUpToDate",
    pestcontroldate: "pestControlDate",
    hassanitaryresolution: "hasSanitaryResolution",
    sanitaryresolutionnumber: "sanitaryResolutionNumber",
    hasgreenseal: "hasGreenSeal",
    greensealcode: "greenSealCode",
    greensealexpiration: "greenSealExpiration",
    hasmaintenancecover: "hasMaintenanceCover",
    haspaintcertificate: "hasPaintCertificate",
    name: "name",
    rut: "rut",
    role: "role",
    articleid: "articleId",
    articlename: "articleName",
    articlequantity: "articleQuantity",
    installedarticles: "installedArticles",
    startlatitude: "start_latitude",
    startlongitude: "start_longitude",
    startaccuracymeters: "start_accuracy_meters",
    startcapturedat: "start_captured_at",
    startonline: "start_online",
    startdistancemeters: "start_distance_meters",
    submitlatitude: "submit_latitude",
    submitlongitude: "submit_longitude",
    submitaccuracymeters: "submit_accuracy_meters",
    submitcapturedat: "submit_captured_at",
    submitonline: "submit_online",
    submitdistancemeters: "submit_distance_meters",
    starterror: "start_error",
    submiterror: "submit_error"
  };
  return aliases[normalizeFieldKey(key)] ?? key;
}

function remoteAnswerValue(row) {
  if (row.answer_text !== null && row.answer_text !== undefined) return String(row.answer_text);
  if (row.answer_number !== null && row.answer_number !== undefined) return String(row.answer_number);
  if (row.answer_date !== null && row.answer_date !== undefined) return String(row.answer_date);
  if (row.answer_boolean !== null && row.answer_boolean !== undefined) return row.answer_boolean ? "Sí" : "No";
  if (row.answer_json && Object.keys(row.answer_json).length) return JSON.stringify(row.answer_json);
  return "";
}

function remoteRecordsBySection(itemRows, answerRows) {
  const recordsByItem = new Map();

  itemRows.forEach((item) => {
    recordsByItem.set(item.id, {
      sectionCode: sectionCodeFromAnswerRow(item),
      itemIndex: Number(item.item_index) || 0,
      record: {
        element: item.item_label || "",
        site: "",
        otherSite: "",
        quantity: "",
        action: "",
        observation: "",
        evidenceName: "",
        evidencePreview: ""
      }
    });
  });

  answerRows.forEach((answerRow) => {
    if (!answerRow.response_item_id) return;
    if (!recordsByItem.has(answerRow.response_item_id)) {
      recordsByItem.set(answerRow.response_item_id, {
        sectionCode: sectionCodeFromAnswerRow(answerRow),
        itemIndex: 0,
        record: {
          element: "",
          site: "",
          otherSite: "",
          quantity: "",
          action: "",
          observation: "",
          evidenceName: "",
          evidencePreview: ""
        }
      });
    }

    const entry = recordsByItem.get(answerRow.response_item_id);
    const code = canonicalFieldKey(questionCodeFromAnswerRow(answerRow));
    if (!code) return;
    entry.record[code] = remoteAnswerValue(answerRow);
  });

  return Array.from(recordsByItem.values()).reduce((bySection, entry) => {
    if (!entry.sectionCode) return bySection;
    const record = entry.record;
    if (!record.element) record.element = record.item_label || "";
    if (!bySection[entry.sectionCode]) bySection[entry.sectionCode] = [];
    bySection[entry.sectionCode].push({ ...record, _itemIndex: entry.itemIndex });
    return bySection;
  }, {});
}

function remoteSingleSectionDraft(answerRows, sectionCode) {
  return answerRows.reduce((draft, row) => {
    if (row.response_item_id || sectionCodeFromAnswerRow(row) !== sectionCode) return draft;
    const code = canonicalFieldKey(questionCodeFromAnswerRow(row));
    if (!code) return draft;
    draft[code] = remoteAnswerValue(row);
    return draft;
  }, {});
}

function remoteLocationEvidence(answerRows) {
  const draft = remoteSingleSectionDraft(answerRows, "geolocation");
  const point = (prefix) => {
    const latitude = Number(draft[`${prefix}_latitude`]);
    const longitude = Number(draft[`${prefix}_longitude`]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return {
      latitude,
      longitude,
      accuracyMeters: Number(draft[`${prefix}_accuracy_meters`]) || null,
      distanceMeters: Number(draft[`${prefix}_distance_meters`]) || null,
      capturedAt: draft[`${prefix}_captured_at`] || "",
      online: draft[`${prefix}_online`] || ""
    };
  };

  return {
    start: point("start"),
    submit: point("submit"),
    startError: draft.start_error || "",
    submitError: draft.submit_error || ""
  };
}

function locationPointLabel(point) {
  if (!point) return "Sin registro";
  const latitude = Number(point.latitude).toFixed(6);
  const longitude = Number(point.longitude).toFixed(6);
  return `${latitude}, ${longitude}`;
}

function locationTimeLabel(point) {
  if (!point?.capturedAt) return "Sin hora";
  return formatDateTimeLabel(point.capturedAt);
}

function locationMapsUrl(point) {
  if (!point) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.latitude},${point.longitude}`)}`;
}

function locationPointDistanceFromRbd(task, point) {
  if (!point) return null;
  if (Number.isFinite(point.distanceMeters)) return Number(point.distanceMeters);
  const coordinates = taskEstablishmentMeta(task)?.coordinates;
  if (!hasValidCoordinates(coordinates)) return null;
  const current = { lat: Number(point.latitude), lng: Number(point.longitude) };
  if (!hasValidCoordinates(current)) return null;
  return Math.round(distanceMetersBetween(current, coordinates));
}

function locationPointWithDistance(task, point) {
  if (!point) return null;
  const distanceMeters = locationPointDistanceFromRbd(task, point);
  return {
    ...point,
    distanceMeters: Number.isFinite(distanceMeters) ? distanceMeters : null
  };
}

function locationMapPoint(point, label, className, fallbackX, fallbackY) {
  if (!point) return null;
  const isFarFromRbd = Number.isFinite(point.distanceMeters) && point.distanceMeters > 150;
  return {
    label,
    className: `${className}${isFarFromRbd ? " far" : ""}`,
    latitude: Number(point.latitude),
    longitude: Number(point.longitude),
    timeLabel: locationTimeLabel(point),
    coordinateLabel: locationPointLabel(point),
    distanceLabel: Number.isFinite(point?.distanceMeters)
      ? `${formatDistance(point.distanceMeters)} del RBD${isFarFromRbd ? " - fuera de rango" : ""}`
      : "Distancia sin dato",
    isFarFromRbd,
    x: fallbackX,
    y: fallbackY,
    url: locationMapsUrl(point)
  };
}

function taskMapPoint(task) {
  const coordinates = taskEstablishmentMeta(task)?.coordinates;
  if (!hasValidCoordinates(coordinates)) return null;
  return {
    label: "RBD",
    className: "rbd",
    latitude: Number(coordinates.lat),
    longitude: Number(coordinates.lng),
    timeLabel: "Establecimiento",
    coordinateLabel: `${Number(coordinates.lat).toFixed(6)}, ${Number(coordinates.lng).toFixed(6)}`,
    distanceLabel: "Punto de referencia",
    x: 50,
    y: 50,
    url: mapsUrlForTask(task)
  };
}

function locationMapModel(task, start, submit) {
  const points = [
    locationMapPoint(start, "Inicio", "start", 28, 58),
    locationMapPoint(submit, "Fin", "submit", 72, 42),
    taskMapPoint(task)
  ].filter(Boolean);
  const coordinatePoints = points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
  if (coordinatePoints.length >= 2) {
    const minLat = Math.min(...coordinatePoints.map((point) => point.latitude));
    const maxLat = Math.max(...coordinatePoints.map((point) => point.latitude));
    const minLng = Math.min(...coordinatePoints.map((point) => point.longitude));
    const maxLng = Math.max(...coordinatePoints.map((point) => point.longitude));
    const latRange = Math.max(0.00015, maxLat - minLat);
    const lngRange = Math.max(0.00015, maxLng - minLng);
    coordinatePoints.forEach((point) => {
      point.x = 18 + ((point.longitude - minLng) / lngRange) * 64;
      point.y = 18 + ((maxLat - point.latitude) / latRange) * 64;
    });
  }

  const routePoints = [points.find((point) => point.className.includes("start")), points.find((point) => point.className.includes("submit"))]
    .filter(Boolean)
    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");

  return { points, routePoints };
}

function locationDistanceWarnings(start, submit) {
  return [
    { label: "Inicio", point: start },
    { label: "Fin", point: submit }
  ].filter(({ point }) => Number.isFinite(point?.distanceMeters) && point.distanceMeters > 150);
}

function initializeBitacoraLocationMap() {
  const element = rootEl.querySelector("[data-location-map]");
  if (!element || !window.L) return;
  const rawPoints = element.dataset.points || "[]";
  let points = [];
  try {
    points = JSON.parse(rawPoints);
  } catch {
    points = [];
  }
  points = points.filter((point) => Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude)));
  if (!points.length || element.dataset.initialized === "true") return;

  element.dataset.initialized = "true";
  element.classList.add("ready");
  const map = window.L.map(element, {
    zoomControl: true,
    attributionControl: true,
    scrollWheelZoom: false
  });

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const markerIcon = (className, label) => window.L.divIcon({
    className: `leaflet-datacora-marker ${className}`,
    html: `<span></span><strong>${escapeHtml(label)}</strong>`,
    iconSize: [34, 44],
    iconAnchor: [17, 36],
    popupAnchor: [0, -34]
  });

  const latLngs = points.map((point) => [Number(point.latitude), Number(point.longitude)]);
  points.forEach((point) => {
    const detailHtml = `
      <strong>${escapeHtml(point.label)}</strong>
      <span>${escapeHtml(point.timeLabel || "")}</span>
      <small>${escapeHtml(point.coordinateLabel || "")}</small>
      <em>${escapeHtml(point.distanceLabel || "")}</em>
    `;
    window.L.marker([Number(point.latitude), Number(point.longitude)], {
      icon: markerIcon(point.className, point.label)
    })
      .addTo(map)
      .bindTooltip(detailHtml, {
        className: "leaflet-datacora-tooltip",
        direction: "top",
        offset: [0, -30],
        opacity: 1,
        sticky: true
      })
      .bindPopup(detailHtml);
  });

  const startPoint = points.find((point) => point.className.includes("start"));
  const submitPoint = points.find((point) => point.className.includes("submit"));
  if (startPoint && submitPoint) {
    window.L.polyline([
      [Number(startPoint.latitude), Number(startPoint.longitude)],
      [Number(submitPoint.latitude), Number(submitPoint.longitude)]
    ], {
      color: "#0b875b",
      weight: 4,
      opacity: 0.85,
      dashArray: "8 7"
    }).addTo(map);
  }

  if (latLngs.length === 1) {
    map.setView(latLngs[0], 17);
  } else {
    map.fitBounds(window.L.latLngBounds(latLngs), { padding: [34, 34], maxZoom: 18 });
  }
}


function sanitizedZipFileName(value, fallback = "foto") {
  const normalized = String(value || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function imageExtensionFromSource(source = "", fallbackName = "") {
  const byName = String(fallbackName).match(/\.([a-zA-Z0-9]{2,5})(?:$|\?)/);
  if (byName) return byName[1].toLowerCase();

  const dataMatch = String(source).match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/i);
  if (dataMatch) {
    const subtype = dataMatch[1].toLowerCase();
    if (subtype === "jpeg") return "jpg";
    return subtype.replace("+xml", "");
  }

  const urlMatch = String(source).match(/\.([a-zA-Z0-9]{2,5})(?:$|\?)/);
  if (urlMatch) return urlMatch[1].toLowerCase();

  return "jpg";
}

async function imageSourceToBlob(source) {
  const value = String(source || "").trim();
  if (!value) throw new Error("La fotografía no tiene una fuente disponible.");

  if (value.startsWith("data:")) {
    const commaIndex = value.indexOf(",");
    if (commaIndex < 0) throw new Error("Formato de fotografía no válido.");
    const meta = value.slice(0, commaIndex);
    const payload = value.slice(commaIndex + 1);
    const mimeMatch = meta.match(/^data:([^;]+)/i);
    const mime = mimeMatch?.[1] || "application/octet-stream";
    const binary = meta.includes(";base64")
      ? window.atob(payload)
      : decodeURIComponent(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mime });
  }

  const response = await fetch(value);
  if (!response.ok) throw new Error(`No se pudo descargar una fotografía (${response.status}).`);
  return response.blob();
}

async function ensureZipLibrary() {
  if (window.JSZip) return window.JSZip;

  const candidates = [
    "./vendor/jszip.min.js",
    "./src/assets/jszip.min.js",
    "./assets/jszip.min.js",
    "./jszip.min.js"
  ];

  for (const src of candidates) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      if (window.JSZip) return window.JSZip;
    } catch {
      // Probar siguiente ruta local.
    }
  }

  return null;
}

function zipLibrary() {
  return window.JSZip || null;
}

async function downloadBitacoraPhotosZip(task = selectedTask()) {
  if (!task) return;
  if (state.jmPhotoZipDownloadBusy) return;

  const JSZip = await ensureZipLibrary();
  if (!JSZip) {
    showErrorToast(
      "No se pudo generar el ZIP",
      "La librería JSZip no está disponible en esta versión de Datácora."
    );
    return;
  }

  setState({ jmPhotoZipDownloadBusy: true });

  try {
    await ensureRemoteSubmissionRecords(task, { includePhotos: true });
    const remoteRows = await remoteSubmissionPhotoRows(task);
    const visibleRecordsBySection = {
      heat: heatRecordsForTask(task.id),
      electricity: electricityRecordsForTask(task.id),
      cold: coldRecordsForTask(task.id),
      vectors: vectorsRecordsForTask(task.id),
      water: waterRecordsForTask(task.id),
      infrastructure: infrastructureRecordsForTask(task.id)
    };
    const zip = new JSZip();
    let added = 0;

    for (const section of formSectionDefinitions) {
      const records = visibleRecordsBySection?.[section.id] || [];
      if (!records.length) continue;

      const sectionFolder = zip.folder(
        `${String(formSectionDefinitions.findIndex((item) => item.id === section.id) + 1).padStart(2, "0")}_${sanitizedZipFileName(section.title)}`
      );

      for (let recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
        const record = records[recordIndex];
        const localPhotos = evidencePhotosForRecord(record);
        const remoteRecordPhotos = photoAttachmentsForRecord(remoteRows, section.id, record, recordIndex)
          .map((photo) => normalizedEvidencePhoto({
            evidenceName: photo.file_name || photo.metadata?.original_file_name || "",
            evidencePreview: photo.dataUrl || photo.metadata?.graph_download_url || "",
            evidenceFilePath: photo.storage_path || "",
            evidenceFileUri: photo.external_url || "",
            evidenceMime: photo.mime_type || ""
          }));

        const remotePhotos = [];
        const matchedRows = photoAttachmentsForRecord(remoteRows, section.id, record, recordIndex);
        for (const photoRow of matchedRows) {
          let preview = fallbackPhotoPreviewUrl(photoRow);
          if (!preview) {
            try {
              preview = await remotePhotoPreviewDataUrl(task, photoRow);
            } catch {
              preview = "";
            }
          }

          remotePhotos.push(normalizedEvidencePhoto({
            evidenceName: photoRow.file_name || photoRow.metadata?.original_file_name || "",
            evidencePreview: preview,
            evidenceFilePath: photoRow.storage_path || "",
            evidenceFileUri: photoRow.external_url || "",
            evidenceMime: photoRow.mime_type || ""
          }));
        }

        const preferredPhotoSource = remotePhotos.some((photo) => isDisplayableImageSource(photo.evidencePreview))
          ? remotePhotos
          : remoteRecordPhotos.some((photo) => isDisplayableImageSource(photo.evidencePreview))
            ? remoteRecordPhotos
            : localPhotos;

        const photos = uniqueEvidencePhotos(preferredPhotoSource)
          .filter((photo) => isDisplayableImageSource(photo.evidencePreview))
          .slice(0, MAX_EVIDENCE_PHOTOS_PER_ELEMENT);

        if (!photos.length) continue;

        const recordName = sanitizedZipFileName(
          record.element || record.item_label || `Elemento_${recordIndex + 1}`,
          `Elemento_${recordIndex + 1}`
        );

        for (let photoIndex = 0; photoIndex < photos.length; photoIndex += 1) {
          const photo = photos[photoIndex];
          const source = photo.evidencePreview;
          const extension = imageExtensionFromSource(source, photo.evidenceName);
          const blob = await imageSourceToBlob(source);
          sectionFolder.file(
            `${String(recordIndex + 1).padStart(2, "0")}_${recordName}_${photoIndex + 1}.${extension}`,
            blob
          );
          added += 1;
        }
      }
    }

    if (!added) {
      throw new Error("Esta bitácora no tiene fotografías disponibles para descargar.");
    }

    const content = await zip.generateAsync({ type: "blob" });
    const baseName = sanitizedZipFileName(
      [task.rbd, task.folio || task.id, "Fotos"].filter(Boolean).join("_"),
      "Bitacora_Fotos"
    );

    if (typeof downloadGeneratedFile === "function") {
      await downloadGeneratedFile(content, `${baseName}.zip`, "application/zip");
    } else {
      const url = URL.createObjectURL(content);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${baseName}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    showSuccessToast(
      "Fotos descargadas",
      `Se generó un ZIP con ${added} fotografía${added === 1 ? "" : "s"}.`
    );
  } catch (error) {
    showErrorToast(
      "No se pudieron descargar las fotos",
      error?.message || "No fue posible generar el archivo ZIP."
    );
  } finally {
    setState({ jmPhotoZipDownloadBusy: false });
  }
}

function bitacoraLocationTracePanel(task) {
  const evidence = locationEvidenceForTask(task?.id);
  const start = locationPointWithDistance(task, evidence.start);
  const submit = locationPointWithDistance(task, evidence.submit);
  const hasPoints = start || submit;
  const routeDistance = start && submit
    ? Math.round(distanceMetersBetween({ lat: start.latitude, lng: start.longitude }, { lat: submit.latitude, lng: submit.longitude }))
    : null;
  const mapModel = locationMapModel(task, start, submit);
  const distanceWarnings = locationDistanceWarnings(start, submit);

  return `
    <section class="jm-location-panel">
      <div class="jm-location-title">
        <span>${icons.location}</span>
        <div>
          <h3>Geolocalización del formulario</h3>
          <p>Registro de inicio y envío comparado con el establecimiento.</p>
        </div>
      </div>
      ${distanceWarnings.length ? `
        <div class="jm-location-warning">
          ${icons.alert}
          <span>
            Alerta de ubicación: ${distanceWarnings.map(({ label, point }) => `${label} quedó a ${formatDistance(point.distanceMeters)} del RBD`).join(" y ")}. El umbral permitido es 150 m.
          </span>
        </div>
      ` : ""}
      ${hasPoints ? `
        <div class="jm-location-real-map" data-location-map data-points="${escapeAttribute(JSON.stringify(mapModel.points))}"></div>
        <div class="jm-location-map">
          <div class="jm-location-map-watermark">Datácora Maps</div>
          ${Number.isFinite(routeDistance) ? `<div class="jm-location-route-badge">Inicio a fin: ${formatDistance(routeDistance)}</div>` : ""}
          <div class="jm-location-map-road main"></div>
          <div class="jm-location-map-road secondary"></div>
          <div class="jm-location-map-road diagonal"></div>
          ${mapModel.routePoints ? `
            <svg class="jm-location-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points="${mapModel.routePoints}"></polyline>
            </svg>
          ` : ""}
          ${mapModel.points.map((point) => `
            <a class="jm-location-marker ${point.className}" href="${point.url}" target="_blank" rel="noopener noreferrer" title="Abrir ${point.label} en Google Maps" style="left:${point.x}%;top:${point.y}%">
              <i></i>
              <span>${escapeHtml(point.label)}</span>
            </a>
          `).join("")}
          <div class="jm-location-map-controls">
            <button type="button" aria-label="Acercar mapa">+</button>
            <button type="button" aria-label="Alejar mapa">-</button>
          </div>
        </div>
      ` : `
        <div class="jm-location-empty">
          ${icons.info}
          <span>No se encontró geolocalización de inicio o fin para esta bitácora.</span>
        </div>
      `}
    </section>
  `;
}

function remoteSignatureData(attachmentRows, kind) {
  const match = attachmentRows.find((row) => (
    row.file_kind === "signature"
    && (
      row.file_name === `${kind}.png`
      || String(row.storage_path ?? "").endsWith(`/${kind}.png`)
    )
  ));
  return match?.metadata?.data_url ?? "";
}

function normalizedMatchValue(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function sectionTitleForCode(sectionCode) {
  return formSectionDefinitions.find((section) => section.id === sectionCode)?.title ?? sectionCode;
}

function isDisplayableImageSource(value) {
  const source = String(value || "").trim();
  if (!source) return false;
  if (/^data:image\/(png|jpe?g|webp);base64,/i.test(source)) return true;
  if (/^blob:/i.test(source)) return true;
  if (/^(file|capacitor):/i.test(source)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])\/_capacitor_file_/i.test(source)) return true;
  if (/^https?:\/\/.+\.(png|jpe?g|webp)(\?.*)?$/i.test(source)) return true;
  return false;
}

function normalizedEvidencePhoto(photo = {}) {
  return {
    evidenceName: photo.evidenceName || photo.name || photo.file_name || photo.metadata?.original_file_name || "",
    evidencePreview: photo.evidencePreview || photo.preview || photo.dataUrl || "",
    evidenceFilePath: photo.evidenceFilePath || photo.filePath || "",
    evidenceFileUri: photo.evidenceFileUri || photo.fileUri || "",
    evidenceMime: photo.evidenceMime || photo.mime || photo.mimeType || ""
  };
}

function uniqueEvidencePhotos(photos = []) {
  const seen = new Set();

  return photos
    .map(normalizedEvidencePhoto)
    .filter((photo) => photo.evidenceName || photo.evidencePreview || photo.evidenceFilePath || photo.evidenceFileUri)
    .filter((photo) => {
      // La fuente visual/archivo tiene prioridad sobre el nombre.
      // Esto evita que una misma fotografía aparezca duplicada cuando
      // llega desde el registro local y también desde el respaldo remoto.
      const preview = String(photo.evidencePreview || "").trim();
      const fileUri = String(photo.evidenceFileUri || "").trim();
      const filePath = String(photo.evidenceFilePath || "").trim();
      const name = String(photo.evidenceName || "").trim();

      const key = preview
        ? `preview:${preview}`
        : fileUri
          ? `uri:${fileUri}`
          : filePath
            ? `path:${filePath}`
            : `name:${name}`;

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function evidencePhotosForRecord(record = {}) {
  const photos = Array.isArray(record.evidencePhotos)
    ? record.evidencePhotos
    : [];

  const legacy = normalizedEvidencePhoto(record);
  const hasLegacy = legacy.evidenceName || legacy.evidencePreview || legacy.evidenceFilePath || legacy.evidenceFileUri;
  const combined = hasLegacy ? [legacy, ...photos] : photos;

  return uniqueEvidencePhotos(combined)
    .slice(0, MAX_EVIDENCE_PHOTOS_PER_ELEMENT);
}

function draftWithEvidencePhotos(draft = {}, photos = []) {
  const nextPhotos = photos.map(normalizedEvidencePhoto).slice(0, MAX_EVIDENCE_PHOTOS_PER_ELEMENT);
  const firstPhoto = nextPhotos[0] || {};
  return {
    ...draft,
    evidencePhotos: nextPhotos,
    evidenceName: firstPhoto.evidenceName || "",
    evidencePreview: firstPhoto.evidencePreview || "",
    evidenceFilePath: firstPhoto.evidenceFilePath || "",
    evidenceFileUri: firstPhoto.evidenceFileUri || "",
    evidenceMime: firstPhoto.evidenceMime || ""
  };
}

function hasEvidencePhotos(record = {}) {
  return evidencePhotosForRecord(record).length > 0;
}

function evidencePhotoGrid(photos = [], options = {}) {
  if (!photos.length) return "";
  const role = options.role || "";
  const removable = Boolean(options.removable);
  return `
    <div class="evidence-photo-grid">
      ${photos.map((photo, index) => {
        const preview = isDisplayableImageSource(photo.evidencePreview) ? photo.evidencePreview : "";
        const name = photo.evidenceName || `Fotografía ${index + 1}`;
        return `
          <div class="evidence-photo-thumb">
            ${preview ? `
              <button
                type="button"
                data-action="open-image-preview"
                data-src="${escapeAttribute(preview)}"
                data-title="${escapeAttribute(name)}"
                data-subtitle="Evidencia ${index + 1} de ${photos.length}">
                <img src="${escapeAttribute(preview)}" alt="${escapeAttribute(name)}" />
              </button>
            ` : `
              <div class="evidence-photo-file">${icons.camera}<span>${escapeHtml(name)}</span></div>
            `}
            ${removable ? `
              <button
                class="evidence-photo-remove"
                type="button"
                data-action="remove-evidence-photo"
                data-role="${escapeAttribute(role)}"
                data-index="${index}"
                aria-label="Quitar fotografía ${index + 1}">×</button>
            ` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function evidencePhotoField(role, draft) {
  const photos = evidencePhotosForRecord(draft);
  const full = photos.length >= MAX_EVIDENCE_PHOTOS_PER_ELEMENT;
  return `
    <div class="field">
      <span>Fotografía de evidencia</span>
      <div class="photo-field ${full ? "is-disabled" : ""}">
        <input name="${role}Evidence" data-role="${role}-evidence" type="file" accept="image/*" capture="environment" ${full ? "disabled" : ""} />
        <div class="photo-field-content">
          <span>${icons.camera}</span>
          <strong>${full ? "Máximo de fotografías alcanzado" : "Tomar fotografía con cámara"}</strong>
          <small>${photos.length}/${MAX_EVIDENCE_PHOTOS_PER_ELEMENT} fotografías registradas.</small>
        </div>
      </div>
      ${evidencePhotoGrid(photos, { role, removable: true })}
    </div>
  `;
}

function photoAttachmentForRecord(photoRows, sectionCode, record, index) {
  return photoAttachmentsForRecord(photoRows, sectionCode, record, index)[0] ?? null;
}

function photoAttachmentsForRecord(photoRows, sectionCode, record, index) {
  const sectionTitle = sectionTitleForCode(sectionCode);
  const sectionPhotos = photoRows.filter((row) => {
    const metadata = row.metadata ?? {};
    const sectionValue = normalizedMatchValue(metadata.section);
    return sectionValue === normalizedMatchValue(sectionTitle)
      || sectionValue === normalizedMatchValue(sectionCode);
  });
  const exactMatch = sectionPhotos.find((row) => {
    const metadata = row.metadata ?? {};
    return normalizedMatchValue(metadata.element) === normalizedMatchValue(record.element)
      && normalizedMatchValue(metadata.site) === normalizedMatchValue(record.site === "Otro" ? record.otherSite : record.site)
      && normalizedMatchValue(metadata.action) === normalizedMatchValue(record.action);
  });
  if (exactMatch) {
    const exactMatches = sectionPhotos.filter((row) => {
      const metadata = row.metadata ?? {};
      return normalizedMatchValue(metadata.element) === normalizedMatchValue(record.element)
        && normalizedMatchValue(metadata.site) === normalizedMatchValue(record.site === "Otro" ? record.otherSite : record.site)
        && normalizedMatchValue(metadata.action) === normalizedMatchValue(record.action);
    });

    const seenRemotePhotos = new Set();
    const uniqueExactMatches = exactMatches.filter((row) => {
      const key = String(
        row.external_id
        || row.id
        || row.storage_path
        || row.file_name
        || row.metadata?.original_file_name
        || ""
      ).trim();

      if (!key) return true;
      if (seenRemotePhotos.has(key)) return false;
      seenRemotePhotos.add(key);
      return true;
    });

    return uniqueExactMatches.slice(0, MAX_EVIDENCE_PHOTOS_PER_ELEMENT);
  }
  return sectionPhotos.slice(index, index + 1);
}

function fallbackPhotoPreviewUrl(photo) {
  return [
    photo?.dataUrl,
    photo?.metadata?.graph_download_url
  ].find(isDisplayableImageSource) || "";
}

async function remoteSubmissionPhotoRows(task) {
  if (!task?.submissionId) return [];
  const functionName = supabaseConfig.uploadOneDrivePdfFunctionName || "upload-onedrive-pdf";
  try {
    await ensureValidSupabaseSession();
    const requestOptions = {
      method: "POST",
      timeoutMs: 120000,
      body: JSON.stringify({
        action: "submission-photos",
        submissionId: task.submissionId
      })
    };
    const response = hasSqlServerApiConfig()
      ? await apiRequest("/functions/upload-onedrive-pdf", requestOptions)
      : await supabaseRequest(`/functions/v1/${functionName}`, requestOptions);
    return Array.isArray(response?.photos) ? response.photos : [];
  } catch (error) {
    console.warn("No se pudo listar fotografias remotas.", error);
    return [];
  }
}

async function remotePhotoPreviewDataUrl(task, photo) {
  if (!photo) return "";
  if (photo.dataUrl) return photo.dataUrl;
  if (!photo.external_id && !photo.id) return fallbackPhotoPreviewUrl(photo);

  const functionName = supabaseConfig.uploadOneDrivePdfFunctionName || "upload-onedrive-pdf";
  try {
    await ensureValidSupabaseSession();
    const requestOptions = {
      method: "POST",
      timeoutMs: 60000,
      body: JSON.stringify({
        action: "download-photo",
        submissionId: task.submissionId,
        attachmentId: photo.id,
        externalId: photo.external_id
      })
    };
    const response = hasSqlServerApiConfig()
      ? await apiRequest("/functions/upload-onedrive-pdf", requestOptions)
      : await supabaseRequest(`/functions/v1/${functionName}`, requestOptions);
    return response?.dataUrl || fallbackPhotoPreviewUrl(photo);
  } catch (error) {
    console.warn("No se pudo descargar fotografia remota.", error);
    return fallbackPhotoPreviewUrl(photo);
  }
}

async function ensureRemoteSubmissionRecords(task, options = {}) {
  const hasLocalMainRecords = [
    heatRecordsForTask(task.id),
    electricityRecordsForTask(task.id),
    coldRecordsForTask(task.id),
    vectorsRecordsForTask(task.id),
    waterRecordsForTask(task.id),
    infrastructureRecordsForTask(task.id)
  ].some((records) => records.length);
  const hasPaeManager = Boolean(state.paeManagerDraft.name.trim() && state.paeManagerDraft.rut.trim() && state.paeManagerDraft.role.trim());
  const hasSignatures = Boolean(state.paeSignatureData && state.technicianSignatureData);
  const includePhotos = Boolean(options.includePhotos);
  const alreadyLoadedDetail = Boolean(task?.submissionId && state.submissionDetailLoadedIds?.[task.submissionId]);

  if (!includePhotos && (hasLocalMainRecords && hasPaeManager && hasSignatures)) return;
  if (includePhotos && alreadyLoadedDetail && hasLocalMainRecords && allEvidencePhotoRecords(task).length) {
    return { photoRows: 0, photoPreviewCount: allEvidencePhotoRecords(task).length };
  }
  if (!task?.submissionId || !hasSupabaseConfig() || !state.supabaseSession?.access_token) return;

  const headers = { Authorization: `Bearer ${state.supabaseSession.access_token}` };
  const submissionId = encodeURIComponent(String(task.submissionId).trim());
  const detail = hasSqlServerApiConfig()
    ? await apiRequest(`/api/submissions/${submissionId}/detail`, { headers })
    : null;
  if (detail && hasSqlServerApiConfig()) {
    const taskIndex = tasks.findIndex((candidate) => candidate.id === task.id);
    if (taskIndex >= 0) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        folio: detail.folio ?? tasks[taskIndex].folio,
        submittedAt: detail.submittedAt ?? tasks[taskIndex].submittedAt,
        pdfUrl: detail.pdfUrl ?? tasks[taskIndex].pdfUrl,
        pdfFileName: detail.pdfFileName ?? tasks[taskIndex].pdfFileName,
        pdfExternalId: detail.pdfExternalId ?? tasks[taskIndex].pdfExternalId,
        pdfFileKind: detail.pdfFileKind ?? tasks[taskIndex].pdfFileKind
      };
      writeOfflineTaskCache(tasks, loggedUser());
    }
  }
  const [itemRows, answerRows, singleAnswerRows, attachmentRows] = detail
    ? [
      detail.itemRows ?? [],
      detail.answerRows ?? [],
      detail.singleAnswerRows ?? [],
      detail.attachmentRows ?? []
    ]
    : await Promise.all([
      supabaseRequest(`/rest/v1/response_items?submission_id=eq.${submissionId}&select=id,section_id,item_index,item_label,form_sections(code)&order=item_index.asc`, { headers }),
      supabaseRequest(`/rest/v1/form_answers?submission_id=eq.${submissionId}&response_item_id=not.is.null&select=response_item_id,section_id,answer_text,answer_number,answer_date,answer_boolean,answer_json,form_questions(code),form_sections(code)`, { headers }),
      supabaseRequest(`/rest/v1/form_answers?submission_id=eq.${submissionId}&response_item_id=is.null&select=response_item_id,section_id,answer_text,answer_number,answer_date,answer_boolean,answer_json,form_questions(code),form_sections(code)`, { headers }),
      supabaseRequest(`/rest/v1/form_attachments?submission_id=eq.${submissionId}&file_kind=in.(signature,onedrive_photo)&select=id,file_kind,file_name,storage_path,external_url,external_id,metadata,created_at&order=created_at.asc`, { headers })
    ]);
  const bySection = remoteRecordsBySection(itemRows, answerRows);
  let photoRows = attachmentRows.filter((row) => row.file_kind === "onedrive_photo");
  if (includePhotos) {
    const functionPhotoRows = await remoteSubmissionPhotoRows(task);
    const seenPhotos = new Set(photoRows.map((row) => row.id || row.external_id || row.file_name));
    functionPhotoRows.forEach((row) => {
      const key = row.id || row.external_id || row.file_name;
      if (!seenPhotos.has(key)) photoRows.push(row);
    });
  }
  const paeManagerDraft = {
    ...state.paeManagerDraft,
    ...remoteSingleSectionDraft(singleAnswerRows, "pae-manager")
  };
  const mpaDraft = {
    ...state.mpaDraft,
    ...remoteSingleSectionDraft(singleAnswerRows, "mpa")
  };
  const serviceYardDraft = {
    ...state.serviceYardDraft,
    ...remoteSingleSectionDraft(singleAnswerRows, "service-yard")
  };
  const rbdCheckersDraft = {
    ...state.rbdCheckersDraft,
    ...remoteSingleSectionDraft(singleAnswerRows, "rbd-checkers")
  };
  const remoteLocation = remoteLocationEvidence(singleAnswerRows);
  const paeSignatureData = state.paeSignatureData || remoteSignatureData(attachmentRows, "pae_manager");
  const technicianSignatureData = state.technicianSignatureData || remoteSignatureData(attachmentRows, "technician");
  const sortRecords = (records = []) => records.sort((left, right) => (left._itemIndex || 0) - (right._itemIndex || 0)).map(({ _itemIndex, ...record }) => record);
  const preserveLocalEvidence = async (sectionCode, remoteRecords = [], localRecords = []) => {
    const sortedRemote = sortRecords(remoteRecords);
    return Promise.all(sortedRemote.map(async (remoteRecord, index) => {
      const remoteKey = recordIdentityKey(remoteRecord);
      const localRecord = localRecords.find((item) => recordIdentityKey(item) === remoteKey) || localRecords[index] || {};
      const photos = includePhotos ? photoAttachmentsForRecord(photoRows, sectionCode, remoteRecord, index) : [];
      const localPhotos = evidencePhotosForRecord(localRecord);
      const remoteRecordPhotos = evidencePhotosForRecord(remoteRecord);
      const remotePhotos = await Promise.all(photos.map(async (photo) => ({
        evidenceName: photo?.file_name || photo?.metadata?.original_file_name || "",
        evidencePreview: await remotePhotoPreviewDataUrl(task, photo)
      })));
      // Una misma evidencia puede existir simultáneamente en:
      // 1) adjuntos remotos descargados,
      // 2) respuestas remotas,
      // 3) caché/local del dispositivo.
      // No se concatenan las tres fuentes porque la misma foto puede tener
      // un dataURL/URI distinto en cada origen y terminar duplicada.
      // Se prioriza una sola fuente completa.
      const preferredPhotoSource = remotePhotos.some((photo) => isDisplayableImageSource(photo.evidencePreview))
        ? remotePhotos
        : remoteRecordPhotos.some((photo) => isDisplayableImageSource(photo.evidencePreview))
          ? remoteRecordPhotos
          : localPhotos;

      const evidencePhotos = uniqueEvidencePhotos(preferredPhotoSource)
        .filter((photo) => isDisplayableImageSource(photo.evidencePreview) || photo.evidenceName)
        .slice(0, MAX_EVIDENCE_PHOTOS_PER_ELEMENT);
      const firstPhoto = evidencePhotos[0] || {};
      return {
        ...remoteRecord,
        evidenceName: firstPhoto.evidenceName || remoteRecord.evidenceName || localRecord.evidenceName || "",
        evidencePreview: firstPhoto.evidencePreview || "",
        evidencePhotos
      };
    }));
  };

  const [
    heatRemoteRecords,
    electricityRemoteRecords,
    coldRemoteRecords,
    vectorsRemoteRecords,
    waterRemoteRecords,
    infrastructureRemoteRecords
  ] = await Promise.all([
    bySection.heat ? preserveLocalEvidence("heat", bySection.heat, heatRecordsForTask(task.id)) : heatRecordsForTask(task.id),
    bySection.electricity ? preserveLocalEvidence("electricity", bySection.electricity, electricityRecordsForTask(task.id)) : electricityRecordsForTask(task.id),
    bySection.cold ? preserveLocalEvidence("cold", bySection.cold, coldRecordsForTask(task.id)) : coldRecordsForTask(task.id),
    bySection.vectors ? preserveLocalEvidence("vectors", bySection.vectors, vectorsRecordsForTask(task.id)) : vectorsRecordsForTask(task.id),
    bySection.water ? preserveLocalEvidence("water", bySection.water, waterRecordsForTask(task.id)) : waterRecordsForTask(task.id),
    bySection.infrastructure ? preserveLocalEvidence("infrastructure", bySection.infrastructure, infrastructureRecordsForTask(task.id)) : infrastructureRecordsForTask(task.id)
  ]);
  const photoPreviewCount = [
    ...heatRemoteRecords,
    ...electricityRemoteRecords,
    ...coldRemoteRecords,
    ...vectorsRemoteRecords,
    ...waterRemoteRecords,
    ...infrastructureRemoteRecords
  ].reduce((count, record) => count + evidencePhotosForRecord(record).filter((photo) => isDisplayableImageSource(photo.evidencePreview)).length, 0);

  setState({
    heatRecordsByTask: { ...state.heatRecordsByTask, [task.id]: heatRemoteRecords },
    electricityRecordsByTask: { ...state.electricityRecordsByTask, [task.id]: electricityRemoteRecords },
    coldRecordsByTask: { ...state.coldRecordsByTask, [task.id]: coldRemoteRecords },
    vectorsRecordsByTask: { ...state.vectorsRecordsByTask, [task.id]: vectorsRemoteRecords },
    waterRecordsByTask: { ...state.waterRecordsByTask, [task.id]: waterRemoteRecords },
    infrastructureRecordsByTask: { ...state.infrastructureRecordsByTask, [task.id]: infrastructureRemoteRecords },
    usedItemsRecordsByTask: { ...state.usedItemsRecordsByTask, [task.id]: bySection["used-items"] ? sortRecords(bySection["used-items"]) : usedItemsRecordsForTask(task.id) },
    paeManagerDraft,
    mpaDraft,
    serviceYardDraft,
    rbdCheckersDraft,
    remoteLocationEvidenceByTask: {
      ...state.remoteLocationEvidenceByTask,
      [task.id]: remoteLocation
    },
    paeSignatureData,
    technicianSignatureData
  });

  return { photoRows: photoRows.length, photoPreviewCount };
}

function minimumForSection(task, section) {
  if (section.minimum) return section.minimum;
  const configured = Number(task.form?.sectionMinimums?.[section.id]);
  if (Number.isFinite(configured) && configured > 0) return Math.trunc(configured);
  if (section.baseRequired || task.form?.requiredSections?.includes(section.id)) return 1;
  return 0;
}

function formSectionsForTask(task) {
  const requiredSections = new Set(task.form?.requiredSections ?? []);
  const criticalSections = new Set(task.form?.criticalSections ?? []);
  const remoteCounts = task.remoteSectionCounts ?? {};
  const heatRecords = heatRecordsForTask(task.id);
  const electricityRecords = electricityRecordsForTask(task.id);
  const coldRecords = coldRecordsForTask(task.id);
  const waterRecords = waterRecordsForTask(task.id);
  const infrastructureRecords = infrastructureRecordsForTask(task.id);
  const vectorsRecords = vectorsRecordsForTask(task.id);
  const doneBySection = {
    heat: heatRecords.length,
    electricity: electricityRecords.length,
    cold: coldRecords.length,
    water: waterRecords.length,
    infrastructure: infrastructureRecords.length,
    "pae-manager": isPaeManagerComplete() && isPaeSignatureComplete() ? 1 : 0,
    mpa: isMpaComplete() ? 1 : 0,
    "service-yard": isServiceYardComplete() ? 1 : 0,
    "rbd-checkers": isRbdCheckersComplete() ? 1 : 0,
    vectors: vectorsRecords.length
  };

  return formSectionDefinitions.map((section) => ({
    ...section,
    required: section.baseRequired || requiredSections.has(section.id),
    critical: section.baseCritical || criticalSections.has(section.id),
    minimum: minimumForSection(task, section),
    done: Math.max(doneBySection[section.id] ?? 0, Number(remoteCounts[section.id] ?? 0) || 0)
  }));
}

function taskHasFormProgress(task = selectedTask()) {
  if (!task?.id) return false;
  return heatRecordsForTask(task.id).length > 0
    || electricityRecordsForTask(task.id).length > 0
    || coldRecordsForTask(task.id).length > 0
    || vectorsRecordsForTask(task.id).length > 0
    || waterRecordsForTask(task.id).length > 0
    || infrastructureRecordsForTask(task.id).length > 0
    || isPaeManagerComplete()
    || isPaeSignatureComplete()
    || isMpaComplete()
    || isServiceYardComplete()
    || isRbdCheckersComplete()
    || Boolean(state.technicianSignatureData);
}

function sectionMinimumById(task, sectionId) {
  const section = formSectionDefinitions.find((item) => item.id === sectionId);
  return section ? minimumForSection(task, section) : 0;
}

function nextSectionAfter(sectionId) {
  const index = formSectionDefinitions.findIndex((section) => section.id === sectionId);
  return formSectionDefinitions[index + 1] ?? null;
}

function openSectionRoute(sectionId) {
  persistCurrentTaskProgress();
  if (sectionId === "heat") return setState({ route: "form-heat", heatError: "" });
  if (sectionId === "electricity") return setState({ route: "form-electricity", electricityError: "" });
  if (sectionId === "cold") return setState({ route: "form-cold", coldError: "" });
  if (sectionId === "water") return setState({ route: "form-water", waterError: "" });
  if (sectionId === "infrastructure") return setState({ route: "form-infrastructure", infrastructureError: "" });
  if (sectionId === "pae-manager") return setState({ route: "form-pae-manager", paeManagerError: "" });
  if (sectionId === "mpa") return setState({ route: "form-mpa", mpaError: "" });
  if (sectionId === "service-yard") return setState({ route: "form-service-yard", serviceYardError: "" });
  if (sectionId === "rbd-checkers") return setState({ route: "form-rbd-checkers", rbdCheckersError: "" });
  if (sectionId === "vectors") return setState({ route: "form-vectors", vectorsError: "" });
  return setState({ route: "form-section", activeFormSection: sectionId });
}

function pluralizeElement(count) {
  return count === 1 ? "elemento" : "elementos";
}

function missingPaeManagerDetails() {
  const missing = [];
  if (!state.paeManagerDraft.name.trim()) missing.push("nombre");
  if (!state.paeManagerDraft.rut.trim() || !isValidRut(state.paeManagerDraft.rut)) missing.push("RUT válido");
  if (!state.paeManagerDraft.role.trim()) missing.push("cargo");
  if (!state.paeSignatureData) missing.push("firma");
  return missing;
}

function missingMpaDetails() {
  const draft = state.mpaDraft;
  const missing = [];
  if (!draft.hasDressingRoom) missing.push("vestidores");
  if (draft.hasDressingRoom === "Sí" && !draft.dressingRoomLocation) missing.push("ubicación del vestidor");
  if (!draft.hasLockers) missing.push("casilleros");
  if (draft.hasLockers === "Sí" && !draft.lockersFitStaff) missing.push("casilleros acorde al personal");
  if (draft.hasLockers === "Sí" && !draft.lockersGoodState) missing.push("estado y cierre de casilleros");
  if (!draft.hasShower) missing.push("ducha");
  if (draft.hasShower === "Sí" && !draft.showerExclusive) missing.push("exclusividad de duchas");
  if (!draft.hasBathroom) missing.push("baño");
  if (draft.hasBathroom === "Sí" && !draft.bathroomExclusive) missing.push("exclusividad del baño");
  return missing;
}

function missingRbdCheckersDetails() {
  const draft = state.rbdCheckersDraft;
  const missing = [];
  if (!draft.pestControlUpToDate) missing.push("control de plagas al día");
  if (!draft.pestControlDate) missing.push("fecha del último control de plagas");
  if (draft.pestControlUpToDate === "Sí" && isIsoDateAfter(draft.pestControlDate)) missing.push("fecha de control de plagas no puede ser posterior a hoy");
  if (!draft.hasSanitaryResolution) missing.push("resolución sanitaria");
  if (draft.hasSanitaryResolution === "Sí" && !draft.sanitaryResolutionNumber.trim()) missing.push("N° Resolución");
  if (!draft.hasGreenSeal) missing.push("sello verde");
  if (draft.hasGreenSeal === "Sí" && !draft.greenSealCode.trim()) missing.push("código o ID de sello verde");
  if (draft.hasGreenSeal === "Sí" && !draft.greenSealExpiration) missing.push("vencimiento de sello verde");
  if (!draft.hasMaintenanceCover) missing.push("carátula de mantención del año");
  if (!draft.hasPaintCertificate) missing.push("certificado de pintura");
  return missing;
}

function hasDraftInputValue(draft = {}, ignoredKeys = []) {
  const ignored = new Set(ignoredKeys);
  return Object.entries(draft).some(([key, value]) => {
    if (ignored.has(key)) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && value !== false;
  });
}

function hasPaeManagerInput() {
  return hasDraftInputValue(state.paeManagerDraft) || Boolean(state.paeSignatureData);
}

function hasMpaInput() {
  return hasDraftInputValue(state.mpaDraft);
}

function hasServiceYardInput() {
  return hasDraftInputValue(state.serviceYardDraft);
}

function hasRbdCheckersInput() {
  return hasDraftInputValue(state.rbdCheckersDraft, ["greenSealExpired"]);
}

function hasRbdCheckersDraftInput(draft = {}) {
  return hasDraftInputValue(draft, ["greenSealExpired"]);
}

function hasInfrastructureDraftInput(draft = {}) {
  return hasDraftInputValue(draft, ["extinguisherExpired", "quantity", "articleQuantity"]);
}

function latestRbdCheckersPrefillNotice(source = {}) {
  const parts = [];
  if (source.folio) parts.push(`Folio ${source.folio}`);
  const date = formatDateLabel(source.submittedAt || source.submitted_at || source.dueDate || source.due_date);
  if (date && date !== "Sin fecha") parts.push(date);
  const suffix = parts.length ? ` (${parts.join(" · ")})` : "";
  return `Se cargaron los verificadores RBD desde la última visita registrada${suffix}. Puedes editar cualquier dato si cambió.`;
}

async function latestRbdCheckersDraftForTask(task) {
  if (!task?.rbd || !hasSqlServerApiConfig() || !state.supabaseSession?.access_token || !isNetworkOnline()) {
    return null;
  }

  const params = new URLSearchParams();
  const remoteTaskId = task.supabaseId || (/^[0-9a-f-]{36}$/i.test(String(task.id || "")) ? task.id : "");
  if (remoteTaskId) params.set("excludeTaskId", remoteTaskId);
  const query = params.toString() ? `?${params}` : "";
  const detail = await apiRequest(`/api/establishments/${encodeURIComponent(task.rbd)}/latest-rbd-checkers${query}`);
  const draft = sanitizedRbdCheckersDraft(remoteSingleSectionDraft(detail?.singleAnswerRows ?? [], "rbd-checkers"));
  if (!hasRbdCheckersDraftInput(draft)) return null;
  return {
    draft,
    source: {
      folio: detail?.folio,
      submittedAt: detail?.submittedAt
    }
  };
}

async function applyLatestRbdCheckersDefaultsForTask(task = selectedTask()) {
  if (!task?.id || isTaskCompleted(task)) return;
  if (state.rbdCheckersPrefillLoadedTaskIds?.[task.id]) return;

  const storedDraft = readStoredFormProgress()[task.id]?.rbdCheckersDraft;
  if (hasRbdCheckersDraftInput(state.rbdCheckersDraft) || hasRbdCheckersDraftInput(storedDraft)) {
    state.rbdCheckersPrefillLoadedTaskIds = {
      ...state.rbdCheckersPrefillLoadedTaskIds,
      [task.id]: true
    };
    return;
  }

  try {
    const prefill = await latestRbdCheckersDraftForTask(task);
    state.rbdCheckersPrefillLoadedTaskIds = {
      ...state.rbdCheckersPrefillLoadedTaskIds,
      [task.id]: true
    };
    if (!prefill) return;
    setStateSilently({
      rbdCheckersDraft: prefill.draft,
      rbdCheckersPrefillNotice: latestRbdCheckersPrefillNotice(prefill.source),
      rbdCheckersPrefillLoadedTaskIds: state.rbdCheckersPrefillLoadedTaskIds
    });
    persistCurrentTaskProgress();
  } catch (error) {
    console.warn("No se pudieron precargar los verificadores RBD.", error);
    state.rbdCheckersPrefillLoadedTaskIds = {
      ...state.rbdCheckersPrefillLoadedTaskIds,
      [task.id]: true
    };
  }
}

function latestInfrastructurePrefillNotice(source = {}) {
  const parts = [];
  if (source.folio) parts.push(`Folio ${source.folio}`);
  const date = formatDateLabel(source.submittedAt || source.submitted_at || source.dueDate || source.due_date);
  if (date && date !== "Sin fecha") parts.push(date);
  const suffix = parts.length ? ` (${parts.join(" · ")})` : "";
  return `Se cargó el último registro de extintor para este RBD${suffix}. Puedes editarlo si fue reemplazado o cambió su vencimiento.`;
}

async function latestInfrastructureDraftForTask(task) {
  if (!task?.rbd || !hasSqlServerApiConfig() || !state.supabaseSession?.access_token || !isNetworkOnline()) {
    return null;
  }

  const params = new URLSearchParams();
  const remoteTaskId = task.supabaseId || (/^[0-9a-f-]{36}$/i.test(String(task.id || "")) ? task.id : "");
  if (remoteTaskId) params.set("excludeTaskId", remoteTaskId);
  const query = params.toString() ? `?${params}` : "";
  const detail = await apiRequest(`/api/establishments/${encodeURIComponent(task.rbd)}/latest-infrastructure${query}`);
  const bySection = remoteRecordsBySection(detail?.itemRows ?? [], detail?.answerRows ?? []);
  const extinguisherRecord = (bySection.infrastructure || [])
    .map((record) => sanitizedInfrastructureDraft(record))
    .find((record) => isExtinguisherElement(record.element) && hasInfrastructureDraftInput(record));
  if (!extinguisherRecord) return null;
  return {
    draft: {
      ...emptyInfrastructureDraft(),
      ...extinguisherRecord,
      evidenceName: "",
      evidencePreview: "",
      evidencePhotos: []
    },
    source: {
      folio: detail?.folio,
      submittedAt: detail?.submittedAt
    }
  };
}

async function applyLatestInfrastructureDefaultsForTask(task = selectedTask()) {
  if (!task?.id || isTaskCompleted(task)) return;
  if (state.infrastructurePrefillLoadedTaskIds?.[task.id]) return;

  const storedProgress = readStoredFormProgress()[task.id];
  const storedDraft = storedProgress?.infrastructureDraft;
  const storedRecords = Array.isArray(storedProgress?.infrastructureRecords) ? storedProgress.infrastructureRecords : [];
  if (
    hasInfrastructureDraftInput(state.infrastructureDraft)
    || hasInfrastructureDraftInput(storedDraft)
    || infrastructureRecordsForTask(task.id).length > 0
    || storedRecords.length > 0
  ) {
    state.infrastructurePrefillLoadedTaskIds = {
      ...state.infrastructurePrefillLoadedTaskIds,
      [task.id]: true
    };
    return;
  }

  try {
    const prefill = await latestInfrastructureDraftForTask(task);
    state.infrastructurePrefillLoadedTaskIds = {
      ...state.infrastructurePrefillLoadedTaskIds,
      [task.id]: true
    };
    if (!prefill) return;
    setStateSilently({
      infrastructureDraft: sanitizedInfrastructureDraft(prefill.draft),
      infrastructurePrefillNotice: latestInfrastructurePrefillNotice(prefill.source),
      infrastructurePrefillLoadedTaskIds: state.infrastructurePrefillLoadedTaskIds
    });
    persistCurrentTaskProgress();
  } catch (error) {
    console.warn("No se pudo precargar infraestructura.", error);
    state.infrastructurePrefillLoadedTaskIds = {
      ...state.infrastructurePrefillLoadedTaskIds,
      [task.id]: true
    };
  }
}

function operationalPrefillNotice(source = {}) {
  const parts = [];
  if (source.folio) parts.push(`Folio ${source.folio}`);
  const date = formatDateLabel(source.submittedAt || source.submitted_at || source.dueDate || source.due_date);
  if (date && date !== "Sin fecha") parts.push(date);
  const suffix = parts.length ? ` (${parts.join(" · ")})` : "";
  return `Se cargaron datos desde la última visita registrada${suffix}. Puedes editar cualquier respuesta si cambió.`;
}

async function latestOperationalSectionsForTask(task) {
  if (!task?.rbd || !hasSqlServerApiConfig() || !state.supabaseSession?.access_token || !isNetworkOnline()) {
    return null;
  }
  const params = new URLSearchParams();
  const remoteTaskId = task.supabaseId || (/^[0-9a-f-]{36}$/i.test(String(task.id || "")) ? task.id : "");
  if (remoteTaskId) params.set("excludeTaskId", remoteTaskId);
  const query = params.toString() ? `?${params}` : "";
  const detail = await apiRequest(`/api/establishments/${encodeURIComponent(task.rbd)}/latest-operational-sections${query}`);
  if (!detail?.submissionId) return null;
  return {
    detail,
    source: {
      folio: detail.folio,
      submittedAt: detail.submittedAt
    }
  };
}

async function applyLatestOperationalDefaultsForTask(task = selectedTask()) {
  if (!task?.id || isTaskCompleted(task)) return;
  if (state.operationalPrefillLoadedTaskIds?.[task.id]) return;

  const progress = readStoredFormProgress()[task.id] || {};
  const canPrefillInfrastructure = !hasInfrastructureDraftInput(state.infrastructureDraft)
    && !hasInfrastructureDraftInput(progress.infrastructureDraft)
    && infrastructureRecordsForTask(task.id).length === 0
    && !(Array.isArray(progress.infrastructureRecords) && progress.infrastructureRecords.length);
  const canPrefillMpa = !hasMpaInput() && !hasDraftInputValue(progress.mpaDraft || {});
  const canPrefillServiceYard = !hasServiceYardInput() && !hasDraftInputValue(progress.serviceYardDraft || {});
  const canPrefillRbdCheckers = !hasRbdCheckersDraftInput(state.rbdCheckersDraft) && !hasRbdCheckersDraftInput(progress.rbdCheckersDraft || {});

  if (!canPrefillInfrastructure && !canPrefillMpa && !canPrefillServiceYard && !canPrefillRbdCheckers) {
    state.operationalPrefillLoadedTaskIds = {
      ...state.operationalPrefillLoadedTaskIds,
      [task.id]: true
    };
    return;
  }

  try {
    const prefill = await latestOperationalSectionsForTask(task);
    state.operationalPrefillLoadedTaskIds = {
      ...state.operationalPrefillLoadedTaskIds,
      [task.id]: true
    };
    if (!prefill) return;

    const nextState = {
      operationalPrefillLoadedTaskIds: state.operationalPrefillLoadedTaskIds
    };
    const notice = operationalPrefillNotice(prefill.source);
    const bySection = remoteRecordsBySection(prefill.detail.itemRows || [], prefill.detail.answerRows || []);
    const singleRows = prefill.detail.singleAnswerRows || [];

    if (canPrefillInfrastructure) {
      const infrastructureRecords = (bySection.infrastructure || [])
        .map((record) => sanitizedInfrastructureDraft(record))
        .filter((record) => hasInfrastructureDraftInput(record))
        .map((record) => ({
          ...record,
          evidenceName: "",
          evidencePreview: "",
          evidencePhotos: []
        }));
      if (infrastructureRecords.length) {
        nextState.infrastructureRecordsByTask = {
          ...state.infrastructureRecordsByTask,
          [task.id]: infrastructureRecords
        };
        nextState.infrastructurePrefillNotice = notice;
        nextState.infrastructurePrefillLoadedTaskIds = {
          ...state.infrastructurePrefillLoadedTaskIds,
          [task.id]: true
        };
      }
    }

    if (canPrefillMpa) {
      const mpaDraft = {
        ...emptyMpaDraft(),
        ...remoteSingleSectionDraft(singleRows, "mpa")
      };
      if (hasDraftInputValue(mpaDraft)) nextState.mpaDraft = mpaDraft;
    }

    if (canPrefillServiceYard) {
      const serviceYardDraft = {
        ...emptyServiceYardDraft(),
        ...remoteSingleSectionDraft(singleRows, "service-yard")
      };
      if (hasDraftInputValue(serviceYardDraft)) nextState.serviceYardDraft = serviceYardDraft;
    }

    if (canPrefillRbdCheckers) {
      const rbdCheckersDraft = sanitizedRbdCheckersDraft(remoteSingleSectionDraft(singleRows, "rbd-checkers"));
      if (hasRbdCheckersDraftInput(rbdCheckersDraft)) {
        nextState.rbdCheckersDraft = rbdCheckersDraft;
        nextState.rbdCheckersPrefillNotice = notice;
        nextState.rbdCheckersPrefillLoadedTaskIds = {
          ...state.rbdCheckersPrefillLoadedTaskIds,
          [task.id]: true
        };
      }
    }

    if (Object.keys(nextState).length > 1) {
      setStateSilently(nextState);
      persistCurrentTaskProgress();
    }
  } catch (error) {
    console.warn("No se pudieron precargar las secciones operativas.", error);
    state.operationalPrefillLoadedTaskIds = {
      ...state.operationalPrefillLoadedTaskIds,
      [task.id]: true
    };
  }
}

function requiredFormMessages(task = selectedTask()) {
  const sections = formSectionsForTask(task);
  const messages = [];
  const recordSections = new Set(["heat", "electricity", "cold", "vectors", "water", "infrastructure"]);
  const recordDraftState = {
    heat: {
      draft: currentHeatDraftFromForm(),
      touched: (draft) => hasRecordDraftInput(draft),
      complete: (draft) => isHeatDraftComplete(draft),
      validate: (draft) => validateHeatRecordDraft(draft)
    },
    electricity: {
      draft: currentElectricityDraftFromForm(),
      touched: (draft) => hasRecordDraftInput(draft),
      complete: (draft) => isElectricityDraftComplete(draft),
      validate: (draft) => validateElectricityRecordDraft(draft)
    },
    cold: {
      draft: currentColdDraftFromForm(),
      touched: (draft) => hasRecordDraftInput(draft),
      complete: (draft) => isSimpleRecordDraftComplete(draft),
      validate: (draft) => validateSimpleRecordDraft(draft, "cold")
    },
    vectors: {
      draft: currentVectorsDraftFromForm(),
      touched: (draft) => hasSimpleRecordDraftInput(draft),
      complete: (draft) => isSimpleRecordDraftComplete(draft),
      validate: (draft) => validateSimpleRecordDraft(draft, "vectors")
    },
    water: {
      draft: currentWaterDraftFromForm(),
      touched: (draft) => hasRecordDraftInput(draft),
      complete: (draft) => isSimpleRecordDraftComplete(draft),
      validate: (draft) => validateSimpleRecordDraft(draft, "water")
    },
    infrastructure: {
      draft: currentInfrastructureDraftFromForm(),
      touched: (draft) => hasRecordDraftInput(draft),
      complete: (draft) => isInfrastructureDraftComplete(draft),
      validate: (draft) => validateSimpleRecordDraft(draft, "infrastructure")
    }
  };
  const touchedSection = {
    "pae-manager": hasPaeManagerInput,
    mpa: hasMpaInput,
    "service-yard": hasServiceYardInput,
    "rbd-checkers": hasRbdCheckersInput
  };

  sections.forEach((section) => {
    const hasMinimum = Boolean(section.minimum);
    const touched = touchedSection[section.id]?.() ?? false;
    const mustComplete = hasMinimum || touched;
    if (!mustComplete) return;
    const requiredDone = hasMinimum ? section.minimum : 1;
    const missingCount = Math.max(0, requiredDone - (section.done ?? 0));
    if (!missingCount) return;

    if (recordSections.has(section.id)) {
      messages.push(`Falta${missingCount === 1 ? "" : "n"} ${missingCount} ${pluralizeElement(missingCount)} de ${section.title}.`);
      return;
    }

    if (section.id === "pae-manager") {
      messages.push(`Encargado PAE está incompleto: falta ${missingPaeManagerDetails().join(", ")}.`);
      return;
    }

    if (section.id === "mpa") {
      messages.push(`MPA está incompleto: falta ${missingMpaDetails().join(", ")}.`);
      return;
    }

    if (section.id === "service-yard") {
      messages.push("Patio Servicio está incompleto: falta responder si es exclusivo para el programa.");
      return;
    }

    if (section.id === "rbd-checkers") {
      messages.push(`Verificadores RBD está incompleto: falta ${missingRbdCheckersDetails().join(", ")}.`);
      return;
    }

    messages.push(`${section.title} es obligatorio y aún no está completo.`);
  });

  sections.forEach((section) => {
    const recordDraft = recordDraftState[section.id];
    if (!recordDraft) return;
    const draft = recordDraft.draft;
    if (!recordDraft.touched(draft) || recordDraft.complete(draft)) return;
    const validation = recordDraft.validate(draft);
    messages.push(`${section.title} tiene una respuesta incompleta: ${validation.message}`);
  });

  return messages;
}

function startTechnicianSignaturePreview() {
  consolidateCompleteRecordDraftsBeforeSubmit();
  const messages = requiredFormMessages();

  if (messages.length) {
    setState({ route: "form", formValidationMessages: messages });
    showErrorToast("Formulario incompleto", messages);
    return;
  }

  setState({ route: "technician-signature-preview", technicianSignatureError: "", formValidationMessages: [] });
}

function registeredItemsList(records, section) {
  return `
    <section class="registered-list">
      <h2>Elementos registrados</h2>
      ${records.map((record, index) => {
        const title = record.element || record.articleName || "Registro";
        const site = record.site === "Otro" ? record.otherSite : record.site;
        const meta = [
          record.articleId ? `Código ${record.articleId}` : "",
          site,
          record.quantity,
          record.action,
          record.observation
        ].filter(Boolean).join(" · ");

        return `
          <article class="registered-item">
            <div class="registered-item-copy">
              <strong>${index + 1}. ${escapeHtml(title)}</strong>
              <span>${escapeHtml(meta)}</span>
              <div class="registered-actions">
                <button type="button" data-action="edit-record" data-section="${section}" data-index="${index}">Editar</button>
                <button type="button" data-action="delete-record" data-section="${section}" data-index="${index}">Eliminar</button>
              </div>
            </div>
            ${evidencePhotoGrid(evidencePhotosForRecord(record))}
          </article>
        `;
      }).join("")}
    </section>
  `;
}

function normalizeSearch(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeAttribute(value) {
  return String(value).replace(/"/g, "&quot;");
}

function filterEstablishments(items, query) {
  const normalizedQuery = normalizeSearch(query).trim();
  if (!normalizedQuery) return items;

  return items.filter((item) => {
    const searchable = [
      item.rbd,
      item.name,
      item.comuna,
      item.address
    ].map(normalizeSearch).join(" ");
    return searchable.includes(normalizedQuery);
  });
}

function establishmentLabel(item) {
  if (!item) return "";
  return `RBD ${item.rbd} · ${item.name} · ${item.comuna}`;
}

function establishmentSearchResults(items, action = "select-establishment") {
  if (!items.length) {
    return `<div class="combo-empty">Sin resultados en esta sucursal.</div>`;
  }

  return items.slice(0, 8).map((item) => `
    <button class="combo-option" type="button" data-action="${escapeAttribute(action)}" data-rbd="${escapeAttribute(item.rbd)}">
      <strong>RBD ${item.rbd}</strong>
      <span>${item.name}</span>
      <small>${item.comuna}${item.address ? ` · ${item.address}` : ""}</small>
    </button>
  `).join("");
}

function assignmentSectionMatrix() {
  return `
    <section class="assignment-section-matrix">
      <div class="assignment-section-head">
        <strong>Secciones del formulario</strong>
        <span>Marca grupos adicionales como obligatorios o críticos para esta tarea.</span>
      </div>
      <div class="assignment-section-row header">
        <span>Grupo</span>
        <span>Oblig.</span>
        <span>Crít.</span>
        <span>Mín.</span>
      </div>
      ${formSectionDefinitions.map((section) => {
        const requiredLocked = Boolean(section.baseRequired);
        const criticalLocked = Boolean(section.baseCritical);
        const requiredChecked = requiredLocked || state.assignRequiredSections.includes(section.id);
        const criticalChecked = criticalLocked || state.assignCriticalSections.includes(section.id);
        const minimumValue = state.assignSectionMinimums[section.id] ?? section.minimum ?? (requiredChecked ? 1 : "");
        const fixedMinimumLabel = section.minimum ? `Fijo: ${section.minimum}` : "";

        return `
          <div class="assignment-section-row">
            <span class="assignment-section-name">${icons[section.icon]} ${section.title}</span>
            <span><input type="checkbox" name="requiredSections" value="${section.id}" data-role="assign-section-toggle" ${requiredChecked ? "checked" : ""} ${requiredLocked ? "disabled" : ""} /></span>
            <span><input type="checkbox" name="criticalSections" value="${section.id}" data-role="assign-section-toggle" ${criticalChecked ? "checked" : ""} ${criticalLocked ? "disabled" : ""} /></span>
            <span>${section.minimum ? `<em class="fixed-minimum">${fixedMinimumLabel}</em>` : `<input class="section-minimum-input" type="number" min="1" step="1" name="sectionMinimum:${section.id}" value="${escapeAttribute(minimumValue)}" data-role="assign-section-minimum" ${requiredChecked ? "" : "disabled"} />`}</span>
          </div>
        `;
      }).join("")}
    </section>
  `;
}

function formatDateLabel(value) {
  const normalized = normalizeIsoDate(value);
  if (!normalized) return "Sin fecha";
  const [year, month, day] = normalized.split("-").map(Number);
  if (!year || !month || !day || year < 1000) return "Sin fecha";

  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre"
  ];

  return `${String(day).padStart(2, "0")} ${months[month - 1]} ${year}`;
}

function formatDateTimeLabel(value) {
  if (!value) return "Sin registro";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Sin registro";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date).replace(",", "");
}

function todayDateLabel() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return formatDateLabel(`${year}-${month}-${day}`);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnName(index) {
  let name = "";
  let value = index;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function xmlCell(rowIndex, colIndex, value) {
  const ref = `${columnName(colIndex)}${rowIndex}`;
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value ?? "")}</t></is></c>`;
}

function worksheetXml(rows, validations = "") {
  const sheetRows = rows.map((row, rowIndex) => `
    <row r="${rowIndex + 1}">
      ${row.map((value, colIndex) => xmlCell(rowIndex + 1, colIndex + 1, value)).join("")}
    </row>
  `).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
  ${validations}
</worksheet>`;
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

function writeUint16(bytes, value) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(bytes, value) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function createStoredZip(files) {
  const encoder = new TextEncoder();
  const output = [];
  const centralDirectory = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const checksum = crc32(contentBytes);

    writeUint32(output, 0x04034b50);
    writeUint16(output, 20);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint32(output, checksum);
    writeUint32(output, contentBytes.length);
    writeUint32(output, contentBytes.length);
    writeUint16(output, nameBytes.length);
    writeUint16(output, 0);
    output.push(...nameBytes, ...contentBytes);

    const central = [];
    writeUint32(central, 0x02014b50);
    writeUint16(central, 20);
    writeUint16(central, 20);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, checksum);
    writeUint32(central, contentBytes.length);
    writeUint32(central, contentBytes.length);
    writeUint16(central, nameBytes.length);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, 0);
    writeUint32(central, offset);
    central.push(...nameBytes);
    centralDirectory.push(...central);
    offset = output.length;
  });

  const centralOffset = output.length;
  output.push(...centralDirectory);
  writeUint32(output, 0x06054b50);
  writeUint16(output, 0);
  writeUint16(output, 0);
  writeUint16(output, files.length);
  writeUint16(output, files.length);
  writeUint32(output, centralDirectory.length);
  writeUint32(output, centralOffset);
  writeUint16(output, 0);

  return new Blob([new Uint8Array(output)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isNativeApp() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

async function saveNativeGeneratedFile(blob, filename) {
  const filesystem = window.Capacitor?.Plugins?.Filesystem;
  if (!filesystem) {
    downloadBlob(blob, filename);
    return { filename, location: "Descargas" };
  }

  const base64 = await blobToBase64(blob);
  const safeFilename = filename.replace(/[\\/:*?"<>|]/g, "-");
  const path = `Datacora/${safeFilename}`;
  const writeFile = async (directory, location) => {
    await filesystem.writeFile({
      path,
      data: base64,
      directory,
      recursive: true
    });
    const uriResult = await filesystem.getUri({ path, directory });
    return { filename: safeFilename, location, uri: uriResult.uri };
  };

  try {
    return await writeFile("DOCUMENTS", "Documentos/Datacora");
  } catch (error) {
    return await writeFile("DATA", "almacenamiento interno de Datacora");
  }
}

async function downloadGeneratedFile(blob, filename, mimeType) {
  if (!isNativeApp()) {
    downloadBlob(blob, filename);
    return;
  }

  try {
    const savedFile = await saveNativeGeneratedFile(blob, filename, mimeType);
    setState({ lastGeneratedDownload: { ...savedFile, mimeType } });
    showSuccessToast("plantilla guardada", `${savedFile.filename} quedó en ${savedFile.location}.`, {
      action: { name: "open-generated-download", label: "Abrir archivo" },
      durationMs: 9000
    });
  } catch (error) {
    showErrorToast("No se pudo guardar la plantilla", error.message || "Intenta nuevamente desde el dispositivo.");
  }
}

async function openLastGeneratedDownload() {
  const fileOpener = window.Capacitor?.Plugins?.FileOpener;
  const file = state.lastGeneratedDownload;
  if (!fileOpener || !file?.uri) {
    showErrorToast("No se pudo abrir el archivo", "La plantilla quedó guardada, pero este dispositivo no permite abrirla desde la app.");
    return;
  }

  try {
    await fileOpener.open({
      filePath: file.uri,
      contentType: file.mimeType,
      openWithDefault: true
    });
    closeSuccessToast();
  } catch (error) {
    showErrorToast("No se pudo abrir el archivo", error.message || "Instala Excel, Google Sheets u otra app compatible.");
  }
}

function downloadBulkTemplate() {
  const actor = loggedUser();
  const technicians = assignableTechnicians(actor).map((user) => user.nombre);
  const taskTypes = Object.values(formBlueprints).map((blueprint) => blueprint.taskType);
  const priorities = ["media", "alta", "baja"];
  const dataRows = [
    ["Fecha planificada", "Nombre Técnico", "RBD", "Tipo Visita", "Prioridad"],
    ["", "", "", "", "media"],
    ["", "", "", "", "media"]
  ];
  const listRows = [["Técnicos", "Tipos de visita", "Prioridades"]];
  const listLength = Math.max(technicians.length, taskTypes.length, priorities.length);
  for (let index = 0; index < listLength; index += 1) listRows.push([technicians[index] ?? "", taskTypes[index] ?? "", priorities[index] ?? ""]);

  const technicianEndRow = Math.max(2, technicians.length + 1);
  const typeEndRow = Math.max(2, taskTypes.length + 1);
  const priorityEndRow = Math.max(2, priorities.length + 1);
  const validations = `
    <dataValidations count="3">
      <dataValidation type="list" allowBlank="1" sqref="B2:B200"><formula1>Listas!$A$2:$A$${technicianEndRow}</formula1></dataValidation>
      <dataValidation type="list" allowBlank="1" sqref="D2:D200"><formula1>Listas!$B$2:$B$${typeEndRow}</formula1></dataValidation>
      <dataValidation type="list" allowBlank="1" sqref="E2:E200"><formula1>Listas!$C$2:$C$${priorityEndRow}</formula1></dataValidation>
    </dataValidations>
  `;
  const files = [
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Tareas" sheetId="1" r:id="rId1"/><sheet name="Listas" sheetId="2" state="hidden" r:id="rId2"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>` },
    { name: "xl/worksheets/sheet1.xml", content: worksheetXml(dataRows, validations) },
    { name: "xl/worksheets/sheet2.xml", content: worksheetXml(listRows) }
  ];

  downloadGeneratedFile(
    createStoredZip(files),
    `plantilla-carga-masiva-${statusClass(branchScopeLabel(actor)).slice(0, 32)}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function findEndOfCentralDirectory(bytes) {
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (bytes[index] === 0x50 && bytes[index + 1] === 0x4b && bytes[index + 2] === 0x05 && bytes[index + 3] === 0x06) return index;
  }
  return -1;
}

async function inflateRaw(bytes) {
  if (!("DecompressionStream" in window)) throw new Error("El navegador no permite leer archivos XLSX comprimidos.");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzipXlsxEntries(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const endOffset = findEndOfCentralDirectory(bytes);
  if (endOffset < 0) throw new Error("El archivo no parece ser un XLSX válido.");

  const totalEntries = view.getUint16(endOffset + 10, true);
  let centralOffset = view.getUint32(endOffset + 16, true);
  const decoder = new TextDecoder();
  const entries = {};

  for (let index = 0; index < totalEntries; index += 1) {
    if (view.getUint32(centralOffset, true) !== 0x02014b50) throw new Error("No se pudo leer el índice del XLSX.");
    const method = view.getUint16(centralOffset + 10, true);
    const compressedSize = view.getUint32(centralOffset + 20, true);
    const nameLength = view.getUint16(centralOffset + 28, true);
    const extraLength = view.getUint16(centralOffset + 30, true);
    const commentLength = view.getUint16(centralOffset + 32, true);
    const localOffset = view.getUint32(centralOffset + 42, true);
    const name = decoder.decode(bytes.slice(centralOffset + 46, centralOffset + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const content = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null;
    if (content) entries[name] = decoder.decode(content);
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function textFromCell(cell, sharedStrings) {
  const type = cell.getAttribute("t");
  if (type === "inlineStr") return cell.getElementsByTagName("t")[0]?.textContent ?? "";
  const raw = cell.getElementsByTagName("v")[0]?.textContent ?? "";
  if (type === "s") return sharedStrings[Number(raw)] ?? "";
  return raw;
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(doc.getElementsByTagName("si")).map((item) => Array.from(item.getElementsByTagName("t")).map((text) => text.textContent ?? "").join(""));
}

function parseWorksheetRows(xml, sharedStrings) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(doc.getElementsByTagName("row")).map((row) => {
    const values = [];
    Array.from(row.getElementsByTagName("c")).forEach((cell) => {
      const ref = cell.getAttribute("r") ?? "";
      const letters = ref.replace(/[0-9]/g, "");
      const index = letters.split("").reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
      values[index] = textFromCell(cell, sharedStrings).trim();
    });
    return values;
  });
}

function excelSerialToIso(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial <= 0) return "";
  const base = Date.UTC(1899, 11, 30);
  const date = new Date(base + serial * 86400000);
  return date.toISOString().slice(0, 10);
}

function normalizeBulkDate(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(text)) {
    const [day, month, year] = text.split(/[/-]/).map((part) => part.padStart(2, "0"));
    return `${year}-${month}-${day}`;
  }
  return excelSerialToIso(text);
}

function blueprintKeyForTaskType(type) {
  const normalizedType = normalizeSearch(type);
  const aliases = {
    "plan de mantencion": "maintenance_plan",
    "plan mantencion": "maintenance_plan",
    "plan preventivo": "maintenance_plan",
    "plan preventivo mantencion": "maintenance_plan",
    "seremi": "seremi"
  };
  return aliases[normalizedType]
    || Object.keys(formBlueprints).find((key) => normalizeSearch(formBlueprints[key].taskType) === normalizedType)
    || "";
}

function buildTaskFromBulkRow(row, index, actor) {
  const [dateValue, technicianName, rbdValue, typeValue] = row;
  const rowNumber = index;
  const errors = [];
  const technicianMatches = assignableTechnicians(actor).filter((user) => normalizeSearch(user.nombre) === normalizeSearch(technicianName));
  const technician = technicianMatches[0];
  const rbd = String(rbdValue ?? "").trim();
  const establishment = establishments.find((item) => item.rbd === rbd);
  const blueprintKey = blueprintKeyForTaskType(typeValue);
  const isoDate = normalizeBulkDate(dateValue);

  if (!isoDate) errors.push(`Fila ${rowNumber}: fecha visita inválida.`);
  if (!technician) errors.push(`Fila ${rowNumber}: técnico no corresponde a ${branchScopeLabel(actor)}.`);
  if (technicianMatches.length > 1) errors.push(`Fila ${rowNumber}: nombre de técnico duplicado en ${branchScopeLabel(actor)}.`);
  if (!establishment) errors.push(`Fila ${rowNumber}: RBD ${rbd || "(vacío)"} no existe en la base.`);
  if (establishment && !userHasBranch(actor, establishment.branch)) errors.push(`Fila ${rowNumber}: RBD ${rbd} pertenece a ${establishment.branch}, fuera de ${branchScopeLabel(actor)}.`);
  if (technician && establishment && establishment.branch !== technician.sucursal) errors.push(`Fila ${rowNumber}: técnico y RBD no pertenecen a la misma zona.`);
  if (!blueprintKey) errors.push(`Fila ${rowNumber}: tipo visita inválido.`);

  if (errors.length) return { errors };

  const type = formBlueprints[blueprintKey].taskType;
  const priority = type === "Emergencia" ? "Alta" : "Media";
  return {
    task: {
      id: `task-bulk-${Date.now()}-${index}`,
      type,
      rbd: establishment.rbd,
      establishment: establishment.name,
      establishmentMeta: {
        comuna: establishment.comuna,
        tipoInstitucion: establishment.institutionType,
        direccion: establishment.address,
        sucursal: establishment.branch
      },
      description: `Tarea cargada masivamente por ${actor.nombre}.`,
      assignedBy: actor.nombre,
      assignedTo: technician.usuario,
      assignedAt: todayDateLabel(),
      dueAt: formatDateLabel(isoDate),
      dueDateIso: isoDate,
      status: priority === "Alta" ? "Urgente" : "Pendiente",
      priority,
      syncStatus: "synced",
      form: { blueprintKey, requiredSections: [], criticalSections: [], sectionMinimums: {} }
    },
    technician,
    establishment,
    errors: []
  };
}

async function importBulkTasks(file) {
  const actor = loggedUser();
  if (!file || !canAssignTasks(actor)) return;

  try {
    const entries = await unzipXlsxEntries(file);
    const sheetXml = entries["xl/worksheets/sheet1.xml"];
    if (!sheetXml) throw new Error("No se encontró la hoja Tareas en el archivo.");

    const rows = parseWorksheetRows(sheetXml, parseSharedStrings(entries["xl/sharedStrings.xml"]));
    const dataRows = rows.slice(1).map((row, index) => ({ row, index: index + 2 })).filter(({ row }) => row.some(Boolean));
    if (!dataRows.length) throw new Error("La planilla no contiene filas para cargar.");

    const results = dataRows.map(({ row, index }) => buildTaskFromBulkRow(row, index, actor));
    const errors = results.flatMap((result) => result.errors);
    if (errors.length) {
      setState({ bulkImportErrors: errors, bulkImportSummary: "" });
      showErrorToast("Carga masiva rechazada", errors.slice(0, 4));
      return;
    }

    const newTasks = results.map((result) => result.task);

    if (hasSupabaseConfig()) {
      if (!state.supabaseSession?.access_token) {
        throw new Error("Cierra sesión e ingresa nuevamente antes de cargar tareas masivamente.");
      }

      for (const result of results) {
        const supabaseId = await createSupabaseTaskFromAssignment(result.task, result.technician, result.establishment, {
          requiredSections: [],
          criticalSections: [],
          sectionMinimums: {}
        });
        result.task.id = supabaseId;
        result.task.supabaseId = supabaseId;
      }
    }

    tasks.unshift(...newTasks);
    setState({ bulkImportErrors: [], bulkImportSummary: `${newTasks.length} tarea(s) cargada(s) correctamente para ${branchScopeLabel(actor)}.` });
    showSuccessToast("carga masiva completada", `${newTasks.length} tarea(s) creadas correctamente.`);
  } catch (error) {
    const message = error?.message ?? "No se pudo leer la planilla.";
    setState({ bulkImportErrors: [message], bulkImportSummary: "" });
    showErrorToast("Carga masiva rechazada", message);
  }
}

function currentAssignFormState() {
  const form = rootEl.querySelector('[data-role="assign-task-form"]');
  if (!form) return {};
  const formData = new FormData(form);
  const sectionMinimums = {};

  formSectionDefinitions.forEach((section) => {
    const value = Number(formData.get(`sectionMinimum:${section.id}`));
    if (Number.isFinite(value) && value > 0) sectionMinimums[section.id] = Math.trunc(value);
  });

  return {
    assignBranch: String(formData.get("branch") ?? state.assignBranch),
    assignTechnician: String(formData.get("technician") ?? state.assignTechnician),
    assignSelectedRbd: String(formData.get("establishmentRbd") ?? state.assignSelectedRbd),
    assignType: String(formData.get("type") ?? state.assignType),
    assignPriority: String(formData.get("priority") ?? state.assignPriority),
    assignDueAt: String(formData.get("dueAt") ?? state.assignDueAt),
    assignDescription: String(formData.get("description") ?? state.assignDescription),
    assignRequiredSections: formData.getAll("requiredSections").map(String),
    assignCriticalSections: formData.getAll("criticalSections").map(String),
    assignSectionMinimums: sectionMinimums
  };
}

function currentUserCreateDraft() {
  const form = rootEl.querySelector('[data-role="create-user-form"]');
  if (!form) return state.userCreateDraft;
  const formData = new FormData(form);
  return {
    nombre: String(formData.get("nombre") ?? ""),
    usuario: String(formData.get("usuario") ?? ""),
    rut: formatRut(String(formData.get("rut") ?? "")),
    grupo: String(formData.get("grupo") ?? "Mantenimiento"),
    cargo: String(formData.get("cargo") ?? ""),
    sucursales: normalizeSelectedBranches(formData.getAll("sucursales"), ["Santiago"])
  };
}

function resetUserCreateDraft() {
  return {
    nombre: "",
    usuario: "",
    rut: "",
    grupo: "Mantenimiento",
    cargo: allowedRoles[0] || "",
    sucursales: ["Santiago"]
  };
}

function loginScreen() {
  return `
    <main class="login-screen">
      <section class="login-hero">
        <div class="brand-mark">${icons.logo}</div>
        <h1>Datácora</h1>
        <p>Digitaliza tu mantenimiento en terreno.</p>
      </section>
      <section class="login-panel">
        ${state.loginError ? `<div class="login-error">${state.loginError}</div>` : ""}
        ${state.loginMessage ? `<div class="login-message">${state.loginMessage}</div>` : ""}
        <label class="field">
          <span>Correo electrónico</span>
          <div class="field-control">${icons.mail}<input name="email" type="email" placeholder="correo@soser.cl" autocomplete="username" /></div>
        </label>
        <label class="field">
          <span>Contraseña</span>
          <div class="field-control">${icons.lock}<input name="password" type="password" placeholder="Ingresa tu contraseña" autocomplete="current-password" /></div>
        </label>
        ${primaryButton("Iniciar sesión", "login")}
      </section>
    </main>
  `;
}

function taskCard(task) {
  const dueDate = taskDueDateIso(task);
  const dueLabel = dueDate ? formatDateLabel(dueDate) : (task.dueAt || "Sin fecha");
  const isOverdue = taskIsOverdue(task);
  const criticality = isOverdue
    ? overdueCriticality(task)
    : { key: "", label: "", days: 0 };
  const overdueClass = criticality.key ? ` technician-overdue-${criticality.key}` : "";

  return `
    <article class="task-card${overdueClass}" data-action="task-detail" data-task-id="${task.id}">
      <div class="task-card-head">
        ${taskTypeLabel(task.type)}
        ${taskStatusPill(task)}
      </div>
      <h2>RBD ${task.rbd}</h2>
      <p>${task.establishment}</p>

      ${criticality.key ? `
        <div class="technician-overdue-indicator ${criticality.key}">
          ${icons.alert}
          <span>
            <strong>${escapeHtml(criticality.label)}</strong>
            · ${criticality.days} día${criticality.days === 1 ? "" : "s"} de atraso
          </span>
        </div>
      ` : ""}

      <div class="task-meta">
        <span>${icons.calendar} Fecha planificada: ${dueLabel}</span>
        <button class="card-arrow" aria-label="Ver detalle">${icons.arrow}</button>
      </div>
    </article>
  `;
}

function currentIncidentDraft() {
  const form = rootEl.querySelector('[data-role="incident-form"]');
  if (!form) return state.incidentDraft;
  const formData = new FormData(form);
  return {
    branch: String(formData.get("branch") ?? state.incidentDraft.branch),
    rbdSearch: state.incidentDraft.rbdSearch,
    selectedRbd: String(formData.get("establishmentRbd") ?? state.incidentDraft.selectedRbd),
    severity: String(formData.get("severity") ?? state.incidentDraft.severity),
    type: state.incidentDraft.type ?? "Emergencia (inmediata)",
    title: String(formData.get("title") ?? state.incidentDraft.title ?? "").trim(),
    description: String(formData.get("description") ?? state.incidentDraft.description ?? "").trim(),
    photos: state.incidentDraft.photos ?? []
  };
}

function emptyIncidentDraft(user = loggedUser()) {
  return {
    branch: userBranches(user)[0] ?? "Santiago",
    rbdSearch: "",
    selectedRbd: "",
    severity: "Alta",
    type: "Emergencia (inmediata)",
    title: "",
    description: "",
    photos: []
  };
}

function tasksScreen() {
  const filters = ["Pendientes", "Atrasadas", "Emergencias", "Completadas"];
  const primaryFilters = ["Pendientes", "Atrasadas", "Emergencias"];
  const currentFilter = filters.includes(state.filter) ? state.filter : "Pendientes";
  const user = loggedUser();

  const zoneEstablishments = establishmentsForUser(user, { includeCasaMatriz: false });
  const selectedRbdEstablishment = zoneEstablishments.find(
    (item) => String(item.rbd) === String(state.technicianSelectedRbd)
  );
  const rbdSearchValue = state.technicianRbdSearch || establishmentLabel(selectedRbdEstablishment);
  const filteredRbdEstablishments = filterEstablishments(zoneEstablishments, state.technicianRbdSearch);
  const showRbdComboResults = !state.technicianSelectedRbd
    && Boolean(state.technicianRbdSearch)
    && filteredRbdEstablishments.length > 0;

  const assignedTasks = isAdmin(user)
    ? tasks
    : tasks.filter((task) => task.assignedTo === user.usuario);
  const activeEmergencyTasks = assignedTasks.filter((task) => !taskIsCompleted(task) && taskIsEmergency(task));

  const visibleTasks = sortTasksByPlannedDate(assignedTasks
    .filter((task) => {
      if (currentFilter === "Pendientes") return !taskIsCompleted(task) && !taskIsEmergency(task) && !taskIsOverdue(task);
      if (currentFilter === "Atrasadas") return !taskIsEmergency(task) && taskIsOverdue(task);
      if (currentFilter === "Emergencias") return !taskIsCompleted(task) && taskIsEmergency(task);
      if (currentFilter === "Completadas") return taskIsCompleted(task);
      return false;
    })
    .filter((task) => {
      if (!state.technicianSelectedRbd) return true;
      return String(task.rbd) === String(state.technicianSelectedRbd);
    })
    .filter((task) => {
      if (currentFilter !== "Atrasadas" || !state.technicianOverdueCriticality) return true;
      return overdueCriticality(task).key === state.technicianOverdueCriticality;
    }));

  return `
    ${topBar("Mis tareas")}
    <main class="screen with-nav">
      <div class="technician-completed-access">
        <button
          type="button"
          class="${currentFilter === "Completadas" ? "active" : ""}"
          data-action="filter"
          data-filter="Completadas">
          ${icons.checkSquare}
          <span>${currentFilter === "Completadas" ? "Viendo completadas" : "Ver tareas completadas"}</span>
        </button>
      </div>

      ${activeEmergencyTasks.length ? `
        <button class="technician-emergency-alert" type="button" data-action="filter" data-filter="Emergencias">
          <span class="technician-emergency-icon">${icons.alert}</span>
          <span>
            <strong>${activeEmergencyTasks.length} emergencia${activeEmergencyTasks.length === 1 ? "" : "s"} activa${activeEmergencyTasks.length === 1 ? "" : "s"}</strong>
            <small>Revisa el detalle de tus visitas de emergencia.</small>
          </span>
          ${icons.arrow}
        </button>
      ` : ""}

      <div class="segmented">
        ${primaryFilters.map((filter) => `
          <button
            class="${currentFilter === filter ? "active" : ""}"
            data-action="filter"
            data-filter="${filter}">
            ${filter}
          </button>
        `).join("")}
      </div>

      ${currentFilter === "Atrasadas" ? `
        <section class="technician-overdue-filters">
          <button
            type="button"
            class="technician-overdue-filter low ${state.technicianOverdueCriticality === "low" ? "active" : ""}"
            data-action="technician-overdue-filter"
            data-criticality="low">
            Atraso Bajo (1-3 días)
          </button>
          <button
            type="button"
            class="technician-overdue-filter medium ${state.technicianOverdueCriticality === "medium" ? "active" : ""}"
            data-action="technician-overdue-filter"
            data-criticality="medium">
            Atraso Medio (4-7 días)
          </button>
          <button
            type="button"
            class="technician-overdue-filter critical ${state.technicianOverdueCriticality === "critical" ? "active" : ""}"
            data-action="technician-overdue-filter"
            data-criticality="critical">
            Atraso Crítico (+7 días)
          </button>
        </section>
      ` : ""}

      <section class="task-search-card technician-task-filters">
        <label class="field compact-field searchable-combo">
          <span>Filtrar por RBD</span>
          <div class="field-control">
            ${icons.location}
            <input
              type="search"
              data-role="technician-rbd-search"
              value="${escapeAttribute(rbdSearchValue)}"
              placeholder="Escribe RBD o nombre del establecimiento..."
              autocomplete="off" />
            ${state.technicianSelectedRbd ? `
              <button
                class="combo-clear-button"
                type="button"
                data-action="clear-technician-rbd-filter"
                aria-label="Quitar filtro RBD">×</button>
            ` : ""}
          </div>

          ${showRbdComboResults ? `
            <div class="combo-results technician-rbd-combo">
              ${establishmentSearchResults(filteredRbdEstablishments, "select-technician-rbd")}
            </div>
          ` : ""}
        </label>

        ${selectedRbdEstablishment ? `
          <article class="technician-rbd-selected">
            <span>${icons.branch}</span>
            <div>
              <strong>RBD ${escapeHtml(selectedRbdEstablishment.rbd)} · ${escapeHtml(selectedRbdEstablishment.name)}</strong>
              <small>${escapeHtml(selectedRbdEstablishment.comuna || "")}</small>
            </div>
          </article>
        ` : `
          <div class="technician-rbd-scope">
            ${icons.branch}
            <span>${zoneEstablishments.length} RBD disponibles en ${escapeHtml(branchScopeLabel(user))}</span>
          </div>
        `}
      </section>

      <style>
        .technician-task-filters{overflow:visible}
        .technician-task-filters .searchable-combo{position:relative}
        .technician-rbd-combo{z-index:40}
        .combo-clear-button{
          border:0;
          background:transparent;
          color:#647782;
          font-size:22px;
          line-height:1;
          padding:0 8px;
          cursor:pointer;
        }
        .technician-rbd-selected{
          display:flex;
          align-items:center;
          gap:10px;
          margin-top:10px;
          padding:10px 12px;
          border-radius:12px;
          background:#f2f8f5;
          border:1px solid #d7e9e0;
        }
        .technician-rbd-selected>span{
          width:24px;
          height:24px;
          display:grid;
          place-items:center;
          color:#0b875b;
        }
        .technician-rbd-selected>div{
          min-width:0;
          display:flex;
          flex-direction:column;
          gap:2px;
        }
        .technician-rbd-selected strong{
          font-size:12px;
          color:#17342b;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .technician-rbd-selected small{
          font-size:11px;
          color:#6d7d76;
        }
        .technician-rbd-scope{
          display:flex;
          align-items:center;
          gap:8px;
          margin:8px 0 12px;
          font-size:11px;
          color:#687a72;
        }
        .technician-rbd-scope>span:first-child{
          width:20px;
          height:20px;
        }

        .technician-overdue-filters{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:8px;
          margin:10px 0 12px;
        }
        .technician-overdue-filter{
          min-height:42px;
          border-radius:12px;
          border:1px solid #d8dee2;
          background:#fff;
          color:#55656f;
          font-size:11px;
          font-weight:700;
          padding:8px 6px;
        }
        .technician-overdue-filter.low.active{
          background:#fff8df;
          border-color:#e2bd43;
          color:#745b00;
        }
        .technician-overdue-filter.medium.active{
          background:#fff0df;
          border-color:#e89b49;
          color:#8b4d08;
        }
        .technician-overdue-filter.critical.active{
          background:#ffebeb;
          border-color:#df6767;
          color:#9c2727;
        }
        .task-card.technician-overdue-low{
          border-left:4px solid #d1ad2e;
        }
        .task-card.technician-overdue-medium{
          border-left:4px solid #e58b34;
        }
        .task-card.technician-overdue-critical{
          border-left:4px solid #d34d4d;
        }
        .technician-overdue-indicator{
          display:flex;
          align-items:center;
          gap:7px;
          margin:8px 0 4px;
          padding:7px 9px;
          border-radius:9px;
          font-size:11px;
        }
        .technician-overdue-indicator>svg,
        .technician-overdue-indicator>span:first-child{
          width:17px;
          height:17px;
          flex:0 0 17px;
        }
        .technician-overdue-indicator.low{
          background:#fff8df;
          color:#745b00;
        }
        .technician-overdue-indicator.medium{
          background:#fff0df;
          color:#8b4d08;
        }
        .technician-overdue-indicator.critical{
          background:#ffebeb;
          color:#9c2727;
        }
        @media(max-width:420px){
          .technician-overdue-filters{
            grid-template-columns:1fr;
          }
        }
      </style>

      <div class="task-refresh-bar">
        <button
          type="button"
          class="task-refresh-button"
          data-action="refresh-tasks"
          ${state.taskRefreshUiBusy ? "disabled" : ""}>
          ${icons.sync}
          <span>${state.taskRefreshUiBusy ? "Actualizando..." : "Actualizar"}</span>
        </button>
      </div>

      <section class="stack">
        ${visibleTasks.length
          ? visibleTasks.map(taskCard).join("")
          : emptyState(
              "Sin tareas",
              state.technicianSelectedRbd
                ? `No hay tareas ${currentFilter.toLowerCase()} para el RBD ${state.technicianSelectedRbd}.`
                : "No hay tareas para este filtro."
            )}
      </section>
    </main>
    ${bottomNav()}
  `;
}

function detailScreen() {
  const task = selectedTask();
  const addressLink = addressLinkForTask(task);
  const completed = isTaskCompleted(task);
  const formActionLabel = taskHasFormProgress(task) ? "Continuar formulario" : "Comenzar formulario";
  return `
    ${topBar("Detalle de tarea", { back: "tasks" })}
    <main class="screen with-nav detail-screen">
      <section class="detail-head">
        ${taskTypeLabel(task.type)}
        <h2>RBD ${task.rbd}</h2>
        <p>${task.establishment}</p>
      </section>
      <section class="detail-list">
        ${detailRow("info", "Descripción", task.description)}
        ${detailRow("user", "Asignada por", task.assignedBy)}
        ${addressLink ? detailRow("location", "Dirección", addressLink) : ""}
        ${detailRow("calendar", "Fecha de asignación", task.assignedAt)}
        ${detailRow("calendar", "Fecha planificada", task.dueAt)}
        ${detailRow("info", "Estado", `<span class="detail-value ${taskDisplayStatusClass(task)}">${escapeHtml(taskDisplayStatus(task))}</span>`)}
        ${detailRow("alert", "Prioridad", `<span class="detail-value priority-${statusClass(task.priority)}">${task.priority}</span>`)}
      </section>
      <div class="sticky-action">${primaryButton(completed ? "Ver resumen" : state.locationCheckBusy ? "Validando ubicación..." : formActionLabel, completed ? "form-summary" : state.locationCheckBusy ? "none" : "form")}</div>
    </main>
    ${bottomNav()}
  `;
}

function formPlaceholderScreen() {
  const task = selectedTask();
  if (isTaskCompleted(task)) return formSummaryScreen();
  const meta = taskEstablishmentMeta(task);
  const sections = formSectionsForTask(task);
  const infoItems = [
    ["RBD", task.rbd],
    ["Nombre", task.establishment],
    ["Dirección", meta?.direccion ?? "Sin dirección registrada"],
    ["Comuna", meta?.comuna ?? "Sin comuna registrada"],
    ["Tipo de institución", meta?.tipoInstitucion ?? "Sin tipo registrado"],
    ["Tipo de tarea", task.type]
  ];

  return `
    ${topBar("Formulario", { back: "detail", info: true })}
    <main class="screen with-nav form-screen">
      ${formWorkHeader(task)}
      <section class="form-task-card">
        <div class="form-card-title">
          <span>${icons.clipboard}</span>
          <h2>Información de la tarea</h2>
        </div>
        <div class="form-info-grid">
          ${infoItems.map(([label, value]) => `
            <div class="form-info-item">
              <span>${label}</span>
              <strong>${value}</strong>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="form-sections-panel">
        <div class="form-section-intro">
          <h2>Secciones del formulario</h2>
          <p>Navega por las secciones para responder las preguntas.</p>
        </div>
        <div class="form-section-list">
          ${sections.map((section, index) => {
            const completed = (section.done ?? 0) >= Math.max(1, section.minimum || 0);
            return `
            <button class="form-section-row ${completed ? "completed" : ""}" type="button" data-action="open-form-section" data-section="${section.id}">
              <span class="form-section-icon tone-${section.tone}">${icons[section.icon]}</span>
              <span class="form-section-copy">
                <span class="form-section-title">
                  ${index + 1}. ${section.title}
                  ${section.critical ? '<em class="section-badge critical">Crítico</em>' : ""}
                  ${section.required ? '<em class="section-badge required">Obligatorio</em>' : ""}
                </span>
                ${section.minimum ? `<small>Mínimo ${section.minimum} respuestas</small>` : ""}
              </span>
              ${section.minimum ? `<span class="section-counter">${section.done ?? 0}/${section.minimum}</span>` : completed ? '<span class="section-counter done">Completo</span>' : '<span class="section-counter empty"></span>'}
              <span class="form-section-arrow">${icons.arrow}</span>
            </button>
          `;
          }).join("")}
        </div>
        <div class="form-legend">
          <span><i class="legend-dot critical"></i>Crítico</span>
          <small>Secciones críticas</small>
          <span><i class="legend-dot required"></i>Obligatorio</span>
          <small>Secciones obligatorias</small>
        </div>
      </section>
      ${state.formValidationMessages.length ? `
        <section class="form-validation-card">
          <strong>No se puede enviar todavía</strong>
          <ul>
            ${state.formValidationMessages.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}
          </ul>
        </section>
      ` : ""}
      <div class="form-actions">
        ${primaryButton("Enviar formulario", "technician-signature-preview")}
      </div>
    </main>
    ${bottomNav()}
  `;
}

function formSummaryScreen() {
  const task = selectedTask();
  const meta = taskEstablishmentMeta(task);
  const sections = formSectionsForTask(task);
  const hasAnySectionCount = sections.some((section) => (section.done ?? 0) > 0);
  const sectionCounts = sections.map((section) => {
    const total = section.done ?? 0;
    return `
      <div class="form-info-item">
        <span>${escapeHtml(section.title)}</span>
        <strong>${total} ${pluralizeElement(total)}</strong>
      </div>
    `;
  }).join("");

  return `
    ${topBar("Resumen del formulario", { back: "detail", info: true })}
    <main class="screen with-nav form-screen">
      <section class="form-task-card">
        <div class="form-card-title">
          <span>${icons.clipboardCheck}</span>
          <h2>Formulario completado</h2>
        </div>
        <div class="form-info-grid">
          <div class="form-info-item"><span>RBD</span><strong>${escapeHtml(task.rbd)}</strong></div>
          <div class="form-info-item"><span>Establecimiento</span><strong>${escapeHtml(task.establishment)}</strong></div>
          <div class="form-info-item"><span>Comuna</span><strong>${escapeHtml(meta?.comuna ?? "Sin comuna registrada")}</strong></div>
          <div class="form-info-item"><span>Tipo de tarea</span><strong>${escapeHtml(task.type)}</strong></div>
          <div class="form-info-item"><span>Folio</span><strong>${task.folio ? escapeHtml(task.folio) : "Pendiente"}</strong></div>
          <div class="form-info-item"><span>Estado</span><strong>${escapeHtml(taskDisplayStatus(task))}</strong></div>
          <div class="form-info-item"><span>Sincronización</span><strong>${task.syncStatus === "synced" ? "Sincronizado" : "Pendiente"}</strong></div>
        </div>
      </section>

      <section class="form-sections-panel">
        <div class="form-section-intro">
          <h2>Respuestas registradas</h2>
          <p>El formulario ya fue enviado y quedó disponible solo para consulta.</p>
        </div>
        ${hasAnySectionCount ? `
          <div class="form-info-grid">
            ${sectionCounts}
          </div>
        ` : `
          <div class="form-validation-card">
            <strong>Respuestas guardadas en Supabase</strong>
            <p>Los conteos por sección aún no se pudieron cargar en este dispositivo.</p>
          </div>
        `}
      </section>

      ${task.submissionId || task.syncWarning || task.pdfUrl ? `
        <section class="detail-list">
          ${task.submissionId ? detailRow("info", "ID de envío", escapeHtml(task.submissionId)) : ""}
          ${task.syncWarning ? detailRow("alert", "Advertencia de sincronización", escapeHtml(task.syncWarning)) : ""}
        </section>
      ` : ""}
      <div class="form-actions single-action">
        ${primaryButton("Ver el PDF", "open-pae-pdf")}
      </div>
    </main>
    ${bottomNav()}
  `;
}

function bitacoraSummaryRecordGroups(task) {
  return [
    { id: "heat", title: "Calor", icon: icons.thermometer, records: heatRecordsForTask(task.id) },
    { id: "electricity", title: "Electricidad", icon: icons.bolt, records: electricityRecordsForTask(task.id) },
    { id: "cold", title: "Frío", icon: icons.snowflake, records: coldRecordsForTask(task.id) },
    { id: "vectors", title: "Vectores", icon: icons.bug, records: vectorsRecordsForTask(task.id) },
    { id: "water", title: "Agua", icon: icons.droplet, records: waterRecordsForTask(task.id) },
    { id: "infrastructure", title: "Infraestructura", icon: icons.home, records: infrastructureRecordsForTask(task.id) }
  ].filter((group) => group.records.length);
}

function orderedDraftKeys(draft, preferredKeys = []) {
  const preferred = preferredKeys.filter((key) => Object.prototype.hasOwnProperty.call(draft, key));
  const extras = Object.keys(draft).filter((key) => !preferredKeys.includes(key)).sort();
  return [...preferred, ...extras];
}

function bitacoraSingleAnswerRows(title, draft, keys = []) {
  const rows = orderedDraftKeys(draft, keys)
    .map((key) => [fieldLabel(key), draft[key]])
    .filter(([, value]) => value !== "" && value !== null && value !== undefined);
  if (!rows.length) return "";
  return `
    <section class="jm-bitacora-panel">
      <h3>${escapeHtml(title)}</h3>
      <div class="jm-answer-grid">
        ${rows.map(([label, value]) => `
          <div>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function bitacoraRecordExtraRows(record) {
  const hiddenKeys = new Set([
    "element",
    "item_label",
    "site",
    "otherSite",
    "quantity",
    "action",
    "observation",
    "evidenceName",
    "evidencePreview",
    "evidencePhotos",
    "evidenceFilePath",
    "evidenceFileUri",
    "evidenceMime",
    "hasAchsSignage",
    "_itemIndex",
    "articleId",
    "articleQuantity"
  ]);
  const rows = Object.entries(record)
    .filter(([key, value]) => !hiddenKeys.has(canonicalFieldKey(key)) && value !== "" && value !== null && value !== undefined)
    .map(([key, value]) => [
      fieldLabel(key),
      displayAnswerValue(key, value)
    ])
    .filter(([, value]) => value !== "");
  if (!rows.length) return "";
  return `
    <div class="jm-bitacora-extra-answers">
      ${rows.map(([label, value]) => `
        <div>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function bitacoraRecordCard(record, index) {
  const site = record.site === "Otro" ? record.otherSite : record.site;
  const photos = evidencePhotosForRecord(record);
  const hasPhoto = photos.some((photo) => isDisplayableImageSource(photo.evidencePreview));
  const visiblePhotos = photos.filter((photo) => isDisplayableImageSource(photo.evidencePreview)).slice(0, MAX_EVIDENCE_PHOTOS_PER_ELEMENT);
  const photoTitle = record.element || `Evidencia ${index + 1}`;
  const photoSubtitle = [site, record.action, record.observation].filter(Boolean).join(" · ");
  return `
    <article class="jm-bitacora-record">
      ${hasPhoto ? `
        <div
          class="jm-bitacora-photo-stack photo-count-${visiblePhotos.length}"
          style="display:grid;grid-template-columns:${
            visiblePhotos.length === 1
              ? "minmax(0,1fr)"
              : visiblePhotos.length === 2
                ? "repeat(2,minmax(0,1fr))"
                : "repeat(3,minmax(0,1fr))"
          };gap:10px;width:100%;">
          ${visiblePhotos.map((photo, photoIndex) => `
            <button
              class="jm-bitacora-photo"
              style="width:100%;min-width:0;"
              type="button"
              data-action="open-image-preview"
              data-src="${escapeAttribute(photo.evidencePreview)}"
              data-title="${escapeAttribute(photoTitle)}"
              data-subtitle="${escapeAttribute(photoSubtitle)} · Foto ${photoIndex + 1} de ${visiblePhotos.length}"
              aria-label="Ver fotografía ${photoIndex + 1} de ${escapeAttribute(photoTitle)}">
              <img
                src="${escapeAttribute(photo.evidencePreview)}"
                alt="Evidencia ${index + 1}.${photoIndex + 1}"
                loading="lazy"
                style="display:block;width:100%;height:100%;object-fit:cover;" />
            </button>
          `).join("")}
        </div>
      ` : `
        <div class="jm-bitacora-photo empty">
          ${icons.camera}<span>Sin fotografía disponible</span>
        </div>
      `}
      <div class="jm-bitacora-record-copy">
        <strong>${escapeHtml(record.element || `Elemento ${index + 1}`)}</strong>
        <div class="jm-bitacora-tags">
          ${site ? `<span>${icons.location}${escapeHtml(site)}</span>` : ""}
          ${record.quantity ? `<span>${escapeHtml(record.quantity)} unidad${String(record.quantity) === "1" ? "" : "es"}</span>` : ""}
          ${record.action ? `<span>${escapeHtml(record.action)}</span>` : ""}
        </div>
        <p>${escapeHtml(record.observation || "Sin observación registrada.")}</p>
        ${bitacoraRecordExtraRows(record)}
      </div>
    </article>
  `;
}

function jmBitacoraSummaryScreen() {
  const task = selectedTask();
  const meta = taskEstablishmentMeta(task);
  const technician = users.find((candidate) => candidate.usuario === task.assignedTo);
  const groups = bitacoraSummaryRecordGroups(task);
  const completedDate = task.submittedAt ? formatDateLabel(String(task.submittedAt).slice(0, 10)) : "Sin fecha registrada";
  const photoWarning = task?.submissionId ? state.submissionPhotoWarnings?.[task.submissionId] : "";
  const hasBackedBitacoraPdf = task.pdfFileKind === "onedrive_bitacora_pdf"
    || (/\.pdf($|\?)/i.test(String(task.pdfUrl || "")) && /bit[áa]cora|bitacora|mantenci[óo]n|mantencion/i.test(String(task.pdfFileName || "")));

  return `
    ${topBar("Resumen de bitácora", { back: "jm-completed", info: true })}
    <main class="screen with-nav jm-bitacora-screen">
      <section class="jm-bitacora-hero">
        <div>
          <span>Bitácora de Mantención</span>
          <h2>RBD ${escapeHtml(task.rbd)} · ${escapeHtml(task.establishment)}</h2>
          <p>${escapeHtml(meta?.direccion ?? "Sin dirección registrada")} · ${escapeHtml(meta?.comuna ?? "Sin comuna registrada")}</p>
        </div>
        <div class="jm-bitacora-folio">
          <span>Folio</span>
          <strong>${task.folio ? escapeHtml(task.folio) : "Pendiente"}</strong>
        </div>
      </section>

      <section class="jm-bitacora-meta">
        <div>${icons.calendar}<span>Fecha</span><strong>${escapeHtml(completedDate)}</strong></div>
        <div>${icons.user}<span>Técnico</span><strong>${escapeHtml(technician?.nombre ?? "Sin técnico")}</strong></div>
        <div>${icons.clipboard}<span>Tipo de tarea</span><strong>${escapeHtml(task.type)}</strong></div>
        <div>${icons.info}<span>Estado</span><strong>${escapeHtml(taskDisplayStatus(task))}</strong></div>
      </section>

      ${bitacoraLocationTracePanel(task)}

      <section class="jm-bitacora-actions">
        <button class="button primary" type="button" data-action="download-jm-bitacora-pdf" ${state.jmPdfDownloadBusy ? "disabled" : ""}>
          ${icons.download}
          ${state.jmPdfDownloadBusy ? "Preparando PDF..." : "Descargar PDF"}
        </button>
      <button
        class="button secondary"
        type="button"
        data-action="download-bitacora-photos"
        ${state.jmPhotoZipDownloadBusy ? "disabled" : ""}>
        ${state.jmPhotoZipDownloadBusy ? "Preparando fotos..." : "Descargar Fotos"}
      </button>
        ${hasBackedBitacoraPdf ? `<span>PDF de bitácora respaldado en OneDrive.</span>` : `<span>Se generará una copia local en PDF con el detalle disponible.</span>`}
      </section>

      ${state.submissionDetailBusy ? `
        <section class="empty-state compact">
          <span class="empty-icon">${icons.sync}</span>
          <h2>Cargando respuestas</h2>
          <p>Estamos preparando el resumen con fotografías.</p>
        </section>
      ` : ""}

      ${state.submissionDetailError ? `
        <section class="form-validation-card">
          <strong>No se pudo cargar el detalle</strong>
          <p>${escapeHtml(state.submissionDetailError)}</p>
        </section>
      ` : ""}

      ${photoWarning && !state.submissionDetailBusy ? `
        <section class="form-validation-card">
          <strong>Fotografías no disponibles</strong>
          <p>${escapeHtml(photoWarning)}</p>
          <button class="button secondary" type="button" data-action="reload-bitacora-photos">Reintentar fotografías</button>
        </section>
      ` : ""}

      ${groups.length ? groups.map((group) => `
        <section class="jm-bitacora-panel">
          <div class="jm-bitacora-section-title">
            <span>${group.icon}</span>
            <h3>${escapeHtml(group.title)}</h3>
            <em>${group.records.length} ${pluralizeElement(group.records.length)}</em>
          </div>
          <div class="jm-bitacora-records">
            ${group.records.map(bitacoraRecordCard).join("")}
          </div>
        </section>
      `).join("") : !state.submissionDetailBusy ? `
        <section class="empty-state compact">
          <span class="empty-icon">${icons.clipboard}</span>
          <h2>Sin elementos registrados</h2>
          <p>No se encontraron elementos para esta bitácora.</p>
        </section>
      ` : ""}

      ${bitacoraSingleAnswerRows("Encargado PAE", state.paeManagerDraft, ["name", "rut", "role"])}
      ${bitacoraSingleAnswerRows("MPA", state.mpaDraft, ["hasDressingRoom", "dressingRoomLocation", "hasLockers", "lockersFitStaff", "lockersGoodState", "hasShower", "showerExclusive", "hasBathroom", "bathroomExclusive"])}
      ${bitacoraSingleAnswerRows("Patio Servicio", state.serviceYardDraft, ["exclusiveProgram"])}
      ${bitacoraSingleAnswerRows("Verificadores RBD", state.rbdCheckersDraft, ["pestControlUpToDate", "pestControlDate", "hasSanitaryResolution", "sanitaryResolutionNumber", "hasGreenSeal", "greenSealCode", "greenSealExpiration", "greenSealExpired", "hasMaintenanceCover", "hasPaintCertificate"])}
    </main>
    ${bottomNav()}
  `;
}

function pdfPreviewScreen() {
  const previewZoom = state.pdfPreviewZoom || 1;
  const zoom = Math.round(previewZoom * 100);
  const frameWidth = Math.max(430, Math.ceil(430 * previewZoom));
  const frameHeight = Math.max(1800, Math.ceil(1800 * previewZoom));
  return `
    ${topBar("Vista previa PDF", { back: "form-summary", info: true })}
    <main class="screen pdf-preview-screen">
      ${state.pdfPreviewBusy ? `
        <section class="empty-state compact">
          <span class="empty-icon">${icons.refresh}</span>
          <h2>Preparando vista previa</h2>
          <p>Estamos cargando la bitácora para consulta.</p>
        </section>
      ` : state.pdfPreviewError ? `
        <section class="empty-state compact">
          <span class="empty-icon">${icons.alert}</span>
          <h2>No se pudo mostrar el PDF</h2>
          <p>${escapeHtml(state.pdfPreviewError)}</p>
        </section>
      ` : `
        <section class="pdf-preview-toolbar" aria-label="Controles de zoom del PDF">
          <button type="button" data-action="pdf-zoom-out" aria-label="Alejar PDF">-</button>
          <strong data-role="pdf-preview-zoom-label">${zoom}%</strong>
          <button type="button" data-action="pdf-zoom-in" aria-label="Acercar PDF">+</button>
          <button type="button" data-action="pdf-zoom-reset">100%</button>
        </section>
        <section class="pdf-preview-shell" data-role="pdf-preview-shell">
          <iframe
            title="Vista previa de bitácora"
            class="pdf-preview-frame"
            data-role="pdf-preview-frame"
            style="width: max(100%, ${frameWidth}px); min-height: ${frameHeight}px;"
            sandbox="">
          </iframe>
        </section>
      `}
    </main>
  `;
}

function pdfEscape(value) {
  return escapeHtml(value ?? "");
}

function pdfDate(value) {
  const iso = normalizeIsoDate(value) || isoDateFromTaskLabel(value);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function pdfTime(value) {
  if (!value) return "";
  const text = String(value);
  const isoTime = text.match(/T(\d{2}):(\d{2})/);
  if (isoTime) return `${isoTime[1]}:${isoTime[2]}`;
  const plainTime = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (plainTime) return `${plainTime[1].padStart(2, "0")}:${plainTime[2]}`;
  return "";
}

function pdfFolio(task) {
  if (task.folio) return String(task.folio);
  return "Pendiente";
}

function pdfFileTitle(task) {
  return `Bitácora Mantención N° Folio ${pdfFolio(task)} RBD ${task.rbd || "Sin RBD"}`;
}

function internalPdfFileTitle(task) {
  return `Informe Interno Folio N° ${pdfFolio(task)} RBD ${task.rbd || "Sin RBD"}`;
}

function photosZipFileTitle(task) {
  return `Fotografías Bitacora Folio N° ${pdfFolio(task)} RBD ${task.rbd || "Sin RBD"}`;
}

function photosFolderTitle(task) {
  return photosZipFileTitle(task);
}

function pdfCheck(condition) {
  return condition ? "√" : "";
}

function isVisitReason(visitReason, reason, task = null) {
  const text = normalizeSearch(visitReason || "");
  if (reason === "maintenance") return /plan|preventivo|mantencion/.test(text);
  if (reason === "dt") return /\bdt\b/.test(text);
  if (reason === "mutuality") return /mutual/.test(text);
  if (reason === "emergency") return /emergencia|urgente/.test(text) || statusClass(task?.priority) === "alta";
  if (reason === "record") return /acta/.test(text);
  if (reason === "seremi") return /seremi/.test(text);
  if (reason === "sec") return /\bsec\b/.test(text);
  return false;
}

function pdfSiteLabel(record) {
  return record.site === "Otro" ? (record.otherSite || "Otro") : record.site;
}

function pdfRowsForElements(elements, records) {
  return elements.flatMap((element) => {
    const matches = records.filter((record) => record.element === element);
    const rows = matches.length ? matches : [{ element }];

    return rows.map((record) => {
      const site = pdfSiteLabel(record);
      const quantity = record.quantity || "";
      const siteCell = (column) => site === column ? quantity : "";
      return `
        <tr>
          <td class="item">${pdfEscape(element)}</td>
          <td>${pdfEscape(siteCell("Cocina"))}</td>
          <td>${pdfEscape(siteCell("Bodega"))}</td>
          <td>${pdfEscape(siteCell("Baño"))}</td>
          <td>${pdfEscape(siteCell("Patio"))}</td>
          <td>${site && !["Cocina", "Bodega", "Baño", "Patio"].includes(site) ? pdfEscape(quantity || site) : ""}</td>
          <td>${pdfEscape(quantity)}</td>
          <td>${pdfEscape(record.action || "")}</td>
          <td>${pdfEscape(record.observation || "")}</td>
        </tr>
      `;
    });
  }).join("");
}

function pdfTable(title, elements, records) {
  return `
    <table class="bitacora-table">
      <thead>
        <tr>
          <th class="section-head">${pdfEscape(title)}</th>
          <th>Cocina</th>
          <th>Bodega</th>
          <th>Baño</th>
          <th>Patio</th>
          <th>Otro</th>
          <th>Cantidad</th>
          <th>Acción</th>
          <th>Observación</th>
        </tr>
      </thead>
      <tbody>${pdfRowsForElements(elements, records)}</tbody>
    </table>
  `;
}

function pdfAnswerSection(title, answers) {
  const visibleAnswers = answers.filter((answer) => answer.value !== "" && answer.value !== null && answer.value !== undefined);
  if (!visibleAnswers.length) return "";

  return `
    <section class="answer-section">
      <h2>${pdfEscape(title)}</h2>
      <table class="answers-table">
        <tbody>
          ${visibleAnswers.map((answer) => `
            <tr>
              <th>${pdfEscape(answer.label)}</th>
              <td>${pdfEscape(answer.value)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function pdfAdditionalSectionsMarkup() {
  return [
    pdfAnswerSection("Encargado PAE", recordAnswers(state.paeManagerDraft)),
    pdfAnswerSection("MPA", recordAnswers(state.mpaDraft)),
    pdfAnswerSection("Patio Servicio", recordAnswers(state.serviceYardDraft)),
    pdfAnswerSection("Verificadores RBD", recordAnswers(state.rbdCheckersDraft))
  ].join("");
}

function pdfSignature(label, name, rut, role, signatureData) {
  return `
    <div class="signature-box">
      <div class="signature-image">${signatureData ? `<img src="${signatureData}" alt="${pdfEscape(label)}" />` : ""}</div>
      <div class="signature-line"></div>
      <strong>Nombre: ${pdfEscape(name)}</strong>
      <strong>Rut: ${pdfEscape(rut)}</strong>
      ${role ? `<strong>Cargo: ${pdfEscape(role)}</strong>` : ""}
    </div>
  `;
}

async function urlToDataUrl(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("No se pudo cargar el recurso.");
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

function appAssetUrl(path) {
  const normalizedPath = String(path).replace(/^\.?\//, "");
  const scriptUrl = document.currentScript?.src || document.querySelector('script[src*="src/app.js"]')?.src || window.location.href;
  return new URL(normalizedPath, scriptUrl).href;
}

function embeddedSoserLogoDataUrl() {
  return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAbcAAABUCAYAAAABMHlzAAAABHNCSVQICAgIfAhkiAAAAGJ6VFh0UmF3IHByb2ZpbGUgdHlwZSBBUFAxAAB4nFXIsQ2AMAwAwd5TeIR3HBwyDkIBRUKAsn9BAQ1XnuztbKOveo9r60cTVVVVz5JrrmkBZl4GbhgJKF8t/ExEDQ8rHgYgD0i2FMl6UPBzAAAgAElEQVR4nOydd5wb1bn+n+eMpN11NwFMtSkua1MTA24EA7mBQIJh1x7JdgKkAuk9uSn3OiTkhuRHCoEkhBRCCNirsXdtTEkgFJPYmF5i3KimYwxeF7y7kuY8vz9mpJV2Ja3WXhdAXz6HkWbOnHNmvJp33nPeAlSpUqVKlSpVqlSpUqVKlSpVqlSpUqVKlSpVqlSpUqVKlSpVqlSpUqVKlSpVqlSpUqVKlSpVqlSpUqVKlSpVqlSpUqVKlSpVqlSpUqVKKbi7B7C70BwMeKPNmeAMGjYpOuqYQyNDBo9E1B7A9NYXYnpzBj+0/M3dPcYqVapUqbJ9RPqikcbGxhGO44wmOQywe4e7UxK3AXgdwLP9+vV75tprr23vi/62F30LAzc6NbOR8Rvf2KpJsSPe/3TtEROOkW0n0lug9BZIGpnqcPYBkBNux7QcM6R/e2RKbdQeXGv8WK2xrw1Q5pG/NqxeuxsvJ8ecOXPMihUrDjfGHA5gP1JDgiOmXVK7MXrZWj4D4HnP81K7c6ylmDVr1jBrU2MB7ieZgYDtL7EVwFZr7dP9+vVbe9111721u8dZpUqVtwfbpbnNnDnzAGsz5wA8E8AUkkMqOM1KeozEUmtx89ChQ++4+uqr09vTf2/ZNqfugPaMvqOU/3FZDSD5Vv8zvtBq9t73wKxQQ3prsE1tvqX2jNs+DAAfnH/sKImXZKxp8MFoRkSdsah1LOqMjzrjr6lz7J+j/Tf89renvL51V1xLlkQicbikGaQ+KGESyX49nSMpBeAhgEuN8W8cM+bIpRdffLHdBcPthuu6g41Ro2Q+COi/SO5Trr4kkXwc0N3WosXzvHsAqK/HFY/HTwHwMVLv6as2JW4htV7SCxKfAPCQ53nVmYEqVXYivRJu8Xh8IoBvAzqLpLODfW+UcF0mk/lFc3Pzuh1sqyiagwGtGDDHptJfUMqvBQk6BrVTZq6KHT5+bIFQS2+B0pufqslsm8AP/ePNhuajL8pYXu7DxDIi8kuNsagzFv0cH3XGos7xX+/HzJd/9eEn5+6M68gnkZhxhmS+SeKUHW1L0isSro5EIlfOnTt3Q1+MryemT5/+XsdxvgZoOsm67W1H0jqAv5P0G8/z+uTFIpFwvwbw533RVjkCQY2HACwknWvmzZv38s7us0qVdxsVCTfXdYeTuILktL4egCQfwF/S6cx3W1pa1vdVu60/GvxfNpX5o1KZEcr4oGMAx8AMHLp6wPRL6guFWijYtO0UntL84syFR33VF3/hh8LMR7BN20IB1y/U4Po5Fv2Mj/6O3zxA9hMXn/nU5r66jiyJROJISVeRmNLXbQNol3B5TU3Nj3bW1F8ikThEspeSTPRlu5JaAV382muvX7lkyZLM9rbT0NCwfywWXQcg2ofD65Hw7/+GTMb/QXNz8zO7su8qVd7JmJ4qxOPx6SRW7AzBBgAkHZKfikYja+Lx+Cd3tD0l4bReMvhi25G5TR3pQLBFHCDigBEHNe89xwazWbazSHfV1HRM4CnNL563aOxJUdrLokbIlgiDEjVCNPzcYQ3afIN2a9Aebtus0/gW+MCcvx8+codvTB7xePxLkn1kJwk2AKgl8e2OjvbVicSMM/q4bcbjM74u2Sf6WrABAMkhpPnlsGH7PuS67lHb2040Gp2MXSzYgNzf/7nRaOSJeHzGV/AuNvKqUqUvKftD2lXTNIXo+rfearvgpptu2tbrM3+NmtbNQ+cqlW5QewqyFnQCoQbHgMbYAbOuINQRGpBsBTJbroyazV/jcVen5wjm5cVjH/dhjsiACDQ3IKvBpUVkZJCxwee0mK+1oZ9j0d/46Odk1g8y6dO/d9q6R3fwZjCRcH8D8LM72E6vkPBTSd/zPM/fkXZmz549NJPJ/I3EmX01th5ot1Zf8DzvT7090XXdjxvDa3bGoHqDpKYtW7aef+utt3bs7rFUqfJ2pqTmlkjM+PSuF2wAwI/271935+zZs4f25iz9fv9+m7fudavSmQZ1pCE/T7CFWpup7fc8nAghQdJrBvbs2AmXfZHHBYYtb9w6elrE4IhInoaW3XZ+tojkaXNZrS2/dFhn322K3f7juw4+ckfuRDwe/8muFmwAQOLbxiDpum5se9uYOXPmwZlM+v5eCjYr6RlA/5K0RNK9kl7txfm1xvCPruv+CG9TDYhkYtCgATfMmTOnx1mVKlWqlKboA8B13WON4f3oYZpGUgbAXQBvk7TCWvu0tXartbYtFovVGmP2lnSopPHGYCrAk1DBVGjICms1tRKrMs1BbFP/97SoLXOmbe+AUhkwkifYHAM4DszAvf7T78wfHIX0Zi9itn2OY75RYETxlZtH3+DDzPJzWhvhCwXGJFntLZ2nvRFAf8dHf8cG21CT6+/4Lw2qbZv09ZNefqHCa87huu40Y7iox2uXtgG8DcBdklYYY9alUqkt1tpUXV1dP9/39yV5OIDjAZ1C8oRKxyDpTgln9NZ9wHXdkSTuJnlgBX1skjAPwEIA/y5mHDJr1qxhvu+fSioh4SOVGDNZqys8z/tSL8ZcUnOT1AFgeaVtZSE5EMBgSfuGn3uBvtPU5F3a2z6rVKkSUMzPjSSvRhnBFvzY+SvHiVzWg5XdqwBWAFgMAA0NDftGo9ELAX2ZZE+m1keS/H8APtVDPWweNOxKtaXOVCodCLbQeASOyQk2RhwQ2kDqI5Gxn7u5WDsRozMJgeqU+l2lv8L/i8FnAUiHGptDIUITaHVWiFIHtnXUNl9z14j3f+KUdRX7+LmuW0fit+XqSNpE4lIJV3pespS1YCuAlwE8CmABEBh2APaLEi7qyX2A5KkAvgrgp70Y+z4k/tGTYJP0JsBLJPyhJ2vHuXPnvgZgLoC5rusOB/B9Ep9CmRclY/jFeHzG+mRy/iWVjr0MryaT3sk7cD5d1x0NYBLJmSROr+CUH7quO9/zvKd2oN8qVd61dNPcAoMCc0uZc17OZPyPLFiw4JHt7XT27NlDfT99KcALeqi6sakpuVe5CpsvP+ATti31Z9vWAbV1QFKotUW6TElitTMAL/b/1OsfLNbO9+4YdaCfxotZra205mYC7S1Pc0vZYF9/x8eAPA1uQK6kr/7WB9ZdWOn9icfjXyJxeZkqK6zVhz3Pe77SNrvS2Nh4UCQSuYLEOeXqSXggmUxWpO1dcMEF0dbWjUtITuqhzWsjkchXb7jhho29GXM+8Xj8eEDXkRxTrp61OtvzvBt7aq8HzW1dMukdsp1DLdbXsST+SHJ8+Zq6vqnJ+1hf9VulyruJIm++/HSpypJ80j97RwQbANxwww0bm5q8C63VTADlHLnLrvm0XzHsUKX8K5TOQOlMsM5mTLDWltPc2G4G+SkOUL3IvUu1ZXz/EIdABMFamsPsFgUlws7jTkG9wIIyKEQqLMH3yAU/v3NEL9ae9ImSR6RW0py5I4INAJqbm19MJpMNEr7Zw1hqKm2ztbX1R+UEW+BEbs9PJpMf3xHBBgDJZPIBCccBKjt1awz/0tjYeNCO9NXXeJ73qITJEhaWr8l4Q0PDvrtmVFWqvLMoEG5Tp06NSChjCs7kvHkLHuyrzj3PawL80yS1Fa+hf5Y6VwJT1vmTfL+/0hkgnQFN53QkHANGYZ0hfi0jiAEEyDGaU3wqy9CPRooIrEiX4lBwkL8PuXq+AmGWyhYZpESkAk3w6v9327D+Pd2TxsbGg0geW+a6L583b16v1/BKkUwmL5PwcUlFo31IuL2SdlzXnQToW6WOS2qTcEZT0/y/bu9Yu+J53lZrMV3SDWWqDY1EImWneHcHnueltmzZMhPAY2WqRaPR6Nm7akxVqryTKHjQ77333mPKRY2QdGtfD6CpacHdAD8eOrPm9/VqOu1/rdR5W68a3qiMPUUZH8r4kBXgMNDcjAFrAGdQxsAAIEESoKlLjTpgVLH2osZYJ6upoVDAFRTk7++s64RCLivMUgo0t3RYUtYcGInGvt3T/XAc533ljpOsSNj0hmQyeS3AYoJpRTQa/XFP58+ZM8cYwytJFjVQCv5t2eB53p07PNgueJ7nSzgPKP23SeIs13U/3Nd97yi33nprh4SvlqtDauquGk+VKu8kCoSbMebgHupv2hmDSCaTSQnvlfBrCQsk/MBxIkeVitiguxBBxv5EfiDYkPFBQyDU3FjnwwxMA4YA8wqIlG8+UKxNI7zaqbXlC61KBJtynxWuwXVqbkFJyyBjnW/85q4R+5W7F8ZgeLnjknZKmKxQg5sK6GpAnoSvxWI1EyuZPly9+omPASgjlPnNZDL5jz4cbgGe5/nWYhaA50qOgPgJ9kD3gGQyeReAkgG4JRy9C4dTpco7hq7WkgPKVSbZk/DbbjzP+w+AL1dS960nR8ywfmYUMhYINTdGI6AxMHU+TH+L4NJYWEgY8jSguyXie4Y8++ybrYemwGCdzwEBKWcRKQAiYEE4ACwEyyDGiQPCUnAA+HnaW9oSaYbFEGmZugwyXwLw3TKXN7jctZM8BMCaSu5Tb0kmk/cAuKeXp1Hit4vrbACgu5NJ71c7NrKe8TxvUyIx/ROAc1ex4ySPcl33rEqMS3Y11uouYzi6xOEe3SmqVKnSnQLNjWRPsflm7cSxVIx8fAO+D4UFhoBhoLH1T4eaGnIaG/M0N5BnKHlYNwFy4XFIG+phB8jT1lCkFGpqJtTgTCjcHAo2a0WpTovKrF+cL/PZcmtvYZqgkpDq8xBWO0IiMeNDJMcVOybJz2TsZ7ETovcXo6lpwd0SSgavJvmVXTGO3mIMni5zuFfBDKpUqRLQ1biibDQIElPi8RkVm7TvDN760+hjZDVe1gJ+UEgD1gpmQCoUYgC7zUDlBF5sW8rGi7Udgf5hKBgAJhRYJm9a0oRCLTiGnGBzQsGWPdehkLYmcPaWyXP+JjLikNpoTUOp6+t52pHnJxIzTqv8ju1seF6ZY39bsGDB6l03FkDS/5YyjgF0cugnt0chqZzF8B6Zf69KlT2dAuHW0dGxGsFMWxn4u3g8PueCCy7Y5UFmAYB1HV+DFWAtFBbWCM6QTsFW6ILNbt9p+PlibTvkXJOntRkgEFqhQAsEWCjUmCfkgFAIZvejIItAVsBlwu8CigpXALDWlrOeAwAjcWE8Hv9M3oXtFs4999z+EkoG1Cb5y105HgAInZ6L+mkyYI+YfehCudQ/1bxv7yAm3HjosInJcWV9d6v0DQXCbdGiRa2AHih3QvB8wA9aWzeujsdnfNF13bJrRH2NzWA6rEUg4IISOcAHmH1ZZ3ag3ZbcsgjmmPYbDju1a9tfOfW5NZTuIZDT2gw7tTTTRXsLBGBenZxGJxD5zt+FjuC++IFf3zKyqP/YkUceuUJS2dQ/JOtIXJ1IxB9xXfdc13W3Oy/ajpBKtU0pE+VkRVNTU0+CeqdA6toyxz60K8dSGSwZg5Rkn6WBqrJ7Gf8gohG/5kknav+2u8fybqCbz5fEiiKqkzyMNL8msT4ej/89kXC/NnPm9ONc193RJKYlSf/9oBPU7vSXBFlB1iKyv8BaW7iq002f6TQoyR70TaSoUQdpf5wVTiZXQi0t+z0r7PKmJzu1uE4BlyfMgs/ICjjTb2M0U/QhG2TGZqW+YMcYw78aw9cTCXdBPB6/KJFIHFnsDuwceFKpIxLm75oxdMda3hrGgywCp5x77rk9+hvuKlzXjTEwciqKhP/syvHsKOOLrGdXCYi+OmpfgAMhHLC7x/JuoFtsSUnXAvgmyaL+YF0hGQNwOsDTJQektsbj8aWklkm8r6Oj475AI9xxbFQXQqHGJoFRi+jBFrabCQaLfmbh/z7Qnhx9am18bYHv1ddOfeG2X9w5YokBp4qCBWDAPCGHMPYkQQJGodAjg8/ZLbLrbMgJuM4COJbHASgaXcNxnJ/6fubTJIdUeGv6A2wk0QgIiUR8A6ClEu+VtLy2tvbBnZGEVMIJZawkD3dd9wd93WcveBPA/kX2R9vb298L4N+7eDxFMUbnAaUj5wAoav25pzFx4ZizjPgHgsMmN499khE0LJ226ondPa49CaXNblnKebfSTbh5npeKx+MflbSknEN3KUgOQCjsSKC2tgbxuLsG4HJS91mLf48bN+6JQEPpHUqZSYGGFgi36PBMsCi2nUjmUgkTycJ1xij45Q7aBykTMQgWIbM6X05zyxNqVCD4SIJSKPgE5As0dAo2H4Rki1oYAsDcuXM3uK77SRLN23lpewM8m8TZJNHR0e4nEvEV1mo5guj2/+6LgLzlXoBInlta8O1ejMGx2AOEm+u6wyX8tNR9kpTqOUTX7mfS4tH1TJv5gBwAy0lMVEbXAKg4A8W7iWDZvcrOpmgoqjBun1s6LFbvIDmGxPkAf2sMH1+9etWGeDzeEo/Hz3ddt+LFVWXMsECwAYwKkf1L5dKs7G9H5PEdC47olnXgi6c+9xiFHwcCrXPtjciWPP/wcBoyEHzKGZcEgVGUJ9iQE2y+iJScEeXG5nleC6AL0aOBT8+EKWKOMYYXGsNrjOGT8bj7SjzuXh+Px6e7rlvWv7EY4fTzHmd5WAnWYuzuHoPrusNJ3Eay5N8/iesrSfm0u2Ha/JBETMCXlzaumiRoIcnjT7hx9KG7e2wAMDF50G5Zk+5KxDHBdLi0U4JhvJ2Yehci4x8sn1JtRymZMsTzvJslTAawaif0O5TEOST+QuK1RMJNBrEJeyBjcsYLkQM7Aq2tiMFIoWzrIuhUuM8KP9Xi0d2mhQYMXvdjUI/m26VkBZoJhZzJdd0p4Nhla8HQ7oXh5+B7m0W5qSgAQFOTd7W1+pCkV3qq21tI7kdyNon54brp1a7rltQmu5JKpQai8tx8exTG7D7H6Dlz5ph4PH4+iYfLZTSQ1GYtfrALh7ZdBGtsPFvCutjQ1b8HAAG3AoCxTskYqbuKyQvH/NyJDtw2qXnMxbt7LPIz75ppyUmLR9cjWXxebXLLyMMzrfXra56vf3FnWo6WfTh5nveotToW0NcR5AXrc0hGALrGcFk8Hr99+vTp9aXqKmNy06iRA1IlrCFVsOn8olwuts7dAoChbe2xK7r2deFxSIP+uRQ6unbTKfDyhFqo0eVvDdBFsIXfQWzNmIr+UT3Puz0ajdUD+rGkPlm77EpoffkZY/hEIuHOdV23bIgwAIjFYoN2xlh2BVLRtbidhuu6da7rnhiPx/9n1aqVa4KXup7yGfKbO5r5YVcQi0U/SCJGo+SSUxAGgbDrAcDI7nbjEoozAMAAPb887yrIzbt7CDuTCS31403GWTUpNqaEP69zGsChJPelkzl8Z42jWLLSAsIszL9wXffKwEdI55E8GTvhrZ3EfzmOedh13Qs9z7uu23EHPsCIGZiB6W9ht4SCxgRb2XyJFqzLFcbPystCml+PZmZb89GL6hofn5d/5JunvLDiZ3eM+B7kXJYbQ+dYc94HZNhMuC//mEWwoJcVajacotyWqXw98/rrr98M4Puu614K2E8A/FhvMmr3Ds4k9cFEYkaiqWn+HTunj91Or9YbSR6QSMQf7W0nkmoRRBjZK3iJAyoxZLVWv/c87ze97W93YMSpACDw7uw+66TvNb5J0uDe3TawEElXg5ghg5/v7rH4cJwIAGjHlxr2bDQQIGhRYmbCv03g/QDW3tu49qGdNYoehVuWUMhdC+DaMKP22QBOJzEV6HmKrVJCLeKv8Xi8fzKZvKrwoDIga5xhHfl2+p2WHj5CbSzQ0oLHSLH1N3UKOgGgIOG3uumYf/Ejj72UX/OQN9b96pmhh36MwLGhC3gXW0zl7VNYI9xSkCUUriBnZe3mtANr2es/8DBj9RUArkgkEodL/jkATyH5fgB9pkkFWgVvjcfj5ySTyaIO0alUanNtbfFUb2GW8L/01Xj6mNc7OlK9FRxRAMf0tqMSSRJ6QL8D8MXtOHG3IOkokuhw/Puz++6b9uxrAPaIMHHLGtf8GECPmS12DcFDH0TZEHvvFERT9Jm0rOGppwFMqLSdqXchkm4dOycNXfdAw+qSQca7UrFwy6elpWU9gD+EhYlE4gjJn0JysoRJlboRlIPEb2bOnP7EvHkL/pXbWeNvA53+zntShcLNCbe5KUnlhFy4o7NkJQyzAi77nUPbO3g1gILUKPE4/P+7UxfBx72hfgiEwiyrsQHdZ0eznzt77hRwr2xz0N/x23fk/jQ1NT0N4OcAfu66rkPyfaQmS5wMaDLJHU3QGQXUlEgkjg37KiAWi22RpBJpbkxTk7dHxnHcg9kM2K80Nc0vmg18j4VmjKT1D521dqdkq3gnQuhdEVKNvUh0XI6O1lHvc4DvR6UIgO9Uet52CbcuqKmpaQWAFQB+DwANDQ37xmLOJGv5fhInk3wvej+NaSTn91OnTj16yZIlGQBgjX0NJrKPMzQNdQB0wmKCbSC31KlFhdJEEqg8YYY8AZerK8DozLaFx86uO+fRguSX3z31ufsu+eehf4VwPlDCiy6nBaJAWcwJOAUCrt0nNrQbDBmQLtAQdwTP83wAD4TlcgCYOXPmwVJmimROBHQyySN6227g1mGvANAti7jneX4iEV8H4JAi5w10XXf422HNaA8gba3+nMlkLm5paelzw6GdyTEtI4YQ2E/E0krrP3bOus0g7PjkYYNj0dj700w/9uA5TxdNvjuxuf59JMYobf6xPL6ypNXo5Ob6I0EdR8c8UMy37sRbRu7z7zOfer3U+eMX79+vJjP4DB96476GNXd3qyCY4xYdfmD+OMc31+9fC0zqMOkHSo0/1/9Nw4fadM0I0AwLHzUlhdukxaPrmeFEH/zPfQ2rt2/KTuCkhaNPJbC/76RvDzXpboxLjhswOOZ/SDB+2mn9x0NnvVJUozz+5nH7bWRq41NnPtUBBNanJjbwFPn+6/dOX9sZ0SoJZ5Iz9iBK+4UPvkETWsYcAgARg9TSs9fk7DaOvm1Y/2iHUak+JyYPqkNs4Icca/sJ/BwAyKDo/TjhlpGDnJRzWtfr2CnWbi0tLeubmuYv8jzvG8mkd5y12guwZ1mr3/cUWqoLY4cNG5bLROzUZJ5ghGCd7dTWspqbg05tTJ36UteivOOB4WThMVpdqiKmw2nxf7Gdb1z5E6NPbYpAAhwHy7anrUqZN2/eC01N8+clk8kvJJPekdZqX2vlSvgbgF4saPMM13WLWr1JpdeujNF7ez3odxGSHgH0FWOcAzzPu+jtJtgAoJ/pdygAEOjxRW3iwjFHDUC/jZNb6r88ZfFhw2uisScMuDim6IrjFh7eLZXWlIX1/+OQDxnwBhO1j49vri9qBDS5uf4zIB4jzDXy9fik5jFuwfGW+unqiK6fvHBs0WnSCTceOqwmM/gRgvMjMHdNWVj/s259tNR/uUax5yctHHN60OfoU2vAtSAXxBS9d+pdxZWEE28aPnRyc/1Cm+73BhF5hEKwps/imT+mtNR/gRmzkjDXRMAHJ7eMubRYvbIInNwy5i8Gzj8J57qIX7NqyqIx3da+JrSMOWRIRCuMjOcIzTWZwY8cf/O4boZkE+aPHRVL6ZVhHZHLgms/bF8THfAghZtpzPIJLfXjs3UnxcZ82hg8R3JucJn8RATm2QjMs7DmpUmLxuaeCQO27vVITWZw0TXZKYsPG26iAx53hGbQ/I3gZMjeHhu8ppvP54SWMYdE2qOPZ6+jNjP44ex17BJTbs/zNjU1zb/J87yLXntt/YGAjQc/7p4hNTv72dSlbsoJtqzWFsnT4Bx0Cit1LchzA+giBLPHA4F3cFvkPRd1HcfFH3zmeQXrIdvlgSkAG9oMXtnmwDFAxNhuOeV2Jp7nve553vxkMnmutdpPwgWSiiaD7QrJmSUOlXyztJZFk8JWAQA83d7eMbWpybt87ty5b9vpPFrtAwAWKKoZ5CPhPQBAYh9lYj8neKCgFwgOiip2fn7diYvGTIH4Q0FvCFpK8MBadl+HDLQCXkngLcD+CIJIdhFOGggALGEh6/g1VxIcLelOQa0QvjrhxkOHFbRADQ4vou6EG0cfCpoWEgOCFXUemHpzdPcXOcHYVF0LybMBbIJss6CSRkknLBw5TsKvCLQK9qeCNhDm2xNaxpxc6pxiTG6pT5DmPEErLewfAQ6F7T6VFwH/TGKEZOcJuo3g6GjKdrMad5xMfwCwUC2ScMDYQoLjAGUImgiUUz58o9sE/U7QfeH9ekbQAgs0SfYPqY6OzucNVQuhqK+v0rFrCI4U0CLgn0F9LO+0xi1yHdBcyN4OcEwsZS8HdoOf0pIlSzJNTfO9sWPHHSfZckk7AQBBdugAs+8bC0ytb3OCLIJOrS37PU9wqUC42bAUCjUVfEegvQFfV5G3saiDX1rBD3vplJcImwCKSj4CyFjg0TciiBqhn+Nv+c1ZTz9c6T3razzPa0smk3/YsmXrOAk9GleQOrnYfkl3lzrHGJ41Z86ct6UfXBE2SvarlZce7+nhtbW1f0UlppN7MEIgsKDK3YQk9IfQIOhqC39GuLfAHNxY/i8AgDyvI536sKC0uqyFA4BDfDF0Hv/B0oY1/wviDoKH5AsnS7MpHGus6/mTm+uPJDgDwBPLMqtPg3QZwIixtUVjfVLYHPHNVQQHQZqOwOYAKOI3OWnhmI+TZqqgx9PAyKWNa6YLNvS1U7f1dkeRb5J0LPDfyxrW/LclLwAAB+ZLxcZSEuIbAOAD58WGrPmsoG0CC9wgpiwacxzAUwQ9uqxhzezWtDlL0HMApp+wYGTBWr01WcdzbJkUHfMFgpNE/dnCusHuztBx909b++yyhtWfE+ylACBi8bKG1TPubVg1c1njmgseij/T6byu4gZ1k1vqJ5E8FdBdy85ZNb01zQZBmyVemFtxCpnYMuqE3HWcs/qjr9X6Z0lYJ8Ad31y/f1+suW0XYfitn8TjcUuipPpN8j2zZs3ae+7cuRt4MNo67sisg4NDEcnT3PKK2sPpxa7TkVmTjvw1OFpAod2+skCTFVkAACAASURBVPfaAOSBqTeOPQ14tMBS8PsfeHbdd/8+coGyKWuy9iso3OaTXW9b/loUEVhEjRAxKplQc1dy6623dgD4Qjwej5H4TOmaLBrRo7a29l+pVEc7gNoihw9ZuXLlyQDuLHLsbYWkzcnk/F5lE08k3IEok+uOxDnxePz7yWTyRzs+wt2DCYWbIUuuZ3WD+C8AJuPYS43MAYFRvHJv5FMWHzZcGXxQ0H+WnbP6FgCY0ly/UsCRU+8aUbvklHU5wUBxhiClAytuAHgDAODH6jrr+AqyLnYXbiA+DQCW+Cni8O1Cc58T/GCPB9DNFUnkSQY8TdKvlzWubp7UMuZoBnFnu7VN8JsAIMOPP3D2qjcAwIj9EZikFQi3qXchkt6IBlFvvV6TuRYAlqdW3TglWv86xA+OfxDRh45DuZx/AAJNluB4Qbn1uskt2Aix0LBDjAOAgN+B0EqsTE1pGXMdYP4n4kQ+BOCPuao2iCJiaCjoh5JWRIe0fT61ud9YWIBQqawg5aE2QygWOzcBABb21+HYtk5pqb8b5LQJi0cfdR/WPp6taOS4oeXeb0DoKTzVsW/L2OsIfj9Ge4YBgsjk8Xj8/Hg8/jvXdf/Pdd3xRTrdKUi6DCibiRjW2n2yn9kv3YRMBIwg0NS6FDoAkNXQbBftrfiUpboclwRr7Iyig6GuCsadFZv5DgfM7csdE7DqDWJTBxEzQswIvuWvuzY7bdq0gWEKoatc1/2B67olo1f0NR0dHd8CUC6w8qCpU6d2exG67rrr3pJUNPgzAJD8Vl+Mb3vZXTkHAcBaXNTz1Lsudl23m0bydkFE+FZvK7b8Daa0cPP909Y+m/WDIsyT2eM2HTuLICXkjLpEPEXSyWyuzU1jTbxp1IEAh0N65IGG1W8AgIBnJTz5Ro3fbf3SAFuLDOdsQO2bUmwBAMk+FYwHRcOGEfy0gFc7opu+E7TJjqDfwrRPE24cfTTBekHL7j17Ve5vQCwebqpjY/3RJAcDuCtrtIE4fAH3kBhQ88KoiozBIsKUcJyd/qnSU6AKDX4s3w8AaaZvze0zQYBuSUVN9AVNJzjIOrpoySnr2mkz4UIOex26DwBYwteP4gQA8Gts3kuxHgOASIZHFVbGSQCQ8TN/z+6yxJLgECeY2bNnDyVxXxgK6yJj+B1j+GAi4f739gy6t3ie51urxeXqWGtzbx7Rg9b/0G6NvlGw3hYBGA22iKKL8LLdhRgsJNvteJcpzQ8WG0v0tKeXWOmlAiGWFXRdthkfeL7V4vVtBjWOUOsIMaNli2cXWnQ1NjYeVltbs4I0vw7jP84h8XgiMaPUWlefsmjRolapvIZ10EEHFX1DK587DafPnDn9/Ts6vt7iuu6n4nH3uU2bWlPxuPtcPB7f5QlKPc9rI00jgI2l6oS5Ef/muu7IXTi0PkNSHQBYqlcZJyT9FQCMNSsh/duaVGeA8MBnEzZic7MmgjYCgO8zZ/BgUjwurJ+z1ru3YfX3ljWuGp0TEGWYsmjMAQQPgfSvlfGVWwEgk05vDAdYNCUNwQMB+8NOCz8Wjb3rZMwHgmZQ8Fyjis5wgMCRwbbwZYjQyuA8U5FwU2CVDilc8wKwrHHNycsaVn+0sEMdIeHNfCvPDFMrw2ssGoKP4MGCFi8/e02hoFSfWNznNadjBLx6/5lP5Rm9mXUAYGm6vnQcIeiN+6c/9WJ2hx/liuwxk8lkLiNZxBqOP3Fdt7j20seQLGsy7vt+7kJ5MNpgzDWIAoiGQq1LCbQv20XA5Ze8/chqeF3r4CAlu1sPXUxYCy7oJti6aG0dGeCFVostHUFG7jpHqDFCjeNf1rXNSCRyDcmCIMQkYxKvnTlzesXOjjuCpJLmzJIURknpRlPT/L+jTPxRa83vXNftPiW0k4jH4x8zhn8kOQIASI4gcUMiMeMju2oMWZqamp4D7EyUCX5NcgiJhdsTvPrtiIRUKrr5ZgBYOn3V8qWNq9+//Oync1a3hCYA2nLfWWtXdO7jWwBgYPOmscxhACBou2LfygbrUJadVsu5NSGW0kb0+voa/889tU1gfLC19+fvL+XUDAYarIRn83dbhlaoXZ4NJRFGAoAcrilVZcqiMQcAHAiqoK/7znp2vaA0VFxrBQDKdrMk7UuOvm1Y/yATTRdDNwUvN5TN5WGceNOoAwn2h1BQ94EzV64HlIEwwgAqMJ3Nh8Q1vQmmu72QKpu3zHGcAvcBZ0vdL+CbDTlNrZiAyxNq+dOO+UJMpTS7cH+7UXFndKPbLToFmwULtLbN7cKLG4VtaSJliRpHqHMs6iL+47c/uapgGm/WrFnDGKrX3e8LY9aa+bNmzRpW7HhfYgzKxbosZw0nhAvIxSB5BMlfbP/IKmfmzJkHA7qyxEh2i1N5U9P82wD9b7k64T36C96mBiZGpmLNjdTjpXybwijxwyU9eczCEYOOaRkx5Pibx+0HdY++k30ZJM2r2zdqHg4ABJ47pmXEkGNaRgyZtGBsdtqzIOAvFYROk7SwEq1QwGgASNdEVhYeUNG4uZ2WnFpXsB/mhbDfyqIPEQcBQCbCkm4lNqMDgz4L+wIhiC8DKLGGppeXNq7tXZooqlTalqIM2jIo+5zbkr/f0gYvh2TntG46NOIhChWjIITvKwAGGgAl3xhJDiBxW2Nj42G9GWRvkVhy6krSM2HYqc5xHbfhFRI/KBBmUYCxztKpjXXV3Aq1OdlCjU159XLWYF2ItJslUmesyKxgS1vi1S02s34r0GEDjS1tiX6ORb+IUOfoW7i48C3e2vLBZUkeZK1/y+zZs4dWfEN7D6XSgWVJPF7qGADU1x/xNwkPlDpO4vPx+IzP7cgAe+KMM86osdafH65ddEPCPsX27wqamrz/Uw952UhMj8dn7JKlgL5GsBUbFUgq6RsZfenwEQQNad43AP02DkC/jbGUXiH5CQCwDjfkNRS4IVhtl3CjFPromWuyfRmD58LDhe4ZDJ6RJJ5EBZAYJqjjgQ+vLBwbS/7G9gKAjLEF9X3ptbDByuLQCsME6YG3VpY28HGCFEuhAOgyPLWCxcP4Cag47FXuHBUKqZ6wJuxb6LKGa+qC3crJAcPI3uG4ulnqUngTRD8DlH4oAQDJAyMR5x7XdXdKoN7p06e/Fyhuah70HywQduMA+ztG8UA3ARfNF3AqIrSyAi1faysh4Eq8d/zs7DVbfOC5bJR/H0Rru1pf2Kj0lpSJdNhAY+uwhEOhf8SiLuIvuvu8J/7RtS1r7dOSerI2e18mk/5XIpHYKRG04/F4Y3YarxgSy76xXXzxxVbSF1B2+s1cEY/PuHAHhlkS13WdgQMHXlM+mDTvK31sp6NoNHo+enhAkOaSRGJGUTP0PRFDBr8QYmCl55CltTxmnKEAIGiDoKWSXZJX/rqtrjXnJ6bwpdzQrzA3mgoEhBi87EhaUdAP9A+RRV05RJZcPy2oBwxh1nIz5MSbhg8lWFxzCwWKhQqEgQM/+wSqNMj6QAibES/15AKg3H3oJngE+QSziU26HtzpOeh8PxL8bZD9C49oXwCgmAsWIPnZpY6iApRg1Ej4jpTz0ioKyQON4b/j8fhX+9J3yXXdfRzHzC0RnxAAYC2SxccECwfnMYr2Ao0t/zO6CDVZwBYRdtnPtnCfYabkD9FarLUg2jJ87aVW++qGbWZIh2W0wyc6/ECwpSwxMGoxIGrfHEi/m2M4EBjUkOrR3y8In6WH+9rIxHXdkSSuKldH6tl1wfO8+wGVy5llSHNVIuH+vC+tGKdNmzaQRDOJckYjb5H8v77qc3u4/vrrN1urBknFrPayGMDM29kzJX2FpFDDYcXCLf/tuyvW5B5q1y9rWH3issY1J+eV8x8/7bXO3yN756Nru8Y5DA0hfOqsgn4aVn/o3nNWdXMDCM5RNyfiYhAcJLHAdN+m+52aO97Fx0uSAYC0MiUe1H0ToxEARIfBFsWmV7cAwETvoO6GLywcM41pC8ZW1Ap1u2h3tr0etlngcE8xDFpun+7cZ8IxqoiLRGDoYzzPuxPgJRX0HSXxi9WrVz3suu6pPVcvTzweP57EsnIJGwGsGjdu3G2lDnJvrGYNvpov3FhTuC0lvAqmJG2JOmDJKZSUxfqXN+s/L2/BsG2+s19WoLWH2w6fqHUsBkYs6iKZ85d8YmXJ6ZOmpvl/lFCJ79sgwMyNx907SoXE6g2u636YQVzAMlkdtMjzvIpSxFiLH0thRIGS8GubNrUu7wt3k3g8PrGurvZBktN6GNlXAuOO3YvneSslfKKHakMjEWfhueee27+HersdKTt9ZyoWbn3Wd+j0s92weCLNsn2WcDwuUrO7kBI+rNCZll3zudGkAaDGRosuEUnsM60p8PsrdTBYW1wef7GbFShhC8acsaFwZGUCvxIea1jXKug1CaMKs6fzREl+ayaSM9ARS7ufiMF9NgCQTCbnAPIqHMMxxvCORCL+aDw+48KZM2cWNZsthuu6juu6pyYS7gJA95HswQTafit09i4Jh+Eq1uDPxQQbawAaBQKrq8Zm/cLpyK4Czvc312BtNyvOuzQnsuyZS7+RsfseviXtHNXuG7T7RJtPZD+3+wYCMDhqMTCS+eHDn3zipp7uzbZt2z4NqKKpM5KnGsNH4vH4Etd1Z/dmPc513Zjrug3xuHuHMbyJ5L5lqqetxf9U2rbneb6kGQAe66Hq+0g8EI+78+Lx+PGVtp8lkUi8L5Fw55K4F+HifSkk/ampaf4fy9XZlXieNx/Q/ytXh+RRHR0dPVrl7XYcExoaFTed7y0RE2gBFHrUVAhtAwCZyHYZ4Si0wLThHE9F0FYakzUDqlOzFAjyDAr/KT6YwJUiGnEKXmhoTPC7Zs8O3ABAIoUehL7ohJoWuxuQCXsJlbl1RByzU16+CCwhEWO0XxDHc+Go95MYBSLnshFUDLUzmG5r7ATeI2lT1kdB1uJjJKIkzqlwHMeQ5irJXhWPu48DeJjESokvknYLoK0AB0tmiKSRJI4O844NDcbWU/P6Y1PT/B6FAgDwQHyWT+NQxnAKawBkAGYA+gB8QG9ZSARFQAwiwhmEnxF8BgLfb5M1WeNidpm7/vvKzx+hJ/1rETHjN6f0cFuettbum1DABWXvGh8DIv6f/vOZ//wAF/R8DTfddNM213VPJ3VbpYlISZxE8iTfz9h4PH6/pMdIrZb4CsktANoADJb0njAN0bGATmKFC9SS/b7nzS/+gyyB53mbGhoazojForch9N8pPnYSQTSCRCIRX2GtFhqjfxkTfWzu3Ln51pl0XfdgkmNJvR/gRwAdU4lhoYTFQ4YM/Wxvxr8rsBbfITU+CDNUHBLxeHzG/cnk/N2eZLMU1trnTfB+XDCNOn7x/v1q0oM+LZlF905fta742d3xkWl1EIOtzPT9TQAwvnKzDuOb6/evdVS/9Ow1d/V0spE2gkTM6EBsh7FEOSRuAJW7hokt9e8lsZ/I21k0L6DWA4QfzKDkzPhldWAwh9hzYOqgGjaS2GdcclxsZXxlCggCVhtLLWtcvQIAjDIbgAhYbLaGOJDqOU4oAMjPRLmDLm7FjL986RqHjBPmsinN9UYWl4T5xbrk9jTrg4iJKvZyfgCI13JvF57npSTNqCTWYJFBHk3y4wB/RuIGwCwGnLsAs5DEX4zh98Opo4o0DEm3W4vPV94/UmYAzmIN7jc1ocaWX2rROQ1pLSC/cP0tX4uz2enKTGeEBIE3/ucTXwciDxmY8YSD19q2DWrzibaMQVso2IJiMDTmY1A0c92Tez12Yej2VhGe523atq3tFEk3VnpOiCEx0RheSJpfGsN5JG4mcSeJlsDvC98mcXrlgk1/Sibnl9UwStHS0vJKe3vH+yVVmon5SGP4fcD8w1r/1UQi3haPu63xuNuaSMStMVxH4u8Av4cKk4ZKWChpxtVXX13RW++uxPM833EiCUll/TtJ87N4PF7UTWRP4L5z1jwvaFvWrytL1B90DmkuNwYN2X2mgkgWG6J8QZJPqCC+4eTmMXMntdRfU1CZgSm7aHNuMjHom7DmzhMWjuzRfUmhZaT1mctIMLll1LGTW+rXTFo0tqJ7bmWLP92pVwnWHN9SH4YnU1yQFezdReuHY6HPQoMxmawBSqXC9zkA6BfryN0TI3MtiJywfwup58KPBX2FTu2DQJT0kdsVLG9c83dASYKHg1xAcqykRcvOXlVge6EOrgMAigUvVmHkmoGQ1hQsynqe5yeTyS9Yq/OkIvPGuwR5Es4OM39XDPfDW84+OM3EcFdWqJlQsLEGYESA/KDY7DSkXyjgbPZ45r5+5750KwC0PDJ1SPMjM24mnMsMnRrSIC3pjfbMIdsyBtt8YluG2JYxaMsYDI5ZDI75v3zmosfOL2u1VIKbbrppWzLpnSPhv1XhAnZfY61+PnbsuAuA7UqAACAX9eRkQJdvx+m1JAeXMuvvCWv1M0kzevs3tCsJsgFwhqRyflMG0C7NHtErCAvgfoAHTGwelYs/SpljAMDSvthZuYQgyCP0IVsF4Ygpi8bk1vFInkQUzijJBmb5pDk6r54BAGMjPbp9ZCP0E8rNkhAcTXA0/dLW2wWwpBvVKgCIUGMgkOAsCstQIqIJLJ8BAIMurgLEKQDAaKqi2ROGQjCqaN4LoMi84MbhutYbBI4ev3j/nAuHtZwKABK65cPbUU68afjQ0IexIoTQ5UO63sJvWNawurGrkrA8vvJNCW+COjZ/fc6keQoAgFhR1OLI87zrJBwJqLnY8Z2BpDZAX2xq8hKe5xX/I+gB7oVN5gh8iLW4jrWhYKsFTPazUZ4RiZ8n4Pzcmpus3warT5PQNcsnjGrP1C0HnTOI7H8Gd7/45Mo234ls8w0CAWfQYYkhMX/b0FjqvOc+++jXeqOxFbsdyWTyp6R5r4R7dqCd3rJBwgzP877R01pnJXielwoyctszK02vs4O8ANjTPc/7dpjAtWJI7si/13aRTCYfQJiIsRQkjwic0/dMJPwDAAzN+dl9Jozgn4k6ORcSkRX5wpG4m6QDa+IAMH7x6L0VWM8VBHLw5QezAsK0rOm6wCDogtNzIuBUKr1cQgo006feNaI2uJZQUJrKsxwUvQYwMHywPGnSwvoPAxwuyCtl9dgRtf+U5ItoyD6oJzaPGktwMoAnlp71TEVJf30GMyWUpgE5p/hDBHW9H7cBrK1ND8pp1lQQRNqnbu7d1RbDZADAhP/mNtX/kdgLY4tboHYhyNunz0h4MjJ09cfvbVi7MHyJKoK9DWAtowNyLz6E+WTwwd5c0pzW87znm5q86aQ/UdLtFV9X70kDuiaT8Uc3NXlXYge0BSCYoowejfNMLT7HWrSxFmBdZwHzpiFDbU3hVCX8TBp++qMDPvXait/fe9RRBrFloDOGNAiKA4C4dtVjsbcyRLZIwF6xzNJBtR3jn/3s4xX9I1ZCU1PTimQyOdVanQFgZ6bIeUvCZe3tHaOSyeSCvm68qWn+rXV1/Y4A9B1Jb/R8Ru+QtAnQnFisZmwQEaT3kH7JtSESlUe97yXJZPLPgK4uV6ejo6PHqBi7C8X86wR1APzKxIVjGyY3j/kegCMg/TvfidmoSFT+Yji8KogVpJ9OXDhmdm2av2ewQl8Qp/H+6U+9KGgpwDFTFo65eFJL/SxKpwt6dvm0p8sGYgfCUFtGfyOwX7q17m9TWkbHQXxekp9Cups/ajGykUu64kczfw+mV3kRxV8Aau+I6oZidQHgobPWbiCxgOAwEx142cSWUSc4dP4KAJbdc6yVwsb8mwKDEHP+lJbR8dgLYy8hOARgQdxYmWD9SuRPpjSPPnHywjHfJXmqpBX3nbOmwK/YUeieoUKtUzT9gOJWq1QwPSph6pSW0WeQxfO2FaMWOpVgFNRjS04uP/NlEVyHAS6d0jz6xOBvj6dAemzZ2U/+u0dfkXnzFtyXTHqnWasjAP2iAofjipC0RsIPSHNIU5P3yebm5hd7Pqtyou/F72I1OJK1uDWnvdWFvu45Aed3rsH5mZdpMx8aeMGmliuXHTqCvvNPwOxNGATFAWFww9pVj7/alhn1VsbgrYxBraMX3lOT/syGNx4+ad2FK1b35TVk8Tzv701NyfESJkn6U99NGetByX7VcSIHJ5PJby5atKi1b9rtzrXXXtve1ORdWlNTO0Kyny8X0aRSJD0e5k8b0dTk/fC6667rVQDffF59dcO/Ja0sflS/3952K8FafBHQv4r2LN3Z0tLSm+z1u5TlH3nyJVA/JFjjCM2kuURSm5X9Wn490QR5EKWyv/Ol01Y9AeH/CL7HkbkeNI2CXjA1mZ92rUvLbwhKA+Z/DHgDSUfSt7vMmpT+rdjUd8KEqdMBpykQBLg0P6BwOPrA7JxdpxXlBNdUmFFj+UeefInU30iMIDFKws8fOmvtBoSpfUTb7aGdgb4tqJXA5xxE7gN4HGRvvze1pmJL3zDY8P+SiAFOkwG+JWizNakf5te79+xV9wj6G8GDQedflPmxoG0+8fGuM05+GBRbLLxGY0NrUHW35FzWsPoJQSsJngA4twAAu1njF5+itVE9JGgzwRmTF9Yvyq5bFmN54+olgm4AOBx0/kWaSwS95QOfBKFem9HOmTPHrFy58r0kTwc0GcA4AIeUc8SWtJXk04Aelni/7/t3LFiwoKJQNn1B+l+YkNmKz2gbptk27KM2wLYhMI00XGvIvwyoy1zJTwU/hN8sOfyeWGTw+2sigxCUwaiJDMKSV7asveyxlYdmrInWRfyVAyL6zevD2v+I0DJpV3HBBRdEW1tbJwH4LwCTGAReLTt1JakV4JOSHiZ5byaTuaOvXyh6SyKRGA3Y0ySeDOh9YZSUUi9caUmrAawksSSd9m9pbm6u2BKvEhobGw+LRCLzSGTdE9KAftLU5M3py36K4bruYBK/DbOeGyAQbBJmep630zTHvmLSwjEzaDGdYCtgr1rauLbAHWT84v37xTKDz06lU7cUJK0sweSW+ukATgO43nfar7xv2rNFrfgmtNSPj4CfhVQrYO6yxtWF02pJOJOiY863jh68b9rabmHkJjcfti9N7EIrDad4x7LG1fO61pmyaMwB8HHKxozjrcz7rU+48dBhkUzNlMjQtlvy88zlrjc96NuGZuPS9KorEId/wi0jBzntkXNSUXtLIOwKOb6lfnQE+IIBhgG8NzJk21Vd262ESQvHzKDYCGAzHV6xdNqqbuto45LjYkMi9vOATgC4HsAfshaVBdfxIKKxF+pnKOrfs/wjT75UuH/0h9P0H+r+MhAGNk5HvgTYvYzB4qVnrykwkpvcMupY0Dlu2TmruwnvCQtHTXDk3BtES9EzvpM+PT+4drfriNovQDoe5GsQ/pi9jj4J1Hr++efXtre372etHeI4dqAEh0RbOo1Nvu+/vnDhwj6fitpe2hZjuDZhGLYBvvDswAsL48hdecd+IxgZ9FynYBuE1lTtlt+sen3tyo2bB9Y4dnFdNL3w9c8/3rsgojuZadOmDYxEIvs4jjMIwGBjLCXnLd/3W2tra18rFdV/TyLMHjAcwABj7BDJafd9f4sxZsv69etfXrJkyS4xsJk+ffqoaBT7tLVlVu5MbbYYDQ0N+9bUmJFS5LWmpqYep9eqVHlHIZgpC+v/iSDD9j8Ini7o6UxN5n2FaXB65m0ZhXxn8vsHEfXbRn+nxhlc3+4P2vhIK1+486Wta9/Stn+/9tnH99jpoSpVqlR5uzO5ecyXSHO5gOuWNaw6b0rL2F8C+AqAXy1tWPXV3rRVFW5VqlSpUmW3M/KWkTXDOiIvCOhv0+bg5fGVbwYBAQY/C6K/TW/dp1hosFL0WRDkKlWqVKlSZXvZu905BeA+kK5fHl/5JgA8dNYr20gkCfZHbOCU3rTXpynC9wQkEYHQzhbmbfM11XzB3vVYQZModE+wRY7ZvK0FYHeH31SVKlWqvF1xyPcCgMiC8GkWesSAIOzhQE+B2Tt52wk3SYMBHA9gLICRAA4My34A9gHQv0v9Xn0uRb4xaCWfFQRDfQNBUsCXAbwE4EkAqwHcT3KXGipUqVKlyp6MBQYEIX/ZxTqY2fQ6lQe5xttMuEn6PIDLEaaBl5QTTNnP+cVaW9H3rm3lkxVYJEESxpjc52Lf8/b1D8vwrm0AsJJ+SfIbO/2mValSpcrbAINAqDlSPQo0NAbpvWz5WKxdeVsJNwB/BbARwCRJ9ZJGAThAUrSc8Cq2LXUM6NTkugqwYltJ3fZZawvOBZBBoL09BWAVyeUA+iDMTZUqVaq8M/Bp73BkIOCL45OHXfdQ/JlNJ940fKhN4zxA7SbW3qtQhO8Ia0lJAxCknR8AoB+CtOx1AKK+79cCiJGM+r6fi+1mra1B3rqbtbZotHwTZpzNVjPG5IdCShlj0gA6ALQ7jpNGkGYmW7YiiJDwVnUN7t3BrFmz9rY2dWRT04K7d/dYqlR5uzG5pd4jOEPCOhD3EJoKcDignyxtWP3d3rT1dtPcikJyK/ow3XmVKtuL7/vXAs49AO7e3WOpUuXtRkdk0/k1mcHtIGYTPFdiisSvlqZXV5w0Ocs7QnOrUmVPYPr06UdHIuakMAB4lSpVtpMTbxo+NJOpOyidSj9fSbi2YpQUbq7rjgRwLAAfwErP83JJ7ObMmWNWrFhxpAkXlLriOM4b8+bNe+GjH/3ooFQqVZBMzhiTiUQiz+eHg3Jd99D169e/UC680uzZs4du27bNLFy48A3XdUd6ntct1pjrunUATjRG+0tmo+M49+dndW5sbDxo4MCBG6699tqCeG1hvMzjEFhfpnzff7i5ublUihbOnDn9BGudEQC2Oo7zUJfM0QXMmjVr70wmk598MZVKpV4uFdYpkUgcaW3J3FebPM97tlRfeX0Os9YObmpqKprksNT9K1XHdd39otFoxw033LCx3DnTp0+vX7BgwWoAmDlz5gG+7xfLkgsAGDp06BNXX3112nXd0K+ulgAADchJREFUozzPK5mvaubMmQdv2rRp/cEHH2w3btx4RLn+Y7HYM8XCjLmuO2ncuHH39ZTG54wzzqgZMGDAFAAHGqPNZOSBefPm5dKfNDQ07D9gwIDNRQI003Xd95EcDcAn+Wixe++67vCOjo6NN954Y9Fgvueff37tli1b9t7dMT+rVHkn0O0h6rpuzBj8GcB+Ev9Fykj4cjzuxiRc6Hnef1asWHFkJOLcJOHOIm3C2syjAH6VTqe/HARYRu5BKslJp1NHxOPxZxzHuWju3LkbSH593333fQTAn0oNNJNJ/yIajf7/9s4/SqriyuPfb72egcFFhCiYrNmAxyQi62ZXjaB74rjZE3WzKMz0VL35YZCQFQMYjLrIouIAskbEBMVjfqDBDArOezUDAyEGiPjr5JebFZIsOGRX0BPZFXQVMoZhhumuu390Nzx63vRMw5z8s/05550zXe9W1a16PX1fVd2quwnABhLbcHJoexpj7gTkyyLYLqLeBHBROp160BizQ0Rus9Z+UFbmLenq+uMaRKaMtNbX7dnTvpzkr0n5LYAKMvE1Y8yxVCp1S9TIVVdXn1dW5rWI4A1SdjmHs9Pp1HJj9Gvd3cfmxhmsVCp1D8nPAPg9AJAyZOjQ8gt8Xx91Dg9Ya7fkZGtraz8u4p4nuSW/nGzefQCWxN2Lkk6nnwDkU5WVlX8Z98IQ038xdeGXyIaiJ3lXKtVzSWNj4+f7MhDGmJtJLAMwCgBE0mtIdgL4oLe0SEdHx30A3laKv/V9fUsQ2NiwL86llwwfPvypjo6ON0ncBhzfb3EBiVEi+LcT7e5aBeDn0fy1tcmJzuHFPXt2z0TGISkW39ezRDBXBC8ohb0i6kLALTbGvCEit1prD5SVlc3r7u5+BUBbLp/WupLEShKvi7idAMoBzjRGDyHVzCAI2iN9uriiYsjYysrKL8Q9l87OzollZV4VMscNlShR4jToZdxIznVODlhrb4ym+37yahH1FwD+IzNikx1haKcXKlxEPABPWmt/kH/PGHOTc6n1AK4i+V0Sz6AP46a1PofklQcPHrw5m3TSiNEY8xggZ4jgsmig08bGxrvb23fPIfkIgGkiVNHYBb5fo0U4j1RfDILm6MnWS3y/Zkoi4b3g+/7VQRC8BQCJhLfaOSyKGqTGxsa79uzZPWPo0KEfAdDLuCkFimBlGIZt0XSt9UVKYbUx5jNhGC7L9ZeI7OmvXwuRTCYnADIU4POjR482AOLiSA3kZJrj3w1SFMDz29t3zwXwSL6g1nocIHeI4LizjQgSInKftfbXhSoRkf8C8NXa2uRvmptbX+0tQZJp1dwcvg3gy5E6p5P46zC0BQ2Bc2q+CG4EeA+ApxETL9D39VIRfLqrq/vyvFHVvVrrGUrhcQDJzIseI/lq/gHgNwBW5x1yvNT3a64RcT9OJpPX5UazACmCw6NHj14OoNc5eUo5lg4NKlFicIj5T5IrSbbkpwZB60vW2kFzXw/DsEkEw6uqqj4aBMEuEXlXa10ZJ0vyZkCejHvbNcZcC+BiEfxTfgTvxYsXuzBseSwM7bT8fHV1dWcD6iERuaG5ublXyIYgaNkI8F4R951I8sVRw5arIwhaniz2BHdr7evl5UP/HpAGY8zfFZO3EImEuouUh1Op1LeU4p2DVa4IFgKcnUwmL4ymNzY2KqWwWgS3Ayg6qCbJThEY59T3tdbnDpa+AKC1/jSAUdbaFhK7fb/mH/NljDGTRHCdCBpipgvFWvv9ILDJmLL/DFDfBjg17tkHQcs2Um71PO+paDrJ+0l8Umtdf7rtK1GiRN/0Mm4i2Afg2j9F5SSZSCQk87esUApz82UqKysTgEzr6jr2RHwpMpt0S6y1BaO25uNcappz8oy19kBfMmEYrgUwrrq6+vysvv9rjJlUTD2FePrpp4+QMh/AoGzmzkxrcnwQtGxbv379PhHZlzX+g8EfAN7ieaop80wyZEdz7flGvxistW+IYD6J5pkzZ5YNirYASMwTwfLMJ7VchPN7S8lsUh6w1hYVk4+kcU5+mBvVxxEELZsBUb7vX5JLc8657u5jN5L4l2Qy+VfF1FmiRImB02tasqen5xvl5eU/NsZcKiI2kUhsi3OYEMEw3/fHxuRPDWRB3BhjADmUMy5B0LLFGL28urr6vGj+MWPGVAN4vkBcrctHjBhV1Oa+jP6cOIAIy0LiBc/zJgHY55zMIhForTeT/FFnZ+dLmzdv7iy27igjRox6/vDhQ025zySGxvWrc85Zawvu0HfO3U66R0+k8CFAHgSw9XR0zBGG4YvGmJ+NGTNmAYD7M6M4zjhy5GiswSf5Md/3ez238vLy9/KdMqy1PzLGXHLo0KFvAr1fcoqlqqrqowAutdbeDABBEPzGGH1Ua32FtfYXEdFJnld+W7Hlk3IFwH5nMkSwnXQTAezIpW3cuPGw7/v1nod1WuurrbUx65IlSpQ4HXqN3Nra2t4fP378JBH5NoDPOpd+0Ri9w/f1rVprLyJ6MeAeyb8SCW9F9M1eKUzVWi/KXcaYR31fbyWlSqmEjpQnJB73PG92nkpzSK4s0IbyVatW9Qp13h+knOV5biDB7z4gZTgAWGt/KoIJSsmrpNQPG1bR7vt6q9b6C8XWnyOr+/HnIIIL4vpVKaxoaGg4s69y6uvrRwJy7YED7wW5tDAMfwUwUVubvOxU9cunoqLibhJJY8xnM1NunNmXgSdlXlxburu7r4uTD8NwKcmxWusvna6eiUTi6yJ4FJE1NhEsVwr5o7ezenp6ig7kKoKzSBfr9RiF5Acime9PlCAIdgFcqhSeyfu/KlGixCAQ63Ke9Yjbkr2gtR5H4gFkDiueAwAkXg0CO7W/CpzD70lGnArkQRHeEYbhc/myR44cbTrjjGE7b7rppiVNTU1dyWTyb0jpCIIw1qU9yx/q6urOfvbZZ3uFbS+ECPeLeOcD+Pd+RMeS+Fnug7X2j8h43a1BZlvAFaRa5fs19wVBy/pidAAArfUoktEfyV0D6dd80ume2YA8kb8uKSIPOafmA9B9ZC2KpqamLt/3Z5DyonOy0lr7y75kncPt/TmU5CFlZWU3plI9rySTyV2tra07T0VHrfUIpXi9c3LSxk9r7U+M0Q9FtywA2A9gHCIevQNSVLCfxLgBiI4lERu1PQzD0Pf1ZSSXALinmPpLlChRmAG5Zllr3zxw4N0vKUVzCnXsCMOwLXel0y4JyGNa6z/PF8yMAGR9V9eROgDwPDXXOawoXDy3ptM9p6LXVkAaCglknAZ41dGjx2J/nABIc3Prz5Vys0TUV05BB5AyzTlp61+yb7TWFSKYAXCqMfql6EViHsnPZfctDgpBEOwQwfUjR47sd1tCsaxdu7bDOalPJLw1U6dO/ciplEHyqyKSIrEtpj9SnufNOyGLrWTx32uSW0QK59NalwPyRee4vS8Z57CAlIla66pidShRokTf9DJutbXJiQXkBxwFtS9aW1t3i2ChUgjjnAd6etKPi6hZWutzAE6w1sbupctB8mGA86urqz8Rd19rXR43bXjw4MH1AMb6fs2UAsU/DMiTmzZt+rChoeHMfE/BHOm0SgFStKeg1vpSgHMALCs2bxSlMJ3Es2For467AHeXUpjXb0FFEIbhK6cyHTwQrLWvi2DRkCFl65CNADFQsgZleldX99/G9cWBA+9eAcjnamtrPwYAx46lVgJyS9azMq48L+PyfzJhGG4jcUY/U6j3k9hgrX2vLwFrbbq7u8dXiksANb6YtpYoUaJvTjJujY2NyjlvqTF6Tc5DEAAmT5487NxzR68AxA5GpdbadSLcefjw4Yfz72WdSd4g8RSA7/ZXVhAEe0XwtbKyxHZjzPWNjY3H25SZ1sR2pXB5fr6XX345RapqES43pubOyZMnD8vdq66uPs/39TNKYYRz+FcASKVS53ieajPG3D1lypSzorIkHhHpewN6lMrKyoTv++N9Xy8msSaddslCHpv9obX2RDAn8yMdj3NsFsHn6+rqxpxqPX9qwjBsdQ6vkagpJp9SMo3ED/s6BSQzbSuPiaS/DgAbNmx4h5QZJJ7z/RodXf9KJpMTlMJWERW3RUWcg1GKC4wxCzOj/Ax1dXVjjDGrlMJFzmFBfzq3tbW975xMF8HSYtpaokSJvjlpzS271naN79f4iUTie8bo0ThxRNc65zJu1el0+hDpfcL3Tex6igheC8PwK0rhfwCJXQsTkTtIbKyqqhq9YcOGd/PufZPEmg8//HBtXF4SJ9Vrrd2UTCb/0/PUwj172pcZo7tIlgHylnNYEIb2p9ly3xJRx733giDYW19fPzGVSs0fNqziV8bobpIKkA5AvhcELeuQdUgIgmBvQ0PD5T09PbOGDCnfaowuAzCExPsiXGptGOs5JyJ7SS7yfbMom5QG3Nsi3CIil7W2th4fDTvnOkic2Xe/yr4wtNXRNOfchERCPZffh3n9c8z39bec67kKgCXxu77qANySzNohj6+lZdYn459jlOhzEcFOpfgD3+89cycikk67Ga2trTtF8LteAidYKIJPkYlex36RfEcEI2O0uNI5FDxkVYRPATy+uT0IWrb7vn+NiLtXKS42RncB8AC+45wsszb8STbffkROXLHW/vcNN9wwsaJiyD+T/IUxuoekSqdTnaSsvvDCCaujJ7qQsl8k/oBva+1rxpjbRNzHC+leokSJEiVKlChR4v8p/weRBXcs16Y4twAAAABJRU5ErkJggg==`;
}

async function appLogoDataUrl() {
  const candidates = [
    appAssetUrl("logo/Logo Soser Png.png"),
    new URL("./src/logo/Logo Soser Png.png", window.location.href).href,
    new URL("./src/logo/Logo%20Soser%20Png.png", window.location.href).href
  ];

  for (const candidate of candidates) {
    const dataUrl = await urlToDataUrl(candidate);
    if (dataUrl) return dataUrl;
  }

  return embeddedSoserLogoDataUrl();
}

function pdfLogoMarkup(logoUrl) {
  return logoUrl
    ? `<img class="logo" src="${logoUrl}" alt="SOSER" />`
    : `<div class="logo-placeholder"></div>`;
}

function pdfSubmittedDate(task) {
  return normalizeIsoDate(task?.submittedAt)
    || normalizeIsoDate(task?.completedAt)
    || isoDateFromTaskLabel(task?.assignedAt)
    || new Date().toISOString().slice(0, 10);
}

function pdfSubmittedDateTime(task) {
  return task?.submittedAt || task?.completedAt || task?.assignedAt || new Date().toISOString();
}

async function paePdfHtml(task, options = {}) {
  const meta = taskEstablishmentMeta(task);
  const technician = taskTechnician(task) || loggedUser();
  const institutionType = meta?.tipoInstitucion || "";
  const visitReason = task.type || "";
  const logoUrl = await appLogoDataUrl();
  const showActions = options.showActions !== false;
  const previewMode = Boolean(options.preview);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${pdfEscape(pdfFileTitle(task))}</title>
  <style>
    @page { size: letter; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 10px; }
    .page { min-height: 279.4mm; padding: 12mm; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .header { display: grid; grid-template-columns: 180px 1fr 150px; align-items: start; gap: 12px; margin-bottom: 24px; }
    .logo { width: 150px; height: auto; }
    .logo-placeholder { width: 150px; height: 46px; }
    h1 { margin: 14px 0 0; text-align: center; font-size: 13px; letter-spacing: 0.2px; }
    .folio { display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: center; margin-top: 14px; }
    .line { display: inline-block; min-width: 78px; border-bottom: 1px solid #000; padding: 0 6px 4px; line-height: 1.2; }
    .meta-grid { display: grid; grid-template-columns: 1fr 0.8fr 0.8fr 1.9fr; gap: 14px; margin-bottom: 18px; }
    .meta-grid.two { grid-template-columns: 1.7fr 2fr 1.2fr; }
    .meta-item { display: flex; gap: 8px; align-items: end; white-space: nowrap; }
    .checks { display: flex; flex-wrap: wrap; gap: 16px 28px; margin: 12px 0 22px; }
    .check-item { display: inline-flex; align-items: end; gap: 8px; }
    .check { display: inline-block; width: 44px; min-height: 14px; border-bottom: 1px solid #000; text-align: center; font-size: 12px; font-weight: 700; }
    .divider { border-top: 1px solid #000; margin: 0 0 28px; }
    .bitacora-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 34px; }
    .bitacora-table th, .bitacora-table td { border: 1px solid #000; padding: 4px 5px; text-align: center; vertical-align: middle; min-height: 18px; }
    .bitacora-table th { font-weight: 700; background: #dfeee7; }
    .bitacora-table .section-head { background: #cce7d8; text-transform: uppercase; }
    .bitacora-table .item { width: 15%; text-align: center; background: #eaf5ef; font-weight: 700; }
    .bitacora-table th:nth-child(7), .bitacora-table td:nth-child(7) { width: 10%; }
    .bitacora-table th:nth-child(8), .bitacora-table td:nth-child(8) { width: 11%; }
    .bitacora-table th:nth-child(9), .bitacora-table td:nth-child(9) { width: 15%; }
    .answer-section { margin: 0 0 22px; break-inside: avoid; }
    .answer-section h2 { margin: 0 0 8px; font-size: 12px; }
    .answers-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .answers-table th, .answers-table td { border: 1px solid #000; padding: 6px 8px; text-align: left; vertical-align: top; }
    .answers-table th { width: 42%; font-weight: 700; }
    .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 70px; margin: 88px 52px 0; }
    .signature-box { display: grid; justify-items: center; gap: 8px; text-align: center; font-size: 11px; }
    .signature-image { height: 54px; display: flex; align-items: end; justify-content: center; }
    .signature-image img { max-width: 140px; max-height: 52px; object-fit: contain; }
    .signature-line { width: 100%; border-top: 1px solid #000; margin-top: 8px; }
    .pdf-actions { position: fixed; right: 16px; top: 16px; display: flex; gap: 8px; }
    .pdf-actions button { padding: 9px 12px; border: 1px solid #1d5fb8; border-radius: 8px; background: #1d5fb8; color: white; font-weight: 700; }
    ${previewMode ? `
    html { background: #e9eef5; }
    body { position: absolute; left: 0; width: 216mm; transform: scale(0.46); transform-origin: top left; }
    .page { background: #fff; margin: 14px; box-shadow: 0 12px 30px rgba(15, 35, 55, 0.16); }
    ` : ""}
    @media print { .pdf-actions { display: none; } }
  </style>
</head>
<body>
  ${showActions ? `<div class="pdf-actions"><button onclick="window.print()">Guardar como PDF</button></div>` : ""}
  <section class="page">
    <header class="header">
      ${pdfLogoMarkup(logoUrl)}
      <h1>BITÁCORA DE MANTENIMIENTO ESTABLECIMIENTOS</h1>
      <div class="folio"><span>FOLIO</span><span class="line">${pdfEscape(pdfFolio(task))}</span></div>
    </header>
    <div class="meta-grid">
      <div class="meta-item">FECHA: <span class="line">${pdfDate(pdfSubmittedDate(task))}</span></div>
      <div class="meta-item">HORA: <span class="line">${pdfTime(pdfSubmittedDateTime(task))}</span></div>
      <div class="meta-item">RBD: <span class="line">${pdfEscape(task.rbd)}</span></div>
      <div class="meta-item">ESTABLECIMIENTO: <span class="line">${pdfEscape(task.establishment)}</span></div>
    </div>
    <div class="meta-grid two">
      <div></div>
      <div class="meta-item">DIRECCIÓN: <span class="line">${pdfEscape(meta?.direccion || "")}</span></div>
      <div class="meta-item">COMUNA: <span class="line">${pdfEscape(meta?.comuna || "")}</span></div>
    </div>
    <div class="checks">
      <span>INSTITUCIÓN</span>
      <span class="check-item"><span class="check">${pdfCheck(/junaeb/i.test(institutionType))}</span>Junaeb</span>
      <span class="check-item"><span class="check">${pdfCheck(/junji/i.test(institutionType))}</span>Junji</span>
      <span class="check-item"><span class="check">${pdfCheck(/integra/i.test(institutionType))}</span>Integra</span>
    </div>
    <div class="checks">
      <span>MOTIVO DE VISITA</span>
      <span class="check-item"><span class="check">${pdfCheck(isVisitReason(visitReason, "maintenance", task))}</span>Plan Preventivo Mantención</span>
      <span class="check-item"><span class="check">${pdfCheck(isVisitReason(visitReason, "dt", task))}</span>DT</span>
      <span class="check-item"><span class="check">${pdfCheck(isVisitReason(visitReason, "mutuality", task))}</span>Mutualidad</span>
      <span class="check-item"><span class="check">${pdfCheck(isVisitReason(visitReason, "emergency", task))}</span>Emergencia</span>
      <span class="check-item"><span class="check">${pdfCheck(isVisitReason(visitReason, "record", task))}</span>Acta</span>
      <span class="check-item"><span class="check">${pdfCheck(isVisitReason(visitReason, "seremi", task))}</span>Seremi</span>
      <span class="check-item"><span class="check">${pdfCheck(isVisitReason(visitReason, "sec", task))}</span>SEC</span>
    </div>
    <div class="divider"></div>
    ${pdfTable("Calor", heatElements(), heatRecordsForTask(task.id))}
    ${pdfTable("Electricidad", electricityElements(), electricityRecordsForTask(task.id))}
    ${pdfTable("Frío", coldElements(), coldRecordsForTask(task.id))}
    ${pdfTable("Vectores", vectorsElements, vectorsRecordsForTask(task.id))}
    ${pdfTable("Agua", waterElements(), waterRecordsForTask(task.id))}
    <div class="signature-grid">
      ${pdfSignature("Firma Técnico", technician?.nombre || "", technician?.rut || "", technician?.cargo || "", state.technicianSignatureData)}
      ${pdfSignature("Firma Encargado PAE", state.paeManagerDraft.name, state.paeManagerDraft.rut, state.paeManagerDraft.role, state.paeSignatureData)}
    </div>
  </section>
</body>
</html>`;
}

async function openPaePdf() {
  const task = selectedTask();
  if (!isTaskCompleted(task)) persistCurrentTaskProgress();

  setState({ route: "pdf-preview", pdfPreviewBusy: true, pdfPreviewHtml: "", pdfPreviewError: "", pdfPreviewZoom: 1 });

  try {
    await ensureRemoteSubmissionRecords(task);
    const previewHtml = await paePdfHtml(task, { showActions: false, preview: true });
    setState({ pdfPreviewBusy: false, pdfPreviewHtml: previewHtml, pdfPreviewError: "" });
  } catch (error) {
    setState({ pdfPreviewBusy: false, pdfPreviewError: error.message || "Intenta nuevamente." });
    showErrorToast("No se pudo cargar la vista previa", error.message);
  }
}

function pdfAscii(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ñ/g, "N")
    .replace(/ñ/g, "n")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfString(value) {
  return pdfAscii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function uint8FromAscii(text) {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index) & 0xff;
  return bytes;
}

function concatUint8(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function dataUrlToBytes(dataUrl) {
  const base64 = String(dataUrl).split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function downloadJmBitacoraPdf() {
  const task = selectedTask();
  if (!task || state.jmPdfDownloadBusy) return;

  setState({ jmPdfDownloadBusy: true });
  try {
    await ensureRemoteSubmissionRecords(task);
    const pdfUrl = String(task.pdfUrl || "");
    const pdfFileName = String(task.pdfFileName || `${pdfFileTitle(task)}.pdf`);
    const isBitacoraPdf = task.pdfFileKind === "onedrive_bitacora_pdf"
      || (/\.pdf($|\?)/i.test(pdfUrl) && /bit[áa]cora|bitacora|mantenci[óo]n|mantencion/i.test(pdfFileName));
    if (pdfUrl && isBitacoraPdf) {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error("No se pudo descargar el PDF desde OneDrive.");
      const blob = await response.blob();
      await downloadGeneratedFile(blob, pdfFileName.toLowerCase().endsWith(".pdf") ? pdfFileName : `${pdfFileName}.pdf`, "application/pdf");
      setState({ jmPdfDownloadBusy: false });
      return;
    }

    const blob = await generatePaeMatrixBitacoraPdfBlob(task);
    await downloadGeneratedFile(blob, `${pdfFileTitle(task)}.pdf`, "application/pdf");
    setState({ jmPdfDownloadBusy: false });
  } catch (error) {
    setState({ jmPdfDownloadBusy: false });
    showErrorToast("No se pudo descargar el PDF", error.message || "Intenta nuevamente.");
  }
}

function dataUrlMime(dataUrl) {
  return String(dataUrl).match(/^data:([^;]+);base64,/i)?.[1] || "image/jpeg";
}

function nativeFilesystem() {
  return window.Capacitor?.Plugins?.Filesystem ?? null;
}

function safeFileSegment(value, fallback = "foto") {
  return String(value || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || fallback;
}

async function writeEvidenceDataUrlToDevice(section, file, dataUrl) {
  const filesystem = nativeFilesystem();
  const base64 = String(dataUrl).split(",")[1] || "";
  if (!filesystem?.writeFile || !base64) return null;

  const extension = dataUrlMime(dataUrl).includes("png") ? "png" : "jpg";
  const taskId = safeFileSegment(state.selectedTaskId || "tarea");
  const fileName = `${safeFileSegment(section)}_${Date.now()}_${safeFileSegment(file?.name || "foto")}.${extension}`;
  const path = `datacora/evidencias/${taskId}/${fileName}`;

  await filesystem.writeFile({
    path,
    data: base64,
    directory: "DATA",
    recursive: true
  });

  let uri = "";
  try {
    const result = await filesystem.getUri({ path, directory: "DATA" });
    uri = result?.uri || "";
  } catch {
    uri = "";
  }

  return {
    evidenceFilePath: path,
    evidenceFileUri: uri,
    evidenceMime: dataUrlMime(dataUrl),
    evidencePreview: uri && window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(uri) : uri
  };
}

async function evidenceDataUrl(recordOrSource) {
  const source = typeof recordOrSource === "string" ? recordOrSource : recordOrSource?.evidencePreview;
  if (/^data:image\//i.test(String(source || ""))) return source;

  const record = typeof recordOrSource === "object" ? recordOrSource : null;
  const path = record?.evidenceFilePath;
  if (path && nativeFilesystem()?.readFile) {
    const result = await nativeFilesystem().readFile({ path, directory: "DATA" });
    const data = result?.data || "";
    if (data) return `data:${record.evidenceMime || "image/jpeg"};base64,${data}`;
  }

  return source || "";
}

function readImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function imageToJpegData(dataUrlOrUrl, maxWidth = 360, maxHeight = 180) {
  if (!dataUrlOrUrl) return null;
  try {
    const image = await readImage(await evidenceDataUrl(dataUrlOrUrl));
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return { data: dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.88)), width, height };
  } catch {
    return null;
  }
}

class SimplePdf {
  constructor() {
    this.width = 612;
    this.height = 792;
    this.pages = [];
  }

  addPage() {
    const page = { ops: [], images: [] };
    this.pages.push(page);
    return page;
  }

  y(top) {
    return this.height - top;
  }

  text(page, text, x, top, size = 9, bold = false) {
    page.ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${this.y(top).toFixed(1)} Tm (${pdfString(text)}) Tj ET\n`);
  }

  line(page, x1, y1, x2, y2) {
    page.ops.push(`${x1.toFixed(1)} ${this.y(y1).toFixed(1)} m ${x2.toFixed(1)} ${this.y(y2).toFixed(1)} l S\n`);
  }

  rect(page, x, y, width, height) {
    page.ops.push(`${x.toFixed(1)} ${(this.y(y) - height).toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)} re S\n`);
  }

  fillRect(page, x, y, width, height, color = [255, 255, 255]) {
    const [r, g, b] = color.map((value) => Math.max(0, Math.min(255, Number(value) || 0)) / 255);
    page.ops.push(
      `q ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(1)} ${(this.y(y) - height).toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)} re f Q\n`
    );
  }

  image(page, image, x, y, width, height) {
    if (!image) return;
    const name = `Im${page.images.length + 1}`;
    page.images.push({ name, ...image });
    page.ops.push(`q ${width.toFixed(1)} 0 0 ${height.toFixed(1)} ${x.toFixed(1)} ${(this.y(y) - height).toFixed(1)} cm /${name} Do Q\n`);
  }

  build() {
    const objects = [];
    const addObject = (body) => {
      objects.push(typeof body === "string" ? uint8FromAscii(body) : body);
      return objects.length;
    };
    const setObject = (id, body) => {
      objects[id - 1] = typeof body === "string" ? uint8FromAscii(body) : body;
    };

    const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    const pagesId = addObject("<< >>");
    const pageRefs = [];

    this.pages.forEach((page) => {
      const imageIds = page.images.map((image) => {
        const header = `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`;
        const footer = "\nendstream";
        return addObject(concatUint8([uint8FromAscii(header), image.data, uint8FromAscii(footer)]));
      });
      const content = page.ops.join("");
      const contentId = addObject(`<< /Length ${uint8FromAscii(content).length} >>\nstream\n${content}endstream`);
      const xObjects = imageIds.length
        ? `/XObject << ${imageIds.map((id, index) => `/${page.images[index].name} ${id} 0 R`).join(" ")} >>`
        : "";
      const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> ${xObjects} >> /Contents ${contentId} 0 R >>`);
      pageRefs.push(pageId);
    });

    const pagesBody = `<< /Type /Pages /Kids [${pageRefs.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;
    setObject(pagesId, pagesBody);
    const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    const parts = [uint8FromAscii("%PDF-1.4\n")];
    const offsets = [0];
    let length = parts[0].length;
    objects.forEach((object, index) => {
      offsets.push(length);
      const prefix = uint8FromAscii(`${index + 1} 0 obj\n`);
      const suffix = uint8FromAscii("\nendobj\n");
      parts.push(prefix, object, suffix);
      length += prefix.length + object.length + suffix.length;
    });
    const xrefOffset = length;
    const xref = [
      `xref\n0 ${objects.length + 1}\n`,
      "0000000000 65535 f \n",
      ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`),
      `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
    ].join("");
    parts.push(uint8FromAscii(xref));
    return new Blob([concatUint8(parts)], { type: "application/pdf" });
  }
}

function wrappedPdfLines(text, maxChars) {
  const words = pdfAscii(text).split(" ").filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function pdfRecordedRows(title, records) {
  return records.map((record) => ({
    section: title,
    element: record.element || title,
    site: pdfSiteLabel(record),
    quantity: record.quantity || "",
    action: record.action || "",
    observation: record.observation || "",
    evidenceName: record.evidenceName || "",
    evidencePreview: record.evidencePreview || "",
    evidenceFilePath: record.evidenceFilePath || "",
    evidenceFileUri: record.evidenceFileUri || "",
    evidenceMime: record.evidenceMime || "",
    evidencePhotos: evidencePhotosForRecord(record)
  }));
}

function allPaePdfRows(task) {
  return [
    ...pdfRecordedRows("Calor", heatRecordsForTask(task.id)),
    ...pdfRecordedRows("Electricidad", electricityRecordsForTask(task.id)),
    ...pdfRecordedRows("Frio", coldRecordsForTask(task.id)),
    ...pdfRecordedRows("Vectores", vectorsRecordsForTask(task.id)),
    ...pdfRecordedRows("Agua", waterRecordsForTask(task.id))
  ];
}

function pdfAdditionalAnswerSections() {
  return [
    ["Encargado PAE", recordAnswers(state.paeManagerDraft)],
    ["MPA", recordAnswers(state.mpaDraft)],
    ["Patio Servicio", recordAnswers(state.serviceYardDraft)],
    ["Verificadores RBD", recordAnswers(state.rbdCheckersDraft)]
  ]
    .map(([title, answers]) => [
      title,
      answers.filter((answer) => answer.value !== "" && answer.value !== null && answer.value !== undefined)
    ])
    .filter(([, answers]) => answers.length);
}

async function generatePaePdfBlob(task) {
  const meta = taskEstablishmentMeta(task);
  const technician = taskTechnician(task) || loggedUser();
  const logo = await imageToJpegData(await appLogoDataUrl(), 420, 180);
  const techSignature = await imageToJpegData(state.technicianSignatureData, 280, 110);
  const paeSignature = await imageToJpegData(state.paeSignatureData, 280, 110);
  const doc = new SimplePdf();
  let page = doc.addPage();
  let y = 42;

  const header = () => {
    doc.image(page, logo, 42, 24, 116, 50);
    doc.text(page, "BITACORA DE MANTENIMIENTO ESTABLECIMIENTOS", 190, 48, 11, true);
    doc.text(page, "FOLIO", 472, 36, 10, true);
    doc.rect(page, 512, 24, 58, 22);
    doc.text(page, pdfFolio(task), 526, 39, 10, true);
    doc.line(page, 42, 84, 570, 84);
    y = 108;
  };

  const newPage = () => {
    page = doc.addPage();
    header();
  };

  const addLabel = (label, value, x, top, width = 160) => {
    doc.text(page, label, x, top, 7, true);
    doc.text(page, value, x, top + 13, 9);
    doc.line(page, x, top + 17, x + width, top + 17);
  };

  const ensureSpace = (needed) => {
    if (y + needed > 724) newPage();
  };

  header();
  addLabel("FECHA", pdfDate(pdfSubmittedDate(task)), 42, y);
  addLabel("RBD", task.rbd, 178, y, 76);
  addLabel("ESTABLECIMIENTO", task.establishment, 272, y, 190);
  addLabel("COMUNA", meta?.comuna || "", 482, y, 88);
  y += 38;
  addLabel("DIRECCION", meta?.direccion || "", 42, y, 250);
  addLabel("TIPO INSTITUCION", meta?.tipoInstitucion || "", 314, y, 120);
  addLabel("TIPO VISITA", task.type, 456, y, 114);
  y += 46;

  doc.text(page, "RESPUESTAS REGISTRADAS", 42, y, 10, true);
  y += 16;
  const columns = [
    ["Seccion", 42, 58],
    ["Elemento", 100, 146],
    ["Sitio", 246, 64],
    ["Cant.", 310, 38],
    ["Accion", 348, 70],
    ["Observacion", 418, 152]
  ];
  const drawTableHeader = () => {
    columns.forEach(([label, x, width]) => {
      doc.rect(page, x, y, width, 18);
      doc.text(page, label, x + 4, y + 12, 7, true);
    });
    y += 18;
  };
  drawTableHeader();

  const rows = allPaePdfRows(task);
  if (!rows.length) {
    doc.text(page, "Sin elementos registrados en las secciones principales.", 42, y + 14, 9);
    y += 32;
  }

  rows.forEach((row) => {
    const elementLines = wrappedPdfLines(row.element, 28).slice(0, 3);
    const observationLines = wrappedPdfLines(row.observation, 28).slice(0, 3);
    const rowHeight = Math.max(24, 10 + Math.max(elementLines.length, observationLines.length) * 10);
    ensureSpace(rowHeight + 8);
    if (y < 130) drawTableHeader();
    columns.forEach(([, x, width]) => doc.rect(page, x, y, width, rowHeight));
    doc.text(page, row.section, 46, y + 13, 7);
    elementLines.forEach((line, index) => doc.text(page, line, 104, y + 13 + index * 10, 7));
    doc.text(page, row.site, 250, y + 13, 7);
    doc.text(page, row.quantity, 316, y + 13, 7);
    doc.text(page, row.action, 352, y + 13, 7);
    observationLines.forEach((line, index) => doc.text(page, line, 422, y + 13 + index * 10, 7));
    y += rowHeight;
  });

  ensureSpace(130);
  y += 36;
  doc.text(page, "FIRMAS", 42, y, 10, true);
  y += 18;
  doc.image(page, techSignature, 78, y, 120, 46);
  doc.image(page, paeSignature, 362, y, 120, 46);
  y += 62;
  doc.line(page, 62, y, 242, y);
  doc.line(page, 332, y, 512, y);
  doc.text(page, `Tecnico: ${technician?.nombre || ""}`, 74, y + 14, 8, true);
  doc.text(page, `Encargado PAE: ${state.paeManagerDraft.name || ""}`, 340, y + 14, 8, true);
  doc.text(page, `RUT: ${state.paeManagerDraft.rut || ""}`, 340, y + 27, 8);
  doc.text(page, `Cargo: ${state.paeManagerDraft.role || ""}`, 340, y + 40, 8);

  return doc.build();
}

async function generatePaeBitacoraPdfBlob(task) {
  const meta = taskEstablishmentMeta(task);
  const technician = taskTechnician(task) || loggedUser();
  const institutionType = meta?.tipoInstitucion || "";
  const visitReason = task.type || "";
  const logo = await imageToJpegData(await appLogoDataUrl(), 420, 180);
  const techSignature = await imageToJpegData(state.technicianSignatureData, 280, 110);
  const paeSignature = await imageToJpegData(state.paeSignatureData, 280, 110);
  const doc = new SimplePdf();
  let page = doc.addPage();
  let y = 40;

  const lineText = (label, value, x, top, width, labelWidth = 42) => {
    doc.text(page, label, x, top, 7, true);
    doc.text(page, value || "", x + labelWidth, top, 8);
    doc.line(page, x + labelWidth - 2, top + 6, x + width, top + 6);
  };

  const centeredText = (text, x, top, width, size = 6.2, bold = false, maxChars = 18) => {
    const lines = wrappedPdfLines(text, maxChars).slice(0, 4);
    const startTop = top + Math.max(7, 12 - lines.length * 3);
    lines.forEach((line, index) => {
      const offset = Math.max(2, (width - line.length * size * 0.38) / 2);
      doc.text(page, line, x + offset, startTop + index * (size + 2), size, bold);
    });
  };

  const checkedLine = (checked, label, x, top, width = 30) => {
    doc.line(page, x, top + 3, x + width, top + 3);
    if (checked) {
      const markX = x + width / 2;
      doc.line(page, markX - 5, top - 1, markX - 1, top + 5);
      doc.line(page, markX - 1, top + 5, markX + 8, top - 8);
    }
    doc.text(page, label, x + width + 8, top, 7);
  };

  const drawFirstPageHeader = () => {
    doc.image(page, logo, 42, 26, 126, 48);
    doc.text(page, "BITACORA DE MANTENIMIENTO ESTABLECIMIENTOS", 190, 52, 11, true);
    doc.text(page, "FOLIO", 470, 42, 8);
    doc.rect(page, 512, 32, 56, 22);
    doc.text(page, pdfFolio(task), 536, 47, 10, true);
    doc.line(page, 42, 86, 570, 86);

    lineText("FECHA:", pdfDate(pdfSubmittedDate(task)), 42, 116, 118, 38);
    lineText("HORA:", pdfTime(pdfSubmittedDateTime(task)), 148, 116, 208, 34);
    lineText("RBD:", task.rbd, 226, 116, 286, 30);
    lineText("ESTABLECIMIENTO:", task.establishment, 306, 116, 568, 84);
    lineText("DIRECCION:", meta?.direccion || "", 306, 142, 456, 58);
    lineText("COMUNA:", meta?.comuna || "", 474, 142, 568, 48);

    doc.text(page, "INSTITUCION", 42, 178, 8);
    checkedLine(/junaeb/i.test(institutionType), "Junaeb", 132, 178);
    checkedLine(/junji/i.test(institutionType), "Junji", 222, 178);
    checkedLine(/integra/i.test(institutionType), "Integra", 312, 178);

    doc.text(page, "MOTIVO DE VISITA", 42, 212, 8);
    checkedLine(isVisitReason(visitReason, "maintenance", task), "Plan Preventivo Mantencion", 144, 212);
    checkedLine(isVisitReason(visitReason, "dt", task), "DT", 322, 212);
    checkedLine(isVisitReason(visitReason, "mutuality", task), "Mutualidad", 400, 212);
    checkedLine(isVisitReason(visitReason, "emergency", task), "Emergencia", 486, 212);
    checkedLine(isVisitReason(visitReason, "record", task), "Acta", 42, 244);
    checkedLine(isVisitReason(visitReason, "seremi", task), "Seremi", 122, 244);
    checkedLine(isVisitReason(visitReason, "sec", task), "SEC", 212, 244);
    doc.line(page, 42, 276, 570, 276);
    y = 304;
  };

  const drawContinuationHeader = () => {
    doc.image(page, logo, 42, 26, 116, 44);
    doc.text(page, "BITACORA DE MANTENIMIENTO ESTABLECIMIENTOS", 190, 50, 11, true);
    doc.text(page, "FOLIO", 470, 40, 8);
    doc.rect(page, 512, 30, 56, 22);
    doc.text(page, pdfFolio(task), 536, 45, 10, true);
    doc.line(page, 42, 82, 570, 82);
    y = 112;
  };

  const newPage = (withHeader = true) => {
    page = doc.addPage();
    y = 40;
    if (withHeader) drawContinuationHeader();
  };

  const narrativeSections = () => [
    ["Calor", heatRecordsForTask(task.id)],
    ["Electricidad", electricityRecordsForTask(task.id)],
    ["Frio", coldRecordsForTask(task.id)],
    ["Vectores", vectorsRecordsForTask(task.id)],
    ["Agua", waterRecordsForTask(task.id)]
  ].map(([title, records]) => [
    title,
    records.filter((record) => hasEvidencePhotos(record))
  ]).filter(([, records]) => records.length);

  const drawNarrativeLines = (lines, x, top, size = 8, bold = false, lineGap = 10) => {
    lines.forEach((line, index) => doc.text(page, line, x, top + index * lineGap, size, bold));
  };

  const drawNarrativeReport = async () => {
    const sections = narrativeSections();
    doc.text(page, "INFORME INTERNO DE ATENCIONES", 42, y, 10, true);
    y += 20;

    if (!sections.length) {
      doc.text(page, "Sin elementos con evidencia fotografica registrada.", 42, y + 12, 9);
      y += 36;
      return;
    }

    for (const [sectionTitle, records] of sections) {
      if (y + 36 > 724) newPage(true);
      doc.text(page, sectionTitle.toUpperCase(), 42, y, 9, true);
      y += 16;

      for (const record of records) {
        const evidenceImages = (await Promise.all(evidencePhotosForRecord(record).map((photo) => imageToJpegData(photo, 220, 150)))).filter(Boolean);
        const blockHeight = evidenceImages.length ? 190 : 118;
        if (y + blockHeight > 724) newPage(true);

        const action = record.action || "la accion indicada";
const quantity = record.quantity || "la cantidad registrada";
        const element = record.element || sectionTitle;
        const site = pdfSiteLabel(record) || "la ubicacion registrada";
        const sentence = `Se realizo accion de ${action} en ${quantity} de ${element} ubicado en ${site}, con la siguiente observacion y evidencia:`;
        const sentenceLines = wrappedPdfLines(sentence, 108).slice(0, 3);

        doc.rect(page, 42, y, 528, blockHeight);
        drawNarrativeLines(sentenceLines, 52, y + 18, 8, true, 10);

        const contentTop = y + 54;
        const observationHeight = blockHeight - 70;
        doc.text(page, "Observacion", 52, contentTop, 7, true);
        doc.rect(page, 52, contentTop + 8, evidenceImages.length ? 240 : 498, observationHeight);
        drawNarrativeLines(wrappedPdfLines(record.observation || "Sin observacion registrada.", evidenceImages.length ? 38 : 82).slice(0, 8), 60, contentTop + 24, 7.5, false, 10);

        if (evidenceImages.length) {
          doc.text(page, "Evidencia", 314, contentTop, 7, true);
          doc.rect(page, 314, contentTop + 8, 246, observationHeight);
          const imageAreaTop = contentTop + 18;
          const imageHeightLimit = Math.max(54, observationHeight - 24);
          const imageWidthLimit = evidenceImages.length === 1 ? 224 : 72;
          evidenceImages.slice(0, MAX_EVIDENCE_PHOTOS_PER_ELEMENT).forEach((evidenceImage, photoIndex) => {
            const slotX = evidenceImages.length === 1 ? 324 : 322 + photoIndex * 76;
            const scale = Math.min(imageWidthLimit / evidenceImage.width, imageHeightLimit / evidenceImage.height, 1);
            const imageWidth = evidenceImage.width * scale;
            const imageHeight = evidenceImage.height * scale;
            doc.image(page, evidenceImage, slotX + (imageWidthLimit - imageWidth) / 2, imageAreaTop + (imageHeightLimit - imageHeight) / 2, imageWidth, imageHeight);
          });
        } else if (record.evidenceName) {
          doc.text(page, `Evidencia registrada: ${record.evidenceName}`, 52, y + blockHeight - 14, 7);
        }

        y += blockHeight + 14;
      }

      y += 8;
    }
  };

  const drawAdditionalAnswers = () => {
    const sections = pdfAdditionalAnswerSections();
    if (!sections.length) return;
    if (y + 90 > 724) newPage(true);
    doc.text(page, "PREGUNTAS ADICIONALES", 42, y, 10, true);
    y += 18;

    sections.forEach(([title, answers]) => {
      if (y + 34 > 724) newPage(true);
      doc.text(page, title, 42, y, 8, true);
      y += 12;
      answers.forEach((answer) => {
        const questionLines = wrappedPdfLines(answer.label, 36).slice(0, 2);
        const valueLines = wrappedPdfLines(answer.value, 48).slice(0, 3);
        const rowHeight = Math.max(20, 8 + Math.max(questionLines.length, valueLines.length) * 9);
        if (y + rowHeight > 724) newPage(true);
        doc.rect(page, 42, y, 210, rowHeight);
        doc.rect(page, 252, y, 318, rowHeight);
        questionLines.forEach((line, index) => doc.text(page, line, 48, y + 12 + index * 9, 6.5, true));
        valueLines.forEach((line, index) => doc.text(page, line, 258, y + 12 + index * 9, 7));
        y += rowHeight;
      });
      y += 12;
    });
  };

  drawFirstPageHeader();
  await drawNarrativeReport();
  drawAdditionalAnswers();

  if (y + 150 > 724) newPage(false);
  y += 34;
  doc.image(page, techSignature, 82, y, 120, 46);
  doc.image(page, paeSignature, 366, y, 120, 46);
  y += 64;
  doc.line(page, 70, y, 250, y);
  doc.line(page, 330, y, 510, y);
  doc.text(page, `Nombre: ${technician?.nombre || ""}`, 118, y + 16, 8, true);
  doc.text(page, `Rut: ${technician?.rut || ""}`, 142, y + 30, 8, true);
  if (technician?.cargo) doc.text(page, `Cargo: ${technician.cargo}`, 126, y + 44, 8, true);
  doc.text(page, `Nombre: ${state.paeManagerDraft.name || ""}`, 372, y + 16, 8, true);
  doc.text(page, `Rut: ${state.paeManagerDraft.rut || ""}`, 394, y + 30, 8, true);
  if (state.paeManagerDraft.role) doc.text(page, `Cargo: ${state.paeManagerDraft.role}`, 378, y + 44, 8, true);

  return doc.build();
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (!String(file.type || "").startsWith("image/")) {
        resolve(dataUrl);
        return;
      }

      const image = new Image();
      image.onload = () => {
        const maxSize = 420;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.42));
      };
      image.onerror = () => resolve(dataUrl);
      image.src = dataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function handleEvidenceFileSelection(element, currentDraftFn, updateDraftFn) {
  const file = element.files?.[0];
  element.value = "";
  const draft = currentDraftFn();
  const currentPhotos = evidencePhotosForRecord(draft);
  if (currentPhotos.length >= MAX_EVIDENCE_PHOTOS_PER_ELEMENT) {
    updateDraftFn(draftWithEvidencePhotos(draft, currentPhotos));
    persistCurrentTaskProgress();
    showSuccessToast("Límite alcanzado", `Puedes adjuntar hasta ${MAX_EVIDENCE_PHOTOS_PER_ELEMENT} fotografías por elemento.`);
    return;
  }
  persistCurrentTaskProgress();
  if (!file) {
    updateDraftFn(draftWithEvidencePhotos(draft, currentPhotos));
    persistCurrentTaskProgress();
    return;
  }

  fileToDataUrl(file)
    .then(async (preview) => {
      const stored = await writeEvidenceDataUrlToDevice(element.dataset.role || element.name || "evidencia", file, preview);
      const photo = stored
        ? { evidenceName: file.name, ...stored }
        : { evidenceName: file.name, evidencePreview: preview, evidenceMime: dataUrlMime(preview) };
      updateDraftFn(draftWithEvidencePhotos(draft, [...currentPhotos, photo]));
      persistCurrentTaskProgress();
    })
    .catch(() => {
      updateDraftFn(draftWithEvidencePhotos(draft, currentPhotos));
      persistCurrentTaskProgress();
      showSuccessToast("Fotografía registrada", "Se guardó la evidencia para avanzar; la vista previa no quedó disponible.");
    });
}

function removeEvidencePhoto(role, index) {
  const config = {
    heat: [currentHeatDraftFromForm, updateHeatDraft],
    electricity: [currentElectricityDraftFromForm, updateElectricityDraft],
    cold: [currentColdDraftFromForm, updateColdDraft],
    water: [currentWaterDraftFromForm, updateWaterDraft],
    infrastructure: [currentInfrastructureDraftFromForm, updateInfrastructureDraft],
    vectors: [currentVectorsDraftFromForm, updateVectorsDraft]
  }[role];
  if (!config) return;
  const [currentDraftFn, updateDraftFn] = config;
  const draft = currentDraftFn();
  const photos = evidencePhotosForRecord(draft).filter((_, photoIndex) => photoIndex !== index);
  updateDraftFn(draftWithEvidencePhotos(draft, photos));
  persistCurrentTaskProgress();
}

const zipCrcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = zipCrcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeZipUint16(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeZipUint32(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function zipDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

function concatByteArrays(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function zipFileBlob(files) {
  const encoder = new TextEncoder();
  const now = zipDosDateTime();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = file.bytes;
    const checksum = crc32(data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeZipUint32(localHeader, 0, 0x04034b50);
    writeZipUint16(localHeader, 4, 20);
    writeZipUint16(localHeader, 6, 0x0800);
    writeZipUint16(localHeader, 8, 0);
    writeZipUint16(localHeader, 10, now.time);
    writeZipUint16(localHeader, 12, now.date);
    writeZipUint32(localHeader, 14, checksum);
    writeZipUint32(localHeader, 18, data.length);
    writeZipUint32(localHeader, 22, data.length);
    writeZipUint16(localHeader, 26, nameBytes.length);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeZipUint32(centralHeader, 0, 0x02014b50);
    writeZipUint16(centralHeader, 4, 20);
    writeZipUint16(centralHeader, 6, 20);
    writeZipUint16(centralHeader, 8, 0x0800);
    writeZipUint16(centralHeader, 10, 0);
    writeZipUint16(centralHeader, 12, now.time);
    writeZipUint16(centralHeader, 14, now.date);
    writeZipUint32(centralHeader, 16, checksum);
    writeZipUint32(centralHeader, 20, data.length);
    writeZipUint32(centralHeader, 24, data.length);
    writeZipUint16(centralHeader, 28, nameBytes.length);
    writeZipUint32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);

    localParts.push(localHeader, data);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  });

  const centralDirectory = concatByteArrays(centralParts);
  const end = new Uint8Array(22);
  writeZipUint32(end, 0, 0x06054b50);
  writeZipUint16(end, 8, files.length);
  writeZipUint16(end, 10, files.length);
  writeZipUint32(end, 12, centralDirectory.length);
  writeZipUint32(end, 16, offset);

  return new Blob([concatByteArrays([...localParts, centralDirectory, end])], { type: "application/zip" });
}

function photoFileBaseName(value) {
  const name = pdfAscii(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .replace(/_(mantencion|mantenimiento|reparacion|instalacion|revision|preventivo|correctivo)$/g, "");

  return name || "fotografia";
}

function allEvidencePhotoRecords(task) {
  const records = [
    ...pdfRecordedRows("Calor", heatRecordsForTask(task.id)),
    ...pdfRecordedRows("Electricidad", electricityRecordsForTask(task.id)),
    ...pdfRecordedRows("Frio", coldRecordsForTask(task.id)),
    ...pdfRecordedRows("Vectores", vectorsRecordsForTask(task.id)),
    ...pdfRecordedRows("Agua", waterRecordsForTask(task.id)),
    ...pdfRecordedRows("Infraestructura", infrastructureRecordsForTask(task.id))
  ];
  return records.flatMap((record) => evidencePhotosForRecord(record).map((photo, photoIndex) => ({
    ...record,
    ...photo,
    evidencePhotoIndex: photoIndex
  }))).filter((record) => isDisplayableImageSource(record.evidencePreview) || record.evidenceFilePath);
}

async function optimizedPhotoBytes(recordOrUrl, maxSize = 1280, quality = 0.72) {
  const image = await readImage(await evidenceDataUrl(recordOrUrl));
  const scale = Math.min(maxSize / image.naturalWidth, maxSize / image.naturalHeight, 1);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("No se pudo optimizar una fotografía.");
  return new Uint8Array(await blob.arrayBuffer());
}

async function generatePhotosZipBlob(task) {
  const usedNames = new Map();
  const files = [];

  for (const record of allEvidencePhotoRecords(task)) {
    const bytes = await optimizedPhotoBytes(record);
    const baseName = photoFileBaseName(record.element || record.section);
    const count = (usedNames.get(baseName) ?? 0) + 1;
    usedNames.set(baseName, count);
    files.push({
      name: `${baseName}${count > 1 ? `_${count}` : ""}.jpg`,
      bytes
    });
  }

  if (!files.length) throw new Error("No hay fotografías locales disponibles para respaldar.");
  return zipFileBlob(files);
}

async function generatePhotoBackupFiles(task) {
  const usedNames = new Map();
  const files = [];

  for (const record of allEvidencePhotoRecords(task)) {
    const bytes = await optimizedPhotoBytes(record);
    const baseName = photoFileBaseName([
      record.section,
      record.element
    ].filter(Boolean).join(" "));
    const count = (usedNames.get(baseName) ?? 0) + 1;
    usedNames.set(baseName, count);
    const fileName = `${baseName}${count > 1 ? `_${count}` : ""}.jpg`;

    files.push({
      fileName,
      blob: new Blob([bytes], { type: "image/jpeg" }),
      mimeType: "image/jpeg",
      metadata: {
        source: "onedrive_photo_backup",
        section: record.section || "",
        element: record.element || "",
        site: record.site || "",
        quantity: record.quantity || "",
        action: record.action || "",
        observation: record.observation || "",
        original_file_name: record.evidenceName || "",
        photo_index: record.evidencePhotoIndex ?? 0
      }
    });
  }

  return files;
}

function oneDriveFolderSegmentForTask(task) {
  const meta = taskEstablishmentMeta(task);
  const branch = meta?.sucursal || loggedUser()?.sucursal || "Sin sucursal";
  const submittedDate = new Date(task?.submittedAt || new Date().toISOString());
  const validDate = Number.isNaN(submittedDate.getTime()) ? new Date() : submittedDate;
  const monthYear = validDate.toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric"
  }).replace(/^\p{Ll}/u, (letter) => letter.toLocaleUpperCase("es-CL"));
  return `${branch}/${monthYear}`;
}

async function generatePaeMatrixBitacoraPdfBlob(task) {
  const meta = taskEstablishmentMeta(task);
  const technician = taskTechnician(task) || loggedUser();
  const institutionType = meta?.tipoInstitucion || "";
  const visitReason = task.type || "";
  const logo = await imageToJpegData(await appLogoDataUrl(), 420, 180);
  const techSignature = await imageToJpegData(state.technicianSignatureData, 280, 110);
  const paeSignature = await imageToJpegData(state.paeSignatureData, 280, 110);
  const doc = new SimplePdf();
  let page = doc.addPage();
  let y = 40;

  const lineText = (label, value, x, top, width, labelWidth = 42) => {
    doc.text(page, label, x, top, 7, true);
    doc.text(page, value || "", x + labelWidth, top, 8);
    doc.line(page, x + labelWidth - 2, top + 6, x + width, top + 6);
  };

  const checkedLine = (checked, label, x, top, width = 30) => {
    doc.line(page, x, top + 3, x + width, top + 3);
    if (checked) {
      const markX = x + width / 2;
      doc.line(page, markX - 5, top - 1, markX - 1, top + 5);
      doc.line(page, markX - 1, top + 5, markX + 8, top - 8);
    }
    doc.text(page, label, x + width + 8, top, 7);
  };

  const centeredText = (text, x, top, width, size = 6.1, bold = false, maxChars = 18, maxLines = Infinity, cellHeight = 18) => {
    const lines = wrappedPdfLines(text, maxChars).slice(0, maxLines);
    const lineHeight = size + 2;
    const startTop = top + Math.max(7, (cellHeight - lines.length * lineHeight) / 2 + size);
    lines.forEach((line, index) => {
      const offset = Math.max(2, (width - line.length * size * 0.38) / 2);
      doc.text(page, line, x + offset, startTop + index * lineHeight, size, bold);
    });
  };

  const drawFirstPageHeader = () => {
    doc.image(page, logo, 42, 26, 126, 48);
    doc.text(page, "BITACORA DE MANTENIMIENTO ESTABLECIMIENTOS", 190, 52, 11, true);
    doc.text(page, "FOLIO", 470, 42, 8);
    doc.rect(page, 512, 32, 56, 22);
    doc.text(page, pdfFolio(task), 536, 47, 10, true);
    doc.line(page, 42, 86, 570, 86);

    lineText("FECHA:", pdfDate(pdfSubmittedDate(task)), 42, 116, 118, 38);
    lineText("HORA:", pdfTime(pdfSubmittedDateTime(task)), 148, 116, 208, 34);
    lineText("RBD:", task.rbd, 226, 116, 286, 30);
    lineText("ESTABLECIMIENTO:", task.establishment, 306, 116, 568, 84);
    lineText("DIRECCION:", meta?.direccion || "", 306, 142, 456, 58);
    lineText("COMUNA:", meta?.comuna || "", 474, 142, 568, 48);

    doc.text(page, "INSTITUCION", 42, 178, 8);
    checkedLine(/junaeb/i.test(institutionType), "Junaeb", 132, 178);
    checkedLine(/junji/i.test(institutionType), "Junji", 222, 178);
    checkedLine(/integra/i.test(institutionType), "Integra", 312, 178);

    doc.text(page, "MOTIVO DE VISITA", 42, 212, 8);
    checkedLine(isVisitReason(visitReason, "maintenance", task), "Plan Preventivo Mantencion", 144, 212);
    checkedLine(isVisitReason(visitReason, "dt", task), "DT", 322, 212);
    checkedLine(isVisitReason(visitReason, "mutuality", task), "Mutualidad", 400, 212);
    checkedLine(isVisitReason(visitReason, "emergency", task), "Emergencia", 486, 212);
    checkedLine(isVisitReason(visitReason, "record", task), "Acta", 42, 244);
    checkedLine(isVisitReason(visitReason, "seremi", task), "Seremi", 122, 244);
    checkedLine(isVisitReason(visitReason, "sec", task), "SEC", 212, 244);
    doc.line(page, 42, 276, 570, 276);
    y = 304;
  };

  const drawContinuationHeader = () => {
    doc.image(page, logo, 42, 26, 116, 44);
    doc.text(page, "BITACORA DE MANTENIMIENTO ESTABLECIMIENTOS", 190, 50, 11, true);
    doc.text(page, "FOLIO", 470, 40, 8);
    doc.rect(page, 512, 30, 56, 22);
    doc.text(page, pdfFolio(task), 536, 45, 10, true);
    doc.line(page, 42, 82, 570, 82);
    y = 112;
  };

  const newPage = (withHeader = true) => {
    page = doc.addPage();
    y = 40;
    if (withHeader) drawContinuationHeader();
  };

  const tableRowsForElements = (elements, records) => elements.flatMap((element) => {
    const matches = records.filter((record) => record.element === element);
    return (matches.length ? matches : [{ element }]).map((record) => ({ element, record }));
  });

  const drawBitacoraTable = (title, elements, records) => {
    const rows = tableRowsForElements(elements, records);
    const widths = [76, 51, 51, 51, 51, 51, 42, 62, 93];
    const labels = [title, "Cocina", "Bodega", "Baño", "Patio", "Otro", "Cantidad", "Accion", "Observacion"];
    const x0 = 42;
    const headerHeight = 18;

    const drawTableHeader = () => {
      let x = x0;
      labels.forEach((label, index) => {
        doc.fillRect(page, x, y, widths[index], headerHeight, index === 0 ? [204, 231, 216] : [223, 238, 231]);
        doc.rect(page, x, y, widths[index], headerHeight);
        centeredText(label, x, y + 2, widths[index], 6.1, true, index === 0 || index === 8 ? 13 : 9, 2, headerHeight);
        x += widths[index];
      });
      y += headerHeight;
    };

    if (y + headerHeight + 20 > 724) newPage(false);
    drawTableHeader();

    rows.forEach(({ element, record }) => {
      let x = x0;
      const site = pdfSiteLabel(record);
      const quantity = record.quantity || "";
      const siteCell = (column) => site === column ? quantity : "";
      const cells = [
        { value: element, size: 5.3, bold: true, maxChars: 14 },
        { value: siteCell("Cocina"), size: 5.8, bold: false, maxChars: 8 },
        { value: siteCell("Bodega"), size: 5.8, bold: false, maxChars: 8 },
        { value: siteCell("Baño"), size: 5.8, bold: false, maxChars: 8 },
        { value: siteCell("Patio"), size: 5.8, bold: false, maxChars: 8 },
        { value: site && !["Cocina", "Bodega", "Baño", "Patio"].includes(site) ? (quantity || site) : "", size: 5.8, bold: false, maxChars: 8 },
        { value: quantity, size: 5.8, bold: false, maxChars: 8 },
        { value: record.action || "", size: 5.8, bold: false, maxChars: 8 },
        { value: record.observation || "", size: 5.8, bold: false, maxChars: 14 }
      ];
      const rowHeight = Math.max(
        20,
        ...cells.map((cell) => 10 + wrappedPdfLines(cell.value, cell.maxChars).length * (cell.size + 2))
      );

      if (y + rowHeight > 724) {
        newPage(false);
        drawTableHeader();
      }

      cells.forEach((cell, index) => {
        if (index === 0) doc.fillRect(page, x, y, widths[index], rowHeight, [234, 245, 239]);
        doc.rect(page, x, y, widths[index], rowHeight);
        centeredText(cell.value, x, y + 2, widths[index], cell.size, cell.bold, cell.maxChars, Infinity, rowHeight);
        x += widths[index];
      });
      y += rowHeight;
    });

    y += 34;
  };

  drawFirstPageHeader();
  drawBitacoraTable("Calor", heatElements(), heatRecordsForTask(task.id));
  drawBitacoraTable("Electricidad", electricityElements(), electricityRecordsForTask(task.id));

  drawBitacoraTable("Frio", coldElements(), coldRecordsForTask(task.id));
  drawBitacoraTable("Vectores", vectorsElements, vectorsRecordsForTask(task.id));
  drawBitacoraTable("Agua", waterElements(), waterRecordsForTask(task.id));

  if (y + 124 > 724) newPage(false);
  y += 18;
  doc.image(page, techSignature, 82, y, 120, 46);
  doc.image(page, paeSignature, 366, y, 120, 46);
  y += 64;
  doc.line(page, 70, y, 250, y);
  doc.line(page, 330, y, 510, y);
  doc.text(page, `Nombre: ${technician?.nombre || ""}`, 118, y + 16, 8, true);
  doc.text(page, `Rut: ${technician?.rut || ""}`, 142, y + 30, 8, true);
  if (technician?.cargo) doc.text(page, `Cargo: ${technician.cargo}`, 126, y + 44, 8, true);
  doc.text(page, `Nombre: ${state.paeManagerDraft.name || ""}`, 372, y + 16, 8, true);
  doc.text(page, `Rut: ${state.paeManagerDraft.rut || ""}`, 394, y + 30, 8, true);
  if (state.paeManagerDraft.role) doc.text(page, `Cargo: ${state.paeManagerDraft.role}`, 378, y + 44, 8, true);

  return doc.build();
}

function oneDrivePdfVariants(task) {
  return [
    {
      key: "bitacora",
      fileKind: "onedrive_bitacora_pdf",
      fileName: `${pdfFileTitle(task)}.pdf`,
      folderPath: supabaseConfig.bitacoraPdfFolderPath || "MANTENIMIENTO/Datácora/PDF Bitacora",
      generate: () => generatePaeMatrixBitacoraPdfBlob(task)
    },
    {
      key: "photos",
      fileKind: "onedrive_photo",
      folderPath: supabaseConfig.photosZipFolderPath || "MANTENIMIENTO/Datácora/PDF Informe Interno",
      folderSegment: `${oneDriveFolderSegmentForTask(task)}/${photosFolderTitle(task)}`,
      generateMany: () => generatePhotoBackupFiles(task)
    }
  ];
}

async function uploadOneDriveFileVariant(task, variant, submissionId) {
  const blob = await variant.generate();
  const fileBase64 = await blobToBase64(blob);
  const functionName = supabaseConfig.uploadOneDrivePdfFunctionName || "upload-onedrive-pdf";

  await ensureValidSupabaseSession();
  const requestOptions = {
    method: "POST",
    timeoutMs: 120000,
    body: JSON.stringify({
      submissionId,
      submission_id: submissionId,
      id: submissionId,
      action: variant.fileKind === "onedrive_bitacora_pdf" ? "upload_and_email" : "upload",
      fileName: variant.fileName,
      fileKind: variant.fileKind,
      folderPath: variant.folderPath,
      folderSegment: variant.folderSegment || oneDriveFolderSegmentForTask(task),
      mimeType: variant.mimeType || blob.type || "application/pdf",
      metadata: {
        ...(variant.metadata || {}),
        folio: pdfFolio(task),
        rbd: task.rbd || "",
        establishment: task.establishment || "",
        branch: taskEstablishmentMeta(task)?.sucursal || loggedUser()?.sucursal || "",
        technician: loggedUser()?.nombre || "",
        submittedAt: task.submittedAt || new Date().toISOString()
      },
      fileBase64
    })
  };

  try {
    if (hasSqlServerApiConfig()) {
      return await apiRequest("/functions/upload-onedrive-pdf", requestOptions);
    }
    return await supabaseRequest(`/functions/v1/${functionName}`, requestOptions);
  } catch (error) {
    if (hasSqlServerApiConfig()) throw error;
    if (!isSupabaseAuthTokenError(error) || !state.supabaseSession?.refresh_token) throw error;
    await refreshSupabaseSession();
    return supabaseRequest(`/functions/v1/${functionName}`, requestOptions);
  }
}

async function uploadOneDriveGeneratedFile(task, variant, generatedFile, submissionId) {
  const fileBase64 = await blobToBase64(generatedFile.blob);
  const functionName = supabaseConfig.uploadOneDrivePdfFunctionName || "upload-onedrive-pdf";

  await ensureValidSupabaseSession();
  const requestOptions = {
    method: "POST",
    timeoutMs: 120000,
    body: JSON.stringify({
      submissionId,
      submission_id: submissionId,
      id: submissionId,
      fileName: generatedFile.fileName,
      fileKind: variant.fileKind,
      folderPath: variant.folderPath,
      folderSegment: variant.folderSegment || oneDriveFolderSegmentForTask(task),
      mimeType: generatedFile.mimeType || generatedFile.blob?.type || variant.mimeType || "application/octet-stream",
      metadata: generatedFile.metadata || variant.metadata || null,
      fileBase64
    })
  };

  try {
    if (hasSqlServerApiConfig()) {
      return await apiRequest("/functions/upload-onedrive-pdf", requestOptions);
    }
    return await supabaseRequest(`/functions/v1/${functionName}`, requestOptions);
  } catch (error) {
    if (hasSqlServerApiConfig()) throw error;
    if (!isSupabaseAuthTokenError(error) || !state.supabaseSession?.refresh_token) throw error;
    await refreshSupabaseSession();
    return supabaseRequest(`/functions/v1/${functionName}`, requestOptions);
  }
}

async function uploadPaePdfToOneDriveForTask(task, options = {}) {
  const showSuccess = options.showSuccess ?? true;
  const showError = options.showError ?? true;
  const setBusy = options.setBusy ?? true;
  const variantKeys = options.variantKeys ?? null;
  const submissionId = String(task.submissionId ?? "").trim();
  if (!submissionId) {
    throw new Error(`Primero el formulario debe estar guardado en ${hasSqlServerApiConfig() ? "SQL Server" : "Supabase"}.`);
  }
  try {
    if (setBusy) setState({ pdfUploadBusy: true });
    await ensureValidSupabaseSession();
    await ensureRemoteSubmissionRecords(task);
    const results = [];
    const variants = oneDrivePdfVariants(task).filter((variant) => !variantKeys || variantKeys.includes(variant.key));
    for (const variant of variants) {
      if (typeof variant.generateMany === "function") {
        const generatedFiles = await variant.generateMany();
        if (!generatedFiles.length) continue;
        for (const generatedFile of generatedFiles) {
          results.push(await uploadOneDriveGeneratedFile(task, variant, generatedFile, submissionId));
        }
      } else {
        results.push(await uploadOneDriveFileVariant(task, variant, submissionId));
      }
    }
    if (!results.length) throw new Error("No se generaron archivos para respaldar.");
    const result = results.find((item) => item.fileName?.includes("Bitácora") || item.fileName?.includes("Bitacora")) || results[0];

    task.pdfUrl = result.externalUrl;
    task.pdfFileName = result.fileName;
    task.pdfExternalId = result.externalId;
    if (setBusy) setState({ pdfUploadBusy: false });
    if (showSuccess) showSuccessToast(
      variantKeys?.length === 1 && variantKeys[0] === "bitacora" ? "Bitácora actualizada en OneDrive" : "Respaldos guardados en OneDrive",
      variantKeys?.length === 1 && variantKeys[0] === "bitacora" ? "El PDF de bitácora quedó actualizado correctamente." : "La bitácora PDF y las fotografías quedaron guardadas correctamente."
    );
    return results;
  } catch (error) {
    if (setBusy) setState({ pdfUploadBusy: false });
    if (showError) showErrorToast("No se pudo respaldar en OneDrive", error.message);
    throw error;
  }
}

async function uploadPaePdfToOneDrive() {
  if (state.pdfUploadBusy) return;
  await uploadPaePdfToOneDriveForTask(selectedTask());
}

function scheduleMissingOneDriveBackup(task, options = {}) {
  const backupKey = task?.submissionId || task?.id;
  const force = options.force ?? false;
  const variantKeys = options.variantKeys ?? null;
  const shouldBackup = task
    && isTaskCompleted(task)
    && task.syncStatus === "synced"
    && task.submissionId
    && (force || !task.pdfUrl)
    && hasSupabaseConfig()
    && state.supabaseSession?.access_token
    && !state.pdfUploadBusy
    && !pdfAutoBackupInFlight.has(backupKey);

  if (!shouldBackup) return;

  pdfAutoBackupInFlight.add(backupKey);
  window.setTimeout(async () => {
    try {
      await uploadPaePdfToOneDriveForTask(task, { showSuccess: false, showError: false, setBusy: false, variantKeys });
    } catch (error) {
      console.warn("No se pudo respaldar el PDF en OneDrive", error);
    } finally {
      pdfAutoBackupInFlight.delete(backupKey);
    }
  }, 0);
}

function heatFormScreen() {
  const task = selectedTask();
  if (isTaskCompleted(task)) return formSummaryScreen();
  const draft = state.heatDraft;
  const heatRecords = heatRecordsForTask(task.id);
  const requiredMinimum = sectionMinimumById(task, "heat") || 2;
  const siteOptions = heatSitesForElement(draft.element);
  const siteDisabled = draft.element ? "" : "disabled";
  const pendingCompleteRecord = state.editingHeatIndex < 0 && isHeatDraftComplete(draft) ? 1 : 0;
  const canAdvance = heatRecords.length + pendingCompleteRecord >= requiredMinimum;
  const requiresSecSeal = Boolean(draft.element) && draft.element !== "Caseta De Gas";
  const isFlexible = draft.element === "Flexibles, filtraciones y conexiones de gas";

  return `
    ${topBar("Calor", { back: "form", info: true })}
    <main class="screen with-nav heat-form-screen">
      ${formWorkHeader(task)}
      <section class="form-task-card heat-progress-card">
        <div class="form-card-title">
          <span class="tone-heat">${icons.thermometer}</span>
          <div>
            <h2>Registro de elementos de calor</h2>
            <p>${task.establishment} · RBD ${task.rbd}</p>
          </div>
        </div>
        <div class="heat-progress">
          <strong>${Math.min(heatRecords.length, requiredMinimum)}/${requiredMinimum} obligatorios</strong>
          <span>${heatRecords.length} elemento${heatRecords.length === 1 ? "" : "s"} registrado${heatRecords.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      ${heatRecords.length ? registeredItemsList(heatRecords, "heat") : ""}

      <form class="heat-form-card" data-role="heat-form">
        ${state.heatError ? `<div class="login-error">${state.heatError}</div>` : ""}
        <label class="field">
          <span>Elemento</span>
          <div class="field-control">${icons.thermometer}
            <select name="heatElement" data-role="heat-element">
              ${optionList(heatElements(), draft.element, "Selecciona un elemento")}
            </select>
          </div>
        </label>

        <label class="field">
          <span>Sitio</span>
          <div class="field-control">${icons.location}
            <select name="heatSite" data-role="heat-site" ${siteDisabled}>
              ${optionList(siteOptions, draft.site, draft.element ? "¿En qué sitio se encuentra?" : "Primero selecciona un elemento")}
            </select>
          </div>
        </label>

        ${draft.site === "Otro" ? `
          <label class="field">
            <span>Otro sitio</span>
            <div class="field-control">${icons.location}
              <input name="heatOtherSite" data-role="heat-other-site" value="${escapeHtml(draft.otherSite)}" placeholder="Escribe el sitio" />
            </div>
          </label>
        ` : ""}

        ${requiresSecSeal ? `
          <label class="field">
            <span>¿Cuenta con sello SEC?</span>
            <div class="field-control">${icons.shield}
              <select name="hasSecSeal" data-role="heat-sec-seal">
                ${optionList(yesNoOptions, draft.hasSecSeal, "Selecciona respuesta")}
              </select>
            </div>
          </label>
        ` : ""}

        ${isFlexible ? `
          <label class="field">
            <span>¿Flexible cuenta con fecha de vencimiento?</span>
            <div class="field-control">${icons.calendar}
              <select name="flexibleHasExpiration" data-role="heat-flexible-expiration">
                ${optionList(yesNoOptions, draft.flexibleHasExpiration, "Selecciona respuesta")}
              </select>
            </div>
          </label>
          ${draft.flexibleHasExpiration === "Sí" ? `
            <label class="field">
              <span>Indique fecha de vencimiento</span>
              <div class="field-control">${icons.calendar}
                <input name="flexibleExpirationDate" data-role="heat-flexible-expiration-date" type="date" value="${escapeHtml(draft.flexibleExpirationDate)}" />
              </div>
            </label>
          ` : ""}
          <label class="field">
            <span>¿Poseen QR?</span>
            <div class="field-control">${icons.info}
              <select name="flexibleHasQr" data-role="heat-flexible-qr">
                ${optionList(yesNoOptions, draft.flexibleHasQr, "Selecciona respuesta")}
              </select>
            </div>
          </label>
        ` : ""}

        <div class="heat-grid">
          <label class="field">
            <span>Cantidad</span>
            <div class="field-control">${icons.info}
              <input name="heatQuantity" data-role="heat-quantity" type="number" min="1" step="1" value="${escapeHtml(draft.quantity)}" />
            </div>
          </label>

          <label class="field">
            <span>Acción</span>
            <div class="field-control">${icons.clipboardCheck}
              <select name="heatAction" data-role="heat-action">
                ${optionList(heatActions, draft.action, "Selecciona acción")}
              </select>
            </div>
          </label>
        </div>

        ${installedArticleField("heat", draft)}

        <label class="field">
          <span>Observación</span>
          <div class="field-control textarea-control">${icons.info}
            <textarea name="heatObservation" data-role="heat-observation" placeholder="Describe el hallazgo o trabajo realizado">${escapeHtml(draft.observation)}</textarea>
          </div>
        </label>

        ${evidencePhotoField("heat", draft)}

        <div class="form-actions heat-actions">
          ${secondaryButton(state.editingHeatIndex >= 0 ? "Guardar cambios" : (canAdvance ? "Agregar otro elemento" : "Registrar elemento"), "register-heat-element")}
          ${primaryButton("Avanzar a Electricidad", canAdvance ? "advance-electricity" : "none")}
        </div>
      </form>
    
      ${clearSectionButton("heat")}
      ${clearSectionButtonStyles()}
</main>
    ${bottomNav()}
  `;
}

function electricityFormScreen() {
  const task = selectedTask();
  if (isTaskCompleted(task)) return formSummaryScreen();
  const draft = state.electricityDraft;
  const electricityRecords = electricityRecordsForTask(task.id);
  const requiredMinimum = sectionMinimumById(task, "electricity") || 6;
  const siteOptions = electricitySitesForElement(draft.element);
  const siteDisabled = draft.element ? "" : "disabled";
  const isDistributionBox = draft.element === "Cajas de Distribución";
  const isLighting = draft.element === "Luminarias y protecciones";
  const pendingCompleteRecord = state.editingElectricityIndex < 0 && isElectricityDraftComplete(draft) ? 1 : 0;
  const canFinish = electricityRecords.length + pendingCompleteRecord >= requiredMinimum;

  return `
    ${topBar("Electricidad", { back: "form", info: true })}
    <main class="screen with-nav heat-form-screen">
      ${formWorkHeader(task)}
      <section class="form-task-card heat-progress-card">
        <div class="form-card-title">
          <span class="tone-electric">${icons.bolt}</span>
          <div>
            <h2>Registro de elementos eléctricos</h2>
            <p>${task.establishment} · RBD ${task.rbd}</p>
          </div>
        </div>
        <div class="heat-progress electricity-progress">
          <strong>${Math.min(electricityRecords.length, requiredMinimum)}/${requiredMinimum} obligatorios</strong>
          <span>${electricityRecords.length} elemento${electricityRecords.length === 1 ? "" : "s"} registrado${electricityRecords.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      ${electricityRecords.length ? registeredItemsList(electricityRecords, "electricity") : ""}

      <form class="heat-form-card" data-role="electricity-form">
        ${state.electricityError ? `<div class="login-error">${state.electricityError}</div>` : ""}
        <label class="field">
          <span>Elemento</span>
          <div class="field-control">${icons.bolt}
            <select name="electricityElement" data-role="electricity-element">
              ${optionList(electricityElements(), draft.element, "Selecciona un elemento")}
            </select>
          </div>
        </label>

        <label class="field">
          <span>Sitio</span>
          <div class="field-control">${icons.location}
            <select name="electricitySite" data-role="electricity-site" ${siteDisabled}>
              ${optionList(siteOptions, draft.site, draft.element ? "¿En qué sitio se encuentra?" : "Primero selecciona un elemento")}
            </select>
          </div>
        </label>

        ${draft.site === "Otro" ? `
          <label class="field">
            <span>Otro sitio</span>
            <div class="field-control">${icons.location}
              <input name="electricityOtherSite" data-role="electricity-other-site" value="${escapeHtml(draft.otherSite)}" placeholder="Escribe el sitio" />
            </div>
          </label>
        ` : ""}

        ${isDistributionBox ? `
          <label class="field">
            <span>Indique tipo de caja de distribución</span>
            <div class="field-control">${icons.clipboard}
              <select name="distributionBoxType" data-role="distribution-box-type">
                ${optionList(distributionBoxTypes, draft.distributionBoxType, "Selecciona tipo de caja")}
              </select>
            </div>
          </label>
          <label class="field">
            <span>Indique dónde se encuentra establecido</span>
            <div class="field-control">${icons.location}
              <select name="distributionBoxLocation" data-role="distribution-box-location">
                ${optionList(distributionBoxLocations, draft.distributionBoxLocation, "Selecciona ubicación")}
              </select>
            </div>
          </label>
          ${draft.distributionBoxLocation === "En otro espacio en el RBD" ? `
            <label class="field">
              <span>Otro espacio en el RBD</span>
              <div class="field-control">${icons.location}
                <input name="distributionBoxOtherLocation" data-role="distribution-box-other-location" value="${escapeHtml(draft.distributionBoxOtherLocation)}" placeholder="Escribe el espacio" />
              </div>
            </label>
          ` : ""}
        ` : ""}

        ${isLighting ? `
          <label class="field">
            <span>¿Cuentan con protección o grupo estanco?</span>
            <div class="field-control">${icons.shield}
              <select name="sealedProtection" data-role="sealed-protection">
                ${optionList(yesNoOptions, draft.sealedProtection, "Selecciona respuesta")}
              </select>
            </div>
          </label>
        ` : ""}

        <div class="heat-grid">
          <label class="field">
            <span>Cantidad</span>
            <div class="field-control">${icons.info}
              <input name="electricityQuantity" data-role="electricity-quantity" type="number" min="1" step="1" value="${escapeHtml(draft.quantity)}" />
            </div>
          </label>

          <label class="field">
            <span>Acción</span>
            <div class="field-control">${icons.clipboardCheck}
              <select name="electricityAction" data-role="electricity-action">
                ${optionList(electricityActions, draft.action, "Selecciona acción")}
              </select>
            </div>
          </label>
        </div>

        ${installedArticleField("electricity", draft)}

        <label class="field">
          <span>Observación</span>
          <div class="field-control textarea-control">${icons.info}
            <textarea name="electricityObservation" data-role="electricity-observation" placeholder="Describe el hallazgo o trabajo realizado">${escapeHtml(draft.observation)}</textarea>
          </div>
        </label>

        ${evidencePhotoField("electricity", draft)}

        <div class="form-actions heat-actions">
          ${secondaryButton(state.editingElectricityIndex >= 0 ? "Guardar cambios" : (canFinish ? "Agregar otro elemento" : "Registrar elemento"), "register-electricity-element")}
          ${primaryButton("Finalizar Electricidad", canFinish ? "finish-electricity" : "none")}
        </div>
      </form>
    
      ${clearSectionButton("electricity")}
      ${clearSectionButtonStyles()}
</main>
    ${bottomNav()}
  `;
}

function coldFormScreen() {
  const task = selectedTask();
  if (isTaskCompleted(task)) return formSummaryScreen();
  const draft = state.coldDraft;
  const coldRecords = coldRecordsForTask(task.id);
  const requiredMinimum = sectionMinimumById(task, "cold");
  const siteOptions = coldSitesForElement(draft.element);
  const siteDisabled = draft.element ? "" : "disabled";
  const pendingCompleteRecord = state.editingColdIndex < 0 && isSimpleRecordDraftComplete(draft) ? 1 : 0;
  const canFinish = coldRecords.length + pendingCompleteRecord >= requiredMinimum;
  const nextSection = nextSectionAfter("cold");

  return `
    ${topBar("Frío", { back: "form", info: true })}
    <main class="screen with-nav heat-form-screen">
      ${formWorkHeader(task)}
      <section class="form-task-card heat-progress-card">
        <div class="form-card-title">
          <span class="tone-cold">${icons.snowflake}</span>
          <div>
            <h2>Registro de equipos de frío</h2>
            <p>${task.establishment} · RBD ${task.rbd}</p>
          </div>
        </div>
        <div class="heat-progress">
          <strong>${requiredMinimum ? `${Math.min(coldRecords.length, requiredMinimum)}/${requiredMinimum} obligatorios` : "Sección opcional"}</strong>
          <span>${coldRecords.length} elemento${coldRecords.length === 1 ? "" : "s"} registrado${coldRecords.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      ${coldRecords.length ? registeredItemsList(coldRecords, "cold") : ""}

      <form class="heat-form-card" data-role="cold-form">
        ${state.coldError ? `<div class="login-error">${state.coldError}</div>` : ""}
        <label class="field">
          <span>Elemento</span>
          <div class="field-control">${icons.snowflake}
            <select name="coldElement" data-role="cold-element">
              ${optionList(coldElements(), draft.element, "Selecciona un elemento")}
            </select>
          </div>
        </label>

        <label class="field">
          <span>Sitio</span>
          <div class="field-control">${icons.location}
            <select name="coldSite" data-role="cold-site" ${siteDisabled}>
              ${optionList(siteOptions, draft.site, draft.element ? "¿En qué sitio se encuentra?" : "Primero selecciona un elemento")}
            </select>
          </div>
        </label>

        ${draft.site === "Otro" ? `
          <label class="field">
            <span>Otro sitio</span>
            <div class="field-control">${icons.location}
              <input name="coldOtherSite" data-role="cold-other-site" value="${escapeHtml(draft.otherSite)}" placeholder="Escribe el sitio" />
            </div>
          </label>
        ` : ""}

        <div class="heat-grid">
          <label class="field">
            <span>Cantidad</span>
            <div class="field-control">${icons.info}
              <input name="coldQuantity" data-role="cold-quantity" type="number" min="1" step="1" value="${escapeHtml(draft.quantity)}" />
            </div>
          </label>

          <label class="field">
            <span>Acción</span>
            <div class="field-control">${icons.clipboardCheck}
              <select name="coldAction" data-role="cold-action">
                ${optionList(coldActions, draft.action, "Selecciona acción")}
              </select>
            </div>
          </label>
        </div>

        ${installedArticleField("cold", draft)}

        <label class="field">
          <span>Observación</span>
          <div class="field-control textarea-control">${icons.info}
            <textarea name="coldObservation" data-role="cold-observation" placeholder="Describe el hallazgo o trabajo realizado">${escapeHtml(draft.observation)}</textarea>
          </div>
        </label>

        ${evidencePhotoField("cold", draft)}

        <div class="form-actions heat-actions">
          ${secondaryButton(state.editingColdIndex >= 0 ? "Guardar cambios" : "Registrar elemento", "register-cold-element")}
          ${primaryButton(nextSection ? `Avanzar a ${nextSection.title}` : "Finalizar Frío", canFinish ? "finish-cold" : "none")}
        </div>
      </form>
    
      ${clearSectionButton("cold")}
      ${clearSectionButtonStyles()}
</main>
    ${bottomNav()}
  `;
}

function vectorsFormScreen() {
  const task = selectedTask();
  if (isTaskCompleted(task)) return formSummaryScreen();
  const draft = state.vectorsDraft;
  const vectorsRecords = vectorsRecordsForTask(task.id);
  const requiredMinimum = sectionMinimumById(task, "vectors");
  const pendingCompleteRecord = state.editingVectorsIndex < 0 && isSimpleRecordDraftComplete(draft) ? 1 : 0;
  const canFinish = vectorsRecords.length + pendingCompleteRecord >= requiredMinimum;
  const nextSection = nextSectionAfter("vectors");

  return `
    ${topBar("Vectores", { back: "form", info: true })}
    <main class="screen with-nav heat-form-screen">
      ${formWorkHeader(task)}
      <section class="form-task-card heat-progress-card">
        <div class="form-card-title">
          <span class="tone-vectors">${icons.bug}</span>
          <div>
            <h2>Registro de mallas mosquiteras</h2>
            <p>${task.establishment} · RBD ${task.rbd}</p>
          </div>
        </div>
        <div class="heat-progress">
          <strong>${requiredMinimum ? `${Math.min(vectorsRecords.length, requiredMinimum)}/${requiredMinimum} obligatorios` : "Sección opcional"}</strong>
          <span>${vectorsRecords.length} elemento${vectorsRecords.length === 1 ? "" : "s"} registrado${vectorsRecords.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      ${vectorsRecords.length ? registeredItemsList(vectorsRecords, "vectors") : ""}

      <form class="heat-form-card" data-role="vectors-form">
        ${state.vectorsError ? `<div class="login-error">${state.vectorsError}</div>` : ""}
        <label class="field">
          <span>Elemento</span>
          <div class="field-control">${icons.bug}
            <select name="vectorsElement" data-role="vectors-element">
              ${optionList(vectorsElements, draft.element, "Selecciona un elemento")}
            </select>
          </div>
        </label>

        <label class="field">
          <span>Sitio</span>
          <div class="field-control">${icons.location}
            <select name="vectorsSite" data-role="vectors-site">
              ${optionList(vectorsSites, draft.site, "¿En qué sitio se encuentra?")}
            </select>
          </div>
        </label>

        <div class="heat-grid">
          <label class="field">
            <span>Cantidad</span>
            <div class="field-control">${icons.info}
              <input name="vectorsQuantity" data-role="vectors-quantity" type="number" min="1" step="1" value="${escapeHtml(draft.quantity)}" />
            </div>
          </label>

          <label class="field">
            <span>Acción</span>
            <div class="field-control">${icons.clipboardCheck}
              <select name="vectorsAction" data-role="vectors-action">
                ${optionList(vectorsActions, draft.action, "Selecciona acción")}
              </select>
            </div>
          </label>
        </div>

        ${installedArticleField("vectors", draft)}

        <label class="field">
          <span>Observación</span>
          <div class="field-control textarea-control">${icons.info}
            <textarea name="vectorsObservation" data-role="vectors-observation" placeholder="Describe el hallazgo o trabajo realizado">${escapeHtml(draft.observation)}</textarea>
          </div>
        </label>

        ${evidencePhotoField("vectors", draft)}

        <div class="form-actions heat-actions">
          ${secondaryButton(state.editingVectorsIndex >= 0 ? "Guardar cambios" : "Registrar elemento", "register-vectors-element")}
          ${primaryButton(nextSection ? `Avanzar a ${nextSection.title}` : "Finalizar Vectores", canFinish ? "finish-vectors" : "none")}
        </div>
      </form>
    
      ${clearSectionButton("vectors")}
      ${clearSectionButtonStyles()}
</main>
    ${bottomNav()}
  `;
}

function waterFormScreen() {
  const task = selectedTask();
  if (isTaskCompleted(task)) return formSummaryScreen();
  const draft = state.waterDraft;
  const waterRecords = waterRecordsForTask(task.id);
  const requiredMinimum = sectionMinimumById(task, "water");
  const siteOptions = waterSitesForElement(draft.element);
  const siteDisabled = draft.element ? "" : "disabled";
  const pendingCompleteRecord = state.editingWaterIndex < 0 && isSimpleRecordDraftComplete(draft) ? 1 : 0;
  const canFinish = waterRecords.length + pendingCompleteRecord >= requiredMinimum;
  const nextSection = nextSectionAfter("water");

  return `
    ${topBar("Agua", { back: "form", info: true })}
    <main class="screen with-nav heat-form-screen">
      ${formWorkHeader(task)}
      <section class="form-task-card heat-progress-card">
        <div class="form-card-title">
          <span class="tone-water">${icons.droplet}</span>
          <div>
            <h2>Registro de elementos de agua</h2>
            <p>${task.establishment} · RBD ${task.rbd}</p>
          </div>
        </div>
        <div class="heat-progress">
          <strong>${requiredMinimum ? `${Math.min(waterRecords.length, requiredMinimum)}/${requiredMinimum} obligatorios` : "Sección opcional"}</strong>
          <span>${waterRecords.length} elemento${waterRecords.length === 1 ? "" : "s"} registrado${waterRecords.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      ${waterRecords.length ? registeredItemsList(waterRecords, "water") : ""}

      <form class="heat-form-card" data-role="water-form">
        ${state.waterError ? `<div class="login-error">${state.waterError}</div>` : ""}
        <label class="field">
          <span>Elemento</span>
          <div class="field-control">${icons.droplet}
            <select name="waterElement" data-role="water-element">
              ${optionList(waterElements(), draft.element, "Selecciona un elemento")}
            </select>
          </div>
        </label>

        <label class="field">
          <span>Sitio</span>
          <div class="field-control">${icons.location}
            <select name="waterSite" data-role="water-site" ${siteDisabled}>
              ${optionList(siteOptions, draft.site, draft.element ? "¿En qué sitio se encuentra?" : "Primero selecciona un elemento")}
            </select>
          </div>
        </label>

        ${draft.site === "Otro" ? `
          <label class="field">
            <span>Otro sitio</span>
            <div class="field-control">${icons.location}
              <input name="waterOtherSite" data-role="water-other-site" value="${escapeHtml(draft.otherSite)}" placeholder="Escribe el sitio" />
            </div>
          </label>
        ` : ""}

        <div class="heat-grid">
          <label class="field">
            <span>Cantidad</span>
            <div class="field-control">${icons.info}
              <input name="waterQuantity" data-role="water-quantity" type="number" min="1" step="1" value="${escapeHtml(draft.quantity)}" />
            </div>
          </label>

          <label class="field">
            <span>Acción</span>
            <div class="field-control">${icons.clipboardCheck}
              <select name="waterAction" data-role="water-action">
                ${optionList(waterActions, draft.action, "Selecciona acción")}
              </select>
            </div>
          </label>
        </div>

        ${installedArticleField("water", draft)}

        <label class="field">
          <span>Observación</span>
          <div class="field-control textarea-control">${icons.info}
            <textarea name="waterObservation" data-role="water-observation" placeholder="Describe el hallazgo o trabajo realizado">${escapeHtml(draft.observation)}</textarea>
          </div>
        </label>

        ${evidencePhotoField("water", draft)}

        <div class="form-actions heat-actions">
          ${secondaryButton(state.editingWaterIndex >= 0 ? "Guardar cambios" : "Registrar elemento", "register-water-element")}
          ${primaryButton(nextSection ? `Avanzar a ${nextSection.title}` : "Finalizar Agua", canFinish ? "finish-water" : "none")}
        </div>
      </form>
    
      ${clearSectionButton("water")}
      ${clearSectionButtonStyles()}
</main>
    ${bottomNav()}
  `;
}

function infrastructureFormScreen() {
  const task = selectedTask();
  if (isTaskCompleted(task)) return formSummaryScreen();
  const draft = state.infrastructureDraft;
  const infrastructureRecords = infrastructureRecordsForTask(task.id);
  const requiredMinimum = sectionMinimumById(task, "infrastructure");
  const siteOptions = infrastructureSitesForElement(draft.element);
  const siteDisabled = draft.element ? "" : "disabled";
  const pendingCompleteRecord = state.editingInfrastructureIndex < 0 && isInfrastructureDraftComplete(draft) ? 1 : 0;
  const canFinish = infrastructureRecords.length + pendingCompleteRecord >= requiredMinimum;
  const nextSection = nextSectionAfter("infrastructure");

  return `
    ${topBar("Infraestructura", { back: "form", info: true })}
    <main class="screen with-nav heat-form-screen">
      ${formWorkHeader(task)}
      <section class="form-task-card heat-progress-card">
        <div class="form-card-title">
          <span class="tone-infra">${icons.home}</span>
          <div>
            <h2>Registro de infraestructura</h2>
            <p>${task.establishment} · RBD ${task.rbd}</p>
          </div>
        </div>
        <div class="heat-progress">
          <strong>${requiredMinimum ? `${Math.min(infrastructureRecords.length, requiredMinimum)}/${requiredMinimum} obligatorios` : "Sección opcional"}</strong>
          <span>${infrastructureRecords.length} elemento${infrastructureRecords.length === 1 ? "" : "s"} registrado${infrastructureRecords.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      ${infrastructureRecords.length ? registeredItemsList(infrastructureRecords, "infrastructure") : ""}

      <form class="heat-form-card" data-role="infrastructure-form">
        ${state.infrastructureError ? `<div class="login-error">${state.infrastructureError}</div>` : ""}
        ${state.infrastructurePrefillNotice ? `<div class="form-prefill-note">${escapeHtml(state.infrastructurePrefillNotice)}</div>` : ""}
        <label class="field">
          <span>Elemento</span>
          <div class="field-control">${icons.home}
            <select name="infrastructureElement" data-role="infrastructure-element">
              ${optionList(infrastructureElements(), draft.element, "Selecciona un elemento")}
            </select>
          </div>
        </label>

        <label class="field">
          <span>Sitio</span>
          <div class="field-control">${icons.location}
            <select name="infrastructureSite" data-role="infrastructure-site" ${siteDisabled}>
              ${optionList(siteOptions, draft.site, draft.element ? "¿En qué sitio se encuentra?" : "Primero selecciona un elemento")}
            </select>
          </div>
        </label>

        ${draft.site === "Otro" ? `
          <label class="field">
            <span>Otro sitio</span>
            <div class="field-control">${icons.location}
              <input name="infrastructureOtherSite" data-role="infrastructure-other-site" value="${escapeHtml(draft.otherSite)}" placeholder="Escribe el sitio" />
            </div>
          </label>
        ` : ""}

        <label class="field">
          <span>¿El RBD cuenta con señalética de ACHS?</span>
          <div class="field-control">${icons.shield}
            <select name="infrastructureAchsSignage" data-role="infrastructure-achs-signage">
              ${optionList(yesNoNotApplicableOptions, draft.achsSignage, "Selecciona respuesta")}
            </select>
          </div>
        </label>

        ${isExtinguisherElement(draft.element) ? `
          <label class="field">
            <span>Fecha vencimiento extintor</span>
            <div class="field-control">${icons.calendar}
              <input
                name="infrastructureExtinguisherExpirationDate"
                data-role="infrastructure-extinguisher-expiration-date"
                type="date"
                value="${escapeAttribute(draft.extinguisherExpirationDate || "")}" />
            </div>
            ${draft.extinguisherExpirationDate && isIsoDateBefore(draft.extinguisherExpirationDate) ? `
              <div style="margin-top:8px;padding:10px 12px;border-radius:10px;background:#fff0f0;border:1px solid #efb7b7;color:#a52828;display:flex;gap:8px;align-items:flex-start;font-size:12px;">
                <span style="width:18px;height:18px;flex:0 0 18px;">${icons.alert}</span>
                <span><strong>Extintor vencido.</strong> La fecha de vencimiento es anterior a la fecha actual.</span>
              </div>
            ` : ""}
          </label>
        ` : ""}

        <div class="heat-grid">
          <label class="field">
            <span>Cantidad</span>
            <div class="field-control">${icons.info}
              <input name="infrastructureQuantity" data-role="infrastructure-quantity" type="number" min="1" step="1" value="${escapeHtml(draft.quantity)}" />
            </div>
          </label>

          <label class="field">
            <span>Acción</span>
            <div class="field-control">${icons.clipboardCheck}
              <select name="infrastructureAction" data-role="infrastructure-action">
                ${optionList(infrastructureActions, draft.action, "Selecciona acción")}
              </select>
            </div>
          </label>
        </div>

        ${installedArticleField("infrastructure", draft)}

        <label class="field">
          <span>Observación</span>
          <div class="field-control textarea-control">${icons.info}
            <textarea name="infrastructureObservation" data-role="infrastructure-observation" placeholder="Describe el hallazgo o trabajo realizado">${escapeHtml(draft.observation)}</textarea>
          </div>
        </label>

        ${evidencePhotoField("infrastructure", draft)}

        <div class="form-actions heat-actions">
          ${secondaryButton(state.editingInfrastructureIndex >= 0 ? "Guardar cambios" : "Registrar elemento", "register-infrastructure-element")}
          ${primaryButton(nextSection ? `Avanzar a ${nextSection.title}` : "Finalizar Infraestructura", canFinish ? "finish-infrastructure" : "none")}
        </div>
      </form>
    
      ${clearSectionButton("infrastructure")}
      ${clearSectionButtonStyles()}
</main>
    ${bottomNav()}
  `;
}

function paeManagerFormScreen() {
  const task = selectedTask();
  if (isTaskCompleted(task)) return formSummaryScreen();
  const draft = state.paeManagerDraft;
  const rutMessage = rutValidationMessage(draft.rut);
  const informationComplete = isPaeManagerComplete(draft);
  const signatureComplete = isPaeSignatureComplete();
  const complete = informationComplete && signatureComplete;
  const nextSection = nextSectionAfter("pae-manager");

  return `
    ${topBar("Encargado PAE", { back: "form", info: true })}
    <main class="screen with-nav heat-form-screen">
      ${formWorkHeader(task)}
      <section class="form-task-card heat-progress-card">
        <div class="form-card-title">
          <span class="tone-person">${icons.user}</span>
          <div>
            <h2>Información Encargado PAE</h2>
            <p>${task.establishment} · RBD ${task.rbd}</p>
          </div>
        </div>
        <div class="heat-progress">
          <strong>${complete ? "Completo" : "Pendiente"}</strong>
          <span>${informationComplete ? "Datos completos" : "Datos pendientes"} · ${signatureComplete ? "Firma guardada" : "Firma pendiente"}</span>
        </div>
      </section>

      <section class="heat-form-card" data-role="pae-manager-form">
        ${state.paeManagerError ? `<div class="login-error">${state.paeManagerError}</div>` : ""}
        <label class="field">
          <span>Nombre</span>
          <div class="field-control">${icons.user}
            <input name="paeManagerName" data-role="pae-manager-input" data-field="name" value="${escapeHtml(draft.name)}" placeholder="Nombre completo" />
          </div>
        </label>

        <label class="field">
          <span>RUT</span>
          <div class="field-control ${rutMessage ? "field-control-error" : ""}">${icons.info}
            <input name="paeManagerRut" data-role="pae-manager-input" data-field="rut" value="${escapeHtml(draft.rut)}" placeholder="12.345.678-9" inputmode="text" maxlength="12" autocomplete="off" />
          </div>
          <small class="field-error-message" data-role="pae-manager-rut-error">${escapeHtml(rutMessage)}</small>
        </label>

        <label class="field">
          <span>Cargo</span>
          <div class="field-control">${icons.clipboard}
            <select name="paeManagerRole" data-role="pae-manager-input" data-field="role">
              ${paeManagerRoleOptionsHtml(draft.role)}
            </select>
          </div>
        </label>

        ${state.paeSignatureError ? `<div class="login-error">${state.paeSignatureError}</div>` : ""}
        <label class="field">
          <span>Firma</span>
          <button class="signature-preview" type="button" data-action="open-signature-pad">
            ${state.paeSignatureData ? `<img src="${escapeAttribute(state.paeSignatureData)}" alt="Firma guardada" />` : `
              <span>${icons.signature}</span>
              <strong>Tocar para firmar</strong>
              <small>Se abrirá un recuadro ampliado para dibujar la firma.</small>
            `}
          </button>
        </label>

        <div class="form-actions heat-actions">
          ${secondaryButton(state.paeSignatureData ? "Borrar firma" : "Guardar información", state.paeSignatureData ? "delete-signature" : "save-pae-manager")}
          ${primaryButton(nextSection ? `Avanzar a ${nextSection.title}` : "Finalizar Encargado PAE", "finish-pae-manager")}
        </div>
      </section>
    
      ${clearSectionButton("pae-manager")}
      ${clearSectionButtonStyles()}
</main>
    ${bottomNav()}
    ${paeSignatureModal()}
  `;
}

function paeSignatureModal() {
  if (!state.paeSignatureModalOpen) return "";

  return `
    <section class="signature-modal-backdrop">
      <div class="signature-modal" role="dialog" aria-modal="true" aria-label="Firma Encargado PAE">
        <div class="signature-modal-head">
          <div>
            <strong>Firma Encargado PAE</strong>
            <span>Dibuja la firma con el dedo o lápiz táctil.</span>
          </div>
          <button class="signature-close" type="button" data-action="close-signature-pad" aria-label="Cerrar firma">×</button>
        </div>
        <div class="signature-canvas-wrap">
          <canvas class="signature-canvas" data-role="signature-canvas" data-signature-kind="pae"></canvas>
        </div>
        <div class="signature-modal-actions">
          ${secondaryButton("Borrar", "clear-signature-pad")}
          ${primaryButton("Guardar firma", "save-signature-pad")}
        </div>
      </div>
    </section>
  `;
}

function technicianSignatureModal() {
  if (!state.technicianSignatureModalOpen) return "";

  return `
    <section class="signature-modal-backdrop">
      <div class="signature-modal" role="dialog" aria-modal="true" aria-label="Firma del técnico">
        <div class="signature-modal-head">
          <div>
            <strong>Firma del técnico</strong>
            <span>Dibuja tu firma para confirmar el envío del formulario.</span>
          </div>
          <button class="signature-close" type="button" data-action="close-technician-signature-pad" aria-label="Cerrar firma">×</button>
        </div>
        <div class="signature-canvas-wrap">
          <canvas class="signature-canvas" data-role="signature-canvas" data-signature-kind="technician"></canvas>
        </div>
        <div class="signature-modal-actions">
          ${secondaryButton("Borrar", "clear-signature-pad")}
          ${primaryButton("Guardar firma", "save-technician-signature-pad")}
        </div>
      </div>
    </section>
  `;
}

function technicianSignaturePreviewScreen() {
  const task = selectedTask();
  if (isTaskCompleted(task)) return formSummaryScreen();
  const user = loggedUser();
  const complete = Boolean(state.technicianSignatureData);

  return `
    ${topBar("Firma del técnico", { back: "form", info: true })}
    <main class="screen with-nav heat-form-screen">
      ${formWorkHeader(task)}
      <section class="form-task-card heat-progress-card">
        <div class="form-card-title">
          <span class="tone-signature">${icons.signature}</span>
          <div>
            <h2>Revisión previa al envío</h2>
            <p>${task.establishment} · RBD ${task.rbd}</p>
          </div>
        </div>
        <div class="heat-progress">
          <strong>${state.formSubmitBusy ? "Enviando formulario" : complete ? "Firma lista" : "Firma requerida"}</strong>
          <span>${state.formSubmitBusy ? "Guardando en Supabase..." : user.nombre}</span>
        </div>
      </section>

      <section class="detail-list">
        ${detailRow("user", "Técnico", user.nombre)}
        ${detailRow("clipboard", "Tipo de tarea", task.type)}
        ${detailRow("calendar", "Fecha planificada", task.dueAt)}
      </section>

      <section class="heat-form-card">
        ${state.technicianSignatureError ? `<div class="login-error">${state.technicianSignatureError}</div>` : ""}
        <button class="signature-preview" type="button" data-action="open-technician-signature-pad">
          ${state.technicianSignatureData ? `<img src="${escapeAttribute(state.technicianSignatureData)}" alt="Firma del técnico guardada" />` : `
            <span>${icons.signature}</span>
            <strong>Tocar para firmar</strong>
            <small>Se abrirá un recuadro ampliado para dibujar la firma del técnico.</small>
          `}
        </button>
        <div class="form-actions heat-actions">
          ${secondaryButton("Borrar firma", state.technicianSignatureData ? "delete-technician-signature" : "none", state.formSubmitBusy)}
          ${primaryButton(state.formSubmitBusy ? "Enviando..." : "Confirmar envío", "confirm-form-submit")}
        </div>
      </section>
    </main>
    ${bottomNav()}
    ${technicianSignatureModal()}
  `;
}

function mpaQuestion(label, name, value) {
  return `
    <label class="field">
      <span>${label}</span>
      <div class="field-control">${icons.info}
        <select name="${name}" data-role="mpa-field" data-field="${name}">
          ${optionList(yesNoOptions, value, "Selecciona respuesta")}
        </select>
      </div>
    </label>
  `;
}

function mpaFormScreen() {
  const task = selectedTask();
  if (isTaskCompleted(task)) return formSummaryScreen();
  const draft = state.mpaDraft;
  const requiredMinimum = sectionMinimumById(task, "mpa");
  const complete = isMpaComplete(draft);
  const canFinish = !requiredMinimum || complete;
  const nextSection = nextSectionAfter("mpa");

  return `
    ${topBar("MPA", { back: "form", info: true })}
    <main class="screen with-nav heat-form-screen">
      ${formWorkHeader(task)}
      <section class="form-task-card heat-progress-card">
        <div class="form-card-title">
          <span class="tone-mpa">${icons.clipboard}</span>
          <div>
            <h2>Condiciones MPA</h2>
            <p>${task.establishment} · RBD ${task.rbd}</p>
          </div>
        </div>
        <div class="heat-progress">
          <strong>${requiredMinimum ? `${complete ? 1 : 0}/1 obligatorio` : "Sección opcional"}</strong>
          <span>${complete ? "Preguntas completas" : "Preguntas pendientes"}</span>
        </div>
      </section>

      <form class="heat-form-card" data-role="mpa-form">
        ${state.mpaError ? `<div class="login-error">${state.mpaError}</div>` : ""}
        ${mpaQuestion("¿El RBD cuenta con vestidores?", "hasDressingRoom", draft.hasDressingRoom)}

        ${draft.hasDressingRoom === "Sí" ? `
          <label class="field">
            <span>Indique dónde se encuentra el vestidor</span>
            <div class="field-control">${icons.location}
              <select name="dressingRoomLocation" data-role="mpa-field" data-field="dressingRoomLocation">
                ${optionList(dressingRoomLocations, draft.dressingRoomLocation, "Selecciona ubicación")}
              </select>
            </div>
          </label>
        ` : ""}

        ${mpaQuestion("¿Existen casilleros en el RBD?", "hasLockers", draft.hasLockers)}

        ${draft.hasLockers === "Sí" ? `
          ${mpaQuestion("¿El RBD cuenta con casilleros acorde al personal de planta?", "lockersFitStaff", draft.lockersFitStaff)}
          ${mpaQuestion("¿El casillero se encuentra en buen estado y permite su cierre?", "lockersGoodState", draft.lockersGoodState)}
        ` : ""}

        ${mpaQuestion("¿MPA cuenta con ducha?", "hasShower", draft.hasShower)}

        ${draft.hasShower === "Sí" ? `
          ${mpaQuestion("¿Las duchas son exclusivas para personal de Soser?", "showerExclusive", draft.showerExclusive)}
        ` : ""}

        ${mpaQuestion("¿MPA cuenta con baño?", "hasBathroom", draft.hasBathroom)}

        ${draft.hasBathroom === "Sí" ? `
          ${mpaQuestion("¿El baño es exclusivo para personal Soser?", "bathroomExclusive", draft.bathroomExclusive)}
        ` : ""}

        <div class="form-actions heat-actions">
          ${secondaryButton("Guardar respuestas", "save-mpa")}
          ${primaryButton(nextSection ? `Avanzar a ${nextSection.title}` : "Finalizar MPA", canFinish ? "finish-mpa" : "none")}
        </div>
      </form>
    
      ${clearSectionButton("mpa")}
      ${clearSectionButtonStyles()}
</main>
    ${bottomNav()}
  `;
}

function serviceYardFormScreen() {
  const task = selectedTask();
  if (isTaskCompleted(task)) return formSummaryScreen();
  const draft = state.serviceYardDraft;
  const requiredMinimum = sectionMinimumById(task, "service-yard");
  const complete = isServiceYardComplete(draft);
  const canFinish = !requiredMinimum || complete;
  const nextSection = nextSectionAfter("service-yard");

  return `
    ${topBar("Patio Servicio", { back: "form", info: true })}
    <main class="screen with-nav heat-form-screen">
      ${formWorkHeader(task)}
      <section class="form-task-card heat-progress-card">
        <div class="form-card-title">
          <span class="tone-patio">${icons.utensils}</span>
          <div>
            <h2>Patio de servicio</h2>
            <p>${task.establishment} · RBD ${task.rbd}</p>
          </div>
        </div>
        <div class="heat-progress">
          <strong>${requiredMinimum ? `${complete ? 1 : 0}/1 obligatorio` : "Sección opcional"}</strong>
          <span>${complete ? "Pregunta completa" : "Pregunta pendiente"}</span>
        </div>
      </section>

      <form class="heat-form-card" data-role="service-yard-form">
        ${state.serviceYardError ? `<div class="login-error">${state.serviceYardError}</div>` : ""}
        <label class="field">
          <span>¿El patio de servicio es exclusivo para el programa?</span>
          <div class="field-control">${icons.info}
            <select name="exclusiveProgram" data-role="service-yard-field">
              ${optionList(yesNoOptions, draft.exclusiveProgram, "Selecciona respuesta")}
            </select>
          </div>
        </label>

        <div class="form-actions heat-actions">
          ${secondaryButton("Guardar respuestas", "save-service-yard")}
          ${primaryButton(nextSection ? `Avanzar a ${nextSection.title}` : "Finalizar Patio Servicio", canFinish ? "finish-service-yard" : "none")}
        </div>
      </form>
    
      ${clearSectionButton("service-yard")}
      ${clearSectionButtonStyles()}
</main>
    ${bottomNav()}
  `;
}

function rbdCheckersQuestion(label, field, value) {
  return `
    <label class="field">
      <span>${label}</span>
      <div class="field-control">${icons.checkSquare}
        <select name="${field}" data-role="rbd-checkers-field" data-field="${field}">
          ${optionList(yesNoOptions, value, "Selecciona respuesta")}
        </select>
      </div>
    </label>
  `;
}

function rbdCheckersFormScreen() {
  const task = selectedTask();
  if (isTaskCompleted(task)) return formSummaryScreen();
  const draft = state.rbdCheckersDraft;
  const today = todayIsoDate();
  const pestControlDate = normalizeIsoDate(draft.pestControlDate);
  const greenSealExpiration = normalizeIsoDate(draft.greenSealExpiration);
  const greenSealExpired = greenSealExpiredValue(draft) === "Sí";
  const requiredMinimum = sectionMinimumById(task, "rbd-checkers");
  const complete = isRbdCheckersComplete(draft);
  const canFinish = !requiredMinimum || complete;
  const nextSection = nextSectionAfter("rbd-checkers");

  return `
    ${topBar("Verificadores RBD", { back: "form", info: true })}
    <main class="screen with-nav heat-form-screen">
      ${formWorkHeader(task)}
      <section class="form-task-card heat-progress-card">
        <div class="form-card-title">
          <span class="tone-check">${icons.checkSquare}</span>
          <div>
            <h2>Verificadores RBD</h2>
            <p>${task.establishment} · RBD ${task.rbd}</p>
          </div>
        </div>
        <div class="heat-progress">
          <strong>${requiredMinimum ? `${complete ? 1 : 0}/1 obligatorio` : "Sección opcional"}</strong>
          <span>${complete ? "Preguntas completas" : "Preguntas pendientes"}</span>
        </div>
      </section>

      <form class="heat-form-card" data-role="rbd-checkers-form">
        ${state.rbdCheckersError ? `<div class="login-error">${state.rbdCheckersError}</div>` : ""}
        ${state.rbdCheckersPrefillNotice ? `<div class="form-prefill-note">${escapeHtml(state.rbdCheckersPrefillNotice)}</div>` : ""}
        ${rbdCheckersQuestion("¿Se encuentra al día el control de plagas?", "pestControlUpToDate", draft.pestControlUpToDate)}

        <label class="field">
          <span>Indique fecha del último control de plagas</span>
          <div class="field-control">${icons.calendar}
            <input name="pestControlDate" data-role="rbd-checkers-input" data-field="pestControlDate" type="date" value="${escapeHtml(pestControlDate)}" ${draft.pestControlUpToDate === "Sí" ? `max="${escapeAttribute(today)}"` : ""} />
          </div>
          ${draft.pestControlUpToDate === "Sí" && isIsoDateAfter(pestControlDate, today) ? `<small class="field-hint field-hint-error">Si el control está al día, la fecha no puede ser posterior a hoy.</small>` : ""}
        </label>

        ${rbdCheckersQuestion("¿El RBD cuenta con resolución sanitaria?", "hasSanitaryResolution", draft.hasSanitaryResolution)}

        ${draft.hasSanitaryResolution === "Sí" ? `
          <label class="field">
            <span>Indicar N° Resolución</span>
            <div class="field-control">${icons.info}
              <input name="sanitaryResolutionNumber" data-role="rbd-checkers-input" data-field="sanitaryResolutionNumber" value="${escapeHtml(draft.sanitaryResolutionNumber)}" placeholder="Número de resolución" />
            </div>
          </label>
        ` : ""}

        ${rbdCheckersQuestion("¿El RBD posee sello verde?", "hasGreenSeal", draft.hasGreenSeal)}

        ${draft.hasGreenSeal === "Sí" ? `
          <label class="field">
            <span>Indicar código o ID</span>
            <div class="field-control">${icons.info}
              <input name="greenSealCode" data-role="rbd-checkers-input" data-field="greenSealCode" value="${escapeHtml(draft.greenSealCode)}" placeholder="Código o ID" />
            </div>
          </label>
          <label class="field">
            <span>Indique fecha de vencimiento</span>
            <div class="field-control">${icons.calendar}
              <input name="greenSealExpiration" data-role="rbd-checkers-input" data-field="greenSealExpiration" type="date" value="${escapeHtml(greenSealExpiration)}" />
            </div>
          </label>
          <label class="rbd-expired-check ${greenSealExpired ? "is-expired" : ""}">
            <input type="checkbox" ${greenSealExpired ? "checked" : ""} disabled />
            <span>Sello verde vencido</span>
          </label>
        ` : ""}

        ${rbdCheckersQuestion("¿El establecimiento cuenta con la carátula de mantención correspondiente al año?", "hasMaintenanceCover", draft.hasMaintenanceCover)}
        ${rbdCheckersQuestion("¿El establecimiento cuenta con certificado de pintura?", "hasPaintCertificate", draft.hasPaintCertificate)}

        <div class="form-actions heat-actions">
          ${secondaryButton("Guardar respuestas", "save-rbd-checkers")}
          ${primaryButton(nextSection ? `Avanzar a ${nextSection.title}` : "Enviar formulario", canFinish ? "finish-rbd-checkers" : "none")}
        </div>
      </form>
    
      ${clearSectionButton("rbd-checkers")}
      ${clearSectionButtonStyles()}
</main>
    ${bottomNav()}
  `;
}

function usedItemsFormScreen() {
  const task = selectedTask();
  if (isTaskCompleted(task)) return formSummaryScreen();
  const draft = state.usedItemsDraft;
  const usedItemsRecords = usedItemsRecordsForTask(task.id);
  const catalogReady = articleCatalog.length > 0;
  const submitLabel = state.formSubmitBusy ? "Enviando..." : "Enviar formulario";

  return `
    ${topBar("Artículos utilizados", { back: "form", info: true })}
    <main class="screen with-nav heat-form-screen">
      ${formWorkHeader(task)}
      <section class="form-task-card heat-progress-card">
        <div class="form-card-title">
          <span class="tone-items">${icons.briefcase}</span>
          <div>
            <h2>Consumo de artículos</h2>
            <p>${task.establishment} · RBD ${task.rbd}</p>
          </div>
        </div>
        <div class="heat-progress">
          <strong>Sección opcional</strong>
          <span>${usedItemsRecords.length} consumo${usedItemsRecords.length === 1 ? "" : "s"} registrado${usedItemsRecords.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      ${usedItemsRecords.length ? registeredItemsList(usedItemsRecords, "used-items") : ""}

      <form class="heat-form-card" data-role="used-items-form">
        ${state.usedItemsError ? `<div class="login-error">${state.usedItemsError}</div>` : ""}
        ${!catalogReady ? `<div class="login-error">No se pudo cargar el catálogo de artículos.</div>` : ""}
        <label class="field">
          <span>Artículo utilizado</span>
          <div class="article-picker-field">
            <button
              class="article-picker-trigger"
              type="button"
              data-action="open-article-picker"
              data-section="used-item"
              data-title="Artículo utilizado"
              ${catalogReady ? "" : "disabled"}>
              ${icons.briefcase}
              <span>${draft.articleId ? escapeHtml(articleSearchValue(draft.articleId, draft.articleName)) : "Buscar por código o nombre"}</span>
            </button>
            <input type="hidden" name="usedItemArticle" data-role="used-item-article" value="${escapeAttribute(draft.articleId || "")}" />
          </div>
        </label>

        <label class="field">
          <span>Cantidad</span>
          <div class="field-control">${icons.info}
            <input name="usedItemQuantity" data-role="used-item-quantity" type="number" min="1" step="1" value="${escapeHtml(draft.quantity)}" />
          </div>
        </label>

        <label class="field">
          <span>Observación</span>
          <div class="field-control textarea-control">${icons.info}
            <textarea name="usedItemObservation" data-role="used-item-observation" placeholder="Detalle opcional del consumo">${escapeHtml(draft.observation)}</textarea>
          </div>
        </label>

        <div class="form-actions heat-actions">
          ${secondaryButton(state.editingUsedItemIndex >= 0 ? "Guardar cambios" : "Registrar consumo", catalogReady ? "register-used-item" : "none")}
          ${primaryButton(submitLabel, state.formSubmitBusy ? "none" : "finish-used-items")}
        </div>
      </form>
    </main>
    ${bottomNav()}
  `;
}

function genericFormSectionScreen() {
  const task = selectedTask();
  if (isTaskCompleted(task)) return formSummaryScreen();
  const section = formSectionDefinitions.find((item) => item.id === state.activeFormSection) ?? formSectionDefinitions[2];
  const nextSection = nextSectionAfter(section.id);
  const requiredMinimum = sectionMinimumById(task, section.id);
  const primaryLabel = nextSection ? `Avanzar a ${nextSection.title}` : "Enviar formulario";
  const primaryAction = nextSection ? "advance-next-section" : "technician-signature-preview";

  return `
    ${topBar(section.title, { back: "form", info: true })}
    <main class="screen with-nav heat-form-screen">
      ${formWorkHeader(task)}
      <section class="form-task-card heat-progress-card">
        <div class="form-card-title">
          <span class="tone-${section.tone}">${icons[section.icon]}</span>
          <div>
            <h2>${section.title}</h2>
            <p>${task.establishment} · RBD ${task.rbd}</p>
          </div>
        </div>
        <div class="blueprint-note">
          Las preguntas de esta sección serán configuradas posteriormente. ${requiredMinimum ? `Mínimo configurado para continuar: ${requiredMinimum} registro${requiredMinimum === 1 ? "" : "s"}.` : "Sin mínimo obligatorio configurado."}
        </div>
      </section>
      <div class="form-actions">
        ${secondaryButton("Volver al índice", "form")}
        ${primaryButton(primaryLabel, primaryAction)}
      </div>
    </main>
    ${bottomNav()}
  `;
}

function formProgressAnswerCount(progress = {}) {
  const filledAnswers = (answers = []) => answers.filter((item) => {
    const value = item?.value;
    return value !== "" && value !== null && value !== undefined;
  }).length;

  const recordGroups = [
    progress.heatRecords,
    progress.electricityRecords,
    progress.coldRecords,
    progress.vectorsRecords,
    progress.waterRecords,
    progress.infrastructureRecords,
    progress.usedItemsRecords
  ];

  const recordAnswerCount = recordGroups.reduce((total, records) => (
    total + (Array.isArray(records) ? records : []).reduce((recordTotal, record) => (
      recordTotal + filledAnswers(recordAnswers(record))
    ), 0)
  ), 0);

  const singleAnswerCount = [
    progress.paeManagerDraft,
    progress.mpaDraft,
    progress.serviceYardDraft,
    progress.rbdCheckersDraft
  ].reduce((total, draft) => total + filledAnswers(recordAnswers(draft ?? {})), 0);

  return recordAnswerCount + singleAnswerCount;
}

function continuableTaskEntries() {
  const user = loggedUser();
  const storedProgress = readStoredFormProgress();
  const assignedTasks = isAdmin(user) ? tasks : tasks.filter((task) => task.assignedTo === user.usuario);

  return assignedTasks
    .map((task) => {
      const progress = storedProgress[task.id];
      const answerCount = formProgressAnswerCount(progress);
      return { task, answerCount };
    })
    .filter(({ task, answerCount }) => answerCount > 0 && !isTaskCompleted(task))
    .sort((a, b) => b.answerCount - a.answerCount);
}

function continueTaskCard(entry) {
  const { task, answerCount } = entry;
  return `
    <article class="task-card" data-action="task-detail" data-task-id="${task.id}">
      <div class="task-card-head">
        ${taskTypeLabel(task.type)}
        ${taskStatusPill(task)}
      </div>
      <h2>RBD ${task.rbd}</h2>
      <p>${task.establishment}</p>
      <div class="task-meta">
        <span>${icons.calendar} Fecha planificada: ${task.dueAt}</span>
        <button class="summary-link" type="button">Continuar</button>
      </div>
      <div class="task-meta">
        <span>${icons.clipboardCheck} ${answerCount} respuesta${answerCount === 1 ? "" : "s"} guardada${answerCount === 1 ? "" : "s"}</span>
        <button class="card-arrow" aria-label="Continuar formulario">${icons.arrow}</button>
      </div>
    </article>
  `;
}

function historyScreen() {
  const entries = continuableTaskEntries();

  return `
    ${topBar("Continuar")}
    <main class="screen with-nav">
      <section class="stack">
        ${entries.length
          ? entries.map(continueTaskCard).join("")
          : emptyState("Sin formularios iniciados", "Cuando registres al menos una respuesta en una tarea, aparecerá aquí para continuarla.")}
      </section>
    </main>
    ${bottomNav()}
  `;
}

function syncScreen() {
  const pending = Math.max(
    tasks.filter((task) => task.syncStatus === "pending").length,
    pendingSubmissionCount()
  );

  return `
    ${topBar("Sincronizar")}
    <main class="screen with-nav">
      <section class="sync-panel">
        <div class="sync-ring">${icons.sync}</div>
        <h2>${pending ? "Formularios pendientes" : "Todo sincronizado"}</h2>
        <p>${pending ? `Hay formularios completados sin internet esperando ser subidos a ${remoteBackendLabel()}.` : "No hay formularios pendientes por subir."}</p>
      </section>
      <section class="detail-list">
        ${detailRow("calendar", "Última sincronización", state.lastSyncAt || "Sin sincronización manual en esta sesión")}
        ${detailRow("sync", "Tareas pendientes por sincronizar", `${pending}`)}
        ${detailRow("info", "Conexión", isNetworkOnline() ? "Con internet" : "Sin conexión")}
      </section>
      <div class="sync-primary-action">
        ${primaryButton(state.syncBusy ? "Sincronizando..." : "Sincronizar ahora", state.syncBusy ? "none" : "sync-now")}
      </div>
    </main>
    ${bottomNav()}
  `;
}

function jmProfileMenuItem(icon, title, value = "", route = "none") {
  return `
    <button class="jm-profile-row" type="button" data-action="${route === "none" ? "none" : "route"}" data-route="${route}">
      ${icon}
      <span>${title}</span>
      ${value ? `<strong>${value}</strong>` : icons.arrow}
    </button>
  `;
}

function incidentsForUser(user = loggedUser()) {
  return state.incidents
    .filter((incident) => userHasBranch(user, incident.branch))
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

function openIncidentsForManager(user = loggedUser()) {
  return incidentsForUser(user).filter((incident) => !["Tarea creada", "Planificada", "Resuelta"].includes(incidentEffectiveStatus(incident)));
}

function incidentTaskFor(incident) {
  if (incident?.plannedTask) return incident.plannedTask;
  if (!incident?.taskId) return null;
  return tasks.find((task) => task.id === incident.taskId || task.supabaseId === incident.taskId) ?? null;
}

function incidentEffectiveStatus(incident) {
  const task = incidentTaskFor(incident);
  if (taskIsCompleted(task)) return "Resuelta";
  if (incident?.status === "Tarea creada") return "Planificada";
  return incident?.status || "En revisión";
}

function incidentIsResolved(incident) {
  return incidentEffectiveStatus(incident) === "Resuelta";
}

function incidentStatusPill(statusOrIncident) {
  const displayStatus = typeof statusOrIncident === "object"
    ? incidentEffectiveStatus(statusOrIncident)
    : statusOrIncident === "Tarea creada" ? "Planificada" : statusOrIncident;
  const tone = `incident-status-${statusClass(displayStatus).replace(/\s+/g, "-")}`;
  return `<span class="pill incident-status ${tone}">${escapeHtml(displayStatus)}</span>`;
}

function preventionIncidentMetrics(incidents) {
  const total = incidents.length;
  const resolved = incidents.filter(incidentIsResolved).length;
  const planned = incidents.filter((incident) => incidentEffectiveStatus(incident) === "Planificada").length;
  const review = incidents.filter((incident) => incidentEffectiveStatus(incident) === "En revisión").length;
  const percent = total ? Math.round((resolved / total) * 100) : 0;
  return { total, resolved, planned, review, percent };
}

function preventionIncidentProgressCard(metrics) {
  return `
    <section class="incident-progress-card">
      <div>
        <span>Cumplimiento de incidencias</span>
        <strong>${metrics.percent}%</strong>
        <small>${metrics.resolved} resuelta${metrics.resolved === 1 ? "" : "s"} de ${metrics.total}</small>
      </div>
      <span class="jm-progress-ring incident-compliance-ring" style="--progress:${metrics.percent * 3.6}deg">${metrics.percent}%</span>
      <div class="incident-progress-stats">
        <span class="incident-stat-review">${metrics.review} en revisión</span>
        <span class="incident-stat-planned">${metrics.planned} planificada${metrics.planned === 1 ? "" : "s"}</span>
        <span class="incident-stat-resolved">${metrics.resolved} resuelta${metrics.resolved === 1 ? "" : "s"}</span>
      </div>
    </section>
  `;
}

function incidentPhotosGrid(photos = []) {
  if (!photos.length) return "";
  return `
    <div class="incident-photo-grid">
      ${photos.slice(0, 4).map((photo, index) => `
        <button class="incident-photo-thumb" type="button" data-action="open-image-preview" data-src="${escapeAttribute(photo.dataUrl)}" data-title="${escapeAttribute(photo.name || `Foto ${index + 1}`)}" data-subtitle="Evidencia de incidencia">
          <img src="${escapeAttribute(photo.dataUrl)}" alt="${escapeAttribute(photo.name || `Foto ${index + 1}`)}" />
        </button>
      `).join("")}
    </div>
  `;
}

function incidentCard(incident, options = {}) {
  const cardAction = options.manager ? "" : ` data-action="incident-detail" data-incident-id="${escapeAttribute(incident.id)}"`;
  return `
    <article class="incident-card ${options.manager ? "" : "clickable"}"${cardAction}>
      <div class="incident-head">
        <span class="incident-icon">${icons.alert}</span>
        <div>
          <strong>${escapeHtml(incident.title)}</strong>
          <small>${escapeHtml(incident.branch)} · RBD ${escapeHtml(incident.rbd)}</small>
        </div>
        ${incidentStatusPill(incident)}
      </div>
      <p>${escapeHtml(incident.description)}</p>
      ${incidentPhotosGrid(incident.photos)}
      <div class="incident-meta">
        <span>${icons.calendar} ${escapeHtml(incident.createdLabel)}</span>
        <span>Prioridad ${escapeHtml(incident.severity)}</span>
      </div>
      ${options.manager ? `
        <button class="button primary" type="button" data-action="create-task-from-incident" data-incident-id="${escapeAttribute(incident.id)}">
          ${icons.clipboardCheck}<span>Crear visita Mutualidad</span>
        </button>
      ` : ""}
    </article>
  `;
}

function incidentDetailScreen() {
  const incident = state.incidents.find((item) => item.id === state.selectedIncidentId);
  if (!incident) {
    return `
      ${topBar("Detalle incidencia", { back: "incidents" })}
      <main class="screen with-nav incidents-screen">
        ${emptyState("Incidencia no encontrada", "Vuelve a tus reportes para seleccionar una incidencia.")}
      </main>
      ${bottomNav()}
    `;
  }

  const task = incidentTaskFor(incident);
  const technician = users.find((user) => user.usuario === task?.assignedTo);
  const planner = task?.assignedBy || "Jefe de Mantención";
  const plannedStatus = incidentEffectiveStatus(incident);

  return `
    ${topBar("Detalle incidencia", { back: "incidents" })}
    <main class="screen with-nav incidents-screen">
      <section class="incident-card incident-detail-card">
        <div class="incident-head">
          <span class="incident-icon">${icons.alert}</span>
          <div>
            <strong>${escapeHtml(incident.title)}</strong>
            <small>${escapeHtml(incident.branch)} · RBD ${escapeHtml(incident.rbd)}</small>
          </div>
          ${incidentStatusPill(incident)}
        </div>
        <p>${escapeHtml(incident.description)}</p>
        ${incidentPhotosGrid(incident.photos)}
      </section>

      <section class="detail-list incident-plan-detail">
        ${detailRow("home", "Establecimiento", escapeHtml(incident.establishment || "Sin establecimiento"))}
        ${detailRow("branch", "RBD", escapeHtml(incident.rbd))}
        ${detailRow("alert", "Prioridad", `<span class="detail-value priority-${statusClass(incident.severity)}">${escapeHtml(incident.severity)}</span>`)}
        ${detailRow("info", "Estado", escapeHtml(plannedStatus))}
      </section>

      ${task ? `
        <section class="detail-list incident-plan-detail">
          ${detailRow("clipboardCheck", "Tipo de visita", escapeHtml(task.type || "Mutualidad"))}
          ${detailRow("calendar", "Fecha planificada", escapeHtml(task.dueAt || "Sin fecha"))}
          ${detailRow("user", "Técnico asignado", escapeHtml(technician?.nombre || task.assignedTo || "Sin técnico"))}
          ${detailRow("user", "Planificada por", escapeHtml(planner))}
          ${detailRow("info", "Estado de la visita", `<span class="detail-value ${taskDisplayStatusClass(task)}">${escapeHtml(taskDisplayStatus(task))}</span>`)}
          ${task.description ? detailRow("clipboard", "Detalle de la visita", escapeHtml(task.description)) : ""}
        </section>
      ` : state.incidentPlanLoadingId === incident.id ? `
        <section class="incident-info-box">
          ${icons.sync}
          <span>Cargando detalle de planificación...</span>
        </section>
      ` : `
        <section class="incident-info-box">
          ${icons.info}
          <span>${plannedStatus === "Planificada" ? escapeHtml(state.incidentPlanError || "La incidencia figura como planificada, pero aún no tiene una tarea vinculada para mostrar el detalle.") : "El Jefe de Mantención aún no ha planificado una visita para esta incidencia."}</span>
        </section>
      `}
    </main>
    ${bottomNav()}
  `;
}

function incidentWizardHeader(step) {
  return `
    <section class="incident-wizard-head">
      <div>
        <h2>Levantar incidencia</h2>
        <p>Paso ${step} de 4</p>
      </div>
      <div class="incident-progress" style="--step:${step}">
        ${[1, 2, 3, 4].map((item) => `<span class="${item <= step ? "active" : ""}"></span>`).join("")}
      </div>
    </section>
  `;
}

function incidentTypeOptions() {
  const types = [
    ["Emergencia (inmediata)", icons.alert],
    ["Condición de riesgo", icons.shield],
    ["Falla de equipo", icons.wrench],
    ["Daño en infraestructura", icons.branch],
    ["Otro", icons.info]
  ];
  return `
    <div class="incident-type-grid">
      ${types.map(([type, icon]) => `
        <button class="incident-type-card ${state.incidentDraft.type === type ? "selected" : ""}" type="button" data-action="select-incident-type" data-type="${escapeAttribute(type)}">
          <span>${icon}</span>
          <strong>${escapeHtml(type)}</strong>
        </button>
      `).join("")}
    </div>
  `;
}

function incidentReviewRows(draft, selectedEstablishment) {
  return `
    <section class="incident-review">
      ${detailRow("location", "Zona", escapeHtml(draft.branch))}
      ${detailRow("branch", "RBD", escapeHtml(selectedEstablishment?.rbd || ""))}
      ${detailRow("home", "Establecimiento", escapeHtml(selectedEstablishment?.name || ""))}
      ${detailRow("alert", "Tipo", escapeHtml(draft.type))}
      ${detailRow("clipboard", "Título", escapeHtml(draft.title))}
      ${detailRow("info", "Descripción", escapeHtml(draft.description))}
    </section>
  `;
}

function incidentsScreen() {
  const user = loggedUser();
  const visibleIncidents = incidentsForUser(user);
  const metrics = preventionIncidentMetrics(visibleIncidents);
  return `
    <header class="incident-home-header">
      <div>
        <h1>Incidencias</h1>
        <p>Hola, ${escapeHtml(user.nombre.split(" ")[0] || "Prevencionista")}</p>
        <span>Prevencionista</span>
      </div>
      <button class="jm-bell" type="button">${icons.info}<i></i></button>
    </header>
    <main class="screen with-nav incidents-screen">
      <section class="placeholder-card prevention-hero">
        <div class="placeholder-icon">${icons.shield}</div>
        <h2>Reportar incidencias de mantención</h2>
        <p>Levanta emergencias o condiciones de riesgo según tu zona y RBD asignado.</p>
        <button class="button primary" type="button" data-action="incident-new">${icons.info}<span>Levantar incidencia</span></button>
      </section>
      ${preventionIncidentProgressCard(metrics)}
      <section class="incident-list">
        <div class="incident-list-head">
          <h3>Mis reportes</h3>
          <button type="button" class="task-refresh-button incident-refresh-button" data-action="refresh-incidents" ${state.incidentRefreshUiBusy ? "disabled" : ""}>
            ${icons.sync}
            <span>${state.incidentRefreshUiBusy ? "Actualizando..." : "Actualizar"}</span>
          </button>
        </div>
        ${visibleIncidents.length ? visibleIncidents.map(incidentCard).join("") : emptyState("Sin incidencias", "Aún no has levantado reportes para tus zonas.")}
      </section>
    </main>
    ${bottomNav()}
  `;
}

function incidentFormScreen() {
  const user = loggedUser();
  const branches = userBranches(user);
  const branch = branches.includes(state.incidentDraft.branch) ? state.incidentDraft.branch : branches[0] ?? "Santiago";
  const branchEstablishments = establishmentsByBranch(branch);
  const selectedEstablishment = branchEstablishments.find((item) => item.rbd === state.incidentDraft.selectedRbd);
  const searchValue = state.incidentDraft.rbdSearch || establishmentLabel(selectedEstablishment);
  const filteredEstablishments = filterEstablishments(branchEstablishments, state.incidentDraft.rbdSearch);
  const showComboResults = !state.incidentDraft.selectedRbd && (state.incidentDraft.rbdSearch || branchEstablishments.length <= 8);
  const step = Math.min(Math.max(Number(state.incidentStep) || 1, 1), 4);
  const draft = state.incidentDraft;
  const incidentPhotoCount = Array.isArray(draft.photos) ? draft.photos.length : 0;
  const isSubmitting = Boolean(state.incidentSubmitting);

  return `
    ${topBar("Levantar incidencia", { back: "incidents" })}
    <main class="screen with-nav incidents-screen">
      ${incidentWizardHeader(step)}
      <form class="heat-form-card incident-form" data-role="incident-form">
        ${state.incidentError ? `<div class="login-error">${state.incidentError}</div>` : ""}
        ${step === 1 ? `
          <h3>Selecciona zona y establecimiento</h3>
          <p class="incident-step-copy">Elige la zona y el establecimiento donde ocurrió la incidencia.</p>
          <label class="field"><span>Zona asignada</span><div class="field-control">${icons.branch}<select name="branch" data-role="incident-branch">${branches.map((item) => `<option value="${escapeAttribute(item)}" ${item === branch ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select></div></label>
          <label class="field searchable-combo"><span>RBD</span><div class="field-control">${icons.location}<input name="establishmentSearch" type="search" data-role="incident-rbd-search" value="${escapeAttribute(searchValue)}" placeholder="Escribe RBD o nombre..." autocomplete="off" /></div><input type="hidden" name="establishmentRbd" value="${escapeAttribute(draft.selectedRbd)}" />${showComboResults ? `<div class="combo-results incident-combo">${establishmentSearchResults(filteredEstablishments, "select-incident-establishment")}</div>` : ""}</label>
          ${selectedEstablishment ? `<article class="incident-selected-rbd"><span>${icons.branch}</span><div><strong>${escapeHtml(selectedEstablishment.name)}</strong><small>${escapeHtml(selectedEstablishment.address || selectedEstablishment.comuna || "")}</small><small>Comuna: ${escapeHtml(selectedEstablishment.comuna || "")}</small></div>${icons.arrow}</article>` : ""}
        ` : ""}
        ${step === 2 ? `
          <h3>Tipo de incidencia</h3>
          <p class="incident-step-copy">Selecciona el tipo de incidente que deseas reportar.</p>
          ${incidentTypeOptions()}
          <label class="field"><span>Prioridad</span><div class="field-control">${icons.alert}<select name="severity" data-role="incident-input" data-field="severity">${["Alta", "Media", "Baja"].map((severity) => `<option value="${severity}" ${severity === draft.severity ? "selected" : ""}>${severity}</option>`).join("")}</select></div></label>
        ` : ""}
        ${step === 3 ? `
          <h3>Detalles de la incidencia</h3>
          <p class="incident-step-copy">Describe la situación y adjunta evidencia si es necesario.</p>
          <label class="field"><span>Título de la incidencia</span><div class="field-control">${icons.clipboard}<input name="title" data-role="incident-input" data-field="title" value="${escapeAttribute(draft.title)}" placeholder="Ej: Fuga de agua en sala cuna" /></div></label>
          <label class="field"><span>Descripción</span><div class="field-control textarea-control"><textarea name="description" maxlength="500" data-role="incident-input" data-field="description" placeholder="Describe lo ocurrido, dónde ocurrió y su impacto.">${escapeHtml(draft.description)}</textarea></div><small class="incident-counter">${draft.description.length}/500</small></label>
          <label class="photo-field incident-photo-field ${incidentPhotoCount >= 4 ? "is-disabled" : ""}"><input type="file" accept="image/*" capture="environment" data-role="incident-photos" ${incidentPhotoCount >= 4 ? "disabled" : ""} /><div class="photo-field-content"><span>${icons.camera}</span><strong>${incidentPhotoCount >= 4 ? "Límite de fotografías alcanzado" : "Tomar fotografía con cámara"}</strong><small>${incidentPhotoCount} de 4 fotografías</small></div></label>
          ${incidentPhotosGrid(draft.photos)}
        ` : ""}
        ${step === 4 ? `
          <h3>Revisa y confirma</h3>
          <p class="incident-step-copy">Verifica la información antes de enviar la incidencia.</p>
          ${incidentReviewRows(draft, selectedEstablishment)}
          ${incidentPhotosGrid(draft.photos)}
          <div class="incident-info-box">${icons.info}<span>Tu incidencia será notificada al Jefe de Mantención, quien podrá generar una tarea o planificar una visita Mutualidad.</span></div>
        ` : ""}
        <div class="form-actions heat-actions">
          ${secondaryButton(step === 1 ? "Cancelar" : "Volver", step === 1 ? "incidents" : "incident-prev", isSubmitting)}
          ${step === 4
            ? `<button class="button primary incident-submit-button ${isSubmitting ? "is-loading" : ""}" type="button" data-action="submit-incident" ${isSubmitting ? "disabled" : ""}>${isSubmitting ? `<span class="button-spinner" aria-hidden="true"></span><span>Enviando...</span>` : "Enviar incidencia"}</button>`
            : primaryButton("Siguiente", "incident-next")}
        </div>
      </form>
    </main>
    ${bottomNav()}
  `;
}

function incidentSuccessScreen() {
  const incident = state.lastIncident;
  return `
    <main class="screen with-nav incidents-screen incident-success-screen">
      <section class="incident-success-hero">
        <div class="incident-success-check">${icons.checkSquare}</div>
        <h1>¡Incidencia enviada!</h1>
        <p>Hemos notificado al Jefe de Mantención. Recibirás novedades sobre tu reporte.</p>
      </section>
      <section class="heat-form-card incident-summary-card">
        <h3>Resumen de tu incidencia</h3>
        ${detailRow("branch", "RBD", escapeHtml(incident?.rbd || ""))}
        ${detailRow("home", "Establecimiento", escapeHtml(incident?.establishment || ""))}
        ${detailRow("alert", "Tipo", escapeHtml(incident?.type || ""))}
        ${detailRow("calendar", "Fecha", escapeHtml(incident?.createdLabel || todayDateLabel()))}
        <div class="incident-info-box">${icons.info}<span>El JM podrá crear una tarea o planificar una visita Mutualidad y asignarla a un técnico.</span></div>
      </section>
      ${primaryButton("Ver mis incidencias", "incidents")}
    </main>
    ${bottomNav()}
  `;
}

function jmProfileMenuItem(icon, title, value = "", route = "none") {
  return `
    <button class="jm-profile-row" type="button" data-action="${route === "none" ? "none" : "route"}" data-route="${route}">
      ${icon}
      <span>${title}</span>
      ${value ? `<strong>${value}</strong>` : icons.arrow}
    </button>
  `;
}

function procedureProfileMenu() {
  if (!canSeeProcedures()) return "";
  return `
    <section class="jm-profile-panel procedures-profile-panel">
      <h3>Procedimientos</h3>
      <button class="procedure-profile-cta" type="button" data-action="route" data-route="procedures">
        <span class="procedure-profile-cta-icon">${icons.clipboard}</span>
        <span>
          <strong>Buscar procedimientos</strong>
          <small>Protocolos, instructivos y documentos disponibles</small>
        </span>
        <em>Ver</em>
      </button>
      ${canManageProcedures() ? jmProfileMenuItem(icons.download, "Gestionar procedimientos", "Admin", "procedures") : ""}
    </section>
  `;
}

function procedureCard(procedure) {
  const downloading = state.procedureDownloadBusyId === procedure.id;
  const deleting = state.procedureDeleteBusyId === procedure.id;
  const manageable = canManageProcedures();
  const audience = state.procedureAudienceById[procedure.id];
  const loadingAudience = state.procedureAudienceLoadingId === procedure.id;
  const audienceError = state.procedureAudienceErrorById[procedure.id] || "";
  const audienceExpanded = state.expandedProcedureAudienceId === procedure.id;
  const meta = [
    procedure.category || "General",
    procedureDateLabel(procedure.createdAt),
    procedure.fileName || (procedure.externalUrl ? "Enlace externo" : "")
  ].filter(Boolean).join(" · ");
  const targets = (procedure.targetRoles || []).map(procedureTargetLabel).join(", ");
  return `
    <article class="procedure-card">
      <div class="procedure-card-icon">${procedure.hasFile ? icons.clipboard : icons.arrow}</div>
      <div class="procedure-card-copy">
        <strong>${escapeHtml(procedure.title)}</strong>
        ${procedure.description ? `<p>${escapeHtml(procedure.description)}</p>` : ""}
        <small>${escapeHtml(meta || "Procedimiento Datácora")}</small>
        ${targets ? `<small class="procedure-targets">Para: ${escapeHtml(targets)}</small>` : ""}
      </div>
      <div class="procedure-card-actions">
        <button class="button secondary procedure-open-button" type="button" data-action="open-procedure" data-procedure-id="${escapeAttribute(procedure.id)}" ${downloading ? "disabled" : ""}>
          ${downloading ? "Abriendo..." : procedure.hasFile ? "Descargar" : "Abrir"}
        </button>
        ${manageable ? `
          <button class="button secondary procedure-manage-button" type="button" data-action="procedure-audience" data-procedure-id="${escapeAttribute(procedure.id)}">${audienceExpanded ? "Ocultar" : "Seguimiento"}</button>
          <button class="button secondary procedure-manage-button" type="button" data-action="edit-procedure" data-procedure-id="${escapeAttribute(procedure.id)}">Editar</button>
          <button class="button danger procedure-manage-button" type="button" data-action="delete-procedure" data-procedure-id="${escapeAttribute(procedure.id)}" ${deleting ? "disabled" : ""}>${deleting ? "Eliminando..." : "Eliminar"}</button>
        ` : ""}
      </div>
      ${manageable && audienceExpanded ? procedureAudiencePanel(procedure, audience, loadingAudience, audienceError) : ""}
    </article>
  `;
}

function procedureAudiencePanel(procedure, audience, loading, error) {
  if (loading) {
    return `<section class="procedure-audience-panel"><p class="muted-copy">Cargando seguimiento...</p></section>`;
  }
  if (error) {
    return `<section class="procedure-audience-panel"><p class="form-error">${escapeHtml(error)}</p></section>`;
  }
  if (!audience) {
    return `<section class="procedure-audience-panel"><p class="muted-copy">Pulsa seguimiento para consultar destinatarios.</p></section>`;
  }
  const recipients = audience.recipients || [];
  return `
    <section class="procedure-audience-panel">
      <div class="procedure-audience-metrics">
        <span><strong>${audience.total}</strong> destinatarios</span>
        <span><strong>${audience.viewed}</strong> revisados</span>
        <span><strong>${audience.downloaded}</strong> descargados</span>
      </div>
      <div class="procedure-audience-table" role="table" aria-label="Seguimiento de ${escapeAttribute(procedure.title)}">
        <div class="procedure-audience-row procedure-audience-head" role="row">
          <span>Usuario</span>
          <span>Cargo</span>
          <span>Revisado</span>
          <span>Descargado</span>
        </div>
        ${recipients.length ? recipients.map((recipient) => `
          <div class="procedure-audience-row" role="row">
            <span>
              <strong>${escapeHtml(recipient.fullName || recipient.email)}</strong>
              <small>${escapeHtml(recipient.email)}</small>
              ${recipient.branchName ? `<small>${escapeHtml(recipient.branchName)}</small>` : ""}
            </span>
            <span>${escapeHtml(recipient.roleName || "Sin cargo")}</span>
            <span class="${recipient.hasViewed ? "status-complete" : "status-pending"}">${escapeHtml(procedureDateTimeLabel(recipient.viewedAt))}</span>
            <span class="${recipient.hasDownloaded ? "status-complete" : "status-pending"}">${escapeHtml(procedureDateTimeLabel(recipient.downloadedAt))}</span>
          </div>
        `).join("") : `<div class="procedure-audience-empty">No se encontraron destinatarios activos para estos cargos.</div>`}
      </div>
    </section>
  `;
}

function proceduresScreen() {
  const procedures = filteredProcedures();
  return `
    ${topBar("Procedimientos", { back: "profile" })}
    <main class="screen with-nav procedures-screen">
      <section class="profile-card procedure-hero">
        <div class="section-icon">${icons.clipboard}</div>
        <div>
          <h2>Procedimientos Datácora</h2>
          <p>Busca instrucciones, protocolos y documentos publicados por administración.</p>
        </div>
        <button class="icon-button" type="button" data-action="refresh-procedures" aria-label="Actualizar procedimientos">${icons.sync}</button>
      </section>

      <section class="profile-card procedure-search-card">
        <label class="field compact-field">
          <span>Buscar</span>
          <div class="field-control">${icons.info}<input type="search" data-role="procedure-search" value="${escapeAttribute(state.procedureSearch)}" placeholder="Nombre, categoría o archivo..." autocomplete="off" /></div>
        </label>
        ${canManageProcedures() ? `<button class="button secondary full-width" type="button" data-action="route" data-route="procedure-upload">Subir procedimiento</button>` : ""}
      </section>

      ${state.procedureError ? `<p class="form-error">${escapeHtml(state.procedureError)}</p>` : ""}

      <section class="profile-card procedure-list-card">
        <div class="section-heading-row">
          <h3>Disponibles</h3>
          <span class="message-badge">${procedures.length}</span>
        </div>
        <div class="procedure-list">
          ${procedures.length ? procedures.map(procedureCard).join("") : emptyState("Sin procedimientos", state.procedureSearch ? "No hay resultados para tu búsqueda." : "Aún no hay documentos publicados.")}
        </div>
      </section>
    </main>
    ${bottomNav()}
  `;
}

function procedureUploadScreen() {
  const draft = state.procedureUploadDraft;
  const isEditing = Boolean(state.procedureEditingId);
  return `
    ${topBar(isEditing ? "Editar procedimiento" : "Subir procedimiento", { back: "procedures" })}
    <main class="screen with-nav procedures-screen">
      <section class="profile-card procedure-hero">
        <div class="section-icon">${icons.download}</div>
        <div>
          <h2>${isEditing ? "Editar procedimiento" : "Nuevo procedimiento"}</h2>
          <p>${isEditing ? "Actualiza la información, destinatarios o reemplaza el archivo." : "Publica archivos o enlaces para los cargos seleccionados."}</p>
        </div>
      </section>

      <section class="profile-card procedure-upload-card">
        ${state.procedureUploadError ? `<p class="form-error">${escapeHtml(state.procedureUploadError)}</p>` : ""}
        <label class="field compact-field"><span>Título</span><div class="field-control">${icons.clipboard}<input data-procedure-upload="title" value="${escapeAttribute(draft.title)}" placeholder="Ej: Procedimiento cambio de luminaria" /></div></label>
        <label class="field compact-field"><span>Categoría</span><div class="field-control">${icons.info}<input data-procedure-upload="category" value="${escapeAttribute(draft.category)}" placeholder="Ej: Electricidad, Agua, Seguridad" /></div></label>
        <section class="procedure-target-selector" aria-label="Cargos destinatarios">
          <span>Visible para</span>
          <div>
            ${PROCEDURE_TARGET_OPTIONS.map((option) => `
              <label class="procedure-target-option">
                <input type="checkbox" data-role="procedure-target-role" value="${escapeAttribute(option.id)}" ${(draft.targetRoles || []).includes(option.id) ? "checked" : ""} />
                <strong>${escapeHtml(option.label)}</strong>
              </label>
            `).join("")}
          </div>
        </section>
        <label class="field compact-field"><span>Descripción</span><div class="field-control textarea-control">${icons.message}<textarea data-procedure-upload="description" placeholder="Resumen breve para identificar el documento">${escapeHtml(draft.description)}</textarea></div></label>
        <label class="field compact-field"><span>Enlace externo opcional</span><div class="field-control">${icons.arrow}<input data-procedure-upload="externalUrl" value="${escapeAttribute(draft.externalUrl)}" placeholder="https://..." /></div></label>
        <label class="procedure-upload-file">
          <input type="file" data-role="procedure-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,application/pdf" />
          <span>${icons.download}</span>
          <strong>${escapeHtml(draft.fileName || "Seleccionar archivo")}</strong>
          <small>PDF, Word, Excel o imagen. Máximo 8 MB.</small>
        </label>
        <div class="procedure-upload-actions">
          <button class="button secondary" type="button" data-action="clear-procedure-upload">${isEditing ? "Cancelar edición" : "Limpiar"}</button>
          <button class="button primary" type="button" data-action="submit-procedure" ${state.procedureUploadBusy ? "disabled" : ""}>${state.procedureUploadBusy ? (isEditing ? "Guardando..." : "Publicando...") : (isEditing ? "Guardar cambios" : "Publicar procedimiento")}</button>
        </div>
      </section>
    </main>
    ${bottomNav()}
  `;
}

function profileScreen() {
  const user = loggedUser();
  const initials = user.nombre.split(" ").map((part) => part[0]).slice(0, 2).join("");

  if (isLimitedManagerUser(user)) {
    return `
      ${topBar("Perfil")}
      <main class="screen with-nav jm-screen jm-profile-screen">
        <section class="jm-profile-hero">
          <div class="avatar">${initials}</div>
          <div>
            <h2>${user.nombre}</h2>
            <p>${user.cargo}</p>
            <span class="jm-role-pill">Jefe</span>
          </div>
        </section>
        <section class="jm-profile-panel">
          <h3>Mi cuenta</h3>
          ${jmProfileMenuItem(icons.user, "Información personal", user.usuario)}
          ${jmProfileMenuItem(icons.branch, "Zonas asignadas", branchScopeLabel(user))}
        </section>
        ${procedureProfileMenu()}
        <section class="jm-profile-panel">
          <h3>Configuración</h3>
          ${jmProfileMenuItem(icons.shield, "Seguridad y privacidad")}
          ${jmProfileMenuItem(icons.info, "Centro de ayuda")}
          ${jmProfileMenuItem(icons.clipboard, "Acerca de Datácora", "v1.4.0")}
        </section>
        <button class="jm-logout-button" type="button" data-action="logout">${icons.arrow}<span>Cerrar sesión</span></button>
      </main>
      ${bottomNav()}
    `;
  }

  return `
    ${topBar("Perfil")}
    <main class="screen with-nav">
      <section class="profile-card">
        <div class="avatar">${initials}</div>
        <h2>${user.nombre}</h2>
        <p>${user.cargo}</p>
      </section>
      <section class="detail-list">
        ${detailRow("mail", "Correo", user.usuario)}
        ${detailRow("user", "Cargo", user.cargo)}
        ${detailRow("branch", "Sucursal", branchScopeLabel(user))}
        ${detailRow("groupBadge", "Grupo", user.grupo)}
        ${detailRow("statusCheck", "Estado", `<span class="detail-value ${user.estado}">${user.estado}</span> - ${user.motivoEstado}`)}
      </section>
      ${procedureProfileMenu()}
      <div class="logout-action">${secondaryButton("Cerrar sesión", "logout")}</div>
    </main>
    ${bottomNav()}
  `;
}

function adminHeader() {
  return `
    <header class="admin-topbar">
      <h1>Acciones</h1>
    </header>
  `;
}

function actionTile(title, text, route, icon) {
  return `
    <button class="action-tile" data-action="route" data-route="${route}">
      <span class="action-tile-icon">${icon}</span>
      <span class="action-tile-copy">
        <strong>${title}</strong>
        <span>${text}</span>
      </span>
      ${icons.arrow}
    </button>
  `;
}

function appMessageDateLabel(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(value).slice(0, 16);
  }
}

function unreadMessageCount() {
  return state.appMessages.filter((message) => !message.readAt).length;
}

function messageRecipientOptions() {
  const managers = users
    .filter((user) => !isAdmin(user) && canAssignTasks(user) && canSeeNotifications(user) && user.estado === "activo")
    .sort((left, right) => left.nombre.localeCompare(right.nombre, "es"));
  return `<option value="">Todos los Jefes de Mantención</option>${managers.map((manager) => {
    const label = `${manager.nombre}${manager.sucursal ? ` · ${manager.sucursal}` : ""}`;
    return `<option value="${escapeAttribute(manager.id)}" ${state.messageDraft.recipientId === manager.id ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("")}`;
}

function appMessageCard(message, options = {}) {
  const sent = options.sent ?? false;
  const unread = !sent && !message.readAt;
  return `
    <article class="message-card ${unread ? "unread" : ""}" data-action="open-app-message" data-message-id="${escapeAttribute(message.id)}">
      <div class="message-card-head">
        <span class="message-badge">${sent ? `${message.readCount}/${message.recipientCount} leídos` : unread ? "Nuevo" : "Leído"}</span>
        <small>${escapeHtml(appMessageDateLabel(message.createdAt))}</small>
      </div>
      <h3>${escapeHtml(message.title)}</h3>
      <p>${escapeHtml(message.body)}</p>
      <footer>
        <span>${escapeHtml(sent ? (message.branchName || "Todos los JM") : message.senderName || "Datácora")}</span>
      </footer>
    </article>
  `;
}

function appMessageReplyBubble(reply) {
  const own = reply.senderId === loggedUser()?.id;
  return `
    <article class="message-reply ${own ? "own" : ""}">
      <strong>${escapeHtml(reply.senderName || "Usuario Datácora")}</strong>
      <p>${escapeHtml(reply.body)}</p>
      <small>${escapeHtml(appMessageDateLabel(reply.createdAt))}</small>
    </article>
  `;
}

function messagesScreen() {
  const canSend = canSendAppMessages();
  const draft = state.messageDraft;
  const inbox = state.appMessages;
  const sent = state.sentAppMessages;
  return `
    ${topBar("Mensajes", { back: backRouteFor("messages") || defaultRouteFor(loggedUser()) })}
    <main class="screen with-nav messages-screen">
      <section class="profile-card message-hero">
        <div class="section-icon">${icons.message}</div>
        <div>
          <h2>Comunicados Datácora</h2>
          <p>${canSend ? "Envía instrucciones personalizadas a Jefes de Mantención." : "Revisa instrucciones y avisos enviados por administración."}</p>
        </div>
        <button class="icon-button" type="button" data-action="refresh-messages" aria-label="Actualizar mensajes">${icons.sync}</button>
      </section>

      ${state.messageError ? `<p class="form-error">${escapeHtml(state.messageError)}</p>` : ""}

      ${canSend ? `
        <section class="profile-card message-compose-card">
          <h3>Nuevo comunicado</h3>
          <label class="field compact-field"><span>Destinatario</span><div class="field-control">${icons.user}<select data-message-draft="recipientId">${messageRecipientOptions()}</select></div></label>
          <label class="field compact-field"><span>Título</span><div class="field-control">${icons.info}<input data-message-draft="title" value="${escapeAttribute(draft.title)}" placeholder="Ej: Revisión de urgencias"></div></label>
          <label class="field compact-field"><span>Mensaje</span><div class="field-control textarea-control">${icons.message}<textarea data-message-draft="body" placeholder="Escribe el mensaje para los JM...">${escapeHtml(draft.body)}</textarea></div></label>
          <button class="button primary full-width" type="button" data-action="send-app-message" ${state.messageSendBusy ? "disabled" : ""}>${state.messageSendBusy ? "Enviando..." : "Enviar comunicado"}</button>
        </section>
      ` : ""}

      <section class="profile-card">
        <div class="section-heading-row">
          <h3>${canSend ? "Bandeja recibida" : "Mis mensajes"}</h3>
          <span class="message-badge">${unreadMessageCount()} sin leer</span>
        </div>
        <div class="message-list">
          ${inbox.length ? inbox.map((message) => appMessageCard(message)).join("") : emptyState("Sin mensajes", "No hay comunicados disponibles.")}
        </div>
      </section>

      ${canSend ? `
        <section class="profile-card">
          <h3>Enviados</h3>
          <div class="message-list">
            ${sent.length ? sent.map((message) => appMessageCard(message, { sent: true })).join("") : emptyState("Sin enviados", "Aún no has enviado comunicados.")}
          </div>
        </section>
      ` : ""}
    </main>
    ${bottomNav()}
  `;
}

function messageDetailScreen() {
  const message = state.selectedMessageDetail
    || state.appMessages.find((item) => item.id === state.selectedMessageId)
    || state.sentAppMessages.find((item) => item.id === state.selectedMessageId);
  const replies = Array.isArray(message?.replies) ? message.replies : [];
  return `
    ${topBar("Comunicado", { back: "messages" })}
    <main class="screen with-nav messages-screen message-detail-screen">
      ${!message ? `
        <section class="profile-card">
          ${state.messageDetailBusy ? emptyState("Cargando mensaje", "Preparando la conversación...") : emptyState("Mensaje no encontrado", "Vuelve a la bandeja e intenta nuevamente.")}
        </section>
      ` : `
        <section class="profile-card message-thread-head">
          <span class="message-badge">${escapeHtml(message.branchName || "Comunicado interno")}</span>
          <h2>${escapeHtml(message.title)}</h2>
          <p>${escapeHtml(message.body)}</p>
          <footer>
            <strong>${escapeHtml(message.senderName || "Datácora")}</strong>
            <span>${escapeHtml(appMessageDateLabel(message.createdAt))}</span>
          </footer>
        </section>

        <section class="profile-card message-thread-card">
          <div class="section-heading-row">
            <h3>Respuestas</h3>
            <span class="message-badge">${replies.length}</span>
          </div>
          <div class="message-thread-list">
            ${replies.length ? replies.map(appMessageReplyBubble).join("") : emptyState("Sin respuestas", "Aún no hay comentarios para este comunicado.")}
          </div>
        </section>

        <section class="profile-card message-reply-card">
          ${state.messageDetailError ? `<p class="form-error">${escapeHtml(state.messageDetailError)}</p>` : ""}
          <label class="field compact-field">
            <span>Responder</span>
            <div class="field-control textarea-control">${icons.message}<textarea data-message-reply placeholder="Ej: Se procede con lo solicitado">${escapeHtml(state.messageReplyDraft)}</textarea></div>
          </label>
          <button class="button primary full-width" type="button" data-action="send-app-message-reply" ${state.messageReplyBusy ? "disabled" : ""}>${state.messageReplyBusy ? "Enviando..." : "Enviar respuesta"}</button>
        </section>
      `}
    </main>
    ${bottomNav()}
  `;
}

function actionsScreen() {
  return `
    ${adminHeader()}
    <main class="screen with-nav actions-screen">
      <section class="profile-card admin-welcome">
        <div class="avatar">AD</div>
        <div class="admin-welcome-copy">
          <h2>Panel administrador</h2>
          <p>Gestiona usuarios, grupos y asignación de tareas a técnicos.</p>
        </div>
        <div class="admin-access-badge">
          ${icons.shield}
          <span>Acceso exclusivo para administradores</span>
        </div>
      </section>
      <section class="action-menu">
        ${actionTile("Usuarios", "Crear usuarios, activar o inactivar cuentas.", "admin-users", icons.user)}
        ${actionTile("Grupos", "Crear grupos para organizar técnicos y equipos.", "admin-groups", icons.group)}
        ${actionTile("Asignar tareas", "Crear tareas y asignarlas a técnicos activos.", "admin-assign", icons.clipboardCheck)}
        ${actionTile("Mensajes", "Enviar comunicados a Jefes de Mantención.", "messages", icons.message)}
        ${actionTile("Procedimientos", "Ver, editar, eliminar y subir documentos.", "procedures", icons.clipboard)}
      </section>
      ${state.actionMessage ? `<div class="temp-password">${state.actionMessage}</div>` : ""}
    </main>
    ${bottomNav()}
  `;
}

function taskIsCompleted(task) {
  return task.status === "Completada";
}

function taskIsEmergency(task) {
  const value = normalizeSearch(task?.type ?? task?.task_type ?? "");
  return value.includes("emergencia");
}

function taskDueDateIso(task) {
  return normalizeIsoDate(task?.dueDateIso)
    || normalizeIsoDate(task?.dueDate)
    || normalizeIsoDate(task?.due_date)
    || isoDateFromTaskLabel(task?.dueAt)
    || "";
}

function taskIsOverdue(task) {
  const dueDate = taskDueDateIso(task);
  return !taskIsCompleted(task) && Boolean(dueDate) && dueDate < localDateKey();
}

function overdueDays(task) {
  const dueDate = taskDueDateIso(task);
  if (!dueDate || !taskIsOverdue(task)) return 0;
  const start = new Date(`${dueDate}T00:00:00`);
  const end = new Date(`${localDateKey()}T00:00:00`);
  const diff = Math.floor((end - start) / 86400000);
  return Math.max(0, diff);
}

function overdueCriticality(task) {
  const days = overdueDays(task);
  if (days > 7) return { key: "critical", label: "Atraso crítico", days };
  if (days >= 4) return { key: "medium", label: "Atraso medio", days };
  if (days >= 1) return { key: "low", label: "Atraso bajo", days };
  return { key: "", label: "", days };
}

function plannedDateSortValue(task) {
  return taskDueDateIso(task) || "9999-12-31";
}

function sortTasksByPlannedDate(tasksList = []) {
  return [...tasksList].sort((left, right) => {
    const dateCompare = plannedDateSortValue(left).localeCompare(plannedDateSortValue(right));
    if (dateCompare !== 0) return dateCompare;
    const rbdCompare = Number(left.rbd || 0) - Number(right.rbd || 0);
    if (Number.isFinite(rbdCompare) && rbdCompare !== 0) return rbdCompare;
    return String(left.establishment || "").localeCompare(String(right.establishment || ""), "es");
  });
}

function tasksForBranch(branchName) {
  return tasks.filter((task) => {
    const technician = users.find((candidate) => candidate.usuario === task.assignedTo);
    return technician?.sucursal === branchName || task.sucursal === branchName;
  });
}

function techniciansForBranch(branchName) {
  return users.filter((user) => user.estado === "activo" && user.cargo.startsWith("Técnico") && user.sucursal === branchName);
}

function jmBranchMetrics(branchName) {
  const branchTasks = tasksForBranch(branchName);
  const emergencies = sortTasksByPlannedDate(branchTasks.filter((task) => !taskIsCompleted(task) && taskIsEmergency(task)));
  const overdue = sortTasksByPlannedDate(branchTasks.filter((task) => !taskIsEmergency(task) && taskIsOverdue(task)));
  const pending = sortTasksByPlannedDate(branchTasks.filter((task) => !taskIsCompleted(task) && !taskIsEmergency(task) && !taskIsOverdue(task)));
  const completed = sortTasksByPlannedDate(branchTasks.filter(taskIsCompleted));
  const total = pending.length + overdue.length + emergencies.length + completed.length;
  const progress = total ? Math.round((completed.length / total) * 100) : 100;

  return {
    branchName,
    pending,
    overdue,
    emergencies,
    completed,
    technicians: techniciansForBranch(branchName),
    progress
  };
}

function jmVisibleBranchMetrics(user = loggedUser()) {
  return userBranches(user).map(jmBranchMetrics);
}

function jmSummaryMetricCard(icon, value, label, hint, tone = "") {
  const targetAction = tone === "success" ? "jm-completed" : "route";
  const targetRoute = tone === "danger" ? "jm-urgent" : tone === "success" ? "" : tone === "overdue" ? "jm-overdue" : "jm-pending";
  return `
    <button class="jm-kpi-card ${tone}" type="button" data-action="${targetAction}" ${targetRoute ? `data-route="${targetRoute}"` : ""}>
      <span class="jm-kpi-icon">${icon}</span>
      <strong>${value}</strong>
      <span>${label}</span>
      <small>${hint}</small>
    </button>
  `;
}

function jmZoneCard(metric, compact = false) {
  const technicianText = `${metric.technicians.length} técnico${metric.technicians.length === 1 ? "" : "s"} activo${metric.technicians.length === 1 ? "" : "s"}`;
  return `
    <article class="jm-zone-card ${compact ? "compact" : ""}" data-action="route" data-route="jm-technicians">
      <span class="jm-zone-icon">${icons.branch}</span>
      <div class="jm-zone-copy">
        <strong>${metric.branchName}</strong>
        <span>${technicianText}</span>
        <small>${icons.group} ${technicianText}</small>
      </div>
      <span class="jm-progress-ring" style="--progress:${metric.progress * 3.6}deg">${metric.progress}%</span>
      ${icons.arrow}
    </article>
  `;
}

function jmTechnicianCard(technician) {
  const initials = technician.nombre.split(" ").map((part) => part[0]).slice(0, 2).join("");
  const technicianTasks = tasks.filter((task) => task.assignedTo === technician.usuario);
  const pending = technicianTasks.filter((task) => !taskIsCompleted(task)).length;
  const completed = technicianTasks.filter(taskIsCompleted).length;
  const lastLoginLabel = formatDateTimeLabel(technician.ultimaConexion);

  return `
    <article class="jm-technician-card">
      <span class="jm-technician-avatar">${initials}</span>
      <div>
        <strong>${technician.nombre}</strong>
        <span>${technician.cargo} · ${technician.grupo}</span>
        <small>${pending} pendiente${pending === 1 ? "" : "s"} · ${completed} completada${completed === 1 ? "" : "s"}</small>
        <small class="jm-technician-last-login">Última conexión: ${escapeHtml(lastLoginLabel)}</small>
      </div>
      <em>${technician.motivoEstado || "Disponible"}</em>
    </article>
  `;
}

function jmTechniciansByZonePanel(metric) {
  const isExpanded = state.expandedJmZone === metric.branchName;
  const pendingTotal = metric.technicians.reduce((total, technician) => total + tasks.filter((task) => task.assignedTo === technician.usuario && !taskIsCompleted(task)).length, 0);
  return `
    <section class="jm-panel jm-technician-zone ${isExpanded ? "expanded" : ""}">
      <button class="jm-zone-toggle" type="button" data-action="toggle-jm-zone" data-zone="${escapeAttribute(metric.branchName)}" aria-expanded="${isExpanded ? "true" : "false"}">
        <span class="jm-zone-icon">${icons.branch}</span>
        <span class="jm-zone-toggle-copy">
          <strong>${metric.branchName}</strong>
          <small>${metric.technicians.length} técnico${metric.technicians.length === 1 ? "" : "s"} activo${metric.technicians.length === 1 ? "" : "s"} · ${pendingTotal} pendiente${pendingTotal === 1 ? "" : "s"}</small>
        </span>
        ${icons.arrow}
      </button>
      ${isExpanded ? `
        <div class="jm-technician-list">
          ${metric.technicians.length ? metric.technicians.map(jmTechnicianCard).join("") : emptyState("Sin técnicos activos", "No hay técnicos disponibles en esta zona.")}
        </div>
      ` : ""}
    </section>
  `;
}

function taskTechnician(task) {
  return users.find((candidate) => candidate.usuario === task.assignedTo);
}

function taskBranchName(task) {
  return taskTechnician(task)?.sucursal || task.establishmentMeta?.sucursal || task.sucursal || "";
}

function taskSubmittedDateIso(task) {
  return normalizeIsoDate(task?.submittedAt) || normalizeIsoDate(task?.completedAt) || normalizeIsoDate(task?.updatedAt) || "";
}

function jmCompletedFilterOptions(tasksList, user) {
  const branches = [...new Set(userBranches(user).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const technicians = [...new Map(tasksList
    .map((task) => taskTechnician(task))
    .filter(Boolean)
    .map((technician) => [technician.usuario, technician])
  ).values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return { branches, technicians };
}

function jmTaskFilterDateIso(task, panel = "completed") {
  return panel === "completed" ? taskSubmittedDateIso(task) : taskDueDateIso(task);
}

function applyJmCompletedFilters(tasksList, panel = "completed") {
  const filters = state.jmCompletedFilters ?? {};
  const search = normalizeSearch(filters.search);
  const rbd = normalizeSearch(filters.rbd);
  const folio = normalizeSearch(filters.folio);
  const technicianValue = String(filters.technician || "");
  const branchValue = String(filters.branch || "");
  const from = normalizeIsoDate(filters.submittedFrom);
  const to = normalizeIsoDate(filters.submittedTo);

  return tasksList.filter((task) => {
    const technician = taskTechnician(task);
    const branch = taskBranchName(task);
    const submittedDate = taskSubmittedDateIso(task);
    const filterDate = jmTaskFilterDateIso(task, panel);
    const haystack = normalizeSearch([
      task.type,
      task.rbd,
      task.establishment,
      task.folio,
      task.dueAt,
      task.submittedAt,
      submittedDate,
      technician?.nombre,
      technician?.usuario,
      branch
    ].filter(Boolean).join(" "));

    if (search && !haystack.includes(search)) return false;
    if (rbd && !normalizeSearch(task.rbd).includes(rbd)) return false;
    if (folio && !normalizeSearch(String(task.folio || "")).includes(folio)) return false;
    if (technicianValue && technician?.usuario !== technicianValue) return false;
    if (branchValue && branch !== branchValue) return false;
    if (from && filterDate && filterDate < from) return false;
    if (to && filterDate && filterDate > to) return false;
    if ((from || to) && !filterDate) return false;
    return true;
  });
}

function completedBitacoraExportRows(tasksList) {
  return tasksList.map((task) => {
    const meta = taskEstablishmentMeta(task);
    const evidence = locationEvidenceForTask(task.id);
    const start = locationPointWithDistance(task, evidence.start);
    const submit = locationPointWithDistance(task, evidence.submit);
    const technician = taskTechnician(task);
    return {
      ZONA: taskBranchName(task) || "",
      FOLIO: task.folio || "",
      RBD: task.rbd || "",
      FECHA_VISITA: taskSubmittedDateIso(task) || "",
      TIPO_INSTITUCION: meta?.tipoInstitucion || "",
      TIPO_VISITA: task.type || "",
      DISTANCIA_INICIO: Number.isFinite(start?.distanceMeters) ? Math.round(start.distanceMeters) : "",
      DISTANCIA_FIN: Number.isFinite(submit?.distanceMeters) ? Math.round(submit.distanceMeters) : "",
      TECNICO: technician?.nombre || task.assignedTo || ""
    };
  });
}

async function ensureCompletedBitacoraExportDetails(tasksList) {
  if (!hasSqlServerApiConfig() || !state.supabaseSession?.access_token || !isNetworkOnline()) return;
  const pendingDetails = tasksList.filter((task) => {
    const evidence = locationEvidenceForTask(task.id);
    return task.submissionId && (!evidence.start || !evidence.submit);
  });
  if (!pendingDetails.length) return;

  await ensureValidSupabaseSession();
  const nextRemoteEvidence = { ...state.remoteLocationEvidenceByTask };
  await Promise.all(pendingDetails.map(async (task) => {
    try {
      const submissionId = encodeURIComponent(String(task.submissionId).trim());
      const detail = await apiRequest(`/api/submissions/${submissionId}/detail`);
      nextRemoteEvidence[task.id] = remoteLocationEvidence(detail?.singleAnswerRows ?? []);
    } catch (error) {
      console.warn(`No se pudo cargar geolocalizacion para exportar folio ${task.folio || task.id}.`, error);
    }
  }));
  setStateSilently({ remoteLocationEvidenceByTask: nextRemoteEvidence });
}

async function downloadCompletedBitacorasExcel() {
  const actor = loggedUser();
  const completed = jmBranchTasks(actor).filter(taskIsCompleted);
  const filtered = applyJmCompletedFilters(completed);
  if (!filtered.length) {
    showErrorToast("Sin bitácoras para exportar", "Ajusta los filtros o revisa la zona seleccionada.");
    return;
  }

  const headers = [
    "ZONA",
    "FOLIO",
    "RBD",
    "FECHA_VISITA",
    "TIPO_INSTITUCIÓN",
    "TIPO_VISITA",
    "DISTANCIA_INICIO",
    "DISTANCIA_FIN",
    "TECNICO"
  ];
  const keys = [
    "ZONA",
    "FOLIO",
    "RBD",
    "FECHA_VISITA",
    "TIPO_INSTITUCION",
    "TIPO_VISITA",
    "DISTANCIA_INICIO",
    "DISTANCIA_FIN",
    "TECNICO"
  ];
  await ensureCompletedBitacoraExportDetails(filtered);

  const rows = completedBitacoraExportRows(filtered);
  const csvEscape = (value) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csv = [
    headers.map(csvEscape).join(";"),
    ...rows.map((row) => keys.map((key) => csvEscape(row[key])).join(";"))
  ].join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const today = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `bitacoras-completadas-${today}.csv`);
}

function jmCompletedFiltersPanel(tasksList, user, filteredCount, options = {}) {
  const filters = state.jmCompletedFilters ?? {};
  const { branches, technicians } = jmCompletedFilterOptions(tasksList, user);
  const hasFilters = Object.values(filters).some(Boolean);
  const canExport = options.canExport ?? false;
  const countLabel = options.countLabel || "tareas";
  const fromLabel = options.fromLabel || "Desde";
  const toLabel = options.toLabel || "Hasta";
  return `
    <section class="jm-completed-filters">
      <label class="jm-filter-field wide">
        <span>Buscar</span>
        <div class="field-control">${icons.info}<input type="search" data-role="jm-completed-search" value="${escapeAttribute(filters.search || "")}" placeholder="RBD, folio, técnico, establecimiento..." autocomplete="off" /></div>
      </label>
      <label class="jm-filter-field">
        <span>RBD</span>
        <div class="field-control"><input type="search" data-role="jm-completed-rbd" value="${escapeAttribute(filters.rbd || "")}" placeholder="Ej: 1" autocomplete="off" /></div>
      </label>
      <label class="jm-filter-field">
        <span>Folio</span>
        <div class="field-control"><input type="search" data-role="jm-completed-folio" value="${escapeAttribute(filters.folio || "")}" placeholder="Folio" autocomplete="off" /></div>
      </label>
      <label class="jm-filter-field">
        <span>Técnico</span>
        <div class="field-control"><select data-role="jm-completed-technician"><option value="">Todos</option>${technicians.map((technician) => `<option value="${escapeAttribute(technician.usuario)}" ${filters.technician === technician.usuario ? "selected" : ""}>${escapeHtml(technician.nombre)}</option>`).join("")}</select></div>
      </label>
      <label class="jm-filter-field">
        <span>Zona</span>
        <div class="field-control"><select data-role="jm-completed-branch"><option value="">Todas</option>${branches.map((branch) => `<option value="${escapeAttribute(branch)}" ${filters.branch === branch ? "selected" : ""}>${escapeHtml(branch)}</option>`).join("")}</select></div>
      </label>
      <label class="jm-filter-field date-filter">
        <span>${escapeHtml(fromLabel)}</span>
        <div class="field-control"><input type="date" data-role="jm-completed-submitted-from" value="${escapeAttribute(filters.submittedFrom || "")}" /></div>
      </label>
      <label class="jm-filter-field date-filter">
        <span>${escapeHtml(toLabel)}</span>
        <div class="field-control"><input type="date" data-role="jm-completed-submitted-to" value="${escapeAttribute(filters.submittedTo || "")}" /></div>
      </label>
      <div class="jm-filter-footer">
        <div class="jm-filter-count">
          <strong>${filteredCount} de ${tasksList.length}</strong>
          <span>${escapeHtml(countLabel)}</span>
        </div>
        <div class="jm-filter-actions">
          ${hasFilters ? `<button class="button ghost" type="button" data-action="clear-jm-completed-filters">Limpiar filtros</button>` : ""}
          ${canExport ? `<button class="button secondary" type="button" data-action="download-completed-bitacoras-excel">${icons.download} Descargar Excel</button>` : ""}
        </div>
      </div>
    </section>
  `;
}

function updateJmCompletedFilter(field, value, options = {}) {
  state.jmCompletedFilters = {
    ...state.jmCompletedFilters,
    [field]: value
  };
  if (options.render === false) return;
  render();
}

function jmTaskListArticle(task, tone = "pending", options = {}) {
  const technicianName = taskTechnician(task)?.nombre ?? "Sin técnico";
  const criticality = tone === "overdue" ? overdueCriticality(task) : { key: "", label: "", days: 0 };
  const criticalityClass = criticality.key ? ` overdue-${criticality.key}` : "";
  const criticalityCopy = criticality.key
    ? ` · ${criticality.label} (${criticality.days} día${criticality.days === 1 ? "" : "s"})`
    : "";
  const dateCopy = options.completed
    ? `Respuesta: ${taskSubmittedDateIso(task) ? formatDateLabel(taskSubmittedDateIso(task)) : "Sin fecha"}`
    : `Fecha planificada: ${taskDueDateIso(task) ? formatDateLabel(taskDueDateIso(task)) : (task.dueAt || "Sin fecha")}`;
  return `
    <article class="${tone}${criticalityClass}${options.completed ? " is-clickable" : ""}" ${options.completed ? `data-action="jm-bitacora-summary" data-task-id="${escapeAttribute(task.id)}"` : ""}>
      ${tone === "overdue" ? icons.alert : options.completed ? icons.checkSquare : icons.clipboard}
      <div>
        <strong>${task.type} · RBD ${task.rbd}</strong>
        <span>${task.establishment} · Técnico: ${technicianName} · Folio: ${task.folio || "Sin folio"} · ${dateCopy}${criticalityCopy} · Zona: ${taskBranchName(task) || "Sin zona"}</span>
      </div>
      ${options.completed ? icons.arrow : ""}
    </article>
  `;
}

function jmTechnicianTaskMetrics(taskList) {
  const grouped = new Map();
  taskList.forEach((task) => {
    const technician = taskTechnician(task);
    const key = technician?.usuario || task.assignedTo || "sin-tecnico";
    const current = grouped.get(key) || {
      key,
      name: technician?.nombre || task.assignedTo || "Sin técnico",
      count: 0
    };
    current.count += 1;
    grouped.set(key, current);
  });

  return [...grouped.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return left.name.localeCompare(right.name, "es");
  });
}

function jmTechnicianChartPanel(taskList, tone = "pending") {
  const metrics = jmTechnicianTaskMetrics(taskList);
  const maxCount = Math.max(1, ...metrics.map((metric) => metric.count));
  const titleByTone = {
    pending: "Pendientes por técnico",
    overdue: "Atrasadas por técnico",
    urgent: "Emergencias por técnico",
    completed: "Completadas por técnico"
  };
  const labelByTone = {
    pending: "pendiente",
    overdue: "atrasada",
    urgent: "emergencia",
    completed: "completada"
  };
  const title = titleByTone[tone] || "Métricas por técnico";
  const label = labelByTone[tone] || "tarea";

  return `
    <div class="jm-technician-chart-panel ${tone}">
      <div class="jm-task-section-head">
        <h3>${title}</h3>
        <span>${taskList.length}</span>
      </div>
      ${metrics.length ? `
        <div class="jm-tech-chart-list">
          ${metrics.map((metric) => {
            const percent = Math.max(8, Math.round((metric.count / maxCount) * 100));
            return `
              <div class="jm-tech-chart-row" style="--bar:${percent}%">
                <div class="jm-tech-chart-copy">
                  <strong>${escapeHtml(metric.name)}</strong>
                  <span>${metric.count} ${label}${metric.count === 1 ? "" : "s"}</span>
                </div>
                <div class="jm-tech-chart-bar" aria-hidden="true"><span></span></div>
              </div>
            `;
          }).join("")}
        </div>
      ` : `
        <article class="jm-tech-chart-empty">
          ${icons.info}
          <div>
            <strong>Sin datos para graficar</strong>
            <span>No hay tareas en este apartado.</span>
          </div>
        </article>
      `}
    </div>
  `;
}

function jmTaskSection(title, subtitle, taskList, tone) {
  return `
    <div class="jm-task-section ${tone}">
      <div class="jm-task-section-head">
        <h3>${title}</h3>
        <span>${taskList.length}</span>
      </div>
      ${subtitle ? `<p>${subtitle}</p>` : ""}
      ${taskList.length ? taskList.map((task) => jmTaskListArticle(task, tone)).join("") : `
        <article>
          ${icons.info}
          <div>
            <strong>Sin registros</strong>
            <span>No hay tareas en este apartado.</span>
          </div>
        </article>
      `}
    </div>
  `;
}

function jmOverdueCriticalityFilters() {
  return `
    <section class="technician-overdue-filters jm-overdue-filters">
      <button
        type="button"
        class="technician-overdue-filter low ${state.jmOverdueCriticality === "low" ? "active" : ""}"
        data-action="jm-overdue-filter"
        data-criticality="low">
        Atraso Bajo (1-3 días)
      </button>
      <button
        type="button"
        class="technician-overdue-filter medium ${state.jmOverdueCriticality === "medium" ? "active" : ""}"
        data-action="jm-overdue-filter"
        data-criticality="medium">
        Atraso Medio (4-7 días)
      </button>
      <button
        type="button"
        class="technician-overdue-filter critical ${state.jmOverdueCriticality === "critical" ? "active" : ""}"
        data-action="jm-overdue-filter"
        data-criticality="critical">
        Atraso Crítico (+7 días)
      </button>
    </section>
  `;
}

function jmDashboardDetails(user, branchTasks, activeTechnicians, panel) {
  const urgent = sortTasksByPlannedDate(branchTasks.filter((task) => !taskIsCompleted(task) && taskIsEmergency(task)));
  const overdue = sortTasksByPlannedDate(branchTasks.filter((task) => !taskIsEmergency(task) && taskIsOverdue(task)));
  const pending = sortTasksByPlannedDate(branchTasks.filter((task) => !taskIsCompleted(task) && !taskIsEmergency(task) && !taskIsOverdue(task)));
  const completed = sortTasksByPlannedDate(branchTasks.filter(taskIsCompleted));
  const baseTasks = panel === "urgent" ? urgent : panel === "overdue" ? overdue : panel === "completed" ? completed : pending;
  const criticalityFilteredTasks = panel === "overdue" && state.jmOverdueCriticality
    ? baseTasks.filter((task) => overdueCriticality(task).key === state.jmOverdueCriticality)
    : baseTasks;
  const selectedTasks = ["urgent", "overdue", "completed", "pending"].includes(panel)
    ? sortTasksByPlannedDate(applyJmCompletedFilters(criticalityFilteredTasks, panel))
    : sortTasksByPlannedDate(criticalityFilteredTasks);

  if (panel === "technicians") {
    const branchMetrics = jmVisibleBranchMetrics(user);
    return `
      ${branchMetrics.length ? branchMetrics.map(jmTechniciansByZonePanel).join("") : emptyState("Sin zonas", "Este jefe aún no tiene zonas asignadas.")}
    `;
  }

  if (panel === "pending") {
    return `
      <section class="notification-list jm-dashboard-list">
        <h2>Tareas pendientes en zona</h2>
        ${jmCompletedFiltersPanel(pending, user, selectedTasks.length, {
          countLabel: "tareas pendientes",
          fromLabel: "Planificada desde",
          toLabel: "Planificada hasta"
        })}
        ${jmTechnicianChartPanel(selectedTasks, "pending")}
        ${jmTaskSection("Pendientes", "Tareas vigentes aún sin completar.", selectedTasks, "pending")}
      </section>
    `;
  }

  const selectedTone = panel === "urgent" ? "urgent" : panel === "overdue" ? "overdue" : panel === "completed" ? "completed" : "pending";
  const chartPanel = ["urgent", "overdue", "completed"].includes(panel) ? jmTechnicianChartPanel(selectedTasks, selectedTone) : "";
  const filterLabel = panel === "urgent" ? "emergencias" : panel === "overdue" ? "tareas atrasadas" : "bitácoras completadas";
  const dateLabel = panel === "completed" ? "Respuesta" : "Planificada";

  return `
    <section class="notification-list jm-dashboard-list">
      <h2>${panel === "urgent" ? "Emergencias activas" : panel === "overdue" ? "Tareas atrasadas" : panel === "completed" ? "Tareas completadas" : "Tareas pendientes en zona"}</h2>
      ${jmCompletedFiltersPanel(baseTasks, user, selectedTasks.length, {
        canExport: panel === "completed",
        countLabel: filterLabel,
        fromLabel: `${dateLabel} desde`,
        toLabel: `${dateLabel} hasta`
      })}
      ${panel === "overdue" ? jmOverdueCriticalityFilters() : ""}
      ${chartPanel}
      ${selectedTasks.length ? selectedTasks.map((task) => `
        ${jmTaskListArticle(task, selectedTone, { completed: panel === "completed" })}
      `).join("") : `
        <article>
          ${icons.info}
          <div>
            <strong>Sin registros</strong>
            <span>No hay ${panel === "urgent" ? "emergencias activas" : panel === "overdue" ? "tareas atrasadas" : panel === "completed" ? "tareas completadas" : "tareas pendientes"} para ${branchScopeLabel(user)}.</span>
          </div>
        </article>
      `}
    </section>
  `;
}

function jmBranchTasks(user = loggedUser()) {
  return tasks.filter((task) => {
    const technician = users.find((candidate) => candidate.usuario === task.assignedTo);
    return technician ? userHasBranch(user, technician.sucursal) : false;
  });
}

async function loadSelectedSubmissionDetailForManager() {
  const task = selectedTask();
  const submissionId = task?.submissionId;
  const attempts = state.submissionPhotoLoadAttempts?.[submissionId] ?? 0;
  const hasLoadedDetail = Boolean(state.submissionDetailLoadedIds?.[submissionId]);
  const hasPhotoPreview = Boolean(task && allEvidencePhotoRecords(task).length);
  if (!task || !submissionId || state.submissionDetailBusy || (hasLoadedDetail && (hasPhotoPreview || attempts >= 1))) return;

  setState({
    submissionDetailBusy: true,
    submissionDetailError: "",
    submissionPhotoLoadAttempts: {
      ...state.submissionPhotoLoadAttempts,
      [submissionId]: attempts + 1
    }
  });
  try {
    const result = await ensureRemoteSubmissionRecords(task, { includePhotos: true });
    const photoPreviewCount = result?.photoPreviewCount ?? allEvidencePhotoRecords(task).length;
    const photoRows = result?.photoRows ?? 0;
    const nextWarnings = { ...state.submissionPhotoWarnings };
    if (!photoPreviewCount) {
      nextWarnings[submissionId] = photoRows
        ? `Se encontraron ${photoRows} fotografía${photoRows === 1 ? "" : "s"} respaldada${photoRows === 1 ? "" : "s"}, pero este dispositivo no pudo descargarlas desde OneDrive. Verifica que la función upload-onedrive-pdf esté desplegada con la acción submission-photos.`
        : "No se encontraron adjuntos de fotografía para esta bitácora en Supabase. Si las fotos sí están en OneDrive, hay que revisar el registro en form_attachments.";
    } else {
      delete nextWarnings[submissionId];
    }
    setState({
      submissionDetailBusy: false,
      submissionDetailError: "",
      submissionDetailLoadedIds: {
        ...state.submissionDetailLoadedIds,
        [submissionId]: true
      },
      submissionPhotoWarnings: nextWarnings
    });
  } catch (error) {
    setState({
      submissionDetailBusy: false,
      submissionDetailError: error.message || "No se pudo cargar el resumen de la bitácora."
    });
  }
}

function jmDashboardScreen(panel) {
  const user = loggedUser();
  const title = panel === "urgent" ? "Emergencias" : panel === "overdue" ? "Atrasadas" : panel === "technicians" ? "Técnicos" : panel === "completed" ? "Completadas" : "Pendientes";
  return `
    ${topBar(title, { back: "jm-notifications" })}
    <main class="screen with-nav jm-screen">
      ${jmDashboardDetails(user, jmBranchTasks(user), assignableTechnicians(user), panel)}
    </main>
    ${bottomNav()}
  `;
}

function maintenanceAlertCard(alert) {
  const busy = state.maintenanceAlertResolveBusyId === alert.id;
  const expired = alert.type === "extinguisher_expired" || Number(alert.daysToExpire) < 0;
  const label = expired ? "Vencido" : "Por vencer";
  const date = alert.dueDate ? formatDateLabel(String(alert.dueDate).slice(0, 10)) : "Sin fecha";
  const resolutionDate = state.maintenanceAlertResolutionDates?.[alert.id] || "";
  return `
    <article class="maintenance-alert-card ${expired ? "expired" : "soon"}">
      <div class="maintenance-alert-icon">${icons.alert}</div>
      <div class="maintenance-alert-body">
        <strong>${escapeHtml(alert.title || "Alerta de extintor")}</strong>
        <p>${escapeHtml(alert.establishmentName || "Establecimiento")} ${alert.rbd ? `· RBD ${escapeHtml(alert.rbd)}` : ""}</p>
        <small>${label} · Vencimiento: ${escapeHtml(date)}</small>
      </div>
      <label class="maintenance-alert-resolution-date">
        <span>Vencimiento nuevo extintor</span>
        <input
          type="date"
          min="${escapeAttribute(todayIsoDate())}"
          value="${escapeAttribute(resolutionDate)}"
          data-role="maintenance-alert-resolution-date"
          data-alert-id="${escapeAttribute(alert.id)}" />
      </label>
      <button type="button" data-action="resolve-maintenance-alert" data-alert-id="${escapeAttribute(alert.id)}" ${busy ? "disabled" : ""}>
        ${busy ? "Guardando..." : "Guardar y marcar OK"}
      </button>
    </article>
  `;
}

function maintenanceAlertsPanel() {
  const alerts = state.maintenanceAlerts || [];
  if (!alerts.length) return "";
  return `
    <section class="jm-panel maintenance-alerts-panel">
      <div class="jm-section-title">
        <h3>Alertas de extintores</h3>
        <button type="button" data-action="refresh-maintenance-alerts">${state.maintenanceAlertRefreshBusy ? "Actualizando..." : "Actualizar"}</button>
      </div>
      <div class="maintenance-alert-list">
        ${alerts.map(maintenanceAlertCard).join("")}
      </div>
    </section>
  `;
}

function jmNotificationsScreen() {
  const user = loggedUser();
  const initials = user.nombre.split(" ").map((part) => part[0]).slice(0, 2).join("");
  const branchMetrics = jmVisibleBranchMetrics(user);
  const pendingTasks = branchMetrics.reduce((total, metric) => total + metric.pending.length, 0);
  const overdueTasks = branchMetrics.reduce((total, metric) => total + metric.overdue.length, 0);
  const urgentTasks = branchMetrics.reduce((total, metric) => total + metric.emergencies.length, 0);
  const completedTasks = branchMetrics.reduce((total, metric) => total + metric.completed.length, 0);
  const activeTechnicians = branchMetrics.reduce((total, metric) => total + metric.technicians.length, 0);
  const visibleZones = branchMetrics.slice(0, 4);
  const openIncidents = openIncidentsForManager(user);
  const unreadMessages = unreadMessageCount();

  return `
    <header class="jm-home-header">
      <div class="jm-brand">
        <strong>SOSER</strong>
        <span>Servicio de Alimentación</span>
      </div>
      <button class="jm-bell" type="button" data-action="route" data-route="messages" aria-label="Mensajes">${icons.message}${unreadMessages ? `<i>${unreadMessages}</i>` : ""}</button>
    </header>
    <main class="screen with-nav jm-screen jm-home-screen">
      <section class="jm-hello-card">
        <div>
          <h2>¡Hola, ${escapeHtml(user.nombre.split(" ")[0] ?? "Jefe")}!</h2>
          <p>${escapeHtml(user.cargo)}</p>
        </div>
        <div class="avatar">${initials}</div>
      </section>
      ${maintenanceAlertsPanel()}
      <section class="jm-panel">
        <div class="jm-section-title">
          <h3>Resumen general</h3>
        </div>
        <div class="jm-summary-grid">
          ${jmSummaryMetricCard(icons.alert, urgentTasks, "Emergencias", "Requieren atención", "danger")}
          ${jmSummaryMetricCard(icons.calendar, overdueTasks, "Atrasadas", "Fuera de fecha", "overdue")}
          ${jmSummaryMetricCard(icons.clipboard, pendingTasks, "Pendientes", `${activeTechnicians} técnicos activos`, "pending")}
          ${jmSummaryMetricCard(icons.checkSquare, completedTasks, "Completadas", "Cerradas en zona", "success")}
        </div>
      </section>
      <section class="jm-panel">
        <div class="jm-section-title">
          <h3>Mis zonas</h3>
          <button type="button" data-action="route" data-route="jm-zones">Ver todas</button>
        </div>
        <div class="jm-zone-list">
          ${visibleZones.length ? visibleZones.map((metric) => jmZoneCard(metric, true)).join("") : emptyState("Sin zonas", "Este jefe aún no tiene zonas asignadas.")}
        </div>
      </section>
      <section class="jm-panel">
        <div class="jm-section-title">
          <h3>Incidencias reportadas</h3>
          <span>${openIncidents.length} pendiente${openIncidents.length === 1 ? "" : "s"}</span>
        </div>
        <div class="incident-list compact">
          ${openIncidents.length ? openIncidents.slice(0, 4).map((incident) => incidentCard(incident, { manager: true })).join("") : emptyState("Sin incidencias", "No hay reportes de prevención pendientes en tus zonas.")}
        </div>
      </section>
    </main>
    ${bottomNav()}
  `;
}

function jmTasksScreen() {
  return `
    ${topBar("Tareas", { back: "jm-notifications" })}
    <main class="screen with-nav jm-screen jm-tasks-screen">
      <section class="jm-panel">
        <div class="jm-section-title">
          <h3>Gestión de tareas</h3>
          <span>${branchScopeLabel(loggedUser())}</span>
        </div>
        <div class="action-menu jm-actions">
          ${actionTile("Asignar tareas", "Crear una visita para técnicos activos.", "admin-assign", icons.clipboardCheck)}
        </div>
      </section>
    </main>
    ${bottomNav()}
  `;
}

function jmZonesScreen() {
  const user = loggedUser();
  const branchMetrics = jmVisibleBranchMetrics(user);

  return `
    ${topBar("Mis zonas", { back: "jm-notifications" })}
    <main class="screen with-nav jm-screen jm-zones-screen">
      <label class="jm-search-field">
        ${icons.info}
        <input type="search" placeholder="Buscar zona" aria-label="Buscar zona" />
      </label>
      ${branchMetrics.length ? branchMetrics.map(jmTechniciansByZonePanel).join("") : emptyState("Sin zonas", "Este jefe aún no tiene zonas asignadas.")}
    </main>
    ${bottomNav()}
  `;
}

function bulkAssignScreen() {
  const actor = loggedUser();
  const technicians = assignableTechnicians(actor);
  const branchRbdCount = establishmentsForUser(actor).length;

  if (!canAssignTasks(actor)) {
    return `
      ${topBar("Carga masiva", { back: defaultRouteFor(actor) })}
      <main class="screen with-nav">${emptyState("Acceso no disponible", "Este perfil no tiene permisos para cargar tareas.")}</main>
      ${bottomNav()}
    `;
  }

  return `
    ${topBar("Carga masiva", { back: defaultRouteFor(actor) })}
    <main class="screen with-nav bulk-screen">
      <section class="bulk-panel">
        <div class="placeholder-icon">${icons.clipboard}</div>
        <h2>Carga masiva de tareas</h2>
        <p>Descarga la plantilla, completa una fila por visita y vuelve a cargar el archivo. La plantilla incluye lista desplegable de técnicos activos para ${branchScopeLabel(actor)}.</p>
      </section>
      <section class="bulk-instructions">
        <h3>Columnas requeridas</h3>
        <ol>
          <li>Fecha planificada</li>
          <li>Nombre Técnico</li>
          <li>RBD</li>
          <li>Tipo Visita</li>
        </ol>
        <div class="assignment-zone-note">
          ${icons.branch}
          <span>Validación activa: ${technicians.length} técnico(s) y ${branchRbdCount} RBD disponibles para <strong>${branchScopeLabel(actor)}</strong>. Si una fila trae un RBD de otra zona o un técnico no permitido, no se cargará la planilla.</span>
        </div>
      </section>
      <section class="bulk-actions">
        <button class="button secondary" type="button" data-action="download-bulk-template">Descargar plantilla Excel</button>
        <label class="button primary file-button">
          Cargar Excel
          <input type="file" accept=".xlsx" data-role="bulk-task-file" />
        </label>
      </section>
      ${state.bulkImportSummary ? `<div class="bulk-summary success">${escapeHtml(state.bulkImportSummary)}</div>` : ""}
      ${state.bulkImportErrors.length ? `
        <section class="bulk-summary error">
          <strong>No se pudo cargar la planilla</strong>
          <ul>${state.bulkImportErrors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>
        </section>
      ` : ""}
    </main>
    ${bottomNav()}
  `;
}

function createUserForm() {
  const draft = state.userCreateDraft ?? {};
  const selectedCargo = draft.cargo || allowedRoles[0] || "";
  return `
    <form class="create-user-form user-create-screen-form" data-role="create-user-form">
      <div class="user-create-hero">
        <span>${icons.user}</span>
      </div>
      <label class="field compact-field"><span>Nombre completo</span><div class="field-control"><input name="nombre" data-role="user-create-input" type="text" value="${escapeAttribute(draft.nombre ?? "")}" placeholder="Ingresa el nombre completo" /></div></label>
      <label class="field compact-field"><span>RUT</span><div class="field-control"><input name="rut" data-role="user-create-input" data-field="rut" type="text" value="${escapeAttribute(draft.rut ?? "")}" placeholder="12.345.678-9" inputmode="text" maxlength="12" autocomplete="off" /></div></label>
      <label class="field compact-field"><span>Correo electrónico</span><div class="field-control"><input name="usuario" data-role="user-create-input" type="email" value="${escapeAttribute(draft.usuario ?? "")}" placeholder="correo@soser.cl" /></div></label>
      <div class="form-grid">
        <label class="field compact-field"><span>Grupo</span><div class="field-control"><select name="grupo" data-role="user-create-input">${groupOptions(draft.grupo || "Mantenimiento")}</select></div></label>
        <label class="field compact-field"><span>Cargo</span><div class="field-control"><select name="cargo" data-role="user-create-input">${roleOptions(selectedCargo)}</select></div></label>
      </div>
      <div class="field compact-field branch-field"><span>Zonas / sucursales</span>${branchCheckboxes(draft.sucursales?.length ? draft.sucursales : ["Santiago"])}</div>
      <div class="temp-password pending-password">
        <strong>Contraseña temporal automática</strong>
        <span>Se generará al crear el usuario y deberá cambiarse en el primer ingreso.</span>
      </div>
      ${state.userCreateError ? `<div class="login-error">${state.userCreateError}</div>` : ""}
      <button class="button primary" type="button" data-action="create-user" ${state.userCreateBusy ? "disabled" : ""}>${state.userCreateBusy ? "Creando..." : "Guardar usuario"}</button>
      <button class="button ghost" type="button" data-action="admin-users">Cancelar</button>
    </form>
  `;
}

function usersSection() {
  return `
    <section class="users-section">
      <div class="section-heading">
        <h2>Usuarios</h2>
        <span>${users.length} registros</span>
      </div>
      ${state.actionMessage ? `<div class="temp-password">${state.actionMessage}</div>` : ""}
      <div class="users-table">${users.map(userCard).join("")}</div>
    </section>
  `;
}

function temporaryPasswordForUser(user) {
  const generated = state.generatedPasswords.find((item) => item.email.toLowerCase() === user.usuario.toLowerCase());
  return generated?.password || (user.requirePasswordChange ? user.password : "") || "";
}

function userTemporaryPasswordBlock(user) {
  const password = temporaryPasswordForUser(user);
  if (!password) return "";

  return `
    <div class="user-temp-password">
      <span>Contraseña temporal</span>
      <code>${escapeHtml(password)}</code>
    </div>
  `;
}

function userCard(user) {
  const isExpanded = state.expandedUserId === user.id;
  const canDelete = loggedUser()?.id !== user.id;
  const canResetPassword = canDelete;
  const resetBusy = state.passwordResetBusyUserId === user.id;
  const lastLoginLabel = formatDateTimeLabel(user.ultimaConexion);

  return `
    <article class="user-row ${isExpanded ? "expanded" : ""}">
      <button class="user-summary" data-action="toggle-user" data-user-id="${user.id}">
        <strong>${user.nombre}</strong>
        <span class="pill ${user.estado === "activo" ? "completada" : "urgente"}">${user.estado}</span>
        <small>${user.motivoEstado}${user.requirePasswordChange ? " · Cambio clave" : ""}</small>
        <small class="user-last-login">Última conexión: ${escapeHtml(lastLoginLabel)}</small>
        ${icons.arrow}
      </button>
      ${isExpanded ? `
        <form class="user-edit-grid" data-role="edit-user-${user.id}">
          <div class="user-readonly-field">
            <span>Última conexión</span>
            <strong>${escapeHtml(lastLoginLabel)}</strong>
          </div>
          <label><span>Nombre</span><input name="nombre" value="${user.nombre}" /></label>
          <label><span>RUT</span><input name="rut" data-role="user-edit-rut" value="${user.rut ?? ""}" placeholder="12.345.678-9" inputmode="text" maxlength="12" autocomplete="off" /></label>
          <label><span>Correo</span><input name="usuario" type="email" value="${user.usuario}" /></label>
          <label><span>Grupo</span><select name="grupo">${groupOptions(user.grupo)}</select></label>
          <label><span>Cargo</span><select name="cargo">${roleOptions(user.cargo)}</select></label>
          <div class="branch-field"><span>Zonas / sucursales</span>${branchCheckboxes(userBranches(user))}</div>
          <label class="checkbox-field inline-checkbox">
            <input name="gestionarUsuarios" type="checkbox" ${user.permisos?.gestionarUsuarios ? "checked" : ""} />
            <span>Administrador</span>
          </label>
        </form>
        ${userTemporaryPasswordBlock(user)}
        <div class="status-actions">
          <button data-action="user-status" data-user-id="${user.id}" data-status="activo" data-reason="Disponible">Activo</button>
          <button data-action="user-status" data-user-id="${user.id}" data-status="inactivo" data-reason="Ausencia">Ausencia</button>
          <button data-action="user-status" data-user-id="${user.id}" data-status="inactivo" data-reason="Licencia">Licencia</button>
          <button data-action="user-status" data-user-id="${user.id}" data-status="inactivo" data-reason="Despido">Despido</button>
          <button type="button" class="save-user-button" data-action="save-user" data-user-id="${user.id}">Guardar cambios</button>
          ${canResetPassword ? `<button type="button" class="save-user-button" data-action="reset-user-password" data-user-id="${user.id}" ${resetBusy ? "disabled" : ""}>${resetBusy ? "Generando..." : "Generar contraseña temporal"}</button>` : ""}
          ${canDelete ? `<button type="button" class="delete-user-button" data-action="delete-user" data-user-id="${user.id}">Eliminar usuario</button>` : ""}
        </div>
      ` : ""}
    </article>
  `;
}

function adminUsersScreen() {
  return `
    ${topBar("Usuarios", { back: "actions", action: "admin-user-create", actionLabel: "Crear usuario", actionIcon: icons.plus })}
    <main class="screen with-nav">${usersSection()}</main>
    ${bottomNav()}
  `;
}

function adminUserCreateScreen() {
  return `
    ${topBar("Crear usuario", { back: "admin-users" })}
    <main class="screen with-nav">
      ${createUserForm()}
    </main>
    ${bottomNav()}
  `;
}

function adminGroupsScreen() {
  return `
    ${topBar("Grupos", { back: "actions" })}
    <main class="screen with-nav">
      <form class="create-user-form" data-role="create-group-form">
        <h3>Crear grupo</h3>
        <label class="field compact-field"><span>Nombre del grupo</span><div class="field-control"><input name="groupName" type="text" placeholder="Ej: Climatizacion" /></div></label>
        <button class="button primary" type="button" data-action="create-group">Crear grupo</button>
      </form>
      <section class="users-table">
        ${state.groups.map(groupCard).join("")}
      </section>
    </main>
    ${bottomNav()}
  `;
}

function groupCard(group) {
  const groupUsers = users.filter((user) => user.grupo === group);
  const isExpanded = state.expandedGroup === group;

  return `
    <article class="user-row ${isExpanded ? "expanded" : ""}">
      <button class="user-summary" data-action="toggle-group" data-group="${group}">
        <strong>${group}</strong>
        <span class="pill pendiente">${groupUsers.length}</span>
        <small>${groupUsers.length === 1 ? "usuario asociado" : "usuarios asociados"}</small>
        ${icons.arrow}
      </button>
      ${isExpanded ? `
        <div class="group-users">
          ${groupUsers.length ? groupUsers.map((user) => `
            <div class="group-user-row">
              <strong>${user.nombre}</strong>
              <span>${user.cargo}</span>
              <span class="pill ${user.estado === "activo" ? "completada" : "urgente"}">${user.estado}</span>
            </div>
          `).join("") : `<div class="empty-inline">Sin usuarios en este grupo.</div>`}
        </div>
      ` : ""}
    </article>
  `;
}

function adminAssignScreen() {
  const actor = loggedUser();
  if (!canAssignTasks(actor)) {
    return `
      ${topBar("Asignar tarea", { back: defaultRouteFor(actor) })}
      <main class="screen with-nav">${emptyState("Acceso no disponible", "Este perfil no tiene permisos para asignar tareas.")}</main>
      ${bottomNav()}
    `;
  }

  const branchOptions = assignBranchOptions(actor);
  const selectedBranch = selectedAssignBranch(actor);
  const technicians = assignableTechnicians(actor, selectedBranch);
  const taskTypes = Object.values(formBlueprints).map((blueprint) => blueprint.taskType);
  const branchEstablishments = selectedBranch
    ? establishmentsByBranch(selectedBranch).filter((item) => !isCasaMatrizEstablishment(item))
    : [];
  const filteredEstablishments = filterEstablishments(branchEstablishments, state.assignRbdSearch);
  const selectedEstablishment = branchEstablishments.find((item) => item.rbd === state.assignSelectedRbd);
  const availableTechnicians = selectedEstablishment
    ? technicians.filter((user) => user.sucursal === selectedEstablishment.branch)
    : technicians;
  const selectedTechnicianEmail = availableTechnicians.some((user) => user.usuario === state.assignTechnician)
    ? state.assignTechnician
    : "";
  const selectedTechnician = availableTechnicians.find((user) => user.usuario === selectedTechnicianEmail);
  const searchValue = state.assignRbdSearch || establishmentLabel(selectedEstablishment);
  const showComboResults = !state.assignSelectedRbd && (state.assignRbdSearch || branchEstablishments.length <= 8);
  const today = new Date().toISOString().slice(0, 10);

  return `
    ${topBar("Asignar tarea", { back: defaultRouteFor(actor), info: isLimitedManagerUser(actor) })}
    <main class="screen with-nav ${isLimitedManagerUser(actor) ? "jm-assign-screen" : ""}">
      <form onsubmit="return validateAssignTaskForm(event)" class="create-user-form ${isLimitedManagerUser(actor) ? "jm-assign-form" : ""}" data-role="assign-task-form">
        <h3>${state.assignEditingTaskId ? "Editar visita programada" : (isLimitedManagerUser(actor) ? "Datos de la tarea" : "Nueva tarea")}</h3>
        <label class="field compact-field"><span>Zona</span><div class="field-control">${icons.branch}<select name="branch" data-role="assign-branch" ${state.assignEditingTaskId || branchOptions.length <= 1 ? "disabled" : ""}>${branchOptions.map((branch) => `<option value="${escapeAttribute(branch)}" ${branch === selectedBranch ? "selected" : ""}>${escapeHtml(branch)}</option>`).join("")}</select>${state.assignEditingTaskId || branchOptions.length <= 1 ? `<input type="hidden" name="branch" value="${escapeAttribute(selectedBranch)}" />` : ""}</div></label>
        <label class="field compact-field searchable-combo"><span>Establecimiento / RBD</span>
          <div class="field-control">${icons.info}<input name="establishmentSearch" type="search" data-role="assign-establishment-search" value="${escapeAttribute(searchValue)}" placeholder="Escribe RBD o nombre del establecimiento..." autocomplete="off" ${state.assignEditingTaskId ? "disabled" : ""} /></div>
          <input type="hidden" name="establishmentRbd" value="${escapeAttribute(state.assignSelectedRbd)}" />
          ${showComboResults ? `<div class="combo-results">${establishmentSearchResults(filteredEstablishments)}</div>` : ""}
        </label>
        <div class="assignment-zone-note">
          ${selectedBranch ? `${icons.branch}<span>Zona seleccionada: <strong>${selectedBranch}</strong>. Mostrando <strong>${filteredEstablishments.length}</strong> de ${branchEstablishments.length} RBD disponibles.</span>` : `${icons.alert}<span>No hay zonas disponibles para este perfil.</span>`}
        </div>
        <label class="field compact-field"><span>Técnico</span><div class="field-control"><select name="technician" data-role="assign-technician" required ${selectedEstablishment ? "" : "disabled"}><option value="">Selecciona técnico</option>${availableTechnicians.map((user) => `<option value="${user.usuario}" ${user.usuario === selectedTechnicianEmail ? "selected" : ""}>${user.nombre} · ${user.sucursal}</option>`).join("")}</select></div></label>
        <div class="form-grid">
          <label class="field compact-field"><span>Tipo</span><div class="field-control"><select name="type" data-role="assign-type" required><option value="">Selecciona tipo</option>${taskTypes.map((type) => `<option value="${type}" ${type === state.assignType ? "selected" : ""}>${type}</option>`).join("")}</select></div></label>
          <label class="field compact-field"><span>Prioridad</span><div class="field-control"><select name="priority" data-role="assign-priority" required><option value="">Selecciona prioridad</option>${["Media", "Alta", "Baja"].map((priority) => `<option value="${priority}" ${priority === state.assignPriority ? "selected" : ""}>${priority}</option>`).join("")}</select></div></label>
        </div>
        <label class="field compact-field"><span>Fecha planificada</span><div class="field-control"><input name="dueAt" type="date" data-role="assign-due-at" value="${escapeAttribute(state.assignDueAt)}" min="${today}" required /></div></label>
        ${assignmentSectionMatrix()}
        <label class="field compact-field"><span>Descripción</span><div class="field-control textarea-control"><textarea name="description" data-role="assign-description" placeholder="Detalle de la tarea">${escapeHtml(state.assignDescription)}</textarea></div></label>
        <button class="button primary" type="button" data-action="assign-task">${state.assignEditingTaskId ? "Guardar cambios" : (isLimitedManagerUser(actor) ? "Continuar" : "Asignar tarea")}</button>
      </form>
      ${state.actionMessage ? `<div class="temp-password">${state.actionMessage}</div>` : ""}
    </main>
    ${bottomNav()}
  `;
}

function passwordRequirements(password) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };
}

function isValidPassword(password) {
  return Object.values(passwordRequirements(password)).every(Boolean);
}

function isPasswordChangeRequired() {
  const user = loggedUser();
  const sessionUser = state.supabaseSession?.user ?? {};
  const sessionRequiresChange = [
    sessionUser.user_metadata?.require_password_change,
    sessionUser.app_metadata?.require_password_change,
    sessionUser.raw_user_meta_data?.require_password_change
  ].some((value) => value === true || value === "true" || value === 1 || value === "1");

  return Boolean(user?.requirePasswordChange || sessionRequiresChange);
}

function passwordRulesList(password = "") {
  const checks = passwordRequirements(password);
  const item = (ok, text) => `<li class="${ok ? "ok" : ""}">${text}</li>`;

  return `
    <ul class="password-rules">
      ${item(checks.length, "Mínimo 8 caracteres")}
      ${item(checks.upper, "Una mayúscula")}
      ${item(checks.lower, "Una minúscula")}
      ${item(checks.number, "Un número")}
      ${item(checks.special, "Un carácter especial")}
    </ul>
  `;
}

function validateAssignTaskForm(event) {
  try {
    event.preventDefault();
    const form = event.target;
    if (!form) return false;
    const rbdValue = String(form.querySelector('[name="establishmentRbd"]')?.value || "").trim();
    const technicianValue = String(form.querySelector('[name="technician"]')?.value || "").trim();
    const typeValue = String(form.querySelector('[name="type"]')?.value || "").trim();
    const priorityValue = String(form.querySelector('[name="priority"]')?.value || "").trim();
    const dueInput = form.querySelector('[name="dueAt"]');
    const dueValue = dueInput?.value || "";
    if (!rbdValue) {
      showErrorToast("RBD requerido", "Selecciona primero el establecimiento/RBD.");
      form.querySelector('[data-role="assign-establishment-search"]')?.focus();
      return false;
    }
    if (!technicianValue) {
      showErrorToast("Técnico requerido", "Selecciona el técnico para esta visita.");
      form.querySelector('[name="technician"]')?.focus();
      return false;
    }
    if (!typeValue) {
      showErrorToast("Tipo requerido", "Selecciona el tipo de visita.");
      form.querySelector('[name="type"]')?.focus();
      return false;
    }
    if (!priorityValue) {
      showErrorToast("Prioridad requerida", "Selecciona la prioridad de la visita.");
      form.querySelector('[name="priority"]')?.focus();
      return false;
    }
    if (!dueValue) {
      showErrorToast("Fecha requerida", "Selecciona la fecha planificada de la visita.");
      dueInput?.focus();
      return false;
    }
    const today = localDateKey();
    if (dueValue < today) {
      showErrorToast("Fecha inválida", "No puedes asignar tareas en fechas anteriores a hoy.");
      return false;
    }
    // Trigger existing assign button click to continue normal flow
    const assignBtn = form.querySelector('[data-action="assign-task"]');
    if (assignBtn) assignBtn.click();
    return false;
  } catch (err) {
    console.error(err);
    return false;
  }
}

function updatePasswordRulesPreview(password) {
  const container = rootEl.querySelector('[data-role="password-rules-preview"]');
  if (container) container.innerHTML = passwordRulesList(password);
}

function changePasswordScreen() {
  return `
    ${topBar("Cambiar contraseña", { back: "force-login" })}
    <main class="screen change-password-screen">
      <section class="placeholder-card">
        <div class="placeholder-icon">${icons.lock}</div>
        <h2>Cambio obligatorio</h2>
        <p>Esta contraseña temporal es de un solo uso. Define una nueva contraseña para continuar.</p>
      </section>
      <section class="login-panel inline-panel">
        ${state.passwordChangeError ? `<div class="login-error">${state.passwordChangeError}</div>` : ""}
        <label class="field"><span>Nueva contraseña</span><div class="field-control">${icons.lock}<input name="newPassword" type="password" autocomplete="new-password" data-role="new-password" /></div></label>
        <label class="field"><span>Confirmar contraseña</span><div class="field-control">${icons.lock}<input name="confirmPassword" type="password" autocomplete="new-password" /></div></label>
        <div data-role="password-rules-preview">${passwordRulesList()}</div>
        ${primaryButton("Guardar nueva contraseña", "save-password")}
        ${secondaryButton("Volver al login", "force-login")}
      </section>
    </main>
  `;
}

function generateTemporaryPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const special = "!#$%&*.?";
  const all = upper + lower + numbers + special;
  const pick = (pool) => pool[Math.floor(Math.random() * pool.length)];
  const required = [pick(upper), pick(lower), pick(numbers), pick(special)];

  while (required.length < 10) required.push(pick(all));
  return required.sort(() => Math.random() - 0.5).join("");
}

async function createUser() {
  const actor = loggedUser();
  if (!actor.permisos.gestionarUsuarios) return;
  if (state.userCreateBusy) return;

  const form = rootEl.querySelector('[data-role="create-user-form"]');
  const formData = new FormData(form);
  const draft = currentUserCreateDraft();
  state.userCreateDraft = draft;
  const nombre = String(formData.get("nombre") ?? "").trim();
  const usuario = String(formData.get("usuario") ?? "").trim().toLowerCase();
  const rut = formatRut(String(formData.get("rut") ?? "").trim());
  const cargo = String(formData.get("cargo") ?? "");
  const sucursales = normalizeSelectedBranches(formData.getAll("sucursales"), ["Santiago"]);
  const sucursal = sucursales[0] ?? "";
  const group = String(formData.get("grupo") ?? "").trim() || "Mantenimiento";

  if (!nombre) {
    setState({ userCreateDraft: draft, userCreateError: "Ingresa el nombre completo.", generatedPassword: "" });
    return;
  }

  if (!rut || !isValidRut(rut)) {
    setState({ userCreateDraft: { ...draft, rut }, userCreateError: rutValidationMessage(rut) || "Ingresa el RUT válido del usuario.", generatedPassword: "" });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usuario) || users.some((user) => user.usuario.toLowerCase() === usuario)) {
    setState({ userCreateDraft: draft, userCreateError: "Correo inválido o ya registrado.", generatedPassword: "" });
    return;
  }

  if (!allowedRoles.includes(cargo) && !state.supabaseCatalogs.roles.some((role) => role.name === cargo)) {
    setState({ userCreateDraft: draft, userCreateError: "Selecciona un cargo válido.", generatedPassword: "" });
    return;
  }

  if (!sucursal) {
    setState({ userCreateDraft: draft, userCreateError: "Selecciona al menos una sucursal.", generatedPassword: "" });
    return;
  }

  if (hasSupabaseConfig() && state.supabaseSession?.access_token) {
    const branchIds = branchIdsByNames(sucursales);
    const branchId = branchIds[0] ?? "";
    const groupId = catalogIdByName("groups", group);
    const roleId = catalogIdByName("roles", cargo);

    if (!branchId || branchIds.length !== sucursales.length || !groupId || !roleId) {
      setState({ userCreateDraft: draft, userCreateError: "No se encontraron los IDs de sucursal, grupo o cargo en Supabase.", generatedPassword: "" });
      return;
    }

    try {
      setState({ userCreateDraft: draft, userCreateBusy: true, userCreateError: "", generatedPassword: "" });
      const createPayload = {
          fullName: nombre,
          email: usuario,
          rut,
          branchId,
          branchIds,
          groupId,
          roleId,
          status: "activo",
          statusReason: "Disponible"
      };
      const functionName = supabaseConfig.createUserFunctionName || "create-user";
      const created = hasSqlServerApiConfig()
        ? await apiRequest("/functions/create-user", {
          method: "POST",
          body: JSON.stringify(createPayload)
        })
        : await supabaseRequest(`/functions/v1/${functionName}`, {
          method: "POST",
          body: JSON.stringify(createPayload)
        });

      users.unshift({
        id: created.id,
        nombre,
        usuario,
        rut,
        password: created.temporaryPassword,
        requirePasswordChange: true,
        sucursal,
        sucursales,
        grupo: group,
        cargo,
        estado: "activo",
        motivoEstado: "Disponible",
        permisos: permissionsForRole(cargo)
      });

      setState({
        generatedPassword: created.temporaryPassword,
        generatedPasswords: [
          { email: usuario, password: created.temporaryPassword },
          ...state.generatedPasswords
        ],
        userCreateError: "",
        userCreateBusy: false,
        userCreateDraft: resetUserCreateDraft(),
        actionMessage: ""
      });
      showSuccessToast("usuario creado correctamente", `La cuenta quedó registrada en ${hasSqlServerApiConfig() ? "SQL Server" : "Supabase"} con contraseña temporal.`);
      return;
    } catch (error) {
      setState({
        userCreateError: `${hasSqlServerApiConfig() ? "SQL Server" : "Supabase"}: ${error.message}`,
        generatedPassword: "",
        userCreateBusy: false,
        userCreateDraft: draft
      });
      return;
    }
  }

  const temporaryPassword = generateTemporaryPassword();
  if (!state.groups.includes(group)) state.groups.push(group);

  users.unshift({
    id: `usr-${Date.now()}`,
    nombre,
    usuario,
    rut,
    password: temporaryPassword,
    requirePasswordChange: true,
    sucursal: allowedBranches.includes(sucursal) ? sucursal : "Santiago",
    sucursales: sucursales.length ? sucursales : [allowedBranches.includes(sucursal) ? sucursal : "Santiago"],
    grupo: group,
    cargo,
    estado: "activo",
    motivoEstado: "Disponible",
    permisos: permissionsForRole(cargo)
  });

  setState({
    generatedPassword: temporaryPassword,
    generatedPasswords: [
      { email: usuario, password: temporaryPassword },
      ...state.generatedPasswords
    ],
    userCreateError: "",
    userCreateDraft: resetUserCreateDraft()
  });
}

function createGroup() {
  const form = rootEl.querySelector('[data-role="create-group-form"]');
  const groupName = String(new FormData(form).get("groupName") ?? "").trim();
  if (!groupName || state.groups.includes(groupName)) {
    setState({ actionMessage: "Ingresa un grupo nuevo y válido." });
    return;
  }
  state.groups.push(groupName);
  setState({ actionMessage: `Grupo creado: ${groupName}` });
}

async function submitIncident() {
  if (state.incidentSubmitting) return;
  const actor = loggedUser();
  const draft = currentIncidentDraft();
  const establishment = establishmentsByBranch(draft.branch).find((item) => item.rbd === draft.selectedRbd);

  if (!isPreventionist(actor)) {
    setState({ incidentError: "Este perfil no tiene permisos para levantar incidencias." });
    return;
  }
  if (!userHasBranch(actor, draft.branch)) {
    setState({ incidentDraft: draft, incidentError: "Selecciona una zona asignada a tu perfil." });
    return;
  }
  if (!establishment) {
    setState({ incidentDraft: draft, incidentError: "Selecciona un RBD válido para la zona." });
    return;
  }
  if (!draft.title || !draft.description) {
    setState({ incidentDraft: draft, incidentError: "Completa título y detalle de la incidencia." });
    return;
  }

  setState({ incidentDraft: draft, incidentError: "", incidentSubmitting: true });

  let remoteId = "";
  let remoteSaved = false;
  if (hasSupabaseConfig() && state.supabaseSession?.access_token && isNetworkOnline()) {
    try {
      const branchId = catalogIdByName("branches", draft.branch);
      const incidentPayload = {
        branch_id: branchId,
        rbd: establishment.rbd,
        reported_by: state.supabaseSession.user.id,
        title: draft.title,
        description: draft.description,
        photos: draft.photos,
        severity: draft.severity,
        incident_type: draft.type,
        status: "En revisión"
      };
      let insertedRows;
      if (hasSqlServerApiConfig()) {
        const inserted = await apiRequest("/api/incidents", {
          method: "POST",
          headers: { Authorization: `Bearer ${state.supabaseSession.access_token}` },
          body: JSON.stringify(incidentPayload)
        });
        insertedRows = [inserted];
      } else try {
        insertedRows = await supabaseRequest("/rest/v1/maintenance_incidents?select=id", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${state.supabaseSession.access_token}`,
            Prefer: "return=representation"
          },
          body: JSON.stringify(incidentPayload)
        });
      } catch (error) {
        const { incident_type: ignoredIncidentType, ...legacyPayload } = incidentPayload;
        insertedRows = await supabaseRequest("/rest/v1/maintenance_incidents?select=id", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${state.supabaseSession.access_token}`,
          Prefer: "return=representation"
        },
          body: JSON.stringify(legacyPayload)
        });
      }
      remoteId = insertedRows[0]?.id ?? "";
      remoteSaved = Boolean(remoteId);
    } catch (error) {
      console.warn("La incidencia quedó local, pero no se pudo guardar en Supabase.", error);
    }
  }

  const incident = {
    id: remoteId || `incident-${Date.now()}`,
    branch: draft.branch,
    rbd: establishment.rbd,
    establishment: establishment.name,
    commune: establishment.comuna,
    severity: draft.severity,
    type: draft.type,
    title: draft.title,
    description: draft.description,
    photos: draft.photos,
    status: "En revisión",
    createdBy: actor.usuario,
    createdByName: actor.nombre,
    createdAt: new Date().toISOString(),
    createdLabel: todayDateLabel(),
    source: remoteSaved ? (hasSqlServerApiConfig() ? "sqlserver" : "supabase") : "local"
  };

  state.incidents = [incident, ...state.incidents];
  persistIncidents();
  setState({
    incidentDraft: emptyIncidentDraft(actor),
    incidentStep: 1,
    lastIncident: incident,
    incidentError: "",
    incidentSubmitting: false,
    route: "incident-success"
  });
  showSuccessToast(remoteSaved ? "incidencia enviada" : "incidencia guardada localmente", remoteSaved ? "El jefe de mantención de la zona podrá crear una visita Mutualidad." : "Aplica la migración Supabase para que llegue a otros dispositivos.");
  if (remoteSaved) refreshSupabaseIncidents({ silent: true });
}

function createTaskFromIncident(incidentId) {
  const actor = loggedUser();
  const incident = state.incidents.find((item) => item.id === incidentId);
  if (!incident || !canAssignTasks(actor) || !canSeeNotifications(actor) || !userHasBranch(actor, incident.branch)) return;

  const technician = assignableTechnicians(actor, incident.branch)[0] ?? null;
  setState({
    selectedIncidentId: incident.id,
    assignBranch: incident.branch,
    assignTechnician: technician?.usuario ?? "",
    assignType: "Mutualidad",
    assignPriority: incident.severity || "Alta",
    assignDueAt: "",
    assignDescription: `[Incidencia prevención] ${incident.title}\n\n${incident.description}\n\nReportado por: ${incident.createdByName}`,
    assignEditingTaskId: "",
    assignConflictTaskId: "",
    assignConflictDraft: null,
    assignSelectedRbd: incident.rbd,
    assignRbdSearch: establishmentLabel(establishments.find((item) => item.rbd === incident.rbd)),
    assignRequiredSections: [],
    assignCriticalSections: [],
    assignSectionMinimums: {},
    actionMessage: "",
    route: "admin-assign"
  });
}

async function assignTask() {
  const actor = loggedUser();
  if (!canAssignTasks(actor)) return;

  const form = rootEl.querySelector('[data-role="assign-task-form"]');
  const formData = new FormData(form);
  const selectedBranch = String(formData.get("branch") ?? state.assignBranch ?? "").trim();
  const technicianEmail = String(formData.get("technician") ?? "");
  const technician = users.find((user) => user.usuario === technicianEmail);
  const type = String(formData.get("type") ?? state.assignType ?? "").trim();
  const priority = String(formData.get("priority") ?? state.assignPriority ?? "").trim();
  const selectedRbd = String(formData.get("establishmentRbd") ?? "").trim();
  const selectedEstablishment = establishments.find((item) => item.rbd === selectedRbd);
  const dueDateIso = String(formData.get("dueAt") ?? "") || state.assignDueAt;
  if (!selectedRbd) {
    const message = "Selecciona primero el establecimiento/RBD.";
    setState({ ...currentAssignFormState(), actionMessage: message });
    showErrorToast("RBD requerido", message);
    return;
  }
  if (!technician) {
    const message = "Selecciona el técnico para esta visita.";
    setState({ ...currentAssignFormState(), actionMessage: message });
    showErrorToast("Técnico requerido", message);
    return;
  }
  if (!type) {
    const message = "Selecciona el tipo de visita.";
    setState({ ...currentAssignFormState(), actionMessage: message });
    showErrorToast("Tipo requerido", message);
    return;
  }
  if (!priority) {
    const message = "Selecciona la prioridad de la visita.";
    setState({ ...currentAssignFormState(), actionMessage: message });
    showErrorToast("Prioridad requerida", message);
    return;
  }
  if (!dueDateIso) {
    const message = "Selecciona la fecha planificada de la visita.";
    setState({ ...currentAssignFormState(), actionMessage: message });
    showErrorToast("Fecha requerida", message);
    return;
  }
  if (dueDateIso < localDateKey()) {
    const message = "No puedes asignar tareas en fechas anteriores a hoy.";
    setState({ ...currentAssignFormState(), actionMessage: message });
    showErrorToast("Fecha inválida", message);
    return;
  }
  const dueAt = formatDateLabel(dueDateIso);
  const blueprintKey = blueprintKeyForTaskType(type) || "maintenance_plan";
  const requiredSections = formData.getAll("requiredSections").map(String);
  const criticalSections = formData.getAll("criticalSections").map(String);
  const sectionMinimums = {};
  formSectionDefinitions.forEach((section) => {
    const value = Number(formData.get(`sectionMinimum:${section.id}`));
    const isRequired = section.baseRequired || requiredSections.includes(section.id);
    if (!section.minimum && isRequired && Number.isFinite(value) && value > 0) sectionMinimums[section.id] = Math.trunc(value);
  });

  if (!selectedEstablishment) {
    setState({ ...currentAssignFormState(), actionMessage: "Selecciona un establecimiento/RBD disponible para tu zona." });
    return;
  }

  if (isCasaMatrizEstablishment(selectedEstablishment)) {
    const message = "Casa Matriz no está disponible para asignación de visitas.";
    setState({ ...currentAssignFormState(), assignSelectedRbd: "", assignRbdSearch: "", actionMessage: message });
    showErrorToast("RBD no disponible", message);
    return;
  }

  if (!selectedBranch || !userHasBranch(actor, selectedBranch)) {
    setState({ ...currentAssignFormState(), actionMessage: "Selecciona una zona válida para tu perfil." });
    return;
  }

  if (!userHasBranch(actor, technician.sucursal)) {
    setState({ actionMessage: `Solo puedes asignar tareas a técnicos de ${branchScopeLabel(actor)}.` });
    return;
  }

  if (selectedEstablishment.branch !== selectedBranch) {
    setState({ ...currentAssignFormState(), actionMessage: `El RBD ${selectedEstablishment.rbd} pertenece a ${selectedEstablishment.branch}, no a ${selectedBranch}.` });
    return;
  }

  if (technician.sucursal !== selectedBranch) {
    setState({ ...currentAssignFormState(), actionMessage: `El técnico seleccionado pertenece a ${technician.sucursal}, no a ${selectedBranch}.` });
    return;
  }

  if (selectedEstablishment.branch !== technician.sucursal) {
    setState({ actionMessage: `El RBD ${selectedEstablishment.rbd} pertenece a ${selectedEstablishment.branch}, no a ${technician.sucursal}.` });
    return;
  }

  let editingTask = state.assignEditingTaskId
    ? tasks.find((item) => item.id === state.assignEditingTaskId)
    : null;

  if (!editingTask) {
    const conflict = openScheduledTaskForRbd(selectedEstablishment.rbd);
    if (conflict) {
      editingTask = conflict;
    }
  }

  const existingRequiredSections = Array.isArray(editingTask?.form?.requiredSections) ? editingTask.form.requiredSections : [];
  const existingCriticalSections = Array.isArray(editingTask?.form?.criticalSections) ? editingTask.form.criticalSections : [];
  const existingSectionMinimums = editingTask?.form?.sectionMinimums || {};
  const effectiveRequiredSections = editingTask
    ? Array.from(new Set([...existingRequiredSections, ...requiredSections]))
    : requiredSections;
  const effectiveCriticalSections = editingTask
    ? Array.from(new Set([...existingCriticalSections, ...criticalSections]))
    : criticalSections;
  const effectiveSectionMinimums = editingTask
    ? { ...existingSectionMinimums, ...sectionMinimums }
    : sectionMinimums;
  const incomingDescription = state.assignDescription.trim() || String(formData.get("description") ?? "").trim() || "Tarea asignada por administrador.";
  const effectiveDescription = editingTask
    ? combinedAssignmentDescription(editingTask.description, incomingDescription)
    : incomingDescription;

  const newTask = {
    id: `task-${Date.now()}`,
    type,
    rbd: selectedEstablishment.rbd,
    establishment: selectedEstablishment.name,
    establishmentMeta: {
      comuna: selectedEstablishment.comuna,
      tipoInstitucion: selectedEstablishment.institutionType,
      direccion: selectedEstablishment.address,
      sucursal: selectedEstablishment.branch
    },
    description: effectiveDescription,
    assignedBy: loggedUser().nombre,
    assignedTo: technician.usuario,
    assignedAt: todayDateLabel(),
    dueAt,
    dueDateIso,
    status: priority === "Alta" ? "Urgente" : "Pendiente",
    priority,
    syncStatus: "synced",
    form: {
      blueprintKey,
      requiredSections: effectiveRequiredSections,
      criticalSections: effectiveCriticalSections,
      sectionMinimums: effectiveSectionMinimums
    }
  };

  if (hasSupabaseConfig() && !state.supabaseSession?.access_token) {
    showErrorToast(`Sesión ${hasSqlServerApiConfig() ? "SQL Server" : "Supabase"} requerida`, "Cierra sesión e ingresa nuevamente antes de asignar tareas.");
    return;
  }

  if (hasSupabaseConfig()) {
    try {
      if (editingTask) {
        newTask.id = editingTask.id;
        newTask.supabaseId = editingTask.supabaseId || editingTask.id;

        await updateRemoteScheduledTask(newTask, technician, {
          requiredSections: effectiveRequiredSections,
          criticalSections: effectiveCriticalSections,
          sectionMinimums: effectiveSectionMinimums
        });
      } else {
        const supabaseId = await createSupabaseTaskFromAssignment(newTask, technician, selectedEstablishment, {
          requiredSections: effectiveRequiredSections,
          criticalSections: effectiveCriticalSections,
          sectionMinimums: effectiveSectionMinimums
        });
        newTask.id = supabaseId;
        newTask.supabaseId = supabaseId;
      }
    } catch (error) {
      showErrorToast(
        editingTask
          ? "No se pudo actualizar la visita"
          : `No se pudo crear la tarea en ${hasSqlServerApiConfig() ? "SQL Server" : "Supabase"}`,
        error.message
      );
      return;
    }
  }

  if (editingTask) {
    const taskIndex = tasks.findIndex((item) => item.id === editingTask.id);
    if (taskIndex >= 0) {
      tasks[taskIndex] = {
        ...editingTask,
        ...newTask,
        id: editingTask.id,
        supabaseId: editingTask.supabaseId || newTask.supabaseId
      };
    }
  } else {
    tasks.unshift(newTask);
  }
  if (state.selectedIncidentId) {
    state.incidents = state.incidents.map((incident) => incident.id === state.selectedIncidentId
      ? { ...incident, status: "Planificada", taskId: newTask.id, plannedTask: newTask }
      : incident);
    persistIncidents();
  }

  setState({
    actionMessage: "",
    selectedIncidentId: "",
    assignRbdSearch: "",
    assignSelectedRbd: "",
    assignTechnician: "",
    assignType: "",
    assignPriority: "",
    assignDueAt: "",
    assignDescription: "",
    assignRequiredSections: [],
    assignCriticalSections: [],
    assignSectionMinimums: {},
    assignEditingTaskId: "",
    assignConflictTaskId: "",
    assignConflictDraft: null,
    route: defaultRouteFor(actor)
  });

  showSuccessToast(
    editingTask ? "visita actualizada correctamente" : "tarea asignada correctamente",
    editingTask
      ? `La visita del RBD ${selectedEstablishment.rbd} fue consolidada y actualizada.`
      : `Asignada a ${technician.nombre}.`
  );
}

function updateUserStatus(userId, estado, motivoEstado) {
  const actor = loggedUser();
  const user = users.find((item) => item.id === userId);
  if (!actor.permisos.gestionarUsuarios || !user) return;

  user.estado = estado;
  user.motivoEstado = motivoEstado;
  render();
}

async function saveUserDetails(userId) {
  const actor = loggedUser();
  const user = users.find((item) => item.id === userId);
  const form = rootEl.querySelector(`[data-role="edit-user-${userId}"]`);
  if (!actor.permisos.gestionarUsuarios || !user || !form) return;

  const formData = new FormData(form);
  const nextEmail = String(formData.get("usuario") ?? "").trim().toLowerCase();
  const rut = formatRut(String(formData.get("rut") ?? user.rut ?? "").trim());
  const cargo = String(formData.get("cargo") ?? "");
  const sucursales = normalizeSelectedBranches(formData.getAll("sucursales"), userBranches(user));
  const sucursal = sucursales[0] ?? user.sucursal;
  const previousEmail = user.usuario;
  const emailTaken = users.some((item) => item.id !== userId && item.usuario.toLowerCase() === nextEmail);

  if (!nextEmail || emailTaken) {
    setState({ actionMessage: "Correo inválido o ya registrado." });
    return;
  }

  if (!rut || !isValidRut(rut)) {
    setState({ actionMessage: rutValidationMessage(rut) || "Ingresa el RUT válido del usuario." });
    return;
  }

  if (!allowedRoles.includes(cargo) && !state.supabaseCatalogs.roles.some((role) => role.name === cargo)) {
    setState({ actionMessage: "Selecciona un cargo válido." });
    return;
  }

  if (!sucursal) {
    setState({ actionMessage: "Selecciona al menos una sucursal." });
    return;
  }

  const nextUser = {
    nombre: String(formData.get("nombre") ?? "").trim() || user.nombre,
    usuario: nextEmail,
    rut,
    sucursal,
    sucursales,
    grupo: String(formData.get("grupo") ?? "").trim() || "Sin grupo",
    cargo,
    permisos: {
      ...user.permisos,
      ...permissionsForRole(cargo),
      gestionarUsuarios: formData.get("gestionarUsuarios") === "on"
    }
  };

  if (hasSupabaseConfig() && state.supabaseSession?.access_token && user.id) {
    const branchIds = branchIdsByNames(sucursales);
    const branchId = branchIds[0] ?? "";
    const groupId = catalogIdByName("groups", nextUser.grupo);
    const roleId = catalogIdByName("roles", cargo);

    if (!branchId || branchIds.length !== sucursales.length || !groupId || !roleId) {
      setState({ actionMessage: "No se encontraron los IDs de sucursal, grupo o cargo en Supabase." });
      return;
    }

    try {
      if (hasSqlServerApiConfig()) {
        await apiRequest(`/api/users/${encodeURIComponent(user.id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            fullName: nextUser.nombre,
            email: nextUser.usuario,
            rut: nextUser.rut,
            branchId,
            branchIds,
            groupId,
            roleId
          })
        });
      } else {
        await supabaseRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            full_name: nextUser.nombre,
            rut: nextUser.rut,
            branch_id: branchId,
            group_id: groupId,
            role_id: roleId
          })
        });

        await supabaseRequest(`/rest/v1/profile_branches?profile_id=eq.${encodeURIComponent(user.id)}`, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" }
        });

        await supabaseRequest("/rest/v1/profile_branches", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify(branchIds.map((branch) => ({ profile_id: user.id, branch_id: branch })))
        });
      }
    } catch (error) {
      setState({ actionMessage: `${hasSqlServerApiConfig() ? "SQL Server" : "Supabase"}: ${error.message}` });
      return;
    }
  }

  Object.assign(user, nextUser);

  if (!state.groups.includes(user.grupo)) state.groups.push(user.grupo);
  tasks.forEach((task) => {
    if (task.assignedTo === previousEmail) task.assignedTo = nextEmail;
  });

  setState({
    expandedUserId: "",
    actionMessage: ""
  });
  showSuccessToast("usuario actualizado correctamente", "Los cambios quedaron guardados en el panel de usuarios.");
}

async function resetUserPassword(userId) {
  const actor = loggedUser();
  const user = users.find((item) => item.id === userId);
  if (!actor?.permisos?.gestionarUsuarios || !user || actor.id === user.id || state.passwordResetBusyUserId) return;

  if (hasSupabaseConfig() && !state.supabaseSession?.access_token) {
    showErrorToast(`Sesión ${remoteBackendLabel()} requerida`, "Cierra sesión e ingresa nuevamente antes de generar una contraseña temporal.");
    return;
  }

  try {
    setState({ passwordResetBusyUserId: user.id, actionMessage: "" });
    let temporaryPassword = "";

    if (hasSupabaseConfig()) {
      const functionName = supabaseConfig.resetUserPasswordFunctionName || "reset-user-password";
      const response = hasSqlServerApiConfig()
        ? await apiRequest("/functions/reset-user-password", {
          method: "POST",
          body: JSON.stringify({
            email: user.usuario,
            requirePasswordChange: true
          })
        })
        : await supabaseRequest(`/functions/v1/${functionName}`, {
          method: "POST",
          body: JSON.stringify({
            email: user.usuario,
            requirePasswordChange: true
          })
        });
      temporaryPassword = response.temporaryPassword;
    } else {
      temporaryPassword = generateTemporaryPassword();
    }

    user.password = temporaryPassword;
    user.requirePasswordChange = true;
    setState({
      passwordResetBusyUserId: "",
      generatedPassword: temporaryPassword,
      generatedPasswords: [
        { email: user.usuario, password: temporaryPassword },
        ...state.generatedPasswords.filter((item) => item.email.toLowerCase() !== user.usuario.toLowerCase())
      ],
      actionMessage: ""
    });
    showSuccessToast("contraseña temporal generada", `${user.nombre} deberá cambiarla al iniciar sesión.`);
  } catch (error) {
    setState({ passwordResetBusyUserId: "" });
    showErrorToast("no se pudo generar contraseña", error.message);
  }
}

async function deleteUser(userId) {
  const actor = loggedUser();
  const user = users.find((item) => item.id === userId);
  if (!actor.permisos.gestionarUsuarios || !user) return;

  if (actor.id === user.id) {
    showErrorToast("no se puede eliminar", "No puedes eliminar tu propio usuario administrador.");
    return;
  }

  const confirmed = window.confirm(`¿Eliminar definitivamente a ${user.nombre}? Esta acción no se puede deshacer.`);
  if (!confirmed) return;

  if (hasSupabaseConfig() && state.supabaseSession?.access_token) {
    try {
      const functionName = supabaseConfig.deleteUserFunctionName || "delete-user";
      if (hasSqlServerApiConfig()) {
        await apiRequest("/functions/delete-user", {
          method: "POST",
          body: JSON.stringify({ userId: user.id })
        });
      } else {
        await supabaseRequest(`/functions/v1/${functionName}`, {
          method: "POST",
          body: JSON.stringify({ userId: user.id })
        });
      }
    } catch (error) {
      showErrorToast("no se pudo eliminar el usuario", error.message);
      return;
    }
  }

  const nextUsers = users.filter((item) => item.id !== userId);
  users.splice(0, users.length, ...nextUsers);

  setState({
    expandedUserId: "",
    actionMessage: ""
  });
  showSuccessToast("usuario eliminado correctamente", `${user.nombre} fue retirado del panel de usuarios.`);
}

function isHeatDraftComplete(draft = currentHeatDraftFromForm()) {
  const quantity = Number(draft.quantity);
  const missingOtherSite = draft.site === "Otro" && !draft.otherSite.trim();
  const requiresSecSeal = draft.element && draft.element !== "Caseta De Gas";
  const isFlexible = draft.element === "Flexibles, filtraciones y conexiones de gas";
  const missingFlexibleExpiration = isFlexible && (!draft.flexibleHasExpiration || (draft.flexibleHasExpiration === "Sí" && !draft.flexibleExpirationDate));

  return Boolean(
    draft.element &&
    draft.site &&
    !missingOtherSite &&
    (!requiresSecSeal || draft.hasSecSeal) &&
    !missingFlexibleExpiration &&
    (!isFlexible || draft.flexibleHasQr) &&
    Number.isFinite(quantity) &&
    quantity >= 1 &&
    draft.action &&
    draft.observation.trim() &&
    draft.evidenceName
  );
}

function isElectricityDraftComplete(draft = currentElectricityDraftFromForm()) {
  const quantity = Number(draft.quantity);
  const missingOtherSite = draft.site === "Otro" && !draft.otherSite.trim();
  const isDistributionBox = draft.element === "Cajas de Distribución";
  const missingDistributionBox = isDistributionBox && (
    !draft.distributionBoxType ||
    !draft.distributionBoxLocation ||
    (draft.distributionBoxLocation === "En otro espacio en el RBD" && !draft.distributionBoxOtherLocation.trim())
  );
  const isLighting = draft.element === "Luminarias y protecciones";

  return Boolean(
    draft.element &&
    draft.site &&
    !missingOtherSite &&
    !missingDistributionBox &&
    (!isLighting || draft.sealedProtection) &&
    Number.isFinite(quantity) &&
    quantity >= 1 &&
    draft.action &&
    draft.observation.trim() &&
    draft.evidenceName
  );
}

function isSimpleRecordDraftComplete(draft) {
  const quantity = Number(draft.quantity);
  const missingOtherSite = draft.site === "Otro" && !draft.otherSite?.trim();
  return Boolean(
    draft.element &&
    draft.site &&
    !missingOtherSite &&
    Number.isFinite(quantity) &&
    quantity >= 1 &&
    draft.action &&
    draft.observation.trim() &&
    draft.evidenceName
  );
}

function hasSimpleRecordDraftInput(draft) {
  return Boolean(
    draft.element ||
    draft.site ||
    (draft.quantity && draft.quantity !== "1") ||
    draft.action ||
    draft.articleId ||
    draft.articleName ||
    installedArticlesForDraft(draft).length ||
    draft.observation?.trim() ||
    draft.evidenceName
  );
}

function hasRecordDraftInput(draft) {
  return hasSimpleRecordDraftInput(draft)
    || Boolean(
      draft.hasSecSeal ||
      draft.flexibleHasExpiration ||
      draft.flexibleExpirationDate ||
      draft.flexibleHasQr ||
      draft.distributionBoxType ||
      draft.distributionBoxLocation ||
      draft.distributionBoxOtherLocation ||
      draft.sealedProtection ||
      draft.achsSignage ||
      draft.extinguisherExpirationDate ||
      draft.extinguisherExpired
    );
}

function isInfrastructureDraftComplete(draft = currentInfrastructureDraftFromForm()) {
  const normalizedDraft = sanitizedInfrastructureDraft(draft);
  if (!isSimpleRecordDraftComplete(normalizedDraft) || !normalizedDraft.achsSignage) return false;
  if (isExtinguisherElement(normalizedDraft.element) && !normalizedDraft.extinguisherExpirationDate) return false;
  return true;
}

function normalizeRecordKeyPart(value) {
  return normalizeSearch(value ?? "").trim().replace(/\s+/g, " ");
}

function recordSiteValue(record) {
  return record.site === "Otro" ? record.otherSite : record.site;
}

function recordIdentityKey(record) {
  return [
    normalizeRecordKeyPart(record.element),
    normalizeRecordKeyPart(recordSiteValue(record)),
    normalizeRecordKeyPart(record.action)
  ].join("|");
}

function duplicateRecordExists(records, draft, editingIndex) {
  const draftKey = recordIdentityKey(draft);
  return records.some((record, index) => index !== editingIndex && recordIdentityKey(record) === draftKey);
}

function validationResult(message, roles) {
  return { valid: false, message, roles: Array.isArray(roles) ? roles : [roles].filter(Boolean) };
}

function validRecordResult() {
  return { valid: true, message: "", roles: [] };
}

function validateBaseRecordDraft(draft, config) {
  const quantity = Number(draft.quantity);
  const prefix = config.prefix;
  const names = config.names;

  if (!draft.element) return validationResult(`Falta responder: ${names.element}.`, `${prefix}-element`);
  if (!draft.site) return validationResult(`Falta responder: ${names.site}.`, `${prefix}-site`);
  if (draft.site === "Otro" && !draft.otherSite?.trim()) return validationResult(`Falta responder: ${names.otherSite}.`, `${prefix}-other-site`);
  if (!Number.isFinite(quantity) || quantity < 1) return validationResult(`Falta responder: ${names.quantity}.`, `${prefix}-quantity`);
  if (!draft.action) return validationResult(`Falta responder: ${names.action}.`, `${prefix}-action`);
  if (!draft.observation?.trim()) return validationResult(`Falta responder: ${names.observation}.`, `${prefix}-observation`);
  if (!hasEvidencePhotos(draft)) return validationResult(`Falta responder: ${names.evidence}.`, `${prefix}-evidence`);

  return validRecordResult();
}

function validateRecordDuplicate(draft, records, editingIndex, prefix) {
  if (!duplicateRecordExists(records, draft, editingIndex)) return validRecordResult();
  return validationResult(
    "Ya existe un elemento registrado con el mismo elemento, sitio y acción. Cambia la acción o edita el registro existente.",
    [`${prefix}-element`, `${prefix}-site`, `${prefix}-action`]
  );
}

function validateHeatRecordDraft(draft, records = heatRecordsForTask(), editingIndex = state.editingHeatIndex) {
  const base = validateBaseRecordDraft(draft, {
    prefix: "heat",
    names: {
      element: "Elemento",
      site: "Sitio",
      otherSite: "Otro sitio",
      quantity: "Cantidad",
      action: "Acción",
      observation: "Observación",
      evidence: "Fotografía de evidencia"
    }
  });
  if (!base.valid) return base;

  const requiresSecSeal = draft.element && draft.element !== "Caseta De Gas";
  const isFlexible = draft.element === "Flexibles, filtraciones y conexiones de gas";
  if (requiresSecSeal && !draft.hasSecSeal) return validationResult("Falta responder: ¿Cuenta con sello SEC?", "heat-sec-seal");
  if (isFlexible && !draft.flexibleHasExpiration) return validationResult("Falta responder: ¿Flexible cuenta con fecha de vencimiento?", "heat-flexible-expiration");
  if (isFlexible && draft.flexibleHasExpiration === "Sí" && !draft.flexibleExpirationDate) return validationResult("Falta responder: Indique fecha de vencimiento.", "heat-flexible-expiration-date");
  if (isFlexible && !draft.flexibleHasQr) return validationResult("Falta responder: ¿Poseen QR?", "heat-flexible-qr");

  return validateRecordDuplicate(draft, records, editingIndex, "heat");
}

function validateElectricityRecordDraft(draft, records = electricityRecordsForTask(), editingIndex = state.editingElectricityIndex) {
  const base = validateBaseRecordDraft(draft, {
    prefix: "electricity",
    names: {
      element: "Elemento",
      site: "Sitio",
      otherSite: "Otro sitio",
      quantity: "Cantidad",
      action: "Acción",
      observation: "Observación",
      evidence: "Fotografía de evidencia"
    }
  });
  if (!base.valid) return base;

  if (draft.element === "Cajas de Distribución") {
    if (!draft.distributionBoxType) return validationResult("Falta responder: Indique tipo de caja de distribución.", "distribution-box-type");
    if (!draft.distributionBoxLocation) return validationResult("Falta responder: Indique dónde se encuentra establecido.", "distribution-box-location");
    if (draft.distributionBoxLocation === "En otro espacio en el RBD" && !draft.distributionBoxOtherLocation?.trim()) {
      return validationResult("Falta responder: Otro espacio en el RBD.", "distribution-box-other-location");
    }
  }
  if (draft.element === "Luminarias y protecciones" && !draft.sealedProtection) {
    return validationResult("Falta responder: ¿Cuentan con protección o grupo estanco?", "sealed-protection");
  }

  return validateRecordDuplicate(draft, records, editingIndex, "electricity");
}

function validateSimpleRecordDraft(draft, section) {
  const config = {
    cold: { prefix: "cold", records: coldRecordsForTask(), editingIndex: state.editingColdIndex },
    vectors: { prefix: "vectors", records: vectorsRecordsForTask(), editingIndex: state.editingVectorsIndex },
    water: { prefix: "water", records: waterRecordsForTask(), editingIndex: state.editingWaterIndex },
    infrastructure: { prefix: "infrastructure", records: infrastructureRecordsForTask(), editingIndex: state.editingInfrastructureIndex }
  }[section];
  const base = validateBaseRecordDraft(draft, {
    prefix: config.prefix,
    names: {
      element: "Elemento",
      site: "Sitio",
      otherSite: "Otro sitio",
      quantity: "Cantidad",
      action: "Acción",
      observation: "Observación",
      evidence: "Fotografía de evidencia"
    }
  });
  if (!base.valid) return base;
  if (section === "infrastructure" && !draft.achsSignage) {
    return validationResult("Falta responder: Señalética ACHS.", "infrastructure-achs-signage");
  }
  if (
    section === "infrastructure"
    && isExtinguisherElement(draft.element)
    && !normalizeIsoDate(draft.extinguisherExpirationDate)
  ) {
    return validationResult(
      "Falta responder: Fecha vencimiento extintor.",
      "infrastructure-extinguisher-expiration-date"
    );
  }
  return validateRecordDuplicate(draft, config.records, config.editingIndex, config.prefix);
}

function autoRegisterCompleteRecordDraft(section) {
  if (section === "heat" && isHeatDraftComplete()) return registerHeatElement();
  if (section === "electricity" && isElectricityDraftComplete()) return registerElectricityElement();
  if (section === "cold" && isSimpleRecordDraftComplete(currentColdDraftFromForm())) return registerColdElement();
  if (section === "vectors" && isSimpleRecordDraftComplete(currentVectorsDraftFromForm())) {
    return registerVectorsElement({ showToast: false });
  }
  if (section === "water" && isSimpleRecordDraftComplete(currentWaterDraftFromForm())) return registerWaterElement();
  if (section === "infrastructure" && isInfrastructureDraftComplete()) return registerInfrastructureElement();
  return false;
}

function consolidateCompleteRecordDraftsBeforeSubmit() {
  commitCompleteInfrastructureDraftSilently();
}

function commitCompleteInfrastructureDraftSilently() {
  const draft = sanitizedInfrastructureDraft(currentInfrastructureDraftFromForm());
  if (!hasRecordDraftInput(draft) || !isInfrastructureDraftComplete(draft)) return false;

  const validation = validateSimpleRecordDraft(draft, "infrastructure");
  if (!validation.valid) return false;

  const quantity = Number(draft.quantity);
  const record = {
    ...draftWithSelectedInstalledArticle(draft),
    quantity: String(Math.trunc(quantity)),
    observation: draft.observation.trim(),
    otherSite: draft.otherSite.trim()
  };
  const taskId = state.selectedTaskId;
  const currentRecords = infrastructureRecordsForTask(taskId);
  const nextRecords = [...currentRecords];
  const wasEditing = state.editingInfrastructureIndex >= 0;

  if (wasEditing) {
    nextRecords[state.editingInfrastructureIndex] = record;
  } else if (!duplicateRecordExists(nextRecords, record, -1)) {
    nextRecords.push(record);
  } else {
    return false;
  }

  Object.assign(state, {
    infrastructureRecordsByTask: {
      ...state.infrastructureRecordsByTask,
      [taskId]: nextRecords
    },
    infrastructureDraft: emptyInfrastructureDraft(),
    editingInfrastructureIndex: -1,
    infrastructureError: "",
    infrastructurePrefillNotice: "",
    fieldErrorRoles: []
  });
  persistCurrentTaskProgress();
  return true;
}

function registerHeatElement() {
  const draft = currentHeatDraftFromForm();
  const quantity = Number(draft.quantity);
  const validation = validateHeatRecordDraft(draft);

  if (!validation.valid) {
    setState({
      heatDraft: draft,
      heatError: validation.message,
      fieldErrorRoles: validation.roles
    });
    return false;
  }

  const record = {
    ...draftWithSelectedInstalledArticle(draft),
    quantity: String(Math.trunc(quantity)),
    observation: draft.observation.trim(),
    otherSite: draft.otherSite.trim()
  };
  const taskId = state.selectedTaskId;
  const currentRecords = heatRecordsForTask(taskId);
  const nextRecords = [...currentRecords];
  const wasEditing = state.editingHeatIndex >= 0;

  if (wasEditing) {
    nextRecords[state.editingHeatIndex] = record;
  } else {
    nextRecords.push(record);
  }

  setState({
    heatRecordsByTask: {
      ...state.heatRecordsByTask,
      [taskId]: nextRecords
    },
    heatDraft: emptyHeatDraft(),
    editingHeatIndex: -1,
    heatError: "",
    fieldErrorRoles: []
  });
  persistCurrentTaskProgress();
  showSuccessToast(
    wasEditing ? "elemento actualizado correctamente" : "elemento registrado correctamente",
    "Puedes ingresar otro elemento de calor o avanzar a Electricidad."
  );
  return true;
}

function updateSectionDraft(draftKey, errorKey, nextDraft, options = {}) {
  const nextState = {
    [draftKey]: { ...state[draftKey], ...nextDraft },
    [errorKey]: "",
    fieldErrorRoles: []
  };
  if (options.render === false) {
    Object.assign(state, nextState);
    persistDailyAuthState();
    return;
  }
  setState(nextState);
}

function updateHeatDraft(nextDraft, options = {}) {
  updateSectionDraft("heatDraft", "heatError", nextDraft, options);
}

function registerElectricityElement() {
  const draft = currentElectricityDraftFromForm();
  const quantity = Number(draft.quantity);
  const validation = validateElectricityRecordDraft(draft);

  if (!validation.valid) {
    setState({
      electricityDraft: draft,
      electricityError: validation.message,
      fieldErrorRoles: validation.roles
    });
    return false;
  }

  const record = {
    ...draftWithSelectedInstalledArticle(draft),
    quantity: String(Math.trunc(quantity)),
    observation: draft.observation.trim(),
    otherSite: draft.otherSite.trim(),
    distributionBoxOtherLocation: draft.distributionBoxOtherLocation.trim()
  };
  const taskId = state.selectedTaskId;
  const currentRecords = electricityRecordsForTask(taskId);
  const nextRecords = [...currentRecords];
  const wasEditing = state.editingElectricityIndex >= 0;

  if (wasEditing) {
    nextRecords[state.editingElectricityIndex] = record;
  } else {
    nextRecords.push(record);
  }

  setState({
    electricityRecordsByTask: {
      ...state.electricityRecordsByTask,
      [taskId]: nextRecords
    },
    electricityDraft: emptyElectricityDraft(),
    editingElectricityIndex: -1,
    electricityError: "",
    fieldErrorRoles: []
  });
  persistCurrentTaskProgress();
  showSuccessToast(
    wasEditing ? "elemento actualizado correctamente" : "elemento registrado correctamente",
    "Puedes ingresar otro elemento eléctrico o finalizar Electricidad."
  );
  return true;
}

function updateElectricityDraft(nextDraft, options = {}) {
  updateSectionDraft("electricityDraft", "electricityError", nextDraft, options);
}

function registerColdElement() {
  const draft = currentColdDraftFromForm();
  const quantity = Number(draft.quantity);
  const validation = validateSimpleRecordDraft(draft, "cold");

  if (!validation.valid) {
    setState({
      coldDraft: draft,
      coldError: validation.message,
      fieldErrorRoles: validation.roles
    });
    return false;
  }

  const record = {
    ...draftWithSelectedInstalledArticle(draft),
    quantity: String(Math.trunc(quantity)),
    observation: draft.observation.trim(),
    otherSite: draft.otherSite.trim()
  };
  const taskId = state.selectedTaskId;
  const currentRecords = coldRecordsForTask(taskId);
  const nextRecords = [...currentRecords];
  const wasEditing = state.editingColdIndex >= 0;

  if (wasEditing) {
    nextRecords[state.editingColdIndex] = record;
  } else {
    nextRecords.push(record);
  }

  setState({
    coldRecordsByTask: {
      ...state.coldRecordsByTask,
      [taskId]: nextRecords
    },
    coldDraft: emptyColdDraft(),
    editingColdIndex: -1,
    coldError: "",
    fieldErrorRoles: []
  });
  persistCurrentTaskProgress();
  showSuccessToast(
    wasEditing ? "elemento actualizado correctamente" : "elemento registrado correctamente",
    "Puedes ingresar otro equipo de frío o avanzar a la siguiente sección."
  );
  return true;
}

function updateColdDraft(nextDraft, options = {}) {
  updateSectionDraft("coldDraft", "coldError", nextDraft, options);
}

function registerWaterElement() {
  const draft = currentWaterDraftFromForm();
  const quantity = Number(draft.quantity);
  const validation = validateSimpleRecordDraft(draft, "water");

  if (!validation.valid) {
    setState({
      waterDraft: draft,
      waterError: validation.message,
      fieldErrorRoles: validation.roles
    });
    return false;
  }

  const record = {
    ...draftWithSelectedInstalledArticle(draft),
    quantity: String(Math.trunc(quantity)),
    observation: draft.observation.trim(),
    otherSite: draft.otherSite.trim()
  };
  const taskId = state.selectedTaskId;
  const currentRecords = waterRecordsForTask(taskId);
  const nextRecords = [...currentRecords];
  const wasEditing = state.editingWaterIndex >= 0;

  if (wasEditing) {
    nextRecords[state.editingWaterIndex] = record;
  } else {
    nextRecords.push(record);
  }

  setState({
    waterRecordsByTask: {
      ...state.waterRecordsByTask,
      [taskId]: nextRecords
    },
    waterDraft: emptyWaterDraft(),
    editingWaterIndex: -1,
    waterError: "",
    fieldErrorRoles: []
  });
  persistCurrentTaskProgress();
  showSuccessToast(
    wasEditing ? "elemento actualizado correctamente" : "elemento registrado correctamente",
    "Puedes ingresar otro elemento de agua o avanzar a la siguiente sección."
  );
  return true;
}

function updateWaterDraft(nextDraft, options = {}) {
  updateSectionDraft("waterDraft", "waterError", nextDraft, options);
}

function registerInfrastructureElement() {
  const draft = sanitizedInfrastructureDraft(currentInfrastructureDraftFromForm());
  const quantity = Number(draft.quantity);
  const validation = validateSimpleRecordDraft(draft, "infrastructure");

  if (!validation.valid) {
    setState({
      infrastructureDraft: draft,
      infrastructureError: validation.message,
      fieldErrorRoles: validation.roles
    });
    return false;
  }

  const record = {
    ...draftWithSelectedInstalledArticle(draft),
    quantity: String(Math.trunc(quantity)),
    observation: draft.observation.trim(),
    otherSite: draft.otherSite.trim()
  };
  const taskId = state.selectedTaskId;
  const currentRecords = infrastructureRecordsForTask(taskId);
  const nextRecords = [...currentRecords];
  const wasEditing = state.editingInfrastructureIndex >= 0;

  if (wasEditing) {
    nextRecords[state.editingInfrastructureIndex] = record;
  } else {
    nextRecords.push(record);
  }

  setState({
    infrastructureRecordsByTask: {
      ...state.infrastructureRecordsByTask,
      [taskId]: nextRecords
    },
    infrastructureDraft: emptyInfrastructureDraft(),
    editingInfrastructureIndex: -1,
    infrastructureError: "",
    infrastructurePrefillNotice: "",
    fieldErrorRoles: []
  });
  persistCurrentTaskProgress();
  showSuccessToast(
    wasEditing ? "elemento actualizado correctamente" : "elemento registrado correctamente",
    "Puedes ingresar otro elemento de infraestructura o avanzar a la siguiente sección."
  );
  return true;
}

function updateInfrastructureDraft(nextDraft, options = {}) {
  updateSectionDraft(
    "infrastructureDraft",
    "infrastructureError",
    sanitizedInfrastructureDraft(nextDraft),
    options
  );
}

function updatePaeManagerDraft(field, value) {
  setState({
    paeManagerDraft: { ...state.paeManagerDraft, [field]: value },
    paeManagerError: ""
  });
}

function currentPaeManagerDraftFromForm() {
  return {
    name: rootEl.querySelector('[name="paeManagerName"]')?.value ?? state.paeManagerDraft.name,
    rut: rootEl.querySelector('[name="paeManagerRut"]')?.value ?? state.paeManagerDraft.rut,
    role: rootEl.querySelector('[name="paeManagerRole"]')?.value ?? state.paeManagerDraft.role
  };
}

function updatePaeRutValidationMessage(value) {
  const message = rutValidationMessage(value);
  const errorEl = rootEl.querySelector('[data-role="pae-manager-rut-error"]');
  const inputEl = rootEl.querySelector('[name="paeManagerRut"]');
  const controlEl = inputEl?.closest(".field-control");
  if (errorEl) errorEl.textContent = message;
  if (controlEl) controlEl.classList.toggle("field-control-error", Boolean(message));
}

function validatePaeManagerDraft() {
  const currentDraft = currentPaeManagerDraftFromForm();
  const role = normalizePaeManagerRole(currentDraft.role);
  const draft = {
    name: currentDraft.name.trim(),
    rut: formatRut(currentDraft.rut),
    role
  };

  if (!draft.name || !draft.rut || !draft.role) {
    setState({ paeManagerDraft: draft, paeManagerError: "Completa nombre, RUT y cargo para continuar." });
    return false;
  }

  if (!isValidRut(draft.rut)) {
    updatePaeRutValidationMessage(draft.rut);
    setState({ paeManagerDraft: draft, paeManagerError: "Ingresa un RUT válido." });
    return false;
  }

  if (!paeManagerRoleOptions.includes(draft.role)) {
    setState({ paeManagerDraft: draft, paeManagerError: "Selecciona un cargo válido para el encargado PAE." });
    return false;
  }

  setState({ paeManagerDraft: draft, paeManagerError: "" });
  return true;
}

function finishPaeManagerSection(showSavedToast = false) {
  const task = selectedTask();
  const mustComplete = sectionMinimumById(task, "pae-manager") || hasPaeManagerInput();
  if (!mustComplete) {
    persistCurrentTaskProgress();
    if (showSavedToast) return;
    const nextSection = nextSectionAfter("pae-manager");
    if (nextSection) openSectionRoute(nextSection.id);
    return;
  }

  if (!validatePaeManagerDraft()) return;

  if (!state.paeSignatureData) {
    setState({ paeSignatureError: "Guarda la firma del Encargado PAE para continuar." });
    return;
  }

  persistCurrentTaskProgress();

  if (showSavedToast) {
    showSuccessToast("información guardada correctamente", "Los datos y firma del Encargado PAE quedaron completos.");
    return;
  }

  const nextSection = nextSectionAfter("pae-manager");
  if (nextSection) openSectionRoute(nextSection.id);
  showSuccessToast("sección Encargado PAE guardada", nextSection ? `Continuando con ${nextSection.title}.` : "El avance quedó registrado en el formulario.");
}

function savePaeManagerInformation() {
  if (hasPaeManagerInput() && !validatePaeManagerDraft()) return;
  if (hasPaeManagerInput() && !state.paeSignatureData) {
    setState({ paeSignatureError: "Guarda la firma del Encargado PAE para completar la sección." });
    return;
  }
  persistCurrentTaskProgress();
  showSuccessToast("información guardada correctamente", state.paeSignatureData ? "La sección Encargado PAE quedó completa." : "Ahora falta guardar la firma del Encargado PAE.");
}

function savePaeSignature() {
  const canvas = rootEl.querySelector('[data-signature-kind="pae"]');
  if (!canvas || canvas.dataset.hasInk !== "true") {
    setState({ paeSignatureError: "Dibuja la firma antes de guardar." });
    return;
  }

  setState({
    paeSignatureData: canvas.toDataURL("image/png"),
    paeSignatureModalOpen: false,
    paeSignatureError: ""
  });
  persistCurrentTaskProgress();
  showSuccessToast("firma guardada correctamente", "Puedes continuar con la siguiente sección.");
}

function saveTechnicianSignature() {
  const canvas = rootEl.querySelector('[data-signature-kind="technician"]');
  if (!canvas || canvas.dataset.hasInk !== "true") {
    setState({ technicianSignatureError: "Dibuja la firma del técnico antes de guardar." });
    return;
  }

  setState({
    technicianSignatureData: canvas.toDataURL("image/png"),
    technicianSignatureModalOpen: false,
    technicianSignatureError: ""
  });
  persistCurrentTaskProgress();
  showSuccessToast("firma guardada correctamente", "Ya puedes confirmar el envío del formulario.");
}

function isoDateFromTaskLabel(label) {
  if (!label) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) return label;

  const months = {
    enero: "01",
    febrero: "02",
    marzo: "03",
    abril: "04",
    mayo: "05",
    junio: "06",
    julio: "07",
    agosto: "08",
    septiembre: "09",
    octubre: "10",
    noviembre: "11",
    diciembre: "12"
  };
  const match = String(label).toLowerCase().match(/(\d{1,2})\s+([a-záéíóúñ]+)\s+(\d{4})/i);
  if (!match) return new Date().toISOString().slice(0, 10);
  const day = match[1].padStart(2, "0");
  const month = months[match[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "")] ?? "01";
  return `${match[3]}-${month}-${day}`;
}

function answer(code, label, value, type = "text") {
  return { code, label, value, type };
}

function answerTypeForField(key) {
  const canonicalKey = canonicalFieldKey(key);
  const dateFields = new Set([
    "flexibleExpirationDate",
    "extinguisherExpirationDate",
    "pestControlDate",
    "greenSealExpiration"
  ]);

  if (canonicalKey === "quantity") return "number";
  if (dateFields.has(canonicalKey)) return "date";
  return "text";
}

function recordAnswers(record) {
  const localEvidenceFields = new Set(["evidencefilepath", "evidencefileuri", "evidencemime"]);
  return Object.entries(record)
    .filter(([key, value]) => !["evidencePreview", "evidencePhotos", "articleQuantity"].includes(canonicalFieldKey(key)) && !localEvidenceFields.has(normalizeFieldKey(key)) && value !== "" && value !== null && value !== undefined)
    .map(([key, value]) => answer(
      key,
      fieldLabel(key),
      canonicalFieldKey(key) === "installedArticles" ? installedArticlesAnswerValue(value) : value,
      answerTypeForField(key)
    ));
}

function displayAnswerValue(key, value) {
  const canonicalKey = canonicalFieldKey(key);
  if (canonicalKey === "installedArticles") return installedArticlesAnswerValue(value);
  if (answerTypeForField(canonicalKey) === "date") return formatDateLabel(value);
  if (canonicalKey === "extinguisherExpired") return normalizeYesNoValue(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function normalizeYesNoValue(value) {
  const normalized = normalizeFieldKey(value);
  if (["si", "s", "true", "1"].includes(normalized)) return "Sí";
  if (["no", "false", "0"].includes(normalized)) return "No";
  return String(value);
}

function fieldLabel(key) {
  const canonicalKey = canonicalFieldKey(key);
  const labels = {
    element: "Elemento",
    site: "Sitio",
    otherSite: "Otro sitio",
    quantity: "Cantidad",
    action: "Acción",
    observation: "Observación",
    evidenceName: "Nombre de evidencia",
    hasSecSeal: "Cuenta con sello SEC",
    flexibleHasExpiration: "Flexible cuenta con fecha de vencimiento",
    flexibleExpirationDate: "Fecha de vencimiento flexible",
    flexibleHasQr: "Posee QR",
    distributionBoxType: "Tipo de caja de distribución",
    distributionBoxLocation: "Ubicación caja de distribución",
    distributionBoxOtherLocation: "Otro espacio de caja de distribución",
    sealedProtection: "Cuenta con protección o grupo estanco",
    achsSignage: "Señalética ACHS",
    hasAchsSignage: "RBD cuenta con señalética ACHS",
    extinguisherExpirationDate: "Vencimiento extintor",
    extinguisherExpired: "Extintor vencido",
    hasDressingRoom: "RBD cuenta con vestidores",
    dressingRoomLocation: "Ubicación del vestidor",
    hasLockers: "Existen casilleros en el RBD",
    lockersFitStaff: "Casilleros acorde al personal de planta",
    lockersGoodState: "Casillero en buen estado y permite cierre",
    hasShower: "MPA cuenta con ducha",
    showerExclusive: "Duchas exclusivas para personal Soser",
    hasBathroom: "MPA cuenta con baño",
    bathroomExclusive: "Baño exclusivo para personal Soser",
    exclusiveProgram: "Patio de servicio exclusivo para el programa",
    pestControlUpToDate: "Control de plagas al día",
    pestControlDate: "Fecha del último control de plagas",
    hasSanitaryResolution: "RBD cuenta con resolución sanitaria",
    sanitaryResolutionNumber: "N° Resolución sanitaria",
    hasGreenSeal: "RBD posee sello verde",
    greenSealCode: "Código o ID sello verde",
    greenSealExpiration: "Fecha de vencimiento sello verde",
    greenSealExpired: "Sello verde vencido",
    hasMaintenanceCover: "Carátula de mantención correspondiente al año",
    hasPaintCertificate: "Certificado de pintura",
    name: "Nombre",
    rut: "RUT",
    role: "Cargo",
    articleId: "Código de artículo",
    articleName: "Artículo",
    articleQuantity: "Cantidad de artículo",
    installedArticles: "Artículos instalados"
  };
  return labels[canonicalKey] ?? key;
}

function sectionPayload(code, title, records) {
  return {
    code,
    title,
    items: records.map((record) => ({
      label: record.element || record.articleName || title,
      answers: recordAnswers(record)
    }))
  };
}

function buildSubmissionPayload(task) {
  persistCurrentTaskProgress();
  const localUuid = task.pendingLocalUuid || crypto.randomUUID();
  task.pendingLocalUuid = localUuid;
  const paeDraft = {
    name: state.paeManagerDraft.name,
    rut: state.paeManagerDraft.rut,
    role: state.paeManagerDraft.role
  };

  const sections = [
    sectionPayload("heat", "Calor", heatRecordsForTask(task.id)),
    sectionPayload("electricity", "Electricidad", electricityRecordsForTask(task.id)),
    sectionPayload("cold", "Frío", coldRecordsForTask(task.id)),
    sectionPayload("vectors", "Vectores", vectorsRecordsForTask(task.id)),
    sectionPayload("water", "Agua", waterRecordsForTask(task.id)),
    sectionPayload("infrastructure", "Infraestructura", infrastructureRecordsForTask(task.id)),
    {
      code: "pae-manager",
      title: "Encargado PAE",
      answers: recordAnswers(paeDraft)
    },
    {
      code: "mpa",
      title: "MPA",
      answers: recordAnswers(state.mpaDraft)
    },
    {
      code: "service-yard",
      title: "Patio Servicio",
      answers: recordAnswers(state.serviceYardDraft)
    },
    {
      code: "rbd-checkers",
      title: "Verificadores RBD",
      answers: recordAnswers(state.rbdCheckersDraft)
    },
    {
      code: "geolocation",
      title: "Georreferenciación",
      answers: gpsEvidenceAnswers(task)
    }
  ].filter((section) => (section.items?.length ?? 0) || (section.answers?.length ?? 0));

  return {
    localUuid,
    task: {
      id: task.supabaseId || (/^[0-9a-f-]{36}$/i.test(task.id) ? task.id : ""),
      type: task.type,
      rbd: task.rbd,
      establishment: task.establishment,
      description: task.description,
      dueDate: task.dueDateIso || isoDateFromTaskLabel(task.dueAt),
      priority: task.priority
    },
    sections,
    signatures: [
      state.paeSignatureData ? { kind: "pae_manager", label: "Firma Encargado PAE", dataUrl: state.paeSignatureData } : null,
      state.technicianSignatureData ? { kind: "technician", label: "Firma Técnico", dataUrl: state.technicianSignatureData } : null
    ].filter(Boolean)
  };
}

function submissionPayloadCounts(payload) {
  return payload.sections.reduce((counts, section) => {
    counts.sections += 1;
    counts.items += section.items?.length ?? 0;
    counts.answers += section.answers?.filter((answer) => answer.value !== "" && answer.value !== null && answer.value !== undefined).length ?? 0;
    counts.answers += (section.items ?? []).reduce((itemTotal, item) => (
      itemTotal + (item.answers ?? []).filter((answer) => answer.value !== "" && answer.value !== null && answer.value !== undefined).length
    ), 0);
    return counts;
  }, { sections: 0, items: 0, answers: 0 });
}

function queuePendingSubmission(task, payload) {
  const queue = readPendingSubmissions();
  queue[task.id] = {
    taskId: task.id,
    queuedAt: new Date().toISOString(),
    technicianId: state.currentUser?.id ?? state.currentUser?.usuario ?? "",
    payload
  };
  writePendingSubmissions(queue);
  task.status = "Completada";
  task.syncStatus = "pending";
  task.syncWarning = `Pendiente de sincronización con ${hasSqlServerApiConfig() ? "SQL Server" : "Supabase"}.`;
}

function hydrateTaskProgressForSync(taskId) {
  if (!taskId) return false;
  const stored = readStoredFormProgress()[taskId];
  if (!stored) return false;
  Object.assign(state, formProgressStateForTask(taskId));
  return true;
}

async function submitPayloadToSupabase(payload) {
  const functionName = supabaseConfig.submitFormFunctionName || "submit-form";
  const counts = submissionPayloadCounts(payload);

  if (!counts.answers) {
    throw new Error("El formulario no contiene respuestas para sincronizar. Vuelve al índice y revisa que las secciones tengan datos guardados.");
  }

  await ensureValidSupabaseSession();

  try {
    if (hasSqlServerApiConfig()) {
      return await apiRequest("/functions/submit-form", {
        method: "POST",
        timeoutMs: 90000,
        body: JSON.stringify(payload)
      });
    }

    return await supabaseRequest(`/functions/v1/${functionName}`, {
      method: "POST",
      timeoutMs: 90000,
      body: JSON.stringify(payload)
    });
  } catch (error) {
    if (hasSqlServerApiConfig()) throw error;
    if (!isSupabaseAuthTokenError(error) || !state.supabaseSession?.refresh_token) throw error;
    await refreshSupabaseSession();
    return supabaseRequest(`/functions/v1/${functionName}`, {
      method: "POST",
      timeoutMs: 90000,
      body: JSON.stringify(payload)
    });
  }
}

async function submitFormToSupabase(task) {
  return submitPayloadToSupabase(buildSubmissionPayload(task));
}

async function markIncidentResolvedForTask(task) {
  if (!task) return;
  const taskIds = [task.id, task.supabaseId].filter(Boolean);
  let changed = false;
  state.incidents = state.incidents.map((incident) => {
    if (!taskIds.includes(incident.taskId)) return incident;
    changed = true;
    return {
      ...incident,
      status: "Resuelta",
      plannedTask: {
        ...(incident.plannedTask ?? {}),
        ...task,
        status: "Completada"
      }
    };
  });
  if (changed) persistIncidents();

  const remoteTaskId = taskIds.find(isUuid);
  if (!remoteTaskId || !hasSupabaseConfig() || !state.supabaseSession?.access_token || !isNetworkOnline()) return;
  try {
    if (hasSqlServerApiConfig()) {
      await apiRequest(`/api/incidents/by-task/${encodeURIComponent(remoteTaskId)}/resolve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${state.supabaseSession.access_token}` }
      });
    } else {
      await supabaseRequest(`/rest/v1/maintenance_incidents?task_id=eq.${encodeURIComponent(remoteTaskId)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${state.supabaseSession.access_token}` },
        body: JSON.stringify({
          status: "Resuelta",
          planned_details: {
            ...task,
            status: "Completada"
          }
        })
      });
    }
  } catch (error) {
    console.warn("La tarea quedó completada, pero no se pudo marcar la incidencia como resuelta en el backend remoto.", error);
  }
}

async function confirmFormSubmit() {
  if (state.formSubmitBusy) return;
  persistActiveFormProgressNow();
  consolidateCompleteRecordDraftsBeforeSubmit();
  const messages = requiredFormMessages();
  if (messages.length) {
    setState({ route: "form", formValidationMessages: messages });
    showErrorToast("Formulario incompleto", messages);
    return;
  }

  if (!state.technicianSignatureData) {
    setState({ technicianSignatureError: "Guarda la firma del técnico para enviar el formulario." });
    return;
  }

  const task = selectedTask();
  const progressBackup = currentFormProgressSnapshot();
  const previousTaskState = {
    status: task.status,
    syncStatus: task.syncStatus,
    submittedAt: task.submittedAt,
    submissionId: task.submissionId,
    folio: task.folio,
    syncWarning: task.syncWarning,
    supabaseId: task.supabaseId
  };

  setState({ formSubmitBusy: true, technicianSignatureError: "" });
  const submitLocation = await captureTaskLocationEvidence(task, "submit", {
    showError: false,
    timeoutMs: isNetworkOnline() ? 90000 : 120000,
    acceptFirstWatchPosition: true
  });
  if (!submitLocation) {
    const evidence = locationEvidenceForTask(task.id);
    const warning = evidence.submitError || "No se pudo registrar la ubicación final.";
    task.syncWarning = [task.syncWarning, `Ubicación final pendiente: ${warning}`].filter(Boolean).join(" | ");
  }

  if (hasSupabaseConfig() && !state.supabaseSession?.access_token) {
    setState({ formSubmitBusy: false });
    showErrorToast(`Sesión ${remoteBackendLabel()} requerida`, `Cierra sesión e ingresa nuevamente con tu usuario de ${remoteBackendLabel()} antes de enviar.`);
    return;
  }

  if (hasSupabaseConfig()) {
    let payload = null;
    try {
      payload = buildSubmissionPayload(task);
      await ensureValidSupabaseSession();
      const result = await submitPayloadToSupabase(payload);
      if (result.answerCount === 0) {
        throw new Error(`${remoteBackendLabel()} recibió el formulario, pero no registró respuestas. Revisa el endpoint submit-form.`);
      }
      task.supabaseId = result.taskId;
      task.submissionId = result.submissionId;
      task.folio = result.folio;
      task.submittedAt = result.submittedAt || new Date().toISOString();
      if (result.warnings?.length) {
        task.syncWarning = result.warnings.join(" | ");
      }
      removePendingSubmission(task.id);
    } catch (error) {
      if (isOfflineSubmissionError(error)) {
        try {
          payload = payload || buildSubmissionPayload(task);
          queuePendingSubmission(task, payload);
          task.status = "Completada";
          task.syncStatus = "pending";
          task.submittedAt = task.submittedAt || new Date().toISOString();
          setState({ route: "form-summary", filter: "Completadas", formSubmitBusy: false });
          showSuccessToast("formulario guardado sin conexión", "Quedó completado en el equipo y se subirá desde Sincronizar cuando vuelva internet.");
        } catch (storageError) {
          setState({ formSubmitBusy: false });
          showErrorToast("No se pudo guardar localmente", "El almacenamiento del dispositivo no permitió dejar el envío pendiente.");
        }
        return;
      }
      setState({ formSubmitBusy: false });
      Object.assign(task, previousTaskState);
      writeStoredFormProgress({
        ...readStoredFormProgress(),
        [task.id]: progressBackup
      });
      Object.assign(state, formProgressStateForTask(task.id));
      showErrorToast(`No se pudo guardar en ${remoteBackendLabel()}`, error.message);
      return;
    }
  }

  task.status = "Completada";
  task.syncStatus = hasSupabaseConfig() ? "synced" : "pending";
  await markIncidentResolvedForTask(task);
  let successMessage = task.syncWarning || (task.syncStatus === "synced" ? `Las respuestas quedaron guardadas en ${remoteBackendLabel()}.` : "El envío quedó preparado para sincronización.");

  if (task.syncStatus === "synced" && task.submissionId) {
    try {
      await uploadPaePdfToOneDriveForTask(task, { showSuccess: false, showError: false, setBusy: false });
      successMessage = `Las respuestas quedaron guardadas en ${remoteBackendLabel()} y los respaldos quedaron en OneDrive.`;
    } catch (error) {
      const warning = `Respaldo pendiente en OneDrive: ${error.message}`;
      task.syncWarning = [task.syncWarning, warning].filter(Boolean).join(" | ");
      successMessage = task.syncWarning;
    }
  }

  setState({ route: "form-summary", filter: "Completadas", formSubmitBusy: false, pdfUploadBusy: false });
  showSuccessToast("formulario enviado correctamente", successMessage);
}

async function syncPendingSubmissions(options = {}) {
  const silent = options.silent ?? false;
  if (state.syncBusy) return;

  if (!hasSupabaseConfig()) {
    if (!silent) showErrorToast(`${remoteBackendLabel()} no configurado`, "No hay conexión configurada para sincronizar formularios.");
    return;
  }

  const entries = pendingSubmissionEntries();
  if (!entries.length) {
    if (!silent) showSuccessToast("sincronización al día", "No hay formularios pendientes por subir.");
    return;
  }

  setState({ syncBusy: true });
  const errors = [];
  let synced = 0;

  try {
    await ensureValidSupabaseSession();
  } catch (error) {
    setState({ syncBusy: false, lastSyncAt: new Date().toLocaleString("es-CL") });
    if (!silent) showErrorToast(`Sesión ${remoteBackendLabel()} requerida`, error.message);
    return;
  }

  for (const [taskId, entry] of entries) {
    try {
      const task = tasks.find((item) => item.id === taskId);
      if (task) hydrateTaskProgressForSync(taskId);
      const payload = task ? buildSubmissionPayload(task) : entry.payload;
      const localPhotoCount = task ? allEvidencePhotoRecords(task).length : 0;
      const result = await submitPayloadToSupabase(payload);
      if (result.answerCount === 0) {
        throw new Error(`${remoteBackendLabel()} recibió el formulario, pero no registró respuestas.`);
      }
      removePendingSubmission(taskId);
      if (task) {
        task.status = "Completada";
        task.syncStatus = "synced";
        task.submissionId = result.submissionId;
        task.supabaseId = result.taskId;
        task.folio = result.folio;
        task.submittedAt = result.submittedAt || new Date().toISOString();
        task.syncWarning = result.warnings?.length ? result.warnings.join(" | ") : "";
        try {
          await uploadPaePdfToOneDriveForTask(task, { showSuccess: false, showError: false, setBusy: false });
          if (!localPhotoCount) {
            task.syncWarning = [task.syncWarning, "Formulario sincronizado sin fotografías locales detectadas para respaldo."].filter(Boolean).join(" | ");
          }
        } catch (pdfError) {
          const warning = `Respaldo pendiente en OneDrive: ${pdfError.message}`;
          task.syncWarning = [task.syncWarning, warning].filter(Boolean).join(" | ");
        }
      }
      synced += 1;
    } catch (error) {
      errors.push(`RBD ${entry.payload?.task?.rbd ?? taskId}: ${error.message}`);
      if (isOfflineSubmissionError(error)) break;
    }
  }

  setState({ syncBusy: false, lastSyncAt: new Date().toLocaleString("es-CL") });

  if (errors.length) {
    if (!silent) showErrorToast("sincronización incompleta", errors);
    return;
  }

  applyPendingSubmissionState();
  writeOfflineTaskCache(tasks);
  persistDailyAuthState();
  if (synced > 0) {
    await refreshSupabaseTasks({ silent: true, notify: false });
  }

  if (!silent) {
    showSuccessToast("sincronización completada", `${synced} formulario${synced === 1 ? "" : "s"} subido${synced === 1 ? "" : "s"} a ${remoteBackendLabel()}.`);
  }
}

function updateMpaDraft(field, value) {
  const nextDraft = { ...state.mpaDraft, [field]: value };

  if (field === "hasDressingRoom" && value !== "Sí") nextDraft.dressingRoomLocation = "";
  if (field === "hasLockers" && value !== "Sí") {
    nextDraft.lockersFitStaff = "";
    nextDraft.lockersGoodState = "";
  }
  if (field === "hasShower" && value !== "Sí") nextDraft.showerExclusive = "";
  if (field === "hasBathroom" && value !== "Sí") nextDraft.bathroomExclusive = "";

  setState({ mpaDraft: nextDraft, mpaError: "" });
}

function finishMpaSection(showSavedToast = false) {
  const task = selectedTask();
  const requiredMinimum = sectionMinimumById(task, "mpa");
  const complete = isMpaComplete();
  const touched = hasMpaInput();

  if ((requiredMinimum || touched) && !complete) {
    setState({ mpaError: `Falta completar: ${missingMpaDetails().join(", ")}.` });
    return;
  }

  persistCurrentTaskProgress();

  if (showSavedToast) {
    showSuccessToast("respuestas guardadas correctamente", complete ? "La sección MPA quedó completa." : "Puedes continuar completando las preguntas pendientes.");
    return;
  }

  const nextSection = nextSectionAfter("mpa");
  if (nextSection) openSectionRoute(nextSection.id);
  showSuccessToast("sección MPA guardada", nextSection ? `Continuando con ${nextSection.title}.` : "El avance quedó registrado en el formulario.");
}

function updateServiceYardDraft(value) {
  setState({ serviceYardDraft: { exclusiveProgram: value }, serviceYardError: "" });
}

function finishServiceYardSection(showSavedToast = false) {
  const task = selectedTask();
  const requiredMinimum = sectionMinimumById(task, "service-yard");
  const complete = isServiceYardComplete();
  const touched = hasServiceYardInput();

  if ((requiredMinimum || touched) && !complete) {
    setState({ serviceYardError: "Responde la pregunta para avanzar." });
    return;
  }

  persistCurrentTaskProgress();

  if (showSavedToast) {
    showSuccessToast("respuesta guardada correctamente", complete ? "La sección Patio Servicio quedó completa." : "Puedes responder la pregunta pendiente más adelante.");
    return;
  }

  const nextSection = nextSectionAfter("service-yard");
  if (nextSection) openSectionRoute(nextSection.id);
  showSuccessToast("sección Patio Servicio guardada", nextSection ? `Continuando con ${nextSection.title}.` : "El avance quedó registrado en el formulario.");
}

function updateRbdCheckersDraft(field, value) {
  const nextValue = ["pestControlDate", "greenSealExpiration"].includes(field) ? normalizeIsoDate(value) : value;
  const nextDraft = { ...state.rbdCheckersDraft, [field]: nextValue };
  let nextError = "";

  if (field === "hasSanitaryResolution" && value !== "Sí") nextDraft.sanitaryResolutionNumber = "";
  if (field === "hasGreenSeal" && value !== "Sí") {
    nextDraft.greenSealCode = "";
    nextDraft.greenSealExpiration = "";
  }
  if (field === "pestControlUpToDate" && value !== "Sí") nextError = "";
  if (nextDraft.pestControlUpToDate === "Sí" && isIsoDateAfter(nextDraft.pestControlDate)) {
    nextError = "Si el control de plagas está al día, la fecha no puede ser posterior a hoy.";
  }
  nextDraft.greenSealExpired = greenSealExpiredValue(nextDraft);

  setState({ rbdCheckersDraft: nextDraft, rbdCheckersError: nextError });
}

function finishRbdCheckersSection(showSavedToast = false) {
  const task = selectedTask();
  const requiredMinimum = sectionMinimumById(task, "rbd-checkers");
  const complete = isRbdCheckersComplete();
  const missingDetails = missingRbdCheckersDetails();
  const touched = hasRbdCheckersInput();

  if ((requiredMinimum || touched) && !complete) {
    setState({ rbdCheckersError: `Falta completar: ${missingDetails.join(", ")}.` });
    return;
  }

  persistCurrentTaskProgress();

  if (showSavedToast) {
    showSuccessToast("respuestas guardadas correctamente", complete ? "La sección Verificadores RBD quedó completa." : "Puedes completar las preguntas pendientes más adelante.");
    return;
  }

  const nextSection = nextSectionAfter("rbd-checkers");
  if (nextSection) {
    openSectionRoute(nextSection.id);
    showSuccessToast("sección Verificadores RBD guardada", `Continuando con ${nextSection.title}.`);
    return;
  }

  startTechnicianSignaturePreview();
}

function registerVectorsElement(options = {}) {
  const showToast = options.showToast ?? true;
  const draft = currentVectorsDraftFromForm();
  const quantity = Number(draft.quantity);
  const validation = validateSimpleRecordDraft(draft, "vectors");

  if (!validation.valid) {
    setState({
      vectorsDraft: draft,
      vectorsError: validation.message,
      fieldErrorRoles: validation.roles
    });
    return false;
  }

  const record = {
    ...draftWithSelectedInstalledArticle(draft),
    quantity: String(Math.trunc(quantity)),
    observation: draft.observation.trim()
  };
  const taskId = state.selectedTaskId;
  const currentRecords = vectorsRecordsForTask(taskId);
  const nextRecords = [...currentRecords];
  const wasEditing = state.editingVectorsIndex >= 0;

  if (wasEditing) {
    nextRecords[state.editingVectorsIndex] = record;
  } else {
    nextRecords.push(record);
  }

  setState({
    vectorsRecordsByTask: {
      ...state.vectorsRecordsByTask,
      [taskId]: nextRecords
    },
    vectorsDraft: emptyVectorsDraft(),
    editingVectorsIndex: -1,
    vectorsError: "",
    fieldErrorRoles: []
  });
  persistCurrentTaskProgress();
  if (showToast) {
    showSuccessToast(
      wasEditing ? "elemento actualizado correctamente" : "elemento registrado correctamente",
      "Puedes ingresar otro elemento de vectores o avanzar a la siguiente sección."
    );
  }
  return true;
}

function updateVectorsDraft(nextDraft, options = {}) {
  updateSectionDraft("vectorsDraft", "vectorsError", nextDraft, options);
}

function hasUsedItemsDraftInput(draft = currentUsedItemsDraftFromForm()) {
  return Boolean(
    draft.articleId
    || draft.articleName
    || String(draft.quantity ?? "").trim() !== "1"
    || String(draft.observation ?? "").trim()
  );
}

function isUsedItemsDraftComplete(draft = currentUsedItemsDraftFromForm()) {
  const quantity = Number(draft.quantity);
  return Boolean(draft.articleId && draft.articleName && Number.isFinite(quantity) && quantity >= 1);
}

function updateUsedItemsDraft(nextDraft) {
  setState({ usedItemsDraft: { ...state.usedItemsDraft, ...nextDraft }, usedItemsError: "", fieldErrorRoles: [] });
}

function registerUsedItem(options = {}) {
  const showToast = options.showToast ?? true;
  const draft = currentUsedItemsDraftFromForm();
  const quantity = Number(draft.quantity);
  const roles = [];

  if (!draft.articleId || !draft.articleName) roles.push("used-item-article");
  if (!Number.isFinite(quantity) || quantity < 1) roles.push("used-item-quantity");

  if (roles.length) {
    setState({
      usedItemsDraft: draft,
      usedItemsError: "Selecciona un artículo y una cantidad válida.",
      fieldErrorRoles: roles
    });
    return false;
  }

  const record = {
    articleId: draft.articleId,
    articleName: draft.articleName,
    quantity: String(Math.trunc(quantity)),
    observation: String(draft.observation ?? "").trim()
  };
  const taskId = state.selectedTaskId;
  const currentRecords = usedItemsRecordsForTask(taskId);
  const nextRecords = [...currentRecords];
  const wasEditing = state.editingUsedItemIndex >= 0;

  if (wasEditing) {
    nextRecords[state.editingUsedItemIndex] = record;
  } else {
    nextRecords.push(record);
  }

  setState({
    usedItemsRecordsByTask: {
      ...state.usedItemsRecordsByTask,
      [taskId]: nextRecords
    },
    usedItemsDraft: emptyUsedItemsDraft(),
    editingUsedItemIndex: -1,
    usedItemsError: "",
    fieldErrorRoles: []
  });
  persistCurrentTaskProgress();

  if (showToast) {
    showSuccessToast(
      wasEditing ? "consumo actualizado correctamente" : "consumo registrado correctamente",
      "Puedes ingresar otro artículo o enviar el formulario."
    );
  }
  return true;
}

function finishUsedItemsSection() {
  const draft = currentUsedItemsDraftFromForm();
  if (hasUsedItemsDraftInput(draft) && !isUsedItemsDraftComplete(draft)) {
    registerUsedItem({ showToast: false });
    return;
  }
  if (isUsedItemsDraftComplete(draft)) {
    const registered = registerUsedItem({ showToast: false });
    if (!registered) return;
  } else {
    persistCurrentTaskProgress();
  }
  startTechnicianSignaturePreview();
}

function editRegisteredRecord(section, index) {
  const recordIndex = Number(index);
  if (!Number.isInteger(recordIndex) || recordIndex < 0) return;

  if (section === "heat") {
    const record = heatRecordsForTask()[recordIndex];
    if (!record) return;
    setState({
      heatDraft: { ...emptyHeatDraft(), ...record },
      editingHeatIndex: recordIndex,
      heatError: ""
    });
  }

  if (section === "electricity") {
    const record = electricityRecordsForTask()[recordIndex];
    if (!record) return;
    setState({
      electricityDraft: { ...emptyElectricityDraft(), ...record },
      editingElectricityIndex: recordIndex,
      electricityError: ""
    });
  }

  if (section === "cold") {
    const record = coldRecordsForTask()[recordIndex];
    if (!record) return;
    setState({
      coldDraft: { ...emptyColdDraft(), ...record },
      editingColdIndex: recordIndex,
      coldError: ""
    });
  }

  if (section === "water") {
    const record = waterRecordsForTask()[recordIndex];
    if (!record) return;
    setState({
      waterDraft: { ...emptyWaterDraft(), ...record },
      editingWaterIndex: recordIndex,
      waterError: ""
    });
  }

  if (section === "infrastructure") {
    const record = infrastructureRecordsForTask()[recordIndex];
    if (!record) return;
    setState({
      infrastructureDraft: { ...emptyInfrastructureDraft(), ...record },
      editingInfrastructureIndex: recordIndex,
      infrastructureError: ""
    });
  }

  if (section === "vectors") {
    const record = vectorsRecordsForTask()[recordIndex];
    if (!record) return;
    setState({
      vectorsDraft: { ...emptyVectorsDraft(), ...record },
      editingVectorsIndex: recordIndex,
      vectorsError: ""
    });
  }

  if (section === "used-items") {
    const record = usedItemsRecordsForTask()[recordIndex];
    if (!record) return;
    setState({
      usedItemsDraft: { ...emptyUsedItemsDraft(), ...record },
      editingUsedItemIndex: recordIndex,
      usedItemsError: ""
    });
  }
}

function deleteRegisteredRecord(section, index) {
  const recordIndex = Number(index);
  if (!Number.isInteger(recordIndex) || recordIndex < 0) return;
  const taskId = state.selectedTaskId;

  if (section === "heat") {
    const records = heatRecordsForTask(taskId).filter((_, itemIndex) => itemIndex !== recordIndex);
    setState({
      heatRecordsByTask: { ...state.heatRecordsByTask, [taskId]: records },
      heatDraft: state.editingHeatIndex === recordIndex ? emptyHeatDraft() : state.heatDraft,
      editingHeatIndex: -1,
      heatError: ""
    });
    showSuccessToast("elemento eliminado correctamente", "El registro fue retirado de la sección Calor.");
  }

  if (section === "electricity") {
    const records = electricityRecordsForTask(taskId).filter((_, itemIndex) => itemIndex !== recordIndex);
    setState({
      electricityRecordsByTask: { ...state.electricityRecordsByTask, [taskId]: records },
      electricityDraft: state.editingElectricityIndex === recordIndex ? emptyElectricityDraft() : state.electricityDraft,
      editingElectricityIndex: -1,
      electricityError: ""
    });
    showSuccessToast("elemento eliminado correctamente", "El registro fue retirado de la sección Electricidad.");
  }

  if (section === "cold") {
    const records = coldRecordsForTask(taskId).filter((_, itemIndex) => itemIndex !== recordIndex);
    setState({
      coldRecordsByTask: { ...state.coldRecordsByTask, [taskId]: records },
      coldDraft: state.editingColdIndex === recordIndex ? emptyColdDraft() : state.coldDraft,
      editingColdIndex: -1,
      coldError: ""
    });
    showSuccessToast("elemento eliminado correctamente", "El registro fue retirado de la sección Frío.");
  }

  if (section === "water") {
    const records = waterRecordsForTask(taskId).filter((_, itemIndex) => itemIndex !== recordIndex);
    setState({
      waterRecordsByTask: { ...state.waterRecordsByTask, [taskId]: records },
      waterDraft: state.editingWaterIndex === recordIndex ? emptyWaterDraft() : state.waterDraft,
      editingWaterIndex: -1,
      waterError: ""
    });
    showSuccessToast("elemento eliminado correctamente", "El registro fue retirado de la sección Agua.");
  }

  if (section === "infrastructure") {
    const records = infrastructureRecordsForTask(taskId).filter((_, itemIndex) => itemIndex !== recordIndex);
    setState({
      infrastructureRecordsByTask: { ...state.infrastructureRecordsByTask, [taskId]: records },
      infrastructureDraft: state.editingInfrastructureIndex === recordIndex ? emptyInfrastructureDraft() : state.infrastructureDraft,
      editingInfrastructureIndex: -1,
      infrastructureError: ""
    });
    showSuccessToast("elemento eliminado correctamente", "El registro fue retirado de la sección Infraestructura.");
  }

  if (section === "vectors") {
    const records = vectorsRecordsForTask(taskId).filter((_, itemIndex) => itemIndex !== recordIndex);
    setState({
      vectorsRecordsByTask: { ...state.vectorsRecordsByTask, [taskId]: records },
      vectorsDraft: state.editingVectorsIndex === recordIndex ? emptyVectorsDraft() : state.vectorsDraft,
      editingVectorsIndex: -1,
      vectorsError: ""
    });
    showSuccessToast("elemento eliminado correctamente", "El registro fue retirado de la sección Vectores.");
  }

  if (section === "used-items") {
    const records = usedItemsRecordsForTask(taskId).filter((_, itemIndex) => itemIndex !== recordIndex);
    setState({
      usedItemsRecordsByTask: { ...state.usedItemsRecordsByTask, [taskId]: records },
      usedItemsDraft: state.editingUsedItemIndex === recordIndex ? emptyUsedItemsDraft() : state.usedItemsDraft,
      editingUsedItemIndex: -1,
      usedItemsError: ""
    });
    showSuccessToast("consumo eliminado correctamente", "El registro fue retirado de Artículos utilizados.");
  }
}

async function attemptLogin() {
  const email = rootEl.querySelector('input[name="email"]')?.value.trim().toLowerCase();
  const password = rootEl.querySelector('input[name="password"]')?.value ?? "";

  if (hasSupabaseConfig()) {
    try {
      const session = await signInWithSupabase(email, password);
      const catalogs = await fetchSupabaseCatalogs(session.access_token);
      const user = await fetchSupabaseProfile(session, catalogs);
      if (user.permisos.gestionarUsuarios || user.permisos.asignarTareas || user.permisos.verNotificaciones || user.permisos.verDatosNacionales) {
        const supabaseUsers = await fetchSupabaseProfiles(session.access_token, catalogs);
        users.splice(0, users.length, ...supabaseUsers);
      }
      try {
        const [supabaseTasks, supabaseIncidents, maintenanceAlerts] = await Promise.all([
          fetchSupabaseTasks(session.access_token),
          fetchSupabaseIncidents(session.access_token).catch(() => readStoredIncidents()),
          (user.permisos.asignarTareas || user.permisos.gestionarUsuarios || user.permisos.verDatosNacionales)
            ? fetchMaintenanceAlerts(session.access_token).catch(() => [])
            : Promise.resolve([])
        ]);
        mergeSupabaseTasks(supabaseTasks, { user });
        state.incidents = supabaseIncidents;
        state.maintenanceAlerts = maintenanceAlerts;
        persistIncidents();
      } catch (taskError) {
        console.warn(`No se pudieron cargar tareas desde ${remoteBackendLabel()}.`, taskError);
      }

      if (user.estado !== "activo") {
        setState({ loginError: `Usuario inactivo por ${user.motivoEstado}.` });
        return;
      }

      setState({
        isAuthenticated: true,
        currentUser: user,
        supabaseSession: session,
        supabaseCatalogs: catalogs,
        loginError: "",
        actionMessage: "",
        passwordChangeError: "",
        route: user.requirePasswordChange ? "password-change" : defaultRouteFor(user)
      });
      startTaskAutoRefresh();
      startTaskRealtime();
      registerPushNotifications();
      window.setTimeout(() => refreshAppMessages({ silent: true }), 0);
      window.setTimeout(() => refreshMaintenanceAlerts({ silent: true }), 0);
      return;
    } catch (error) {
      setState({ loginError: `${hasSqlServerApiConfig() ? "SQL Server" : "Supabase"}: ${error.message}` });
      return;
    }
  }

  const user = users.find((candidate) => candidate.usuario.toLowerCase() === email && candidate.password === password);

  if (!user) {
    setState({ loginError: "Usuario o contraseña incorrectos." });
    return;
  }

  if (user.estado !== "activo") {
    setState({ loginError: `Usuario inactivo por ${user.motivoEstado}.` });
    return;
  }

  setState({ isAuthenticated: true, currentUser: user, supabaseSession: null, loginError: "", actionMessage: "", incidents: readStoredIncidents(), route: user.requirePasswordChange ? "password-change" : defaultRouteFor(user) });
  startTaskAutoRefresh();
  window.setTimeout(() => refreshAppMessages({ silent: true }), 0);
}

async function savePassword() {
  const newPassword = rootEl.querySelector('input[name="newPassword"]')?.value ?? "";
  const confirmPassword = rootEl.querySelector('input[name="confirmPassword"]')?.value ?? "";
  const user = loggedUser();

  if (newPassword !== confirmPassword) {
    setState({ passwordChangeError: "Las contraseñas no coinciden." });
    return;
  }

  if (!isValidPassword(newPassword)) {
    setState({ passwordChangeError: "La contraseña no cumple los requisitos mínimos." });
    return;
  }

  if (hasSupabaseConfig() && state.supabaseSession?.access_token) {
    try {
      if (hasSqlServerApiConfig()) {
        await apiRequest("/auth/change-password", {
          method: "POST",
          body: JSON.stringify({ password: newPassword })
        });
      } else {
        await supabaseRequest("/auth/v1/user", {
          method: "PUT",
          body: JSON.stringify({
            password: newPassword,
            data: {
              ...(state.supabaseSession.user?.user_metadata ?? {}),
              require_password_change: false
            }
          })
        });
      }
    } catch (error) {
      if (isSupabaseAuthTokenError(error)) {
        returnToLogin("Tu sesión temporal ya fue usada o expiró. Ingresa nuevamente con tu contraseña actual.");
        return;
      }
      setState({ passwordChangeError: `${hasSqlServerApiConfig() ? "SQL Server" : "Supabase"}: ${error.message}` });
      return;
    }
  }

  user.password = newPassword;
  user.requirePasswordChange = false;
  if (state.supabaseSession?.user?.user_metadata) {
    state.supabaseSession.user.user_metadata.require_password_change = false;
  }
  if (state.supabaseSession?.user?.app_metadata) {
    state.supabaseSession.user.app_metadata.require_password_change = false;
  }
  if (state.supabaseSession?.user?.raw_user_meta_data) {
    state.supabaseSession.user.raw_user_meta_data.require_password_change = false;
  }
  if (!user.cargo) {
    setState({
      isAuthenticated: false,
      currentUser: null,
      supabaseSession: null,
      passwordChangeError: "",
      loginMessage: "Contraseña actualizada correctamente. Ingresa con tu nueva contraseña.",
      route: "tasks"
    });
    return;
  }

  setState({ passwordChangeError: "", route: defaultRouteFor(user) });
}

function bottomNav() {
  if (isFormProgressRoute() && state.route !== "form-summary") return "";

  const adminItems = [
    ["actions", "Administración", icons.tasks],
    ["admin-tasks", "Tareas", icons.clipboardCheck],
    ["messages", "Mensajes", icons.message],
    ["profile", "Perfil", icons.profile]
  ];
  const jmItems = [
    ["jm-notifications", "Inicio", icons.home],
    ["jm-zones", "Zonas", icons.branch],
    ["jm-tasks", "Tareas", icons.clipboardCheck],
    ["profile", "Perfil", icons.profile]
  ];
  const techItems = [
    ["tasks", "Mis tareas", icons.tasks],
    ["history", "Continuar", icons.history],
    ["sync", "Sincronizar", icons.sync],
    ["profile", "Perfil", icons.profile]
  ];
  const preventionItems = [
    ["incidents", "Incidencias", icons.alert],
    ["profile", "Perfil", icons.profile]
  ];
  const isLimitedManager = !isAdmin() && canAssignTasks() && canSeeNotifications();
  const isPrevention = isPreventionist();
  const items = isAdmin() ? adminItems : isLimitedManager ? jmItems : isPrevention ? preventionItems : techItems;

  return `
    <nav class="bottom-nav ${isAdmin() ? "admin-nav" : ""} ${isLimitedManager ? "manager-nav" : ""} ${isPrevention ? "prevention-nav" : ""}">
      ${items.map(([route, label, icon]) => `
        <button class="${state.route === route || (route === "actions" && ["admin-users", "admin-user-create", "admin-groups", "procedure-upload"].includes(state.route)) || (route === "admin-tasks" && ["admin-tasks", "admin-assign", "bulk-assign"].includes(state.route)) || (route === "incidents" && state.route === "incident-new") || (route === "jm-notifications" && ["jm-notifications", "jm-pending", "jm-overdue", "jm-urgent", "jm-completed", "jm-technicians", "jm-bitacora-summary"].includes(state.route)) || (route === "jm-tasks" && ["jm-tasks", "admin-assign", "bulk-assign"].includes(state.route)) || (route === "messages" && ["messages", "message-detail"].includes(state.route)) || (route === "profile" && ["profile", "procedures", "procedure-upload"].includes(state.route)) ? "active" : ""}" data-action="route" data-route="${route}">
          ${icon}
          <span>${label}</span>
        </button>
      `).join("")}
    </nav>
  `;
}

function setupSignatureCanvas() {
  const canvases = rootEl.querySelectorAll('[data-role="signature-canvas"]');
  if (!canvases.length) return;

  canvases.forEach((canvas) => {
    const signatureData = canvas.dataset.signatureKind === "technician" ? state.technicianSignatureData : state.paeSignatureData;

    const context = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    context.scale(ratio, ratio);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 3;
    context.strokeStyle = "#0D2B45";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, rect.height);
    canvas.dataset.hasInk = "false";

    if (signatureData) {
      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 0, 0, rect.width, rect.height);
        canvas.dataset.hasInk = "true";
      };
      image.src = signatureData;
    }

    let drawing = false;
    let previousPoint = null;
    const pointFromEvent = (event) => {
      const box = canvas.getBoundingClientRect();
      return {
        x: event.clientX - box.left,
        y: event.clientY - box.top
      };
    };

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      drawing = true;
      previousPoint = pointFromEvent(event);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!drawing || !previousPoint) return;
      event.preventDefault();
      const point = pointFromEvent(event);
      context.beginPath();
      context.moveTo(previousPoint.x, previousPoint.y);
      context.lineTo(point.x, point.y);
      context.stroke();
      previousPoint = point;
      canvas.dataset.hasInk = "true";
    });

    const stopDrawing = (event) => {
      if (!drawing) return;
      event.preventDefault();
      drawing = false;
      previousPoint = null;
    };

    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);
    canvas.addEventListener("pointerleave", stopDrawing);
  });
}

function pdfPreviewHtmlWithZoom(html) {
  const zoom = Math.min(4, Math.max(0.6, Number(state.pdfPreviewZoom || 1)));
  const zoomStyle = `<style id="datacora-pdf-preview-zoom">
    html { background: #e8f0eb; }
    body {
      zoom: ${zoom};
      transform-origin: top left;
    }
  </style>`;

  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${zoomStyle}</head>`);
  return `${zoomStyle}${html}`;
}

function normalizedPdfPreviewZoom(nextZoom) {
  return Math.min(4, Math.max(0.6, Number(nextZoom.toFixed(2))));
}

function applyPdfPreviewZoomToDom(zoom) {
  const frame = rootEl.querySelector('[data-role="pdf-preview-frame"]');
  const label = rootEl.querySelector('[data-role="pdf-preview-zoom-label"]');
  if (label) label.textContent = `${Math.round(zoom * 100)}%`;
  if (frame) {
    frame.style.width = `max(100%, ${Math.max(430, Math.ceil(430 * zoom))}px)`;
    frame.style.minHeight = `${Math.max(1800, Math.ceil(1800 * zoom))}px`;
    frame.srcdoc = pdfPreviewHtmlWithZoom(state.pdfPreviewHtml);
  }
}

function updatePdfPreviewZoom(nextZoom, options = {}) {
  const zoom = normalizedPdfPreviewZoom(nextZoom);
  if (options.silent) {
    setStateSilently({ pdfPreviewZoom: zoom });
    applyPdfPreviewZoomToDom(zoom);
    return;
  }
  setState({ pdfPreviewZoom: zoom });
}

function setupPdfPreviewFrame() {
  if (state.route !== "pdf-preview" || state.pdfPreviewBusy || !state.pdfPreviewHtml) return;
  const frame = rootEl.querySelector('[data-role="pdf-preview-frame"]');
  if (frame) frame.srcdoc = pdfPreviewHtmlWithZoom(state.pdfPreviewHtml);
}

function touchDistance(touches) {
  if (!touches || touches.length < 2) return 0;
  const [first, second] = touches;
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

function setupPdfPreviewPinchZoom() {
  if (state.route !== "pdf-preview" || state.pdfPreviewBusy || !state.pdfPreviewHtml) return;
  const shell = rootEl.querySelector('[data-role="pdf-preview-shell"]');
  if (!shell) return;
  let startDistance = 0;
  let startZoom = state.pdfPreviewZoom || 1;
  let lastZoom = startZoom;

  shell.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 2) return;
    startDistance = touchDistance(event.touches);
    startZoom = state.pdfPreviewZoom || 1;
    lastZoom = startZoom;
  }, { passive: true });

  shell.addEventListener("touchmove", (event) => {
    if (event.touches.length !== 2 || !startDistance) return;
    event.preventDefault();
    const nextDistance = touchDistance(event.touches);
    const nextZoom = normalizedPdfPreviewZoom(startZoom * (nextDistance / startDistance));
    if (Math.abs(nextZoom - lastZoom) < 0.04) return;
    lastZoom = nextZoom;
    updatePdfPreviewZoom(nextZoom, { silent: true });
  }, { passive: false });

  shell.addEventListener("touchend", () => {
    startDistance = 0;
  }, { passive: true });
}

function setupFieldErrorHighlights() {
  (state.fieldErrorRoles ?? []).forEach((role) => {
    const element = rootEl.querySelector(`[data-role="${role}"]`);
    const control = element?.closest(".field-control, .photo-field");
    if (!control) return;
    control.classList.add("field-control-error");
    control.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

function render() {
  if (!state.isAuthenticated) {
    rootEl.innerHTML = loginScreen();
    return;
  }

  if (isPasswordChangeRequired() && state.route !== "password-change") {
    state.route = "password-change";
  }

  if (isTaskCompleted() && state.route.startsWith("form") && state.route !== "form-summary") {
    state.route = "form-summary";
  }

  if (isFormProgressRoute() && state.route !== "form-summary" && !isTaskCompleted()) {
    const task = selectedTask();
    if (!locationEvidenceForTask(task?.id).start) state.route = "detail";
  }

  const screens = {
    tasks: tasksScreen,
    detail: detailScreen,
    form: formPlaceholderScreen,
    "form-summary": formSummaryScreen,
    "pdf-preview": pdfPreviewScreen,
    "form-heat": heatFormScreen,
    "form-electricity": electricityFormScreen,
    "form-cold": coldFormScreen,
    "form-vectors": vectorsFormScreen,
    "form-water": waterFormScreen,
    "form-infrastructure": infrastructureFormScreen,
    "form-pae-manager": paeManagerFormScreen,
    "technician-signature-preview": technicianSignaturePreviewScreen,
    "form-mpa": mpaFormScreen,
    "form-service-yard": serviceYardFormScreen,
    "form-rbd-checkers": rbdCheckersFormScreen,
    "form-section": genericFormSectionScreen,
    history: historyScreen,
    sync: syncScreen,
    incidents: incidentsScreen,
    "incident-detail": incidentDetailScreen,
    "incident-new": incidentFormScreen,
    "incident-success": incidentSuccessScreen,
    messages: messagesScreen,
    "message-detail": messageDetailScreen,
    procedures: proceduresScreen,
    "procedure-upload": procedureUploadScreen,
    profile: profileScreen,
    actions: actionsScreen,
    "jm-notifications": jmNotificationsScreen,
    "jm-zones": jmZonesScreen,
    "jm-tasks": jmTasksScreen,
    "jm-pending": () => jmDashboardScreen("pending"),
    "jm-overdue": () => jmDashboardScreen("overdue"),
    "jm-urgent": () => jmDashboardScreen("urgent"),
    "jm-completed": () => jmDashboardScreen("completed"),
    "jm-technicians": () => jmDashboardScreen("technicians"),
    "jm-bitacora-summary": jmBitacoraSummaryScreen,
    "bulk-assign": bulkAssignScreen,
    "admin-users": adminUsersScreen,
    "admin-user-create": adminUserCreateScreen,
    "admin-groups": adminGroupsScreen,
    "admin-assign": adminAssignScreen,
    "password-change": changePasswordScreen
  };

  const fallbackRoute = defaultRouteFor(loggedUser());
  rootEl.innerHTML = (screens[state.route] ?? screens[fallbackRoute])() + imagePreviewOverlay() + articlePickerOverlay() + successToast() + gpsDebugFloatingPanel() + assignmentConflictOverlay();
  setupSignatureCanvas();
  setupPdfPreviewFrame();
  setupPdfPreviewPinchZoom();
  setupFieldErrorHighlights();
  if (state.articlePicker?.section) {
    window.setTimeout(focusArticlePickerSearch, 0);
  }
  if (state.route === "form-summary") {
    scheduleMissingOneDriveBackup(selectedTask());
  }
  if (state.route === "jm-bitacora-summary") {
    loadSelectedSubmissionDetailForManager();
    window.setTimeout(initializeBitacoraLocationMap, 0);
  }
  if (state.route === "jm-notifications") {
    scheduleMaintenanceAlertsRefresh();
  }
  if (state.route === "incident-detail") {
    loadSelectedIncidentPlanDetail();
  }
  if (state.route === "message-detail") {
    startMessageDetailAutoRefresh();
  } else {
    stopMessageDetailAutoRefresh();
  }

  startGpsDebugMonitor();
  refreshGpsDebugFloatingPanel();
}

rootEl.addEventListener("click", async (event) => {
  const element = event.target.closest("[data-action]");
  if (!element) return;

  const action = element.dataset.action;

  if (action === "technician-overdue-filter") {
    const selectedCriticality = String(element.dataset.criticality || "");
    setState({
      technicianOverdueCriticality:
        state.technicianOverdueCriticality === selectedCriticality
          ? ""
          : selectedCriticality
    });
    return;
  }

  if (action === "jm-overdue-filter") {
    const selectedCriticality = String(element.dataset.criticality || "");
    setState({
      jmOverdueCriticality:
        state.jmOverdueCriticality === selectedCriticality
          ? ""
          : selectedCriticality
    });
    return;
  }


  if (action === "clear-section-responses") {
    clearResponsesForSection(element.dataset.section);
    return;
  }


  if (action === "toggle-gps-debug") {
    toggleGpsDebugPanel();
    return;
  }

  if (action === "download-bitacora-photos") {
    await downloadBitacoraPhotosZip(selectedTask());
    return;
  }


  if (state.isAuthenticated && isFormProgressRoute()) {
    persistActiveFormProgressNow();
  }

  if (action === "open-image-preview") {
    setState({
      imagePreview: {
        src: element.dataset.src || "",
        title: element.dataset.title || "Fotografía",
        subtitle: element.dataset.subtitle || ""
      }
    });
    return;
  }
  if (action === "close-image-preview") {
    setState({ imagePreview: null });
    return;
  }
  if (action === "none") return;
  if (action === "open-article-picker") {
    openArticlePicker(element.dataset.section, element.dataset.title);
    return;
  }
  if (action === "close-article-picker") {
    closeArticlePicker();
    return;
  }
  if (action === "select-article-option") {
    selectArticleOption(element.dataset.section, element.dataset.articleId);
    return;
  }
  if (action === "add-installed-article") {
    addInstalledArticleToDraft(element.dataset.section);
    return;
  }
  if (action === "remove-installed-article") {
    removeInstalledArticleFromDraft(element.dataset.articleId);
    return;
  }
  if (action === "increase-installed-article") {
    adjustInstalledArticleQuantity(element.dataset.articleId, 1);
    return;
  }
  if (action === "decrease-installed-article") {
    adjustInstalledArticleQuantity(element.dataset.articleId, -1);
    return;
  }
  if (action === "remove-evidence-photo") {
    removeEvidencePhoto(element.dataset.role || "", Number(element.dataset.index));
    return;
  }

  if (action === "login") attemptLogin();
  if (action === "logout") {
    returnToLogin("");
  }
  if (action === "force-login") {
    returnToLogin("Ingresa nuevamente para continuar.");
    return;
  }
  if (isPasswordChangeRequired() && !["logout", "force-login", "save-password"].includes(action)) {
    setState({ route: "password-change" });
    return;
  }
  if (action === "back") {
    const route = element.dataset.route;
    if (route) {
      if (route !== state.route && !confirmLeaveFormIfNeeded()) return;
      if (state.route === "form" || state.route.startsWith("form-") || state.route === "technician-signature-preview") {
        if (route === "detail" || route === "tasks") clearTaskLocationGate();
      }
      setState({
        route,
        jmOverdueCriticality: route === "jm-overdue" ? state.jmOverdueCriticality : ""
      });
      if (route === "incidents") refreshSupabaseIncidents({ silent: true, render: true });
      if (route === "messages") refreshAppMessages({ silent: true });
      if (route === "procedures") refreshProcedures({ silent: true });
      if (route === "jm-notifications") refreshMaintenanceAlerts({ silent: true });
      return;
    }
    navigateBack();
    return;
  }
  if (action === "route") {
    const route = element.dataset.route;
    if (route !== state.route && !confirmLeaveFormIfNeeded()) return;
    setState({
      route,
      jmOverdueCriticality: route === "jm-overdue" ? state.jmOverdueCriticality : ""
    });
    if (route === "incidents") refreshSupabaseIncidents({ silent: true, render: true });
    if (route === "messages") refreshAppMessages({ silent: true });
    if (route === "procedures") refreshProcedures({ silent: true });
    if (route === "jm-notifications") refreshMaintenanceAlerts({ silent: true });
    return;
  }
  if (action === "save-form-progress") {
    saveFormProgressManually();
    return;
  }
  if (action === "check-permissions") {
    checkRequiredPermissions();
    return;
  }
  if (action === "run-diagnostic") {
    runConnectionDiagnostic();
    return;
  }
  if (action === "refresh-messages") {
    refreshAppMessages({ silent: false, manual: true });
    return;
  }
  if (action === "refresh-maintenance-alerts") {
    refreshMaintenanceAlerts({ silent: false, manual: true });
    return;
  }
  if (action === "resolve-maintenance-alert") {
    resolveMaintenanceAlert(element.dataset.alertId || "");
    return;
  }
  if (action === "open-app-message") {
    openAppMessage(element.dataset.messageId || "");
    return;
  }
  if (action === "send-app-message") {
    sendAppMessage();
    return;
  }
  if (action === "send-app-message-reply") {
    sendAppMessageReply();
    return;
  }
  if (action === "refresh-procedures") {
    refreshProcedures({ silent: false, manual: true });
    return;
  }
  if (action === "open-procedure") {
    openProcedure(element.dataset.procedureId || "");
    return;
  }
  if (action === "procedure-audience") {
    loadProcedureAudience(element.dataset.procedureId || "");
    return;
  }
  if (action === "edit-procedure") {
    startEditProcedure(element.dataset.procedureId || "");
    return;
  }
  if (action === "delete-procedure") {
    deleteProcedure(element.dataset.procedureId || "");
    return;
  }
  if (action === "submit-procedure") {
    submitProcedure();
    return;
  }
  if (action === "clear-procedure-upload") {
    setState({ procedureUploadDraft: emptyProcedureUploadDraft(), procedureUploadError: "", procedureEditingId: "" });
    return;
  }
  if (action === "messages") {
    setState({ route: "messages" });
    refreshAppMessages({ silent: true });
    return;
  }
  if (action === "incidents") {
    setState({ route: "incidents", incidentError: "" });
    refreshSupabaseIncidents({ silent: true, render: true });
    return;
  }
  if (action === "incident-detail") {
    const incidentId = element.dataset.incidentId || "";
    const nextLoadedIds = { ...state.incidentPlanLoadedIds };
    delete nextLoadedIds[incidentId];
    setState({ selectedIncidentId: incidentId, incidentPlanLoadedIds: nextLoadedIds, incidentPlanError: "", route: "incident-detail" });
    return;
  }
  if (action === "incident-new") {
    setState({ incidentDraft: emptyIncidentDraft(), incidentStep: 1, incidentError: "", route: "incident-new" });
    return;
  }
  if (action === "select-incident-type") {
    setState({
      incidentDraft: {
        ...currentIncidentDraft(),
        type: element.dataset.type || "Emergencia (inmediata)"
      },
      incidentError: ""
    });
    return;
  }
  if (action === "select-incident-establishment") {
    const rbd = element.dataset.rbd || "";
    const draft = currentIncidentDraft();
    const selected = establishmentsByBranch(draft.branch).find((item) => item.rbd === rbd);
    if (!selected) return;
    setState({
      incidentDraft: {
        ...draft,
        selectedRbd: selected.rbd,
        rbdSearch: establishmentLabel(selected)
      },
      incidentError: ""
    });
    return;
  }
  if (action === "incident-prev") {
    setState({ incidentDraft: currentIncidentDraft(), incidentStep: Math.max(1, state.incidentStep - 1), incidentError: "" });
    return;
  }
  if (action === "incident-next") {
    const draft = currentIncidentDraft();
    const step = Math.min(Math.max(Number(state.incidentStep) || 1, 1), 4);
    const establishment = establishmentsByBranch(draft.branch).find((item) => item.rbd === draft.selectedRbd);
    if (step === 1 && !establishment) {
      setState({ incidentDraft: draft, incidentError: "Selecciona un RBD v?lido para continuar." });
      return;
    }
    if (step === 2 && !draft.type) {
      setState({ incidentDraft: draft, incidentError: "Selecciona el tipo de incidencia." });
      return;
    }
    if (step === 3 && (!draft.title || !draft.description)) {
      setState({ incidentDraft: draft, incidentError: "Completa t?tulo y descripci?n para continuar." });
      return;
    }
    setState({ incidentDraft: draft, incidentStep: Math.min(4, step + 1), incidentError: "" });
    return;
  }
  if (action === "jm-completed") {
    setState({ route: "jm-completed", jmOverdueCriticality: "" });
    return;
  }
  if (action === "download-completed-bitacoras-excel") {
    await downloadCompletedBitacorasExcel();
    return;
  }
  if (action === "toggle-jm-zone") {
    const zone = element.dataset.zone || "";
    setState({ expandedJmZone: state.expandedJmZone === zone ? "" : zone });
  }
  if (action === "actions") setState({ route: "actions" });
  if (action === "admin-users") setState({ route: "admin-users" });
  if (action === "admin-user-create") setState({ route: "admin-user-create" });
  if (action === "jm-notifications") setState({ route: "jm-notifications" });
  if (action === "download-bulk-template") downloadBulkTemplate();
  if (action === "tasks") {
    if (!confirmLeaveFormIfNeeded()) return;
    clearTaskLocationGate();
    setState({ route: "tasks" });
  }
  if (action === "refresh-tasks") refreshSupabaseTasks({ silent: false, notify: true, manual: true });
  if (action === "refresh-incidents") refreshSupabaseIncidents({ silent: false, manual: true });
  if (action === "detail") {
    if (!confirmLeaveFormIfNeeded()) return;
    clearTaskLocationGate();
    setState({ route: "detail" });
  }
  if (action === "form") {
    await openTaskFormAfterLocationCheck();
    return;
  }
  if (action === "form-summary") setState({ route: "form-summary" });
  if (action === "open-pae-pdf") openPaePdf();
  if (action === "pdf-zoom-out") {
    updatePdfPreviewZoom((state.pdfPreviewZoom || 1) - 0.15);
    return;
  }
  if (action === "pdf-zoom-in") {
    updatePdfPreviewZoom((state.pdfPreviewZoom || 1) + 0.15);
    return;
  }
  if (action === "pdf-zoom-reset") {
    updatePdfPreviewZoom(1);
    return;
  }
  if (action === "download-jm-bitacora-pdf") {
    downloadJmBitacoraPdf();
    return;
  }
  if (action === "upload-pae-pdf") uploadPaePdfToOneDrive();
  if (action === "technician-signature-preview") startTechnicianSignaturePreview();
  if (action === "open-form-section") {
    await openFormSectionAfterLocationCheck(element.dataset.section);
    return;
  }
  if (action === "filter") {
    const nextFilter = element.dataset.filter;
    setState({
      filter: nextFilter,
      technicianOverdueCriticality: nextFilter === "Atrasadas"
        ? state.technicianOverdueCriticality
        : ""
    });
  }
  if (action === "jm-bitacora-summary") {
    const taskId = element.dataset.taskId;
    const task = tasks.find((item) => item.id === taskId);
    const submissionId = task?.submissionId;
    const nextLoadedIds = { ...state.submissionDetailLoadedIds };
    const nextAttempts = { ...state.submissionPhotoLoadAttempts };
    if (submissionId && !allEvidencePhotoRecords(task).length) {
      delete nextLoadedIds[submissionId];
      delete nextAttempts[submissionId];
    }
    setState({
      selectedTaskId: taskId,
      route: "jm-bitacora-summary",
      submissionDetailError: "",
      submissionDetailLoadedIds: nextLoadedIds,
      submissionPhotoLoadAttempts: nextAttempts,
      ...formProgressStateForTask(taskId)
    });
  }
  if (action === "reload-bitacora-photos") {
    const task = selectedTask();
    const submissionId = task?.submissionId;
    if (submissionId) {
      const nextLoadedIds = { ...state.submissionDetailLoadedIds };
      const nextAttempts = { ...state.submissionPhotoLoadAttempts };
      const nextWarnings = { ...state.submissionPhotoWarnings };
      delete nextLoadedIds[submissionId];
      delete nextAttempts[submissionId];
      delete nextWarnings[submissionId];
      setState({
        submissionDetailLoadedIds: nextLoadedIds,
        submissionPhotoLoadAttempts: nextAttempts,
        submissionPhotoWarnings: nextWarnings
      });
    }
  }
  if (action === "task-detail") {
    persistCurrentTaskProgress();
    clearTaskLocationGate();
    const taskId = element.dataset.taskId;
    setState({
      selectedTaskId: taskId,
      route: "detail",
      formValidationMessages: [],
      ...formProgressStateForTask(taskId),
      editingHeatIndex: -1,
      heatError: "",
      editingElectricityIndex: -1,
      electricityError: "",
      editingColdIndex: -1,
      coldError: "",
      editingWaterIndex: -1,
      waterError: "",
      editingInfrastructureIndex: -1,
      infrastructureError: "",
      paeManagerError: "",
      paeSignatureError: "",
      paeSignatureModalOpen: false,
      technicianSignatureError: "",
      technicianSignatureModalOpen: false,
      mpaError: "",
      serviceYardError: "",
      rbdCheckersError: "",
      editingVectorsIndex: -1,
      vectorsError: "",
      editingUsedItemIndex: -1,
      usedItemsError: ""
    });
  }
  if (action === "toggle-user") {
    setState({ expandedUserId: state.expandedUserId === element.dataset.userId ? "" : element.dataset.userId });
  }
  if (action === "toggle-group") {
    setState({ expandedGroup: state.expandedGroup === element.dataset.group ? "" : element.dataset.group });
  }
  if (action === "select-technician-rbd") {
    const selected = establishments.find((item) => String(item.rbd) === String(element.dataset.rbd));
    setState({
      technicianSelectedRbd: String(element.dataset.rbd || ""),
      technicianRbdSearch: establishmentLabel(selected)
    });
    return;
  }

  if (action === "clear-technician-rbd-filter") {
    setState({
      technicianSelectedRbd: "",
      technicianRbdSearch: ""
    });
    return;
  }

  if (action === "select-establishment") {
    const formState = currentAssignFormState();
    const selectedBranch = formState.assignBranch || selectedAssignBranch(loggedUser());
    const selected = establishmentsByBranch(selectedBranch)
      .filter((item) => !isCasaMatrizEstablishment(item))
      .find((item) => item.rbd === element.dataset.rbd);
    if (!selected) {
      setState({
        ...formState,
        assignSelectedRbd: "",
        assignRbdSearch: "",
        assignTechnician: "",
        actionMessage: "El RBD seleccionado no pertenece a la zona activa."
      });
      return;
    }
    const draft = assignmentDraftSnapshot();
    const conflict = openScheduledTaskForRbd(element.dataset.rbd, state.assignEditingTaskId);

    setState({
      ...formState,
      assignBranch: selectedBranch,
      assignSelectedRbd: element.dataset.rbd,
      assignRbdSearch: establishmentLabel(selected),
      assignTechnician: selected?.branch === users.find((user) => user.usuario === state.assignTechnician)?.sucursal
        ? state.assignTechnician
        : "",
      assignConflictTaskId: conflict?.id || "",
      assignConflictDraft: conflict ? draft : null,
      actionMessage: ""
    });
  }
  if (action === "user-status") updateUserStatus(element.dataset.userId, element.dataset.status, element.dataset.reason);
  if (action === "save-user") saveUserDetails(element.dataset.userId);
  if (action === "reset-user-password") resetUserPassword(element.dataset.userId);
  if (action === "delete-user") deleteUser(element.dataset.userId);
  if (action === "create-user") createUser();
  if (action === "create-group") createGroup();
  if (action === "submit-incident") submitIncident();
  if (action === "create-task-from-incident") createTaskFromIncident(element.dataset.incidentId);
  if (action === "cancel-assignment-conflict") cancelAssignmentConflict();
  if (action === "edit-existing-assignment") beginEditingScheduledTask(element.dataset.taskId);
  if (action === "assign-task") assignTask();
  if (action === "register-heat-element") registerHeatElement();
  if (action === "advance-electricity") {
    const draft = currentHeatDraftFromForm();
    const hadDraftInput = hasRecordDraftInput(draft);
    const registeredDraft = autoRegisterCompleteRecordDraft("heat");
    if (hadDraftInput && !registeredDraft) {
      registerHeatElement();
      return;
    }
    persistCurrentTaskProgress();
    setState({ route: "form-electricity", electricityError: "" });
  }
  if (action === "register-electricity-element") registerElectricityElement();
  if (action === "register-cold-element") registerColdElement();
  if (action === "register-vectors-element") registerVectorsElement();
  if (action === "register-used-item") registerUsedItem();
  if (action === "register-water-element") registerWaterElement();
  if (action === "register-infrastructure-element") registerInfrastructureElement();
  if (action === "edit-record") editRegisteredRecord(element.dataset.section, element.dataset.index);
  if (action === "delete-record") deleteRegisteredRecord(element.dataset.section, element.dataset.index);
  if (action === "finish-electricity") {
    const draft = currentElectricityDraftFromForm();
    const hadDraftInput = hasRecordDraftInput(draft);
    const registeredDraft = autoRegisterCompleteRecordDraft("electricity");
    if (hadDraftInput && !registeredDraft) {
      registerElectricityElement();
      return;
    }
    persistCurrentTaskProgress();
    const nextSection = nextSectionAfter("electricity");
    if (nextSection) openSectionRoute(nextSection.id);
    showSuccessToast("sección Electricidad completada", nextSection ? `Continuando con ${nextSection.title}.` : "El avance quedó registrado en el formulario.");
  }
  if (action === "advance-next-section") {
    persistCurrentTaskProgress();
    const nextSection = nextSectionAfter(state.activeFormSection);
    if (nextSection) openSectionRoute(nextSection.id);
    else setState({ route: "form" });
  }
  if (action === "finish-cold") {
    const draft = currentColdDraftFromForm();
    const hadDraftInput = hasRecordDraftInput(draft);
    const registeredDraft = autoRegisterCompleteRecordDraft("cold");
    if (hadDraftInput && !registeredDraft) {
      registerColdElement();
      return;
    }
    persistCurrentTaskProgress();
    const nextSection = nextSectionAfter("cold");
    if (nextSection) openSectionRoute(nextSection.id);
    showSuccessToast("sección Frío completada", nextSection ? `Continuando con ${nextSection.title}.` : "El avance quedó registrado en el formulario.");
  }
  if (action === "finish-vectors") {
    const draft = currentVectorsDraftFromForm();
    const hadDraftInput = hasSimpleRecordDraftInput(draft);
    const registeredDraft = autoRegisterCompleteRecordDraft("vectors");
    if (hadDraftInput && !registeredDraft) {
      registerVectorsElement({ showToast: false });
      return;
    }
    persistCurrentTaskProgress();
    const nextSection = nextSectionAfter("vectors");
    if (nextSection) openSectionRoute(nextSection.id);
    showSuccessToast("sección Vectores completada", nextSection ? `Continuando con ${nextSection.title}.` : "El avance quedó registrado en el formulario.");
  }
  if (action === "finish-water") {
    const draft = currentWaterDraftFromForm();
    const hadDraftInput = hasRecordDraftInput(draft);
    const registeredDraft = autoRegisterCompleteRecordDraft("water");
    if (hadDraftInput && !registeredDraft) {
      registerWaterElement();
      return;
    }
    persistCurrentTaskProgress();
    const nextSection = nextSectionAfter("water");
    if (nextSection) openSectionRoute(nextSection.id);
    showSuccessToast("sección Agua completada", nextSection ? `Continuando con ${nextSection.title}.` : "El avance quedó registrado en el formulario.");
  }
  if (action === "finish-infrastructure") {
    const draft = currentInfrastructureDraftFromForm();
    const hadDraftInput = hasRecordDraftInput(draft);
    const registeredDraft = autoRegisterCompleteRecordDraft("infrastructure");
    if (hadDraftInput && !registeredDraft) {
      registerInfrastructureElement();
      return;
    }
    persistCurrentTaskProgress();
    const nextSection = nextSectionAfter("infrastructure");
    if (nextSection) openSectionRoute(nextSection.id);
    showSuccessToast("sección Infraestructura completada", nextSection ? `Continuando con ${nextSection.title}.` : "El avance quedó registrado en el formulario.");
  }
  if (action === "save-pae-manager") savePaeManagerInformation();
  if (action === "finish-pae-manager") finishPaeManagerSection();
  if (action === "open-signature-pad") setState({ paeSignatureModalOpen: true, paeSignatureError: "" });
  if (action === "close-signature-pad") setState({ paeSignatureModalOpen: false });
  if (action === "open-technician-signature-pad") setState({ technicianSignatureModalOpen: true, technicianSignatureError: "" });
  if (action === "close-technician-signature-pad") setState({ technicianSignatureModalOpen: false });
  if (action === "clear-signature-pad") {
    const canvas = rootEl.querySelector('[data-role="signature-canvas"]');
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      const rect = canvas.getBoundingClientRect();
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, rect.width, rect.height);
      canvas.dataset.hasInk = "false";
    }
  }
  if (action === "save-signature-pad") savePaeSignature();
  if (action === "delete-signature") setState({ paeSignatureData: "", paeSignatureError: "", paeSignatureModalOpen: false });
  if (action === "save-technician-signature-pad") saveTechnicianSignature();
  if (action === "delete-technician-signature") setState({ technicianSignatureData: "", technicianSignatureError: "", technicianSignatureModalOpen: false });
  if (action === "confirm-form-submit") confirmFormSubmit();
  if (action === "save-mpa") finishMpaSection(true);
  if (action === "finish-mpa") finishMpaSection();
  if (action === "save-service-yard") finishServiceYardSection(true);
  if (action === "finish-service-yard") finishServiceYardSection();
  if (action === "save-rbd-checkers") finishRbdCheckersSection(true);
  if (action === "finish-rbd-checkers") finishRbdCheckersSection();
  if (action === "finish-used-items") finishUsedItemsSection();
  if (action === "save-password") savePassword();
  if (action === "close-toast") closeSuccessToast();
  if (action === "open-generated-download") openLastGeneratedDownload();
  if (action === "sync-now") syncPendingSubmissions();
  if (action === "clear-jm-completed-filters") {
    setState({
      jmCompletedFilters: {
        search: "",
        rbd: "",
        folio: "",
        technician: "",
        branch: "",
        submittedFrom: "",
        submittedTo: ""
      }
    });
  }
});

rootEl.addEventListener("input", (event) => {
  const element = event.target;
  const jmCompletedInputMap = {
    "jm-completed-search": "search",
    "jm-completed-rbd": "rbd",
    "jm-completed-folio": "folio"
  };
  const jmCompletedInputField = jmCompletedInputMap[element?.dataset?.role];
  if (jmCompletedInputField) {
    const value = element.value;
    updateJmCompletedFilter(jmCompletedInputField, value);
    const nextInput = rootEl.querySelector(`[data-role="${element.dataset.role}"]`);
    nextInput?.focus({ preventScroll: true });
    nextInput?.setSelectionRange(value.length, value.length);
    return;
  }
  if (element?.matches('[data-role="procedure-search"]')) {
    const value = element.value;
    setState({ procedureSearch: value });
    const nextInput = rootEl.querySelector('[data-role="procedure-search"]');
    nextInput?.focus({ preventScroll: true });
    nextInput?.setSelectionRange(value.length, value.length);
    return;
  }
  if (element?.matches('[data-role="technician-rbd-search"]')) {
    const value = element.value;

    setState({
      technicianRbdSearch: value,
      technicianSelectedRbd: ""
    });

    const nextInput = rootEl.querySelector('[data-role="technician-rbd-search"]');
    nextInput?.focus({ preventScroll: true });
    nextInput?.setSelectionRange(value.length, value.length);
    return;
  }
  if (element?.matches('[data-role="maintenance-alert-resolution-date"]')) {
    state.maintenanceAlertResolutionDates = {
      ...state.maintenanceAlertResolutionDates,
      [element.dataset.alertId || ""]: element.value
    };
    return;
  }
  if (element?.matches("[data-procedure-upload]")) {
    state.procedureUploadDraft = {
      ...state.procedureUploadDraft,
      [element.dataset.procedureUpload]: element.value
    };
    state.procedureUploadError = "";
  }
  if (element?.matches("[data-message-reply]")) {
    state.messageReplyDraft = element.value;
    state.messageDetailError = "";
  }
  if (element?.matches("[data-message-draft]")) {
    state.messageDraft = {
      ...state.messageDraft,
      [element.dataset.messageDraft]: element.value
    };
    state.messageError = "";
  }
  if (element?.matches('[data-role="user-create-input"]')) {
    if (element.dataset.field === "rut") normalizeRutInputElement(element);
    state.userCreateDraft = currentUserCreateDraft();
    state.userCreateError = "";
  }
  if (element?.matches('[data-role="user-edit-rut"]')) {
    normalizeRutInputElement(element);
    state.actionMessage = "";
  }
  if (element?.matches('[data-role="new-password"]')) {
    updatePasswordRulesPreview(element.value);
  }
  if (element?.matches('[data-role="pae-manager-input"]')) {
    const value = element.dataset.field === "rut"
      ? formatRut(element.value)
      : element.dataset.field === "role"
        ? normalizePaeManagerRole(element.value)
        : element.value;
    if (element.dataset.field === "rut" && element.value !== value) {
      element.value = value;
      updatePaeRutValidationMessage(value);
    }
    if (element.dataset.field === "rut") updatePaeRutValidationMessage(value);
    state.paeManagerDraft[element.dataset.field] = value;
    state.paeManagerError = "";
  }
  scheduleActiveFormProgressSave();
});

rootEl.addEventListener("change", (event) => {
  const element = event.target;
  const jmCompletedChangeMap = {
    "jm-completed-technician": "technician",
    "jm-completed-branch": "branch",
    "jm-completed-submitted-from": "submittedFrom",
    "jm-completed-submitted-to": "submittedTo"
  };
  const jmCompletedChangeField = jmCompletedChangeMap[element?.dataset?.role];
  if (jmCompletedChangeField) {
    updateJmCompletedFilter(jmCompletedChangeField, element.value);
    return;
  }
  if (element?.matches("[data-message-draft]")) {
    setState({
      messageDraft: {
        ...state.messageDraft,
        [element.dataset.messageDraft]: element.value
      },
      messageError: ""
    });
    return;
  }
  if (element?.matches('[data-role="procedure-target-role"]')) {
    setState({
      procedureUploadDraft: {
        ...state.procedureUploadDraft,
        targetRoles: Array.from(rootEl.querySelectorAll('[data-role="procedure-target-role"]:checked')).map((item) => item.value)
      },
      procedureUploadError: ""
    });
    return;
  }
  if (element?.matches('[data-role="procedure-file"]')) {
    const file = element.files?.[0];
    element.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setState({ procedureUploadError: "El archivo no puede superar 8 MB." });
      return;
    }
    blobToBase64(file)
      .then((fileBase64) => {
        setState({
          procedureUploadDraft: {
            ...state.procedureUploadDraft,
            fileName: file.name,
            fileMime: file.type || "application/octet-stream",
            fileBase64
          },
          procedureUploadError: ""
        });
      })
      .catch((error) => {
        setState({ procedureUploadError: error.message || "No se pudo leer el archivo seleccionado." });
      });
    return;
  }
  if (element?.closest('[data-role="create-user-form"]')) {
    if (element?.matches('[name="rut"]')) normalizeRutInputElement(element);
    state.userCreateDraft = currentUserCreateDraft();
    state.userCreateError = "";
  }
  if (element?.matches('[data-role="user-edit-rut"]')) {
    normalizeRutInputElement(element);
    state.actionMessage = "";
  }
  if (element?.matches('[data-role="incident-photos"]')) {
    const baseDraft = currentIncidentDraft();
    const currentPhotos = Array.isArray(baseDraft.photos) ? baseDraft.photos : [];
    const availableSlots = Math.max(0, 4 - currentPhotos.length);
    const files = Array.from(element.files ?? []).filter((file) => file.type.startsWith("image/")).slice(0, availableSlots);
    element.value = "";
    if (!availableSlots) {
      setState({ incidentDraft: baseDraft, incidentError: "Puedes adjuntar un máximo de 4 fotografías." });
      return;
    }
    Promise.all(files.map(async (file) => ({
      name: file.name,
      dataUrl: await fileToDataUrl(file)
    }))).then((photos) => {
      setState({
        incidentDraft: {
          ...baseDraft,
          photos: [...currentPhotos, ...photos].slice(0, 4)
        },
        incidentError: ""
      });
    });
  }
  if (element?.matches('[data-role="bulk-task-file"]')) {
    importBulkTasks(element.files?.[0]);
    element.value = "";
  }
  if (element?.matches('[data-role$="-article-search"]')) {
    const role = element.dataset.role.replace(/-article-search$/, "");
    const articleId = articleIdFromSearchValue(element.value);
    const hiddenInput = rootEl.querySelector(`[data-role="${role}-article"]`);
    if (hiddenInput) hiddenInput.value = articleId;
    if (articleId || !element.value.trim()) {
      updateArticleDraftByRole(role, articleId);
    }
  }
  if (element?.matches('[data-role="assign-technician"]')) {
    setState({ ...currentAssignFormState(), assignTechnician: element.value, actionMessage: "" });
  }
  if (element?.matches('[data-role="assign-branch"]')) {
    setState({
      ...currentAssignFormState(),
      assignBranch: element.value,
      assignTechnician: "",
      assignRbdSearch: "",
      assignSelectedRbd: "",
      assignConflictTaskId: "",
      assignConflictDraft: null,
      actionMessage: ""
    });
  }
  if (element?.matches('[data-role="assign-type"]')) {
    setState({ ...currentAssignFormState(), assignType: element.value, actionMessage: "" });
  }
  if (element?.matches('[data-role="assign-priority"]')) {
    setState({ ...currentAssignFormState(), assignPriority: element.value, actionMessage: "" });
  }
  if (element?.matches('[data-role="incident-branch"]')) {
    setState({
      incidentDraft: {
        ...currentIncidentDraft(),
        branch: element.value,
        rbdSearch: "",
        selectedRbd: ""
      },
      incidentError: ""
    });
  }
  if (element?.matches('[data-role="incident-input"]')) {
    setState({
      incidentDraft: {
        ...currentIncidentDraft(),
        [element.dataset.field]: element.value
      },
      incidentError: ""
    });
  }
  if (element?.matches('[data-role="assign-section-toggle"]')) {
    const nextState = currentAssignFormState();
    const sectionId = element.value;
    if (element.name === "requiredSections" && element.checked && !nextState.assignSectionMinimums[sectionId]) {
      const section = formSectionDefinitions.find((item) => item.id === sectionId);
      nextState.assignSectionMinimums[sectionId] = section?.minimum ?? 1;
    }
    setState({ ...nextState, actionMessage: "" });
  }
  if (element?.matches('[data-role="heat-element"]')) {
    const sites = heatSitesForElement(element.value);
    updateHeatDraft({
      ...currentHeatDraftFromForm(),
      element: element.value,
      site: sites.length === 1 ? sites[0] : "",
      otherSite: "",
      hasSecSeal: element.value && element.value !== "Caseta De Gas" ? state.heatDraft.hasSecSeal : "",
      flexibleHasExpiration: element.value === "Flexibles, filtraciones y conexiones de gas" ? state.heatDraft.flexibleHasExpiration : "",
      flexibleExpirationDate: element.value === "Flexibles, filtraciones y conexiones de gas" ? state.heatDraft.flexibleExpirationDate : "",
      flexibleHasQr: element.value === "Flexibles, filtraciones y conexiones de gas" ? state.heatDraft.flexibleHasQr : "",
      evidenceName: state.heatDraft.evidenceName
    });
  }
  if (element?.matches('[data-role="heat-site"]')) {
    updateHeatDraft({
      ...currentHeatDraftFromForm(),
      site: element.value,
      otherSite: element.value === "Otro" ? state.heatDraft.otherSite : ""
    });
  }
  if (element?.matches('[data-role="heat-action"]')) {
    const draft = currentHeatDraftFromForm();
    updateHeatDraft({ ...draft, action: element.value });
  }
  if (element?.matches('[data-role="heat-article"]')) {
    updateHeatDraft({ ...currentHeatDraftFromForm(), ...selectedArticleDraftFields(element.value) });
  }
  if (element?.matches('[data-role="heat-sec-seal"]')) {
    updateHeatDraft({ ...currentHeatDraftFromForm(), hasSecSeal: element.value });
  }
  if (element?.matches('[data-role="heat-flexible-expiration"]')) {
    updateHeatDraft({
      ...currentHeatDraftFromForm(),
      flexibleHasExpiration: element.value,
      flexibleExpirationDate: element.value === "Sí" ? state.heatDraft.flexibleExpirationDate : ""
    });
  }
  if (element?.matches('[data-role="heat-flexible-qr"]')) {
    updateHeatDraft({ ...currentHeatDraftFromForm(), flexibleHasQr: element.value });
  }
  if (element?.matches('[data-role="heat-evidence"]')) {
    handleEvidenceFileSelection(element, currentHeatDraftFromForm, updateHeatDraft);
    return;
  }
  if (element?.matches('[data-role="electricity-element"]')) {
    const sites = electricitySitesForElement(element.value);
    updateElectricityDraft({
      ...currentElectricityDraftFromForm(),
      element: element.value,
      site: sites.length === 1 ? sites[0] : "",
      otherSite: "",
      distributionBoxType: "",
      distributionBoxLocation: "",
      distributionBoxOtherLocation: "",
      sealedProtection: "",
      evidenceName: state.electricityDraft.evidenceName
    });
  }
  if (element?.matches('[data-role="electricity-site"]')) {
    updateElectricityDraft({
      ...currentElectricityDraftFromForm(),
      site: element.value,
      otherSite: element.value === "Otro" ? state.electricityDraft.otherSite : ""
    });
  }
  if (element?.matches('[data-role="electricity-action"]')) {
    updateElectricityDraft({ ...currentElectricityDraftFromForm(), action: element.value });
  }
  if (element?.matches('[data-role="electricity-article"]')) {
    updateElectricityDraft({ ...currentElectricityDraftFromForm(), ...selectedArticleDraftFields(element.value) });
  }
  if (element?.matches('[data-role="distribution-box-type"]')) {
    updateElectricityDraft({ ...currentElectricityDraftFromForm(), distributionBoxType: element.value });
  }
  if (element?.matches('[data-role="distribution-box-location"]')) {
    updateElectricityDraft({
      ...currentElectricityDraftFromForm(),
      distributionBoxLocation: element.value,
      distributionBoxOtherLocation: element.value === "En otro espacio en el RBD" ? state.electricityDraft.distributionBoxOtherLocation : ""
    });
  }
  if (element?.matches('[data-role="sealed-protection"]')) {
    updateElectricityDraft({ ...currentElectricityDraftFromForm(), sealedProtection: element.value });
  }
  if (element?.matches('[data-role="electricity-evidence"]')) {
    handleEvidenceFileSelection(element, currentElectricityDraftFromForm, updateElectricityDraft);
    return;
  }
  if (element?.matches('[data-role="cold-element"]')) {
    const sites = coldSitesForElement(element.value);
    updateColdDraft({
      ...currentColdDraftFromForm(),
      element: element.value,
      site: sites.length === 1 ? sites[0] : "",
      otherSite: "",
      evidenceName: state.coldDraft.evidenceName
    });
  }
  if (element?.matches('[data-role="cold-site"]')) {
    updateColdDraft({
      ...currentColdDraftFromForm(),
      site: element.value,
      otherSite: element.value === "Otro" ? state.coldDraft.otherSite : ""
    });
  }
  if (element?.matches('[data-role="cold-action"]')) {
    updateColdDraft({ ...currentColdDraftFromForm(), action: element.value });
  }
  if (element?.matches('[data-role="cold-article"]')) {
    updateColdDraft({ ...currentColdDraftFromForm(), ...selectedArticleDraftFields(element.value) });
  }
  if (element?.matches('[data-role="cold-evidence"]')) {
    handleEvidenceFileSelection(element, currentColdDraftFromForm, updateColdDraft);
    return;
  }
  if (element?.matches('[data-role="water-element"]')) {
    const sites = waterSitesForElement(element.value);
    updateWaterDraft({
      ...currentWaterDraftFromForm(),
      element: element.value,
      site: sites.length === 1 ? sites[0] : "",
      otherSite: "",
      evidenceName: state.waterDraft.evidenceName
    });
  }
  if (element?.matches('[data-role="water-site"]')) {
    updateWaterDraft({
      ...currentWaterDraftFromForm(),
      site: element.value,
      otherSite: element.value === "Otro" ? state.waterDraft.otherSite : ""
    });
  }
  if (element?.matches('[data-role="water-action"]')) {
    updateWaterDraft({ ...currentWaterDraftFromForm(), action: element.value });
  }
  if (element?.matches('[data-role="water-article"]')) {
    updateWaterDraft({ ...currentWaterDraftFromForm(), ...selectedArticleDraftFields(element.value) });
  }
  if (element?.matches('[data-role="water-evidence"]')) {
    handleEvidenceFileSelection(element, currentWaterDraftFromForm, updateWaterDraft);
    return;
  }
  if (element?.matches('[data-role="infrastructure-element"]')) {
    const sites = infrastructureSitesForElement(element.value);
    updateInfrastructureDraft({
      ...currentInfrastructureDraftFromForm(),
      element: element.value,
      site: sites.length === 1 ? sites[0] : "",
      otherSite: "",
      extinguisherExpirationDate: isExtinguisherElement(element.value)
        ? state.infrastructureDraft.extinguisherExpirationDate
        : "",
      extinguisherExpired: "",
      evidenceName: state.infrastructureDraft.evidenceName
    });
  }
  if (element?.matches('[data-role="infrastructure-site"]')) {
    updateInfrastructureDraft({
      ...currentInfrastructureDraftFromForm(),
      site: element.value,
      otherSite: element.value === "Otro" ? state.infrastructureDraft.otherSite : ""
    });
  }
  if (element?.matches('[data-role="infrastructure-achs-signage"]')) {
    updateInfrastructureDraft({ ...currentInfrastructureDraftFromForm(), achsSignage: element.value });
  }
  if (element?.matches('[data-role="infrastructure-extinguisher-expiration-date"]')) {
    const nextDraft = sanitizedInfrastructureDraft({
      ...currentInfrastructureDraftFromForm(),
      extinguisherExpirationDate: element.value
    });

    updateInfrastructureDraft(nextDraft);

    if (nextDraft.extinguisherExpired === "Sí") {
      window.setTimeout(() => {
        showErrorToast(
          "Extintor vencido",
          "La fecha de vencimiento seleccionada es anterior a la fecha actual."
        );
      }, 0);
    }
  }
  if (element?.matches('[data-role="infrastructure-action"]')) {
    updateInfrastructureDraft({ ...currentInfrastructureDraftFromForm(), action: element.value });
  }
  if (element?.matches('[data-role="infrastructure-article"]')) {
    updateInfrastructureDraft({ ...currentInfrastructureDraftFromForm(), ...selectedArticleDraftFields(element.value) });
  }
  if (element?.matches('[data-role="infrastructure-evidence"]')) {
    handleEvidenceFileSelection(element, currentInfrastructureDraftFromForm, updateInfrastructureDraft);
    return;
  }
  if (element?.matches('[data-role="mpa-field"]')) {
    updateMpaDraft(element.dataset.field, element.value);
  }
  if (element?.matches('[data-role="service-yard-field"]')) {
    updateServiceYardDraft(element.value);
  }
  if (element?.matches('[data-role="rbd-checkers-field"]')) {
    updateRbdCheckersDraft(element.dataset.field, element.value);
  }
  if (element?.matches('[data-role="rbd-checkers-input"]') && element.type === "date") {
    updateRbdCheckersDraft(element.dataset.field, element.value);
  }
  if (element?.matches('[data-role="vectors-element"]')) {
    updateVectorsDraft({ ...currentVectorsDraftFromForm(), element: element.value });
  }
  if (element?.matches('[data-role="vectors-site"]')) {
    updateVectorsDraft({ ...currentVectorsDraftFromForm(), site: element.value });
  }
  if (element?.matches('[data-role="vectors-action"]')) {
    updateVectorsDraft({ ...currentVectorsDraftFromForm(), action: element.value });
  }
  if (element?.matches('[data-role="vectors-article"]')) {
    updateVectorsDraft({ ...currentVectorsDraftFromForm(), ...selectedArticleDraftFields(element.value) });
  }
  if (element?.matches('[data-role="vectors-evidence"]')) {
    handleEvidenceFileSelection(element, currentVectorsDraftFromForm, updateVectorsDraft);
    return;
  }
  if (element?.matches('[data-role="used-item-article"]')) {
    updateArticleDraftByRole("used-item", element.value);
  }
  scheduleActiveFormProgressSave();
});

rootEl.addEventListener("input", (event) => {
  const element = event.target;
  if (element?.matches('[data-role="article-picker-search"]')) {
    updateArticlePickerQuery(element.value);
    return;
  }
  if (element?.matches('[data-role$="-article-search"]')) {
    const role = element.dataset.role.replace(/-article-search$/, "");
    const articleId = articleIdFromSearchValue(element.value);
    const hiddenInput = rootEl.querySelector(`[data-role="${role}-article"]`);
    if (hiddenInput) hiddenInput.value = articleId;
    if (articleId || !element.value.trim()) {
      updateArticleDraftByRole(role, articleId);
    }
  }
  if (element?.matches('[data-role="incident-rbd-search"]')) {
    setState({
      incidentDraft: {
        ...currentIncidentDraft(),
        rbdSearch: element.value,
        selectedRbd: ""
      },
      incidentError: ""
    });
    const nextInput = rootEl.querySelector('[data-role="incident-rbd-search"]');
    if (nextInput) {
      nextInput.focus({ preventScroll: true });
      nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
    }
    return;
  }
  if (element?.matches('[data-role="assign-establishment-search"]')) {
    const value = element.value;
    setState({ ...currentAssignFormState(), assignRbdSearch: value, assignSelectedRbd: "", actionMessage: "" });
    const nextInput = rootEl.querySelector('[data-role="assign-establishment-search"]');
    nextInput?.focus();
    nextInput?.setSelectionRange(value.length, value.length);
  }
  if (element?.matches('[data-role="assign-description"]')) {
    state.assignDescription = element.value;
    state.actionMessage = "";
  }
  if (element?.matches('[data-role="assign-section-minimum"]')) {
    const sectionId = element.name.replace("sectionMinimum:", "");
    const value = Number(element.value);
    if (Number.isFinite(value) && value > 0) {
      state.assignSectionMinimums = {
        ...state.assignSectionMinimums,
        [sectionId]: Math.trunc(value)
      };
    }
  }
  if (element?.matches('[data-role="heat-other-site"]')) {
    state.heatDraft.otherSite = element.value;
    state.heatError = "";
  }
  if (element?.matches('[data-role="heat-quantity"]')) {
    state.heatDraft.quantity = element.value;
    state.heatError = "";
  }
  if (element?.matches('[data-role="heat-observation"]')) {
    state.heatDraft.observation = element.value;
    state.heatError = "";
  }
  if (element?.matches('[data-role="heat-flexible-expiration-date"]')) {
    state.heatDraft.flexibleExpirationDate = element.value;
    state.heatError = "";
  }
  if (element?.matches('[data-role="electricity-other-site"]')) {
    state.electricityDraft.otherSite = element.value;
    state.electricityError = "";
  }
  if (element?.matches('[data-role="distribution-box-other-location"]')) {
    state.electricityDraft.distributionBoxOtherLocation = element.value;
    state.electricityError = "";
  }
  if (element?.matches('[data-role="electricity-quantity"]')) {
    state.electricityDraft.quantity = element.value;
    state.electricityError = "";
  }
  if (element?.matches('[data-role="electricity-observation"]')) {
    state.electricityDraft.observation = element.value;
    state.electricityError = "";
  }
  if (element?.matches('[data-role="cold-other-site"]')) {
    state.coldDraft.otherSite = element.value;
    state.coldError = "";
  }
  if (element?.matches('[data-role="cold-quantity"]')) {
    state.coldDraft.quantity = element.value;
    state.coldError = "";
  }
  if (element?.matches('[data-role="cold-observation"]')) {
    state.coldDraft.observation = element.value;
    state.coldError = "";
  }
  if (element?.matches('[data-role="water-other-site"]')) {
    state.waterDraft.otherSite = element.value;
    state.waterError = "";
  }
  if (element?.matches('[data-role="water-quantity"]')) {
    state.waterDraft.quantity = element.value;
    state.waterError = "";
  }
  if (element?.matches('[data-role="water-observation"]')) {
    state.waterDraft.observation = element.value;
    state.waterError = "";
  }
  if (element?.matches('[data-role="infrastructure-other-site"]')) {
    state.infrastructureDraft.otherSite = element.value;
    state.infrastructureError = "";
  }
  if (element?.matches('[data-role="infrastructure-quantity"]')) {
    state.infrastructureDraft.quantity = element.value;
    state.infrastructureError = "";
  }
  if (element?.matches('[data-role="infrastructure-observation"]')) {
    state.infrastructureDraft.observation = element.value;
    state.infrastructureError = "";
  }
  if (element?.matches('[data-role="pae-manager-input"]')) {
    const value = element.dataset.field === "rut"
      ? formatRut(element.value)
      : element.dataset.field === "role"
        ? normalizePaeManagerRole(element.value)
        : element.value;
    if (element.dataset.field === "rut" && element.value !== value) {
      element.value = value;
      updatePaeRutValidationMessage(value);
    }
    if (element.dataset.field === "rut") updatePaeRutValidationMessage(value);
    state.paeManagerDraft[element.dataset.field] = value;
    state.paeManagerError = "";
  }
  if (element?.matches('[data-role="rbd-checkers-input"]')) {
    const field = element.dataset.field;
    const value = ["pestControlDate", "greenSealExpiration"].includes(field) ? normalizeIsoDate(element.value) : element.value;
    state.rbdCheckersDraft[field] = value;
    state.rbdCheckersDraft.greenSealExpired = greenSealExpiredValue(state.rbdCheckersDraft);
    state.rbdCheckersError = state.rbdCheckersDraft.pestControlUpToDate === "Sí" && isIsoDateAfter(state.rbdCheckersDraft.pestControlDate)
      ? "Si el control de plagas está al día, la fecha no puede ser posterior a hoy."
      : "";
  }
  if (element?.matches('[data-role="vectors-quantity"]')) {
    state.vectorsDraft.quantity = element.value;
    state.vectorsError = "";
  }
  if (element?.matches('[data-role="vectors-observation"]')) {
    state.vectorsDraft.observation = element.value;
    state.vectorsError = "";
  }
  if (element?.matches('[data-role="used-item-quantity"]')) {
    state.usedItemsDraft.quantity = element.value;
    state.usedItemsError = "";
  }
  if (element?.matches('[data-role="used-item-observation"]')) {
    state.usedItemsDraft.observation = element.value;
    state.usedItemsError = "";
  }
  scheduleActiveFormProgressSave();
});

rootEl.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.imagePreview) {
    setState({ imagePreview: null });
    return;
  }
  if (event.key === "Enter" && !state.isAuthenticated) attemptLogin();
});

function initializeNativeBackButton() {
  const app = window.Capacitor?.Plugins?.App;
  if (!app?.addListener) return;

  app.addListener("backButton", () => {
    if (!state.isAuthenticated) {
      app.minimizeApp?.();
      return;
    }
    navigateBack();
  });

  app.addListener("pause", () => {
    persistActiveFormProgressNow();
  });

  app.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) persistActiveFormProgressNow();
    if (isActive && isFormProgressRoute()) return;
    if (isActive && state.isAuthenticated) {
      startTaskRealtime();
      registerPushNotifications();
      refreshSupabaseTasks({ silent: true, notify: true });
    }
  });
}

async function initializeNetworkStatus() {
  const network = window.Capacitor?.Plugins?.Network;
  if (!network?.getStatus) {
    state.networkOnline = navigator.onLine;
    return;
  }

  try {
    const status = await network.getStatus();
    setNetworkOnlineStatus(status.connected);
  } catch {
    state.networkOnline = navigator.onLine;
  }

  network.addListener?.("networkStatusChange", (status) => {
    setNetworkOnlineStatus(status.connected);
    if (status.connected && state.isAuthenticated && pendingSubmissionCount()) {
      syncPendingSubmissions({ silent: true });
    }
    if (status.connected && state.isAuthenticated) {
      startTaskRealtime();
      registerPushNotifications();
      if (!isFormProgressRoute()) refreshSupabaseTasks({ silent: true, notify: true });
    }
    if (!status.connected) {
      stopTaskRealtime();
    }
  });
}

window.addEventListener("online", () => {
  setNetworkOnlineStatus(true);
  if (state.isAuthenticated && pendingSubmissionCount()) {
    syncPendingSubmissions({ silent: true });
  }
  if (state.isAuthenticated) {
    startTaskRealtime();
    registerPushNotifications();
    if (!isFormProgressRoute()) refreshSupabaseTasks({ silent: true, notify: true });
  }
});

window.addEventListener("offline", () => {
  stopTaskRealtime();
  setNetworkOnlineStatus(false);
});

window.addEventListener("pagehide", () => {
  persistActiveFormProgressNow();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persistActiveFormProgressNow();
  if (document.visibilityState === "visible" && isFormProgressRoute()) return;
  if (document.visibilityState === "visible" && state.isAuthenticated) {
    refreshSupabaseTasks({ silent: true, notify: true });
  }
});

try {
  initializeNativeBackButton();
  initializeNetworkStatus();
  if (restoreDailyAuthState()) {
    startTaskAutoRefresh();
    startTaskRealtime();
    registerPushNotifications();
    refreshSupabaseTasks({ silent: true, notify: true });
  }
  state.incidents = readStoredIncidents();
  render();
} catch (error) {
  console.error(error);
  rootEl.innerHTML = `
    <main class="screen">
      <section class="empty-state">
        <h2>No se pudo iniciar Datácora</h2>
        <p>${escapeHtml(error.message || "Error de inicio no identificado.")}</p>
      </section>
    </main>
  `;
}
})();
