import { useEffect, useRef, useState, useCallback } from "react";
import {
  Wifi, WifiOff, Terminal, Send, ChevronDown, ChevronUp,
  Radio, Activity, Zap, Power,
} from "lucide-react";
import VoiceOrb from "@/components/VoiceOrb";
import SignalMeter from "@/components/SignalMeter";
import VUBars from "@/components/VUBars";
import { connectReceiver, type ReceiverEvent } from "@/lib/receiver";

// ─── Design tokens ────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.58)",
  backdropFilter: "blur(28px) saturate(1.8)",
  WebkitBackdropFilter: "blur(28px) saturate(1.8)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.92), 0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
};

const PANEL: React.CSSProperties = {
  background: "rgba(240,230,215,0.5)",
  backdropFilter: "blur(22px) saturate(1.6)",
  WebkitBackdropFilter: "blur(22px) saturate(1.6)",
  border: "1px solid rgba(210,185,145,0.4)",
  boxShadow: "inset 0 1px 0 rgba(255,245,225,0.8), 0 4px 20px rgba(80,50,10,0.08)",
};

const GLASS_DARK: React.CSSProperties = {
  background: "rgba(8,14,20,0.86)",
  backdropFilter: "blur(20px) saturate(1.5)",
  WebkitBackdropFilter: "blur(20px) saturate(1.5)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.24)",
};

const SERIF = "'Cormorant Garamond', Georgia, serif";

const AMBER  = "#E8A020";        // warm analog amber — primary accent
const AMBER2 = "#D4821A";        // deeper amber — active/pressed
const GREEN  = "#32CD32";        // power LED green — LIVE status only
const BLUE   = "#00d4ff";        // terminal blue — command input
const TEXT   = "#1c2018";        // dark warm text
const MUTED  = "#7a6a50";        // warm muted
const LCD    = "#00b341";        // LCD green — intentionally digital

// ─── Types ────────────────────────────────────────────────────
type LogType = "info" | "command" | "heartbeat" | "connect" | "disconnect" | "error";
interface LogEntry { id: number; ts: string; type: LogType; text: string; }

const LOG_COLOR: Record<LogType, string> = {
  info:       LCD,
  command:    "#E8A020",
  heartbeat:  "rgba(232,160,32,0.45)",
  connect:    "#00d4ff",
  disconnect: "#FF6644",
  error:      "#FF4444",
};

let _logId = 0;
function nowTime() { return new Date().toLocaleTimeString("en-US", { hour12: false }); }

