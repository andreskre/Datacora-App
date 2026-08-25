(function () {
const users = [
  {
    id: "usr-admin-001",
    nombre: "Administrador Local",
    usuario: "admin@datacora.local",
    rut: "",
    password: "",
    requirePasswordChange: false,
    sucursal: "Santiago",
    grupo: "Administradores",
    cargo: "Administrador Aplicación",
    estado: "inactivo",
    motivoEstado: "Usuario local deshabilitado",
    permisos: {
      gestionarUsuarios: true
    }
  }
];

const formBlueprints = {
  maintenance_plan: {
    taskType: "Plan Preventivo Mantención",
    supportedAnswerTypes: ["text", "single_choice", "multi_choice", "observation", "photo", "attachment"],
  },
  dt: {
    taskType: "DT",
    supportedAnswerTypes: ["text", "single_choice", "observation", "photo", "attachment"],
  },
  mutuality: {
    taskType: "Mutualidad",
    supportedAnswerTypes: ["text", "single_choice", "observation", "photo", "attachment"],
  },
  emergency: {
    taskType: "Emergencia",
    supportedAnswerTypes: ["text", "single_choice", "observation", "photo", "attachment"],
  },
  record: {
    taskType: "Acta",
    supportedAnswerTypes: ["text", "observation", "photo", "attachment"],
  },
  seremi: {
    taskType: "Seremi",
    supportedAnswerTypes: ["text", "single_choice", "observation", "photo", "attachment"],
  },
  sec: {
    taskType: "SEC",
    supportedAnswerTypes: ["text", "single_choice", "observation", "photo", "attachment"],
  }
};

const establishments = window.DatacoraEstablishments ?? [];

const tasks = [
  {
    id: "task-demo-9001",
    type: "Plan de mantención",
    assignedTo: "tecnico.prueba@soser.cl",
    rbd: "9001",
    establishment: "Escuela Demo Datácora",
    description: "Tarea de prueba para validar el flujo técnico: revisar detalle y acceder al placeholder de formulario.",
    assignedBy: "Patricio Tapia",
    assignedAt: "30 junio 2026",
    dueAt: "05 julio 2026",
    status: "Pendiente",
    priority: "Media",
    syncStatus: "synced",
    form: {
      blueprintKey: "maintenance_plan"
    }
  },
  {
    id: "task-5101",
    type: "Plan de mantención",
    assignedTo: "juan.perez@datacora.cl",
    rbd: "5101",
    establishment: "Escuela Básica Los Robles",
    description: "Plan de mantención preventiva mensual del sistema eléctrico y revisión general de condiciones del establecimiento.",
    assignedBy: "María González",
    assignedAt: "20 mayo 2026",
    dueAt: "24 mayo 2026",
    status: "Pendiente",
    priority: "Media",
    syncStatus: "synced",
    form: {
      blueprintKey: "maintenance_plan"
    }
  },
  {
    id: "task-4203",
    type: "Emergencia",
    assignedTo: "juan.perez@datacora.cl",
    rbd: "4203",
    establishment: "Liceo Técnico Industrial",
    description: "Atención prioritaria por falla informada en tablero principal. Registrar diagnóstico inicial y evidencias.",
    assignedBy: "Claudia Rivas",
    assignedAt: "21 mayo 2026",
    dueAt: "22 mayo 2026",
    status: "Urgente",
    priority: "Alta",
    syncStatus: "pending",
    form: {
      blueprintKey: "emergency"
    }
  },
  {
    id: "task-3105",
    type: "Acta",
    assignedTo: "juan.perez@datacora.cl",
    rbd: "3105",
    establishment: "Escuela República",
    description: "Levantamiento de acta de visita técnica y registro de observaciones generales.",
    assignedBy: "Mario Pizarro",
    assignedAt: "19 mayo 2026",
    dueAt: "25 mayo 2026",
    status: "Pendiente",
    priority: "Media",
    syncStatus: "synced",
    form: {
      blueprintKey: "record"
    }
  },
  {
    id: "task-6102",
    type: "SEREMI",
    assignedTo: "juan.perez@datacora.cl",
    rbd: "6102",
    establishment: "Escuela Santa María",
    description: "Preparación de antecedentes de visita SEREMI y chequeo documental preliminar.",
    assignedBy: "Daniel Soto",
    assignedAt: "18 mayo 2026",
    dueAt: "27 mayo 2026",
    status: "Pendiente",
    priority: "Baja",
    syncStatus: "synced",
    form: {
      blueprintKey: "seremi"
    }
  }
];

const taskHistory = [
  {
    type: "Plan de mantención",
    rbd: "7781",
    establishment: "Colegio Vista Alegre",
    sentAt: "18 mayo 2026, 15:30",
    status: "Completada"
  },
  {
    type: "Acta",
    rbd: "3190",
    establishment: "Escuela Nuevo Horizonte",
    sentAt: "16 mayo 2026, 11:05",
    status: "Completada"
  },
  {
    type: "SEREMI",
    rbd: "9024",
    establishment: "Liceo Bicentenario Sur",
    sentAt: "14 mayo 2026, 09:42",
    status: "Completada"
  }
];

window.DatacoraData = {
  establishments,
  formBlueprints,
  taskHistory,
  tasks,
  users
};
})();

