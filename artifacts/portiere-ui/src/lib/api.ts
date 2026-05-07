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

export interface WizardChunk {
  type: "chunk" | "done" | "error" | "setup_result";
  content?: string;
  result?: Record<string, string>;
}

export function streamWizard(
  messages: Array<{ role: string; content: string }>,
  onChunk: (c: WizardChunk) => void,
  onDone: () => void,
): () => void {
  const ctrl = new AbortController();
  (async () => {
    try {
      const r = await fetch(`${API}/setup-wizard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
        signal: ctrl.signal,
      });
      if (!r.ok) { onChunk({ type: "error", content: `HTTP ${r.status}` }); onDone(); return; }
      const reader = r.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try { onChunk(JSON.parse(line.slice(6))); } catch { /* skip */ }
          }
        }
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") onChunk({ type: "error", content: String(e) });
    }
    onDone();
  })();
  return () => ctrl.abort();
}

export async function probeOllama(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
  const r = await fetch(`${API}/probe/ollama`);
  return r.json();
}

export async function probeLMStudio(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
  const r = await fetch(`${API}/probe/lmstudio`);
  return r.json();
}

export function streamOllamaInstall(
  model: string,
  onProgress: (status: string, percent?: number) => void,
  onDone: () => void,
  onError: (err: string) => void,
): () => void {
  const ctrl = new AbortController();
  (async () => {
    try {
      const r = await fetch(`${API}/ollama/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
        signal: ctrl.signal,
      });
      if (!r.ok) { onError(`HTTP ${r.status}`); onDone(); return; }
      const reader = r.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const obj = JSON.parse(line.slice(6));
              if (obj.error) { onError(obj.error); onDone(); return; }
              const total = (obj.total as number) ?? 0;
              const completed = (obj.completed as number) ?? 0;
              const pct = total > 0 ? Math.round((completed / total) * 100) : undefined;
              onProgress((obj.status as string) || "Downloading…", pct);
              if (obj.status === "success") { onDone(); return; }
            } catch { /* skip */ }
          }
        }
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") onError(String(e));
    }
    onDone();
  })();
  return () => ctrl.abort();
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
