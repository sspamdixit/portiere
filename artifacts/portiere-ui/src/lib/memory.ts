const KEY = "portiere_memory";

export function loadMemory(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveMemory(facts: string[]): void {
  localStorage.setItem(KEY, JSON.stringify(facts.filter(Boolean)));
}

export function clearMemory(): void {
  localStorage.removeItem(KEY);
}
