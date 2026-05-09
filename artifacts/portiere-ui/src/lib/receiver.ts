const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export type ReceiverEventType =
  | "heartbeat"
  | "command_received"
  | "connected"
  | "disconnected";

export interface ReceiverEvent {
  type: ReceiverEventType;
  status?: string;
  command?: string;
  target?: string;
  source?: string;
  ts?: string;
  clients?: number;
}

export function connectReceiver(
  onEvent: (e: ReceiverEvent) => void,
  onStatusChange: (connected: boolean) => void,
): () => void {
  let ws: WebSocket | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dead = false;

  function buildUrl(): string {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}${BASE}/ws/receiver`;
  }

  function connect() {
    if (dead) return;
    try {
      ws = new WebSocket(buildUrl());
    } catch {
      schedule();
      return;
    }

    ws.onopen = () => {
      onStatusChange(true);
      onEvent({ type: "connected", status: "connected" });
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data as string) as ReceiverEvent;
        onEvent(data);
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      onStatusChange(false);
      if (!dead) {
        onEvent({ type: "disconnected", status: "disconnected" });
        schedule();
      }
    };

    ws.onerror = () => { ws?.close(); };
  }

  function schedule() {
    if (!dead) timer = setTimeout(connect, 3000);
  }

  connect();

  return () => {
    dead = true;
    if (timer) clearTimeout(timer);
    ws?.close();
  };
}

export async function fetchReceiverStatus(): Promise<{
  connected_clients: number;
  listening: boolean;
  endpoint: string;
}> {
  const r = await fetch(`${BASE}/api/receiver/status`);
  if (!r.ok) throw new Error("Failed to fetch receiver status");
  return r.json();
}
