import { useEffect, useRef, useState, useCallback } from "react";
import {
  Wifi, WifiOff, Terminal, Send, ChevronDown, ChevronUp,
  Radio, Activity, Zap, Power,
} from "lucide-react";
import VoiceOrb from "@/components/VoiceOrb";
import SignalMeter from "@/components/SignalMeter";
import VUBars from "@/components/VUBars";
import { connectReceiver, type ReceiverEvent } from "@/lib/receiver";

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.62)",
  backdropFilter: "blur(28px) saturate(1.9)",
  WebkitBackdropFilter: "blur(28px) saturate(1.9)",
  border: "1px solid rgba(255,255,255,0.88)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95), 0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.05)",
};

const GLASS_DARK: React.CSSProperties = {
  background: "rgba(8,16,24,0.84)",
  backdropFilter: "blur(20px) saturate(1.5)",
  WebkitBackdropFilter: "blur(20px) saturate(1.5)",
  border: "1px solid rgba(255,255,255,0.09)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.22)",
};

const GREEN = "#32CD32";
const BLUE  = "#00d4ff";
const TEXT  = "#1c2b3a";
const MUTED = "#5a7488";
const LCD   = "#00b341";

type LogType = "info" | "command" | "heartbeat" | "connect" | "disconnect" | "error";

interface LogEntry {
  id: number;
  ts: string;
  type: LogType;
  text: string;
}

let _logId = 0;

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

const LOG_COLOR: Record<LogType, string> = {
  info:       LCD,
  command:    "#39ff14",
  heartbeat:  "rgba(0,212,255,0.45)",
  connect:    BLUE,
  disconnect: "#FF6644",
  error:      "#FF4444",
};

