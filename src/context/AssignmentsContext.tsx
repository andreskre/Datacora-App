import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { api, QuestionsResponse } from '../services/api';
import { Assignment, AssignmentStatus, EstablishmentType } from '../types';

type AssignmentInput = {
  rbd: string;
  establishmentName: string;
  establishmentType: EstablishmentType;
  assignedTo: string;
};

interface AssignmentsContextValue {
  assignments: Assignment[];
  questionsByType: QuestionsResponse;
  createAssignment: (input: AssignmentInput) => Promise<void>;
  submitForm: (assignmentId: string, answers: Record<string, string>) => Promise<void>;
  getAssignmentsByUser: (userId: string) => Assignment[];
  getByStatus: (status: AssignmentStatus) => Assignment[];
  refreshAssignments: () => Promise<void>;
}

const AssignmentsContext = createContext<AssignmentsContextValue | undefined>(undefined);

export function AssignmentsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [questionsByType, setQuestionsByType] = useState<QuestionsResponse>({
    JUNAEB: [],
    JUNJI: [],
    INTEGRA: [],
  });

  const refreshAssignments = async () => {
    try {
      const items = await api.getAssignments();
      setAssignments(items);
    } catch {
      setAssignments([]);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!user) {
        setAssignments([]);
        setQuestionsByType({ JUNAEB: [], JUNJI: [], INTEGRA: [] });
        return;
      }

      await refreshAssignments();
      try {
        const questions = await api.getQuestions();
        setQuestionsByType(questions);
      } catch {
        setQuestionsByType({ JUNAEB: [], JUNJI: [], INTEGRA: [] });
      }
    };

    bootstrap();
  }, [user]);

  const createAssignment = async (input: AssignmentInput) => {
    const created = await api.createAssignment(input);
    setAssignments((prev) => [created, ...prev]);
  };

  const submitForm = async (assignmentId: string, answers: Record<string, string>) => {
    const updated = await api.submitForm(assignmentId, answers);
    setAssignments((prev) => prev.map((item) => (item.id === assignmentId ? updated : item)));
  };

  const getAssignmentsByUser = (userId: string) =>
    assignments.filter((item) => item.assignedTo === userId);

  const getByStatus = (status: AssignmentStatus) =>
    assignments.filter((item) => item.status === status);

  const value = useMemo(
    () => ({
      assignments,
      questionsByType,
      createAssignment,
      submitForm,
      getAssignmentsByUser,
      getByStatus,
      refreshAssignments,
    }),
    [assignments, questionsByType],
  );

  return (
    <AssignmentsContext.Provider value={value}>{children}</AssignmentsContext.Provider>
  );
}

export function useAssignments() {
  const context = useContext(AssignmentsContext);
  if (!context) {
    throw new Error('useAssignments debe usarse dentro de AssignmentsProvider');
  }
  return context;
}
