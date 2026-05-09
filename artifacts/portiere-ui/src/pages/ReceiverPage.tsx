import { useEffect, useRef, useState, useCallback } from "react";
import {
  Wifi, WifiOff, Terminal, Send, ChevronDown, ChevronUp,
  Radio, Activity, Zap, Power,
} from "lucide-react";
import VoiceOrb from "@/components/VoiceOrb";
import SignalMeter from "@/components/SignalMeter";
import VUBars from "@/components/VUBars";
import { connectReceiver, type ReceiverEvent } from "@/lib/receiver";

// ─── Design tokens ─────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background: "rgba(255,250,238,0.62)",
  backdropFilter: "blur(28px) saturate(1.8)",
  WebkitBackdropFilter: "blur(28px) saturate(1.8)",
  border: "1px solid rgba(220,190,120,0.4)",
  boxShadow: "inset 0 1.5px 0 rgba(255,245,215,0.85), 0 4px 18px rgba(80,50,10,0.07)",
};

// Instrument panel bezel — rectilinear, physically-machined feel
const BEZEL: React.CSSProperties = {
  background: "linear-gradient(158deg, rgba(235,218,178,0.72) 0%, rgba(218,198,150,0.6) 100%)",
  backdropFilter: "blur(22px) saturate(1.7)",
  WebkitBackdropFilter: "blur(22px) saturate(1.7)",
  border: "1px solid rgba(175,145,70,0.45)",
  borderRadius: "5px",
  boxShadow: [
    "inset 0 1.5px 0 rgba(255,245,215,0.75)",
    "inset 0 -1.5px 0 rgba(110,80,20,0.2)",
    "inset 1.5px 0 0 rgba(255,245,215,0.4)",
    "inset -1.5px 0 0 rgba(110,80,20,0.12)",
    "0 4px 18px rgba(80,50,10,0.09)",
  ].join(", "),
  position: "relative" as const,
};

const GLASS_DARK: React.CSSProperties = {
  background: "rgba(8,13,18,0.87)",
  backdropFilter: "blur(20px) saturate(1.5)",
  WebkitBackdropFilter: "blur(20px) saturate(1.5)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.24)",
};

const SERIF = "'Cormorant Garamond', Georgia, serif";

const AMBER  = "#E8A020";
const AMBER2 = "#C87810";
const GREEN  = "#32CD32";
const TEXT   = "#1c1a10";
const MUTED  = "#7a6840";
const LCD    = "#00b341";

// ─── Types ─────────────────────────────────────────────────
type LogType = "info" | "command" | "heartbeat" | "connect" | "disconnect" | "error";
interface LogEntry { id: number; ts: string; type: LogType; text: string; }

const LOG_COLOR: Record<LogType, string> = {
  info:       LCD,
  command:    "#E8A020",
  heartbeat:  "rgba(232,160,32,0.42)",
  connect:    "#00d4ff",
  disconnect: "#FF6644",
  error:      "#FF4444",
};

let _logId = 0;
function nowTime() { return new Date().toLocaleTimeString("en-US", { hour12: false }); }

// ─── Small reusable sub-components ─────────────────────────

/** Corner rivet — looks like a panel mounting screw */
function Rivet({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      position: "absolute",
      width: 6, height: 6,
      borderRadius: "50%",
      background: "radial-gradient(circle at 33% 28%, rgba(248,225,155,0.95) 0%, rgba(175,135,55,0.8) 52%, rgba(105,75,20,0.65) 100%)",
      border: "0.5px solid rgba(95,65,15,0.35)",
      boxShadow: "inset 0 0.5px 0 rgba(255,240,170,0.55), 0 0.5px 2px rgba(0,0,0,0.22)",
      ...style,
    }} />
  );
}

