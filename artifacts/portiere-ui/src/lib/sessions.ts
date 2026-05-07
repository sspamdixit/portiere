import type { OrchestrateEvent } from "./api";

export interface Session {
  id: string;
  title: string;
  timestamp: number;
  pinned?: boolean;
  tags?: string[];
  events: OrchestrateEvent[];
}

const KEY = "portiere_sessions";
const MAX = 60;

export function getSessions(): Session[] {
  try {
    const raw = localStorage.getItem(KEY);
    const sessions = raw ? (JSON.parse(raw) as Session[]) : [];
    return sessions.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.timestamp - a.timestamp;
    });
  } catch {
    return [];
  }
}

export function saveSession(events: OrchestrateEvent[]): Session {
  const userEvent = events.find(e => e.type === "user_input");
  const rawTitle = (userEvent?.content ?? "Session").trim();
  const title = rawTitle.slice(0, 60) + (rawTitle.length > 60 ? "…" : "");
  const session: Session = {
    id: crypto.randomUUID(),
    title,
    timestamp: Date.now(),
    pinned: false,
    tags: [],
    events: events.filter(e =>
      ["user_input", "worker_done", "complete", "error", "worker_error"].includes(e.type)
    ),
  };
  const all = [session, ...getSessions()].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(all));
  return session;
}

export function deleteSession(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getSessions().filter(s => s.id !== id)));
}

export function togglePin(id: string): void {
  const sessions = getSessions().map(s =>
    s.id === id ? { ...s, pinned: !s.pinned } : s
  );
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

export function addTag(id: string, tag: string): void {
  const sessions = getSessions().map(s => {
    if (s.id !== id) return s;
    const tags = [...new Set([...(s.tags ?? []), tag.trim()])];
    return { ...s, tags };
  });
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

export function removeTag(id: string, tag: string): void {
  const sessions = getSessions().map(s => {
    if (s.id !== id) return s;
    return { ...s, tags: (s.tags ?? []).filter(t => t !== tag) };
  });
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

/** Search session titles AND message content */
export function searchSessions(query: string): Session[] {
  if (!query.trim()) return getSessions();
  const q = query.toLowerCase();
  return getSessions().filter(s => {
    if (s.title.toLowerCase().includes(q)) return true;
    return s.events.some(e => (e.content ?? "").toLowerCase().includes(q));
  });
}

export function clearAllSessions(): void {
  localStorage.removeItem(KEY);
}

export function relativeTime(ts: number): string {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60_000);
  const h = Math.floor(d / 3_600_000);
  const days = Math.floor(d / 86_400_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${days}d ago`;
}
