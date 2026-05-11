export type Role = 'tecnico' | 'jefe_mantencion' | 'jefe_nacional' | 'admin';

export type EstablishmentType = 'JUNAEB' | 'JUNJI' | 'INTEGRA';

export type AssignmentStatus = 'pendiente' | 'completada';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
}

export interface Assignment {
  id: string;
  rbd: string;
  establishmentName: string;
  establishmentType: EstablishmentType;
  assignedTo: string;
  assignedBy: string;
  status: AssignmentStatus;
  answers?: Record<string, string>;
}
