import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setApiToken } from '../services/api';
import { User } from '../types';

const TOKEN_KEY = 'datacora_token';
const USER_KEY = 'datacora_user';

type LoginInput = {
  email: string;
  password: string;
};

interface AuthContextValue {
  user: User | null;
  usersList: User[];
  loading: boolean;
  initializing: boolean;
  login: (input: LoginInput) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const [token, savedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (!token || !savedUser) {
          setInitializing(false);
          return;
        }

        setApiToken(token);
        const parsedUser = JSON.parse(savedUser) as User;
        setUser(parsedUser);

        const me = await api.me();
        setUser(me.user);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(me.user));

        if (['jefe_mantencion', 'jefe_nacional', 'admin'].includes(me.user.role)) {
          const items = await api.getUsers();
          setUsersList(items);
        }
      } catch {
        setApiToken(null);
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
        setUser(null);
        setUsersList([]);
      } finally {
        setInitializing(false);
      }
    };

    bootstrapAuth();
  }, []);

  const login = async ({ email, password }: LoginInput) => {
    setLoading(true);
    try {
      const response = await api.login(email, password);
      setApiToken(response.token);
      setUser(response.user);
      await AsyncStorage.setItem(TOKEN_KEY, response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));

      if (['jefe_mantencion', 'jefe_nacional', 'admin'].includes(response.user.role)) {
        const items = await api.getUsers();
        setUsersList(items);
      } else {
        setUsersList([]);
      }

      setLoading(false);
      return { ok: true };
    } catch (error) {
      setLoading(false);
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : 'No fue posible iniciar sesion.',
      };
    }
  };

  const logout = async () => {
    setApiToken(null);
    setUser(null);
    setUsersList([]);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  };

  const value = useMemo(
    () => ({ user, usersList, loading, initializing, login, logout }),
    [user, usersList, loading, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