/** Thin rule with tick marks — front-panel divider */
function PanelRule() {
  return (
    <div className="flex-shrink-0 relative" style={{ height: 10, margin: "2px 0 8px" }}>
      <div style={{
        position: "absolute",
        top: 4, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent 0%, rgba(175,140,55,0.25) 8%, rgba(175,140,55,0.25) 92%, transparent 100%)",
      }} />
      {Array.from({ length: 50 }, (_, i) => {
        const pct = i / 49;
        const isMajor = i % 10 === 0;
        const isMed   = i % 5 === 0 && !isMajor;
        return (
          <div key={i} style={{
            position: "absolute",
            left: `${pct * 100}%`,
            top: isMajor ? 0 : isMed ? 2 : 3,
            width: 1,
            height: isMajor ? 8 : isMed ? 5 : 3,
            transform: "translateX(-50%)",
            background: `rgba(160,125,45,${isMajor ? 0.45 : isMed ? 0.28 : 0.14})`,
          }} />
        );
      })}
    </div>
  );
}

/** FM tuner frequency strip */
function TunerStrip() {
  const freqs = [88, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108];
  const allTicks = Array.from({ length: 21 }, (_, i) => 88 + i); // 88-108 inclusive
  const tuned = 97.5;
  const toX = (f: number) => ((f - 88) / 20) * 100;

  return (
    <div
      className="flex-shrink-0 relative overflow-hidden mb-3"
      style={{
        background: "linear-gradient(180deg, rgba(248,235,195,0.6) 0%, rgba(240,220,165,0.5) 100%)",
        border: "1px solid rgba(185,150,65,0.4)",
        borderRadius: "4px",
        boxShadow: "inset 0 1.5px 0 rgba(255,248,220,0.7), inset 0 -1.5px 0 rgba(140,100,25,0.2), 0 2px 10px rgba(80,50,5,0.06)",
        height: 34,
        padding: "0 18px",
      }}
    >
      {/* Amber glow backlight */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, rgba(232,160,32,0.05) 0%, rgba(232,160,32,0.1) 55%, rgba(232,160,32,0.04) 100%)",
        pointerEvents: "none",
      }} />

      {/* Tick marks */}
      {allTicks.map(f => {
        const isMajor = f % 2 === 0;
        return (
          <div key={f} style={{
            position: "absolute",
            left: `calc(18px + ${toX(f)}% * (100% - 36px) / 100)`,
            top: 0,
            width: 1,
            height: isMajor ? 10 : 6,
            background: `rgba(145,105,25,${isMajor ? 0.5 : 0.25})`,
            transform: "translateX(-50%)",
          }} />
        );
      })}

      {/* Frequency labels — only even MHz */}
      {freqs.filter((_, i) => i % 2 === 0 || freqs[i] === 88 || freqs[i] === 108).map(f => (
        <div key={f} style={{
          position: "absolute",
          left: `calc(18px + ${toX(f)}% * (100% - 36px) / 100)`,
          top: 11,
          transform: "translateX(-50%)",
          fontSize: "7.5px",
          fontFamily: SERIF,
          fontStyle: "italic",
          color: "rgba(120,88,18,0.58)",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}>
          {f}
        </div>
      ))}

      {/* Tuner needle */}
      <div style={{
        position: "absolute",
        left: `calc(18px + ${toX(tuned)}% * (100% - 36px) / 100)`,
        top: 0, bottom: 0,
        width: 2,
        transform: "translateX(-50%)",
        background: `linear-gradient(180deg, ${AMBER} 0%, rgba(232,160,32,0.5) 100%)`,
        boxShadow: `0 0 7px rgba(232,160,32,0.65)`,
        borderRadius: "1px",
      }} />

      {/* Tuned frequency label */}
      <div style={{
        position: "absolute",
        left: `calc(18px + ${toX(tuned)}% * (100% - 36px) / 100)`,
        bottom: 3,
        transform: "translateX(-50%)",
        fontSize: "7px",
        fontFamily: SERIF,
        fontStyle: "italic",
        fontWeight: 600,
        color: AMBER2,
        whiteSpace: "nowrap",
        userSelect: "none",
      }}>
        {tuned.toFixed(1)}
      </div>

      {/* FM STEREO label */}
      <div style={{
        position: "absolute",
        right: 10, top: "50%",
        transform: "translateY(-50%)",
        fontSize: "8px",
        fontFamily: SERIF,
        fontStyle: "italic",
        letterSpacing: "0.14em",
        color: "rgba(140,105,25,0.5)",
        userSelect: "none",
      }}>
        FM STEREO
      </div>

      {/* Left channel label */}
      <div style={{
        position: "absolute",
        left: 6, top: "50%",
        transform: "translateY(-50%)",
        fontSize: "8px",
        fontFamily: SERIF,
        fontStyle: "italic",
        letterSpacing: "0.14em",
        color: "rgba(140,105,25,0.45)",
        userSelect: "none",
      }}>
        MHz
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────
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

      {/* ── Background ─────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 22%, #fdfaf0 0%, #f8f0d8 35%, #f0e4c0 65%, #e8d8a8 100%)",
      }} />
      {/* Subtle diagonal crosshatch — references speaker cloth / brushed panel */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: [
          "repeating-linear-gradient(45deg, rgba(160,120,40,0.028) 0px, rgba(160,120,40,0.028) 1px, transparent 1px, transparent 8px)",
          "repeating-linear-gradient(-45deg, rgba(160,120,40,0.022) 0px, rgba(160,120,40,0.022) 1px, transparent 1px, transparent 8px)",
        ].join(", "),
      }} />
      {/* Bottom ambient glow — light reflecting off the receiver's base */}
      <div className="absolute bottom-0 pointer-events-none" style={{
        left: "10%", right: "10%", height: 2,
        background: "radial-gradient(ellipse at center, rgba(232,160,32,0.45) 0%, transparent 70%)",
        filter: "blur(4px)",
      }} />

      {/* ── Scrollable content ─────────────────────── */}
      <div className="relative z-10 flex flex-col h-full overflow-y-auto feed-scroll"
        style={{ padding: "14px 20px 16px" }}>

        {/* FM Tuner scale strip */}
        <TunerStrip />

        {/* TOP BAR */}
        <div className="flex items-center gap-4 flex-shrink-0 mb-2">

          {/* Identity */}
          <div className="flex flex-col gap-0.5 flex-shrink-0 w-40">
            <div className="flex items-center gap-2">
              <Radio size={13} style={{ color: connected ? AMBER : MUTED, transition: "color 0.4s" }} />
              <span style={{
                fontFamily: SERIF,
                fontSize: "21px",
                fontWeight: 500,
                fontStyle: "italic",
                color: TEXT,
                letterSpacing: "-0.015em",
                lineHeight: 1,
              }}>
                Receiver
              </span>
            </div>
            <span className="font-mono text-[9px] tracking-[0.2em]" style={{ color: MUTED, opacity: 0.7 }}>
              PC ENGINE ROOM
            </span>
          </div>

          {/* Signal Meter */}
          <div className="flex-1 flex justify-center">
            <div className="rounded-md px-5 py-1" style={GLASS}>
              <SignalMeter value={signal} connected={connected} label="RECEIVER" />
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 w-40">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[10.5px] font-semibold transition-all"
              style={{
                ...GLASS,
                color: connected ? GREEN : "#FF6644",
                border: `1px solid ${connected ? "rgba(50,205,50,0.4)" : "rgba(255,100,68,0.4)"}`,
                boxShadow: connected ? "0 0 14px rgba(50,205,50,0.2)" : "none",
              }}>
              {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {connected ? "LIVE" : "OFFLINE"}
            </div>
            <div className="font-mono text-[9px] text-right leading-relaxed" style={{ color: MUTED, opacity: 0.7 }}>
              ws://…/ws/receiver<br />port 8080
            </div>
          </div>
        </div>

        {/* Panel rule separator */}
        <PanelRule />

        {/* ── MIDDLE — VU | ORB | VU ─────────────── */}
        <div className="flex items-center justify-center gap-5 flex-shrink-0 mb-3">

          {/* Left VU bezel panel */}
          <div className="flex flex-col items-center gap-2 px-5 py-4" style={BEZEL}>
            <Rivet style={{ top: 5, left: 5 }} />
            <Rivet style={{ top: 5, right: 5 }} />
            <Rivet style={{ bottom: 5, left: 5 }} />
            <Rivet style={{ bottom: 5, right: 5 }} />
            <span style={{
              fontFamily: SERIF,
              fontSize: "10.5px",
              fontWeight: 400,
              fontStyle: "italic",
              letterSpacing: "0.18em",
              color: MUTED,
              textTransform: "uppercase" as const,
            }}>
              Input
            </span>
            <VUBars active={active} count={7} height={100} />
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full transition-all" style={{
                background: active ? AMBER : "rgba(200,150,30,0.22)",
                boxShadow: active ? `0 0 8px ${AMBER}` : "none",
              }} />
              <span className="font-mono text-[8px]" style={{ color: active ? AMBER : MUTED }}>L</span>
            </div>
          </div>

          {/* Orb — central section */}
          <div className="flex flex-col items-center gap-3">
            <VoiceOrb active={orbActive} listening={listening} size={152} />

            {/* Controls */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setListening(l => !l)}
                className="flex items-center gap-2 px-5 py-2 rounded-full transition-all"
                style={{
                  background: listening
                    ? `linear-gradient(135deg, rgba(232,160,32,0.2) 0%, rgba(200,120,20,0.14) 100%)`
                    : "rgba(252,248,238,0.72)",
                  border: `1px solid ${listening ? "rgba(232,160,32,0.48)" : "rgba(200,170,90,0.35)"}`,
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  color: listening ? AMBER2 : MUTED,
                  boxShadow: listening ? `0 0 18px rgba(232,160,32,0.22)` : "0 2px 8px rgba(60,40,0,0.06)",
                  transition: "all 0.25s ease",
                  fontFamily: SERIF,
                  fontSize: "15px",
                  fontWeight: 500,
                  fontStyle: "italic",
                }}
              >
                <Activity size={12} />
                {listening ? "Listening" : "Standby"}
              </button>

              <div className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all"
                style={{
                  background: "rgba(252,245,225,0.65)",
                  border: `1px solid ${active ? "rgba(232,160,32,0.42)" : "rgba(185,155,70,0.32)"}`,
                  backdropFilter: "blur(12px)",
                  color: active ? AMBER2 : MUTED,
                  boxShadow: active ? `0 0 14px rgba(232,160,32,0.22)` : "none",
                  transition: "all 0.3s ease",
                  fontFamily: SERIF,
                  fontSize: "13px",
                  fontWeight: 400,
                  fontStyle: "italic",
                }}>
                <Zap size={9} style={{ color: active ? AMBER : MUTED }} />
                {active ? "Processing" : "Ready"}
              </div>
            </div>
          </div>

          {/* Right VU bezel panel */}
          <div className="flex flex-col items-center gap-2 px-5 py-4" style={BEZEL}>
            <Rivet style={{ top: 5, left: 5 }} />
            <Rivet style={{ top: 5, right: 5 }} />
            <Rivet style={{ bottom: 5, left: 5 }} />
            <Rivet style={{ bottom: 5, right: 5 }} />
            <span style={{
              fontFamily: SERIF,
              fontSize: "10.5px",
              fontWeight: 400,
              fontStyle: "italic",
              letterSpacing: "0.18em",
              color: MUTED,
              textTransform: "uppercase" as const,
            }}>
              Output
            </span>
            <VUBars active={active} count={7} height={100} />
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full transition-all" style={{
                background: active ? AMBER : "rgba(200,150,30,0.22)",
                boxShadow: active ? `0 0 8px ${AMBER}` : "none",
              }} />
              <span className="font-mono text-[8px]" style={{ color: active ? AMBER : MUTED }}>R</span>
            </div>
          </div>
        </div>

        {/* Model badge + second panel rule */}
        <div className="flex items-center justify-between flex-shrink-0 mb-3">
          <PanelRule />
        </div>

        {/* MODEL badge row */}
        <div className="flex items-center justify-end flex-shrink-0 -mt-2 mb-2">
          <div style={{
            fontFamily: SERIF,
            fontSize: "9px",
            fontStyle: "italic",
            letterSpacing: "0.2em",
            color: "rgba(140,105,30,0.38)",
            userSelect: "none",
          }}>
            PORTIERE · SA-PCR 1
          </div>
        </div>

        {/* ── LOG + COMMAND ─────────────────────────── */}
        <div className="flex flex-col gap-2.5 flex-shrink-0">

          <button
            className="flex items-center justify-between px-4 py-2.5 rounded-md text-left transition-all"
            style={{ ...GLASS_DARK, borderRadius: "4px", color: LCD }}
            onClick={() => setLogOpen(v => !v)}
          >
            <div className="flex items-center gap-2.5">
              <Terminal size={12} style={{ color: LCD }} />
              <span className="font-mono text-[10.5px] font-bold tracking-[0.18em]">RECEIVER LOG</span>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                style={{ background: "rgba(0,179,65,0.14)", color: LCD, border: "1px solid rgba(0,179,65,0.28)" }}>
                {log.length}
              </span>
              {connected && (
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1"
                  style={{ background: "rgba(50,205,50,0.1)", color: GREEN, border: "1px solid rgba(50,205,50,0.25)" }}>
                  <Power size={7} /> LIVE
                </span>
              )}
            </div>
            <div style={{ color: MUTED }}>
              {logOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </div>
          </button>

          {logOpen && (
            <div ref={logRef}
              className="overflow-y-auto feed-scroll"
              style={{
                ...GLASS_DARK,
                borderRadius: "4px",
                height: 118,
                padding: "10px 16px",
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                fontSize: "10.5px",
                lineHeight: 1.95,
              }}
            >
              {/* Scanline overlay */}
              <div style={{
                position: "sticky",
                top: 0, left: 0, right: 0, bottom: 0,
                pointerEvents: "none",
                backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 3px)",
                zIndex: 1,
                height: 0,
              }} />
              {log.map(entry => (
                <div key={entry.id} className="flex gap-2.5">
                  <span style={{ color: "rgba(0,179,65,0.34)", whiteSpace: "nowrap", flexShrink: 0 }}>{entry.ts}</span>
                  <span style={{ color: "rgba(0,179,65,0.18)", flexShrink: 0 }}>::</span>
                  <span style={{ color: LOG_COLOR[entry.type] }}>{entry.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Command input */}
          <div className="flex gap-2.5">
            <div className="flex-1 flex items-center gap-3 px-4 py-2.5"
              style={{
                ...GLASS_DARK,
                borderRadius: "4px",
                border: `1px solid ${cmdInput.trim() ? "rgba(232,160,32,0.35)" : "rgba(255,255,255,0.07)"}`,
                transition: "border-color 0.2s ease",
              }}>
              <span className="font-mono text-[12px] flex-shrink-0" style={{ color: "rgba(232,160,32,0.42)" }}>$</span>
              <input
                value={cmdInput}
                onChange={e => setCmdInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendCommand(); }}
                placeholder="send a command..."
                className="flex-1 bg-transparent outline-none font-mono text-[12.5px]"
                style={{ color: "#F0C055", caretColor: AMBER }}
              />
              <span className="font-mono text-[10px] flex-shrink-0" style={{ color: "rgba(232,160,32,0.28)" }}>↵</span>
            </div>
            <button onClick={sendCommand}
              className="flex items-center justify-center w-10 transition-all flex-shrink-0"
              style={{
                background: cmdInput.trim()
                  ? "linear-gradient(135deg, rgba(232,160,32,0.22) 0%, rgba(200,120,20,0.16) 100%)"
                  : "rgba(15,24,35,0.7)",
                borderRadius: "4px",
                border: `1px solid ${cmdInput.trim() ? "rgba(232,160,32,0.45)" : "rgba(255,255,255,0.07)"}`,
                color: cmdInput.trim() ? AMBER : MUTED,
                boxShadow: cmdInput.trim() ? `0 0 16px rgba(232,160,32,0.25)` : "none",
              }}>
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
