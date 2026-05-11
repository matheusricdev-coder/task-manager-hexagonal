import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, tokenStorage, User, userStorage } from "../api/client";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => userStorage.get<User>());
  const [token, setToken] = useState<string | null>(() => tokenStorage.get());

  const persistedLogout = useCallback(() => {
    tokenStorage.clear();
    userStorage.clear();
    setToken(null);
    setUser(null);
  }, []);

  // If we have a token but no cached user (e.g. legacy session, or user data
  // was cleared), fetch it from /auth/me so the UI shows the real name/avatar.
  useEffect(() => {
    if (!token || user) return;
    let cancelled = false;
    void api
      .me()
      .then((u) => {
        if (cancelled) return;
        userStorage.set(u);
        setUser(u);
      })
      .catch(() => {
        if (!cancelled) persistedLogout();
      });
    return () => {
      cancelled = true;
    };
  }, [token, user, persistedLogout]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login({ email, password });
    tokenStorage.set(result.token);
    userStorage.set(result.user);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (email: string, name: string, password: string) => {
      const result = await api.register({ email, name, password });
      tokenStorage.set(result.token);
      userStorage.set(result.user);
      setToken(result.token);
      setUser(result.user);
    },
    []
  );

  const value = useMemo(
    () => ({ user, token, login, register, logout: persistedLogout }),
    [user, token, login, register, persistedLogout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
