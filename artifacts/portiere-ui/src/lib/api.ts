const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
export const API = `${BASE}/api`;

export async function fetchSettings() {
  const r = await fetch(`${API}/settings`);
  if (!r.ok) throw new Error("Failed to fetch settings");
  return r.json();
}

export async function saveSettings(data: Record<string, unknown>) {
  const r = await fetch(`${API}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error("Failed to save settings");
  return r.json();
}

export async function fetchModels() {
  const r = await fetch(`${API}/models`);
  if (!r.ok) throw new Error("Failed to fetch models");
  return r.json();
}

export async function fetchWorkers() {
  const r = await fetch(`${API}/workers`);
  if (!r.ok) throw new Error("Failed to fetch workers");
  return r.json();
}

export async function probeOllama(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
  const r = await fetch(`${API}/probe/ollama`);
  return r.json();
}

export async function probeLMStudio(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
  const r = await fetch(`${API}/probe/lmstudio`);
  return r.json();
}

export function streamOrchestrate(
  message: string,
  filePath: string | null,
  prevContext: string | null,
  onEvent: (event: OrchestrateEvent) => void,
  onDone: () => void,
  onError: (err: string) => void,
): () => void {
  const ctrl = new AbortController();
  (async () => {
    try {
      const r = await fetch(`${API}/orchestrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          file_path: filePath,
          context: prevContext || undefined,
        }),
        signal: ctrl.signal,
      });
      if (!r.ok) {
        onError(`HTTP ${r.status}: ${await r.text()}`);
        onDone();
        return;
      }
      const reader = r.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: OrchestrateEvent = JSON.parse(line.slice(6));
              onEvent(event);
              if (event.type === "complete" || event.type === "error") {
                onDone();
                return;
              }
            } catch { /* skip malformed */ }
          }
        }
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") {
        onError(String(e));
      }
    }
    onDone();
  })();
  return () => ctrl.abort();
}

export interface OrchestrateEvent {
  type: string;
  content?: string;
  worker?: string;
  step?: number;
  total_steps?: number;
  data?: unknown;
  error?: string;
}