export default function ReceiverPage() {
  const [connected, setConnected]   = useState(false);
  const [signal, setSignal]         = useState(0);
  const [active, setActive]         = useState(false);
  const [listening, setListening]   = useState(false);
  const [orbActive, setOrbActive]   = useState(false);
  const [logOpen, setLogOpen]       = useState(true);
  const [cmdInput, setCmdInput]     = useState("");
  const [log, setLog] = useState<LogEntry[]>([
    { id: ++_logId, ts: nowTime(), type: "info",    text: "PORTIERE RECEIVER v1.0  ·  PC ENGINE ROOM" },
    { id: ++_logId, ts: nowTime(), type: "info",    text: "WAITING FOR CONNECTION ON /ws/receiver ..." },
  ]);

  const logRef = useRef<HTMLDivElement>(null);
  const heartRef = useRef(0);

  const push = useCallback((type: LogType, text: string) => {
    setLog(prev => [...prev.slice(-150), { id: ++_logId, ts: nowTime(), type, text }]);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const triggerActive = useCallback(() => {
    setOrbActive(true);
    setActive(true);
    const t = setTimeout(() => { setOrbActive(false); setActive(false); }, 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const stop = connectReceiver(
      (evt: ReceiverEvent) => {
        if (evt.type === "heartbeat") {
          setConnected(true);
          setSignal(100);
          heartRef.current += 1;
          if (heartRef.current % 6 === 1) {
            push("heartbeat", `HEARTBEAT OK  ·  clients: ${evt.clients ?? 1}`);
          }
        } else if (evt.type === "connected") {
          push("connect", "RECEIVER CONNECTED  ·  LISTENING");
        } else if (evt.type === "disconnected") {
          setConnected(false);
          setSignal(0);
          push("disconnect", "RECEIVER DISCONNECTED  ·  RECONNECTING IN 3s ...");
        } else if (evt.type === "command_received") {
          const cmd = (evt.command || "unknown").toUpperCase();
          const tgt = evt.target ? `  ·  TARGET: ${evt.target.toUpperCase()}` : "";
          push("command", `CMD  >>  ${cmd}${tgt}`);
          triggerActive();
        }
      },
      (ok: boolean) => {
        setConnected(ok);
        setSignal(ok ? 100 : 0);
      },
    );
    return stop;
  }, [push, triggerActive]);

  function sendCommand() {
    const cmd = cmdInput.trim();
    if (!cmd) return;
    push("command", `LOCAL  >>  ${cmd.toUpperCase()}`);
    triggerActive();
    setCmdInput("");
  }

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{ color: TEXT }}>

      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 28%, #ffffff 0%, #edfcff 42%, #d9f6fc 72%, #caf0f8 100%)",
      }} />

      {/* Dot grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle, rgba(0,160,220,0.07) 1px, transparent 1px)",
        backgroundSize: "26px 26px",
      }} />

      {/* Main layout */}
      <div className="relative z-10 flex flex-col h-full overflow-y-auto feed-scroll" style={{ padding: "18px 22px 16px" }}>

        {/* ─── TOP BAR ──────────────────────────────── */}
        <div className="flex items-center gap-4 flex-shrink-0 mb-4">

          {/* Identity */}
          <div className="flex flex-col gap-0.5 flex-shrink-0 w-36">
            <div className="flex items-center gap-2">
              <Radio size={15} style={{ color: connected ? GREEN : MUTED, transition: "color 0.4s" }} />
              <span className="text-[14px] font-semibold tracking-tight" style={{ color: TEXT }}>Receiver</span>
            </div>
            <span className="text-[10px] font-mono tracking-widest" style={{ color: MUTED }}>PC ENGINE ROOM</span>
          </div>

          {/* Signal Meter — centrepiece of top bar */}
          <div className="flex-1 flex justify-center">
            <div className="rounded-2xl px-6 py-1.5" style={GLASS}>
              <SignalMeter value={signal} connected={connected} label="RECEIVER" />
            </div>
          </div>

          {/* Status + endpoint */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 w-36">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-mono font-semibold transition-all"
              style={{
                ...GLASS,
                color: connected ? GREEN : "#FF6644",
                border: `1px solid ${connected ? "rgba(50,205,50,0.4)" : "rgba(255,100,68,0.4)"}`,
                boxShadow: connected ? "0 0 12px rgba(50,205,50,0.18)" : "none",
              }}
            >
              {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {connected ? "LIVE" : "OFFLINE"}
            </div>
            <div className="text-[9.5px] font-mono text-right leading-relaxed" style={{ color: MUTED }}>
              ws://…/ws/receiver<br />port 8080
            </div>
          </div>
        </div>

        {/* ─── MIDDLE — VU | ORB | VU ─────────────── */}
        <div className="flex items-center justify-center gap-6 flex-shrink-0 mb-4">

          {/* Left VU panel */}
          <div className="flex flex-col items-center gap-2.5 px-5 py-4 rounded-2xl" style={GLASS}>
            <span className="text-[8px] font-mono font-bold tracking-[0.2em]" style={{ color: MUTED }}>INPUT</span>
            <VUBars active={active} count={7} height={104} />
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full transition-all" style={{
                background: active ? GREEN : "rgba(50,205,50,0.2)",
                boxShadow: active ? `0 0 6px ${GREEN}` : "none",
              }} />
              <span className="text-[8.5px] font-mono" style={{ color: active ? GREEN : MUTED }}>L</span>
            </div>
          </div>

          {/* Central orb section */}
          <div className="flex flex-col items-center gap-3">
            <VoiceOrb active={orbActive} listening={listening} size={154} />

            {/* Controls beneath orb */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setListening(l => !l)}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-[12.5px] font-semibold transition-all"
                style={{
                  background: listening
                    ? "linear-gradient(135deg, rgba(50,205,50,0.22) 0%, rgba(0,212,255,0.14) 100%)"
                    : "rgba(255,255,255,0.72)",
                  border: `1px solid ${listening ? "rgba(50,205,50,0.45)" : "rgba(255,255,255,0.88)"}`,
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  color: listening ? GREEN : MUTED,
                  boxShadow: listening ? `0 0 16px rgba(50,205,50,0.22)` : "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "all 0.25s ease",
                }}
              >
                <Activity size={12} />
                {listening ? "Listening" : "Standby"}
              </button>

              <div
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10.5px] font-mono"
                style={{
                  background: "rgba(255,255,255,0.55)",
                  border: "1px solid rgba(255,255,255,0.8)",
                  backdropFilter: "blur(12px)",
                  color: active ? BLUE : MUTED,
                  boxShadow: active ? `0 0 10px rgba(0,212,255,0.18)` : "none",
                  transition: "all 0.3s ease",
                }}
              >
                <Zap size={9} style={{ color: active ? BLUE : MUTED }} />
                {active ? "PROCESSING" : "READY"}
              </div>
            </div>
          </div>

          {/* Right VU panel */}
          <div className="flex flex-col items-center gap-2.5 px-5 py-4 rounded-2xl" style={GLASS}>
            <span className="text-[8px] font-mono font-bold tracking-[0.2em]" style={{ color: MUTED }}>OUTPUT</span>
            <VUBars active={active} count={7} height={104} />
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full transition-all" style={{
                background: active ? GREEN : "rgba(50,205,50,0.2)",
                boxShadow: active ? `0 0 6px ${GREEN}` : "none",
              }} />
              <span className="text-[8.5px] font-mono" style={{ color: active ? GREEN : MUTED }}>R</span>
            </div>
          </div>
        </div>

        {/* ─── BOTTOM — Log + Command ──────────────── */}
        <div className="flex flex-col gap-2.5 flex-shrink-0">

          {/* Log toggle */}
          <button
            className="flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-all"
            style={{ ...GLASS_DARK, color: LCD }}
            onClick={() => setLogOpen(v => !v)}
          >
            <div className="flex items-center gap-2.5">
              <Terminal size={12} style={{ color: LCD }} />
              <span className="text-[11.5px] font-mono font-bold tracking-[0.15em]">RECEIVER LOG</span>
              <span
                className="text-[9.5px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: "rgba(0,179,65,0.14)", color: LCD, border: "1px solid rgba(0,179,65,0.28)" }}
              >
                {log.length}
              </span>
              {connected && (
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1"
                  style={{ background: "rgba(0,212,255,0.1)", color: BLUE, border: "1px solid rgba(0,212,255,0.25)" }}
                >
                  <Power size={7} /> LIVE
                </span>
              )}
            </div>
            <div style={{ color: MUTED }}>
              {logOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </div>
          </button>

          {/* Log body */}
          {logOpen && (
            <div
              ref={logRef}
              className="rounded-xl overflow-y-auto feed-scroll"
              style={{
                ...GLASS_DARK,
                height: 132,
                padding: "11px 16px",
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                fontSize: "11px",
                lineHeight: 1.95,
              }}
            >
              {log.map(entry => (
                <div key={entry.id} className="flex gap-2.5">
                  <span style={{ color: "rgba(0,179,65,0.38)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {entry.ts}
                  </span>
                  <span style={{ color: "rgba(0,179,65,0.22)", flexShrink: 0 }}>::</span>
                  <span style={{ color: LOG_COLOR[entry.type] }}>{entry.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Command input */}
          <div className="flex gap-2.5">
            <div
              className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{
                ...GLASS_DARK,
                border: `1px solid ${cmdInput.trim() ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                transition: "border-color 0.2s ease",
              }}
            >
              <span className="font-mono text-[12px] flex-shrink-0" style={{ color: "rgba(0,212,255,0.4)" }}>$</span>
              <input
                value={cmdInput}
                onChange={e => setCmdInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendCommand(); }}
                placeholder="send a command..."
                className="flex-1 bg-transparent outline-none text-[13px] font-mono"
              style={{ color: BLUE, caretColor: BLUE }}
              />
              <span className="text-[10px] font-mono flex-shrink-0" style={{ color: "rgba(0,212,255,0.25)" }}>↵</span>
            </div>
            <button
              onClick={sendCommand}
              className="flex items-center justify-center w-11 rounded-xl transition-all flex-shrink-0"
              style={{
                background: cmdInput.trim()
                  ? "linear-gradient(135deg, rgba(0,212,255,0.22) 0%, rgba(50,205,50,0.16) 100%)"
                  : "rgba(20,35,50,0.6)",
                border: `1px solid ${cmdInput.trim() ? "rgba(0,212,255,0.4)" : "rgba(255,255,255,0.08)"}`,
                backdropFilter: "blur(16px)",
                color: cmdInput.trim() ? BLUE : MUTED,
                boxShadow: cmdInput.trim() ? `0 0 14px rgba(0,212,255,0.22)` : "none",
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
