import { createContext, useContext, useState, useCallback } from "react";
import type { Session } from "./sessions";

interface SessionCtx {
  loadedSession: Session | null;
  setLoadedSession: (s: Session | null) => void;
  sidebarKey: number;
  notifySessionSaved: () => void;
}

export const SessionContext = createContext<SessionCtx>({
  loadedSession: null,
  setLoadedSession: () => {},
  sidebarKey: 0,
  notifySessionSaved: () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [loadedSession, setLoadedSession] = useState<Session | null>(null);
  const [sidebarKey, setSidebarKey] = useState(0);
  const notifySessionSaved = useCallback(() => setSidebarKey(k => k + 1), []);

  return (
    <SessionContext.Provider value={{ loadedSession, setLoadedSession, sidebarKey, notifySessionSaved }}>
      {children}
    </SessionContext.Provider>
  );
}