// ─── Component ────────────────────────────────────────────────
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

  const logRef   = useRef<HTMLDivElement>(null);
  const heartRef = useRef(0);

  const push = useCallback((type: LogType, text: string) => {
    setLog(prev => [...prev.slice(-150), { id: ++_logId, ts: nowTime(), type, text }]);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
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
          if (heartRef.current % 6 === 1) push("heartbeat", `HEARTBEAT OK  ·  clients: ${evt.clients ?? 1}`);
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
      (ok: boolean) => { setConnected(ok); setSignal(ok ? 100 : 0); },
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

      {/* Background — warm sky, slightly tinted amber */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 28%, #fffdf8 0%, #faf4e8 38%, #f0e8d2 68%, #e8dcc0 100%)",
      }} />
      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle, rgba(160,120,40,0.07) 1px, transparent 1px)",
        backgroundSize: "26px 26px",
      }} />

      {/* Main layout */}
      <div className="relative z-10 flex flex-col h-full overflow-y-auto feed-scroll" style={{ padding: "18px 22px 16px" }}>

        {/* ─── TOP BAR ─────────────────────────────── */}
        <div className="flex items-center gap-4 flex-shrink-0 mb-4">

          {/* Identity — serif display */}
          <div className="flex flex-col gap-0.5 flex-shrink-0 w-40">
            <div className="flex items-center gap-2">
              <Radio size={14} style={{ color: connected ? AMBER : MUTED, transition: "color 0.4s" }} />
              <span style={{
                fontFamily: SERIF,
                fontSize: "22px",
                fontWeight: 500,
                fontStyle: "italic",
                color: TEXT,
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}>
                Receiver
              </span>
            </div>
            <span className="font-mono text-[9.5px] tracking-[0.18em]" style={{ color: MUTED }}>
              PC ENGINE ROOM
            </span>
          </div>

          {/* Signal Meter — centrepiece */}
          <div className="flex-1 flex justify-center">
            <div className="rounded-2xl px-6 py-1.5" style={GLASS}>
              <SignalMeter value={signal} connected={connected} label="RECEIVER" />
            </div>
          </div>

          {/* Status pill + endpoint */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 w-40">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[11px] font-semibold transition-all"
              style={{
                ...GLASS,
                color: connected ? GREEN : "#FF6644",
                border: `1px solid ${connected ? "rgba(50,205,50,0.4)" : "rgba(255,100,68,0.4)"}`,
                boxShadow: connected ? "0 0 14px rgba(50,205,50,0.2)" : "none",
              }}
            >
              {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {connected ? "LIVE" : "OFFLINE"}
            </div>
            <div className="font-mono text-[9px] text-right leading-relaxed" style={{ color: MUTED }}>
              ws://…/ws/receiver<br />port 8080
            </div>
          </div>
        </div>

        {/* ─── MIDDLE — VU | ORB | VU ─────────────── */}
        <div className="flex items-center justify-center gap-6 flex-shrink-0 mb-4">

          {/* Left VU panel */}
          <div className="flex flex-col items-center gap-2.5 px-5 py-4 rounded-2xl" style={PANEL}>
            <span style={{
              fontFamily: SERIF,
              fontSize: "12px",
              fontWeight: 400,
              letterSpacing: "0.12em",
              color: MUTED,
              textTransform: "uppercase" as const,
            }}>
              Input
            </span>
            <VUBars active={active} count={7} height={104} />
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full transition-all" style={{
                background: active ? AMBER : "rgba(232,160,32,0.2)",
                boxShadow: active ? `0 0 7px ${AMBER}` : "none",
              }} />
              <span className="font-mono text-[8.5px]" style={{ color: active ? AMBER : MUTED }}>L</span>
            </div>
          </div>

          {/* Central orb section */}
          <div className="flex flex-col items-center gap-3">
            <VoiceOrb active={orbActive} listening={listening} size={154} />

            {/* Controls beneath orb */}
            <div className="flex items-center gap-2.5">
              {/* Standby / Listening button — serif label */}
              <button
                onClick={() => setListening(l => !l)}
                className="flex items-center gap-2 px-5 py-2 rounded-full transition-all"
                style={{
                  background: listening
                    ? `linear-gradient(135deg, rgba(232,160,32,0.22) 0%, rgba(212,130,26,0.14) 100%)`
                    : "rgba(255,255,255,0.72)",
                  border: `1px solid ${listening ? "rgba(232,160,32,0.45)" : "rgba(255,255,255,0.85)"}`,
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  color: listening ? AMBER2 : MUTED,
                  boxShadow: listening ? `0 0 18px rgba(232,160,32,0.22)` : "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "all 0.25s ease",
                  fontFamily: SERIF,
                  fontSize: "15px",
                  fontWeight: 500,
                  fontStyle: "italic",
                  letterSpacing: "0.01em",
                }}
              >
                <Activity size={12} />
                {listening ? "Listening" : "Standby"}
              </button>

              {/* Ready / Processing status */}
              <div
                className="flex items-center gap-1.5 px-3 py-2 rounded-full"
                style={{
                  background: "rgba(255,248,235,0.65)",
                  border: `1px solid ${active ? "rgba(232,160,32,0.4)" : "rgba(210,185,145,0.35)"}`,
                  backdropFilter: "blur(12px)",
                  color: active ? AMBER2 : MUTED,
                  boxShadow: active ? `0 0 12px rgba(232,160,32,0.2)` : "none",
                  transition: "all 0.3s ease",
                  fontFamily: SERIF,
                  fontSize: "13px",
                  fontWeight: 400,
                  fontStyle: "italic",
                }}
              >
                <Zap size={9} style={{ color: active ? AMBER : MUTED }} />
                {active ? "Processing" : "Ready"}
              </div>
            </div>
          </div>

          {/* Right VU panel */}
          <div className="flex flex-col items-center gap-2.5 px-5 py-4 rounded-2xl" style={PANEL}>
            <span style={{
              fontFamily: SERIF,
              fontSize: "12px",
              fontWeight: 400,
              letterSpacing: "0.12em",
              color: MUTED,
              textTransform: "uppercase" as const,
            }}>
              Output
            </span>
            <VUBars active={active} count={7} height={104} />
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full transition-all" style={{
                background: active ? AMBER : "rgba(232,160,32,0.2)",
                boxShadow: active ? `0 0 7px ${AMBER}` : "none",
              }} />
              <span className="font-mono text-[8.5px]" style={{ color: active ? AMBER : MUTED }}>R</span>
            </div>
          </div>
        </div>

        {/* ─── BOTTOM — Log + Command ──────────────── */}
        <div className="flex flex-col gap-2.5 flex-shrink-0">

          {/* Log toggle bar */}
          <button
            className="flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-all"
            style={{ ...GLASS_DARK, color: LCD }}
            onClick={() => setLogOpen(v => !v)}
          >
            <div className="flex items-center gap-2.5">
              <Terminal size={12} style={{ color: LCD }} />
              <span className="font-mono text-[11px] font-bold tracking-[0.18em]">RECEIVER LOG</span>
              <span
                className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                style={{ background: "rgba(0,179,65,0.14)", color: LCD, border: "1px solid rgba(0,179,65,0.28)" }}
              >
                {log.length}
              </span>
              {connected && (
                <span
                  className="font-mono text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1"
                  style={{ background: "rgba(50,205,50,0.1)", color: GREEN, border: "1px solid rgba(50,205,50,0.25)" }}
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
                  <span style={{ color: "rgba(0,179,65,0.36)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {entry.ts}
                  </span>
                  <span style={{ color: "rgba(0,179,65,0.2)", flexShrink: 0 }}>::</span>
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
                border: `1px solid ${cmdInput.trim() ? "rgba(232,160,32,0.35)" : "rgba(255,255,255,0.08)"}`,
                transition: "border-color 0.2s ease",
              }}
            >
              <span className="font-mono text-[12px] flex-shrink-0" style={{ color: "rgba(232,160,32,0.45)" }}>$</span>
              <input
                value={cmdInput}
                onChange={e => setCmdInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendCommand(); }}
                placeholder="send a command..."
                className="flex-1 bg-transparent outline-none font-mono text-[13px]"
                style={{ color: "#F0C060", caretColor: AMBER }}
              />
              <span className="font-mono text-[10px] flex-shrink-0" style={{ color: "rgba(232,160,32,0.3)" }}>↵</span>
            </div>
            <button
              onClick={sendCommand}
              className="flex items-center justify-center w-11 rounded-xl transition-all flex-shrink-0"
              style={{
                background: cmdInput.trim()
                  ? "linear-gradient(135deg, rgba(232,160,32,0.25) 0%, rgba(212,130,26,0.18) 100%)"
                  : "rgba(18,28,40,0.6)",
                border: `1px solid ${cmdInput.trim() ? "rgba(232,160,32,0.45)" : "rgba(255,255,255,0.08)"}`,
                backdropFilter: "blur(16px)",
                color: cmdInput.trim() ? AMBER : MUTED,
                boxShadow: cmdInput.trim() ? `0 0 16px rgba(232,160,32,0.25)` : "none",
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
