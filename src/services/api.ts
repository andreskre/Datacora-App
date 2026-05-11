import { Assignment, EstablishmentType, User } from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
let authToken: string | null = null;

export function setApiToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.message || 'Error de conexion con la API.';
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export type QuestionsResponse = Record<EstablishmentType, string[]>;

export const api = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async me(): Promise<{ user: User }> {
    return request<{ user: User }>('/auth/me');
  },

  async getUsers(): Promise<User[]> {
    return request<User[]>('/users');
  },

  async getAssignments(): Promise<Assignment[]> {
    return request<Assignment[]>('/assignments');
  },

  async getQuestions(): Promise<QuestionsResponse> {
    return request<QuestionsResponse>('/questions');
  },

  async createAssignment(input: {
    rbd: string;
    establishmentName: string;
    establishmentType: EstablishmentType;
    assignedTo: string;
  }): Promise<Assignment> {
    return request<Assignment>('/assignments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async submitForm(assignmentId: string, answers: Record<string, string>): Promise<Assignment> {
    return request<Assignment>(`/assignments/${assignmentId}/submit`, {
      method: 'PATCH',
      body: JSON.stringify({ answers }),
    });
  },
};
