import { Assignment, EstablishmentType, User } from '../types';

export const users: User[] = [
  {
    id: 'u1',
    name: 'Camila Soto',
    email: 'tecnico@datacora.cl',
    password: 'Datacora123',
    role: 'tecnico',
  },
  {
    id: 'u2',
    name: 'Marco Rojas',
    email: 'jefe@datacora.cl',
    password: 'Datacora123',
    role: 'jefe_mantencion',
  },
  {
    id: 'u3',
    name: 'Ana Paredes',
    email: 'nacional@datacora.cl',
    password: 'Datacora123',
    role: 'jefe_nacional',
  },
  {
    id: 'u4',
    name: 'Admin Datacora',
    email: 'admin@datacora.cl',
    password: 'Datacora123',
    role: 'admin',
  },
];

export const initialAssignments: Assignment[] = [
  {
    id: 'a1',
    rbd: '10234-5',
    establishmentName: 'Escuela Las Araucarias',
    establishmentType: 'JUNAEB',
    assignedTo: 'u1',
    assignedBy: 'u2',
    status: 'pendiente',
  },
  {
    id: 'a2',
    rbd: '66771-9',
    establishmentName: 'Jardín Arcoíris',
    establishmentType: 'JUNJI',
    assignedTo: 'u1',
    assignedBy: 'u2',
    status: 'pendiente',
  },
];

export const formQuestions: Record<EstablishmentType, string[]> = {
  JUNAEB: [
    '¿Se verificó el estado del sistema eléctrico?',
    '¿Se inspeccionaron filtraciones o humedad?',
    '¿El equipamiento crítico opera correctamente?',
  ],
  JUNJI: [
    '¿Las salidas de emergencia están despejadas?',
    '¿Existe señalética visible en áreas comunes?',
    '¿El sistema de agua caliente funciona correctamente?',
  ],
  INTEGRA: [
    '¿Se revisó el sistema de climatización?',
    '¿El área de cocina cumple condiciones operativas?',
    '¿Se detectaron observaciones de seguridad?',
  ],
};
