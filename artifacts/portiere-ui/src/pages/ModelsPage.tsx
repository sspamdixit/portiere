import { useState, useRef, useEffect } from "react";
import { RefreshCw, Cpu, HardDrive, Loader2, AlertCircle, Box, ChevronRight, Sparkles, Search, Globe, Film, Monitor, Check, Cloud, Mail, Terminal, Image, Languages, Newspaper, TrendingUp, CalendarPlus, ExternalLink, Copy, Download, X, Play, Wrench } from "lucide-react";
import { fetchModels, fetchSettings, saveSettings, streamOllamaInstall, probeOllama, fetchSystemInfo, streamInstallOllama, startOllamaService } from "@/lib/api";

const dim = "#4A3A2C";
const muted = "#8A7A66";
const green = "#6A8A5A";
const primary = "#CC7722";

interface OllamaModel { name: string; size_gb: number; modified: string; }
interface LMStudioModel { name: string; object: string; }
interface ModelsData {
  ollama: OllamaModel[];
  lmstudio: LMStudioModel[];
  ollama_error?: string;
  lmstudio_error?: string;
}

const RAM_MAP: Record<string, string> = {
  "llama3.2": "2 GB",   "llama3.2:1b": "1.3 GB", "llama3.2:3b": "2 GB",
  "llama3.1:8b": "4.9 GB", "llama3.1:70b": "40 GB", "llama3.1:405b": "229 GB",
  "llama3:8b": "4.7 GB", "llama3:70b": "40 GB",
  "mistral": "4.1 GB",  "mistral:7b": "4.1 GB",
  "gemma2": "5.4 GB",   "gemma2:2b": "1.6 GB", "gemma2:9b": "5.4 GB",
  "phi3": "2.2 GB",     "phi3.5": "2.2 GB",    "phi4": "8.5 GB",
  "qwen2.5": "4.7 GB",  "qwen2.5:7b": "4.7 GB", "qwen2.5:14b": "9 GB",
  "deepseek-r1:7b": "4.7 GB", "deepseek-r1:14b": "9 GB",
  "codellama": "3.8 GB", "codellama:7b": "3.8 GB",
  "nomic-embed-text": "0.3 GB", "mxbai-embed-large": "0.7 GB",
};

function getRAM(name: string): string | null {
  return RAM_MAP[name] ?? RAM_MAP[name.split(":")[0]] ?? null;
}

const POPULAR_MODELS = [
  { name: "llama3.2",       desc: "Fast · 2 GB"         },
  { name: "llama3.1:8b",    desc: "Balanced · 5 GB"     },
  { name: "mistral",        desc: "Reasoning · 4 GB"    },
  { name: "gemma2:2b",      desc: "Tiny · 1.6 GB"       },
  { name: "phi4",           desc: "Smart · 8.5 GB"      },
  { name: "deepseek-r1:7b", desc: "Step-by-step · 5 GB" },
  { name: "codellama",      desc: "Code · 4 GB"         },
];

const CAPABILITIES = [
  { Icon: Search,      label: "Web Search",           desc: "Real-time search: flights, therapists, news, products, anything on the web.", color: primary, status: "built-in" as const },
  { Icon: Cloud,       label: "Weather",              desc: "Current conditions and 7-day forecast for any city worldwide. No API key needed.", color: "hsl(200 80% 65%)", status: "built-in" as const },
  { Icon: Newspaper,   label: "Live News",            desc: "Latest headlines on any topic: tech, world events, sports, finance. No API key needed.", color: "hsl(25 90% 62%)", status: "built-in" as const },
  { Icon: TrendingUp,  label: "Finance & Markets",    desc: "Real-time stock prices and crypto rates: TSLA, AAPL, Bitcoin, Ethereum, and more.", color: "hsl(142 60% 55%)", status: "built-in" as const },
  { Icon: Languages,   label: "Translator",           desc: "Translate text to and from 50+ languages instantly. No API key needed.", color: "hsl(185 70% 58%)", status: "built-in" as const },
  { Icon: CalendarPlus,label: "Calendar & Reminders", desc: "Create calendar events as .ics files, importable into Google Calendar, Outlook, or Apple Calendar.", color: "#C8882C", status: "built-in" as const },
  { Icon: Sparkles,    label: "Claude: Writing & Coding", desc: "Deep reasoning, code generation, drafting emails, analysis, and complex tasks.", color: "#E0A040", status: "key" as const, key: "claude_api_key", keyLabel: "Anthropic API Key" },
  { Icon: Mail,        label: "Email",                desc: "Compose and send emails. Sends via SMTP if configured, otherwise creates a mailto draft.", color: "hsl(38 90% 60%)", status: "smtp" as const, key: "smtp_host", keyLabel: "SMTP Host" },
  { Icon: Terminal,    label: "Code Runner",          desc: "Write and execute Python code. Output appears in the feed.", color: "hsl(142 60% 55%)", status: "built-in" as const },
  { Icon: Globe,       label: "Research & OSINT",     desc: "Domain investigation, DNS/WHOIS lookups, and digital footprinting.", color: "hsl(38 90% 60%)", status: "built-in" as const },
  { Icon: Monitor,     label: "System Monitor",       desc: "CPU, RAM, battery, disk usage, and file system access.", color: "hsl(142 60% 55%)", status: "built-in" as const },
  { Icon: Image,       label: "Image Generation",     desc: "Generate images via FAL.ai Flux from any text description: portraits, artwork, concepts.", color: "hsl(310 70% 68%)", status: "key" as const, key: "fal_api_key", keyLabel: "FAL API Key" },
  { Icon: Film,        label: "Video Generation",     desc: "Generate video clips via FAL.ai or Seedance from a text prompt.", color: "hsl(328 80% 68%)", status: "key" as const, key: "fal_api_key", keyLabel: "FAL API Key" },
];

export default function CapabilitiesPage() {
  const [modelData, setModelData] = useState<ModelsData | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const [selectedBrain, setSelectedBrain] = useState<string | null>(null);
  const [showInstaller, setShowInstaller] = useState(false);
  const [installModel, setInstallModel] = useState("llama3.2");
  const [installProgress, setInstallProgress] = useState<{ status: string; percent?: number } | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const [justReconnected, setJustReconnected] = useState(false);
  const installCancelRef = useRef<(() => void) | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [osName, setOsName] = useState<string | null>(null);
  const [setupPhase, setSetupPhase] = useState<"idle" | "installing" | "starting">("idle");
  const [installLines, setInstallLines] = useState<string[]>([]);
  const [startMsg, setStartMsg] = useState<string | null>(null);
  const installOutputRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchSettings()
      .then(s => setSelectedBrain(String(s.brain_model || "")))
      .catch(() => {});
    fetchSystemInfo()
      .then(info => setOsName(info.os))
      .catch(() => {});
  }, []);

  const handleInstallOllama = () => {
    setSetupPhase("installing");
    setInstallLines([]);
    setStartMsg(null);
    streamInstallOllama(
      (line) => setInstallLines(prev => {
        const next = [...prev, line];
        setTimeout(() => {
          if (installOutputRef.current)
            installOutputRef.current.scrollTop = installOutputRef.current.scrollHeight;
        }, 30);
        return next;
      }),
      (type, msg) => {
        if (type === "success") {
          setInstallLines(prev => [...prev, "✓ " + msg]);
          setSetupPhase("starting");
          handleStartOllama();
        } else if (type === "error") {
          setInstallLines(prev => [...prev, "✗ " + msg]);
          setSetupPhase("idle");
        } else {
          setSetupPhase("idle");
        }
      },
    );
  };

  const handleStartOllama = async () => {
    setSetupPhase("starting");
    const r = await startOllamaService();
    setStartMsg(r.message);
    setSetupPhase("idle");
    if (r.ok) setTimeout(() => refresh(), 2000);
  };

  useEffect(() => {
    if (!modelData?.ollama_error) {
      if (reconnectRef.current) { clearInterval(reconnectRef.current); reconnectRef.current = null; }
      return;
    }
    reconnectRef.current = setInterval(async () => {
      try {
        const r = await probeOllama();
        if (r.ok) {
          clearInterval(reconnectRef.current!); reconnectRef.current = null;
          setJustReconnected(true);
          setTimeout(() => setJustReconnected(false), 4000);
          refresh();
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => { if (reconnectRef.current) clearInterval(reconnectRef.current); };
  }, [modelData?.ollama_error]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      const [models, cfg] = await Promise.all([fetchModels(), fetchSettings()]);
      setModelData(models);
      setSettings(Object.fromEntries(Object.entries(cfg).map(([k, v]) => [k, String(v)])));
      setSelectedBrain(String(cfg.brain_model || ""));
      setLastRefresh(new Date().toLocaleTimeString("en", { hour12: false }));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const useModel = async (modelName: string) => {
    try {
      await saveSettings({ brain_model: modelName, brain_provider: "ollama" });
      setSelectedBrain(modelName);
    } catch { /* ignore */ }
  };

  const handleInstall = () => {
    const m = installModel.trim();
    if (!m || installProgress) return;
    setInstallError(null);
    setInstallProgress({ status: "Starting…" });
    installCancelRef.current = streamOllamaInstall(
      m,
      (status, percent) => setInstallProgress({ status, percent }),
      () => { setInstallProgress(null); setShowInstaller(false); refresh(); },
      (err) => { setInstallError(err); setInstallProgress(null); },
    );
  };

  const cancelInstall = () => {
    installCancelRef.current?.();
    setInstallProgress(null);
  };

  const isKeyConfigured = (key: string) => (settings[key] || "").length > 5;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 flex-shrink-0"
        style={{ height: "46px", borderBottom: "1px solid #242018" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold" style={{ color: "#E2D0B4", letterSpacing: "-0.01em" }}>
            Capabilities
          </span>
          <ChevronRight size={12} style={{ color: "#4A3A2C" }} />
          <span className="text-[13px]" style={{ color: muted }}>
            {lastRefresh ? `Local models · ${lastRefresh}` : "What Portiere can do"}
          </span>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium transition-all disabled:opacity-50"
          style={{
            backgroundColor: "rgba(204,119,34,0.08)",
            border: "1px solid rgba(165,124,0,0.22)",
            color: primary,
            letterSpacing: "0em",
            borderRadius: "2px",
          }}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Refresh local models
        </button>
      </div>

      <div className="flex-1 overflow-y-auto feed-scroll px-6 py-5 space-y-6 max-w-2xl w-full">
        {error && (
          <div
            className="flex items-center gap-2 p-4 rounded-2xl text-[13px]"
            style={{ backgroundColor: "hsl(347 87% 60% / 0.06)", border: "1px solid hsl(347 87% 60% / 0.2)", color: "hsl(347 87% 65%)" }}
          >
            <AlertCircle size={14} className="flex-shrink-0" /> {error}
          </div>
        )}

        {/* Reconnected banner */}
        {justReconnected && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[13px] animate-feed-in"
            style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", color: green }}
          >
            <Check size={13} /> Ollama reconnected, models refreshed
          </div>
        )}

        {/* Capability cards */}
        <div>
          <p className="text-[10px] uppercase font-semibold mb-3 px-1" style={{ color: "#5A4A38", letterSpacing: "0.06em" }}>
            Available capabilities
          </p>
          <div className="space-y-2">
            {CAPABILITIES.map(({ Icon, label, desc, color, status, key, keyLabel }) => {
              const configured = status === "built-in" || (key ? isKeyConfigured(key) : false);
              const badgeText = status === "built-in"
                ? "Built-in"
                : status === "smtp"
                ? (configured ? "Configured" : `Needs ${keyLabel}`)
                : configured ? "Connected" : `Needs ${keyLabel}`;

              return (
                <div
                  key={label}
                  className="flex items-start gap-4 p-4 rounded-2xl transition-colors"
                  style={{
                    backgroundColor: "#1A1714",
                    border: "1px solid #2A2420",
                    borderLeft: configured ? `2px solid ${color}70` : "1px solid #2A2420",
                    borderRadius: "3px",
                  }}
                >
                  <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${color}14`, color, borderRadius: "2px" }}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold" style={{ color: "#E2D0B4", letterSpacing: "-0.01em" }}>
                        {label}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 font-semibold"
                        style={{
                          backgroundColor: configured ? "rgba(106,138,90,0.1)" : "#111009",
                          color: configured ? green : "#5A4A38",
                          border: `1px solid ${configured ? "rgba(106,138,90,0.25)" : "#2A2420"}`,
                          letterSpacing: "0.04em",
                          borderRadius: "2px",
                          textTransform: "uppercase",
                          fontSize: "9px",
                        }}
                      >
                        {badgeText}
                      </span>
                    </div>
                    <p className="text-[12px] leading-relaxed" style={{ color: muted }}>{desc}</p>
                  </div>
                  {configured && (
                    <Check size={13} className="flex-shrink-0 mt-1.5" style={{ color: green, opacity: 0.8 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Local AI models */}
        <div>
          <p className="text-[10px] uppercase font-semibold mb-3 px-1" style={{ color: "#5A4A38", letterSpacing: "0.06em" }}>
            Local AI models
          </p>

          {!modelData && !loading && (
            <div className="relative flex flex-col items-center justify-center py-16 gap-4">
              <div className="absolute inset-0 pointer-events-none dot-grid" style={{ opacity: 0.4, borderRadius: "3px" }} />
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 50% 30% at 50% 50%, rgba(96,0,0,0.06) 0%, transparent 70%)" }} />
              <div className="relative w-12 h-12 flex items-center justify-center"
                style={{ backgroundColor: "#1A1714", border: "1px solid #2A2420", borderRadius: "3px" }}>
                <Cpu size={20} style={{ color: "#5A4A38" }} />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold" style={{ color: "#E2D0B4", letterSpacing: "-0.01em" }}>
                  Check for local models
                </p>
                <p className="text-[13px] mt-1" style={{ color: muted }}>Scans Ollama and LM Studio</p>
              </div>
              <button onClick={refresh}
                className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold"
                style={{
                  background: "linear-gradient(135deg, #7A5200 0%, #CC7722 100%)",
                  color: "#E2D0B4", boxShadow: "0 2px 12px rgba(165,124,0,0.32)", letterSpacing: "0em",
                  borderRadius: "2px", border: "1px solid rgba(204,119,34,0.4)",
                }}
              >
                <RefreshCw size={13} /> Scan now
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={22} className="animate-spin" style={{ color: primary }} />
              <p className="text-[13px]" style={{ color: muted }}>Probing local AI endpoints…</p>
            </div>
          )}

          {modelData && !loading && (
            <div className="space-y-3">
              {/* Ollama */}
              <div className="section-card">
                <div className="section-card-header">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 flex items-center justify-center"
                      style={{ backgroundColor: "rgba(204,119,34,0.12)", color: primary, borderRadius: "2px" }}>
                      <Box size={13} />
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: "#E2D0B4", letterSpacing: "-0.01em" }}>
                      Ollama
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!modelData.ollama_error && (
                      <button
                        onClick={() => setShowInstaller(v => !v)}
                        className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 transition-all"
                        style={{
                          color: showInstaller ? primary : muted,
                          background: showInstaller ? "rgba(204,119,34,0.08)" : "transparent",
                          border: `1px solid ${showInstaller ? "rgba(165,124,0,0.25)" : "transparent"}`,
                          borderRadius: "2px",
                        }}
                        title="Install a new model"
                      >
                        <Download size={10} /> Install model
                      </button>
                    )}
                    {modelData.ollama_error ? (
                      <span className="text-[11px] px-2.5 py-0.5 font-medium"
                        style={{ color: "#8B4A4A", backgroundColor: "rgba(139,74,74,0.08)", border: "1px solid rgba(139,74,74,0.2)", borderRadius: "2px" }}>
                        Unreachable
                      </span>
                    ) : (
                      <span className="text-[11px] px-2.5 py-0.5 font-medium"
                        style={{ backgroundColor: "rgba(204,119,34,0.08)", color: primary, border: "1px solid rgba(165,124,0,0.2)", borderRadius: "2px" }}>
                        {modelData.ollama.length} model{modelData.ollama.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {modelData.ollama_error ? (
                  <div className="px-5 py-5 space-y-3">
                    {/* Header */}
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg leading-none mt-0.5">🦙</span>
                      <div>
                        <p className="text-[13.5px] font-semibold text-foreground mb-0.5">Ollama isn't running</p>
                        <p className="text-[12.5px]" style={{ color: muted }}>
                          {setupPhase === "installing" ? "Installing Ollama, this takes about a minute…"
                            : setupPhase === "starting" ? "Starting Ollama service…"
                            : "Portiere can set this up. No terminal needed."}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons — only shown when idle */}
                    {setupPhase === "idle" && (
                      <div className="space-y-2">
                        {osName === "Linux" && (
                          <button
                            onClick={handleInstallOllama}
                            className="w-full flex items-center justify-center gap-2 py-3 text-[13px] font-semibold transition-all"
                            style={{
                              background: "linear-gradient(135deg, #7A5200 0%, #CC7722 100%)",
                              color: "#E2D0B4",
                              boxShadow: "0 2px 12px rgba(165,124,0,0.3)",
                              borderRadius: "2px",
                              border: "1px solid rgba(204,119,34,0.4)",
                            }}
                          >
                            <Wrench size={13} /> Install Ollama automatically
                          </button>
                        )}
                        {(osName === "Darwin" || osName === "Windows") && (
                          <a
                            href={osName === "Darwin" ? "https://ollama.com/download/mac" : "https://ollama.com/download/windows"}
                            target="_blank" rel="noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-3 text-[13px] font-semibold"
                            style={{
                              background: "linear-gradient(135deg, #7A5200 0%, #CC7722 100%)",
                              color: "#E2D0B4",
                              display: "flex",
                              borderRadius: "2px",
                              border: "1px solid rgba(204,119,34,0.4)",
                            }}
                          >
                            <Download size={13} /> Download Ollama for {osName === "Darwin" ? "Mac" : "Windows"}
                          </a>
                        )}
                        <button
                          onClick={handleStartOllama}
                          className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold transition-all"
                          style={{ background: "rgba(204,119,34,0.08)", border: "1px solid rgba(165,124,0,0.22)", color: primary, borderRadius: "2px" }}
                        >
                          <Play size={11} /> Start Ollama {osName === "Linux" ? "(already installed)" : osName === "Darwin" ? "(already installed)" : "service"}
                        </button>
                      </div>
                    )}

                    {/* Installing: live streaming terminal output */}
                    {setupPhase === "installing" && (
                      <div className="space-y-2 animate-feed-in">
                        <div className="flex items-center gap-2 text-[12px]" style={{ color: primary }}>
                          <Loader2 size={11} className="animate-spin" /> Installing…
                        </div>
                        <div
                          ref={installOutputRef}
                          className="font-mono text-[11px] p-3 overflow-y-auto space-y-0.5"
                          style={{
                            background: "#0D0C08",
                            border: "1px solid #2A2420",
                            maxHeight: "160px",
                            borderRadius: "3px",
                          }}
                        >
                          {installLines.length === 0 ? (
                            <p style={{ color: dim }}>Waiting for installer…</p>
                          ) : installLines.map((line, i) => (
                            <p key={i} style={{
                              color: line.startsWith("✗") ? "#8B4A4A"
                                : line.startsWith("✓") ? green
                                : "#8A7A66",
                              lineHeight: "1.5",
                            }}>{line}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Starting spinner */}
                    {setupPhase === "starting" && (
                      <div className="flex items-center gap-2 text-[13px] py-1 animate-feed-in" style={{ color: primary }}>
                        <Loader2 size={13} className="animate-spin" /> Starting Ollama service…
                      </div>
                    )}

                    {/* Result message after start attempt */}
                    {startMsg && setupPhase === "idle" && (
                      <p className="text-[12px] flex items-center gap-1.5" style={{ color: muted }}>
                        <Check size={11} style={{ color: green }} /> {startMsg}
                      </p>
                    )}

                    <p className="text-[11.5px] text-center pt-1" style={{ color: dim }}>
                      Checking automatically every 5 seconds…
                    </p>
                    <button onClick={refresh}
                      className="w-full flex items-center justify-center gap-2 py-2 text-[12px] font-medium transition-all"
                      style={{ background: "rgba(204,119,34,0.04)", border: "1px solid rgba(165,124,0,0.15)", color: dim, borderRadius: "2px" }}>
                      <RefreshCw size={11} /> Check now
                    </button>
                  </div>
                ) : modelData.ollama.length === 0 ? (
                  <div className="px-5 py-5 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg leading-none mt-0.5">✓</span>
                      <div>
                        <p className="text-[13.5px] font-semibold mb-0.5" style={{ color: green }}>Ollama is running</p>
                        <p className="text-[12.5px]" style={{ color: muted }}>Now install a model to get started.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { name: "llama3.2", desc: "Fast · 2 GB, best for most tasks" },
                        { name: "llama3.1:8b", desc: "Smarter · 5 GB" },
                        { name: "mistral", desc: "Reasoning · 4 GB" },
                      ].map(({ name, desc }) => (
                        <button key={name}
                          onClick={() => { setInstallModel(name); setShowInstaller(true); }}
                          className="flex items-center gap-2 px-3 py-1.5 text-[11.5px] transition-colors"
                          style={{ background: "#111009", border: "1px solid #2A2420", borderRadius: "3px" }}>
                          <code style={{ color: "#B8A080" }}>{name}</code>
                          <span style={{ color: dim }}>·</span>
                          <span style={{ color: dim }}>{desc}</span>
                          <Download size={9} style={{ color: dim, marginLeft: 2 }} />
                        </button>
                      ))}
                    </div>
                    <button onClick={refresh}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                      style={{ background: "rgba(204,119,34,0.08)", border: "1px solid rgba(165,124,0,0.22)", color: primary, borderRadius: "2px" }}>
                      <RefreshCw size={12} /> I installed a model, scan again
                    </button>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "#2A2420" }}>
                    {modelData.ollama.map(m => {
                      const ram = getRAM(m.name);
                      const isSelected = selectedBrain === m.name;
                      return (
                        <div key={m.name} className="flex items-center justify-between px-5 py-3 gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: isSelected ? green : primary }} />
                            <span className="text-[13.5px] font-medium truncate" style={{ color: "#E2D0B4", letterSpacing: "-0.01em" }}>
                              {m.name}
                            </span>
                            {ram && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0"
                                style={{ color: "hsl(38 90% 62%)", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
                                {ram} RAM
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0"
                                style={{ color: green, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                                Active brain
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => useModel(m.name)}
                              disabled={isSelected}
                              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 transition-all disabled:opacity-50"
                              style={{
                                color: isSelected ? green : primary,
                                background: isSelected ? "rgba(106,138,90,0.08)" : "rgba(204,119,34,0.07)",
                                border: `1px solid ${isSelected ? "rgba(106,138,90,0.2)" : "rgba(165,124,0,0.2)"}`,
                                borderRadius: "2px",
                              }}
                              title="Use this as AI brain"
                            >
                              {isSelected ? <Check size={10} /> : null}
                              {isSelected ? "In use" : "Use"}
                            </button>
                            <span className="text-[11px] flex items-center gap-1.5 px-2.5 py-1"
                              style={{ color: muted, backgroundColor: "#111009", border: "1px solid #2A2420", borderRadius: "2px" }}>
                              <HardDrive size={10} /> {m.size_gb} GB
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Model installer panel */}
                {showInstaller && !modelData.ollama_error && (
                  <div className="px-5 py-4" style={{ borderTop: "1px solid #2A2420" }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "#5A4A38" }}>
                        Install a model
                      </p>
                      <button onClick={() => { setShowInstaller(false); setInstallError(null); }}
                        className="p-1 rounded-md" style={{ color: dim }}
                        onMouseEnter={e => (e.currentTarget.style.color = muted)}
                        onMouseLeave={e => (e.currentTarget.style.color = dim)}>
                        <X size={12} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {POPULAR_MODELS.map(({ name, desc }) => (
                        <button key={name} onClick={() => setInstallModel(name)}
                          className="px-2.5 py-1 rounded-lg text-[11px] transition-all"
                          style={{
                            background: installModel === name ? "rgba(204,119,34,0.12)" : "#111009",
                            border: `1px solid ${installModel === name ? "rgba(165,124,0,0.35)" : "#2A2420"}`,
                            color: installModel === name ? primary : muted,
                            borderRadius: "2px",
                          }}>
                          <span style={{ color: installModel === name ? "#E2D0B4" : "#8A7A66" }}>{name}</span>
                          <span style={{ color: dim }}> · {desc}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 mb-2">
                      <input
                        value={installModel}
                        onChange={e => setInstallModel(e.target.value)}
                        placeholder="or type a custom model name…"
                        className="portiere-input flex-1 text-[13px]"
                        style={{ height: "36px" }}
                        onKeyDown={e => { if (e.key === "Enter") handleInstall(); }}
                      />
                      {installProgress ? (
                        <button onClick={cancelInstall}
                          className="px-3 py-2 rounded-xl text-[13px] font-medium"
                          style={{ background: "hsl(347 87% 60% / 0.08)", border: "1px solid hsl(347 87% 60% / 0.2)", color: "hsl(347 87% 62%)" }}>
                          <X size={13} />
                        </button>
                      ) : (
                        <button onClick={handleInstall} disabled={!installModel.trim()}
                          className="px-4 py-2 text-[13px] font-semibold disabled:opacity-50 transition-all flex items-center gap-1.5"
                          style={{ background: "linear-gradient(135deg, #7A5200 0%, #CC7722 100%)", color: "#E2D0B4", borderRadius: "2px", border: "1px solid rgba(204,119,34,0.4)" }}>
                          <Download size={12} /> Install
                        </button>
                      )}
                    </div>
                    {installProgress && (
                      <div className="space-y-1.5 animate-feed-in">
                        <div className="flex justify-between text-[11px]">
                          <span style={{ color: muted }}>{installProgress.status}</span>
                          {installProgress.percent !== undefined && (
                            <span style={{ color: primary }}>{installProgress.percent}%</span>
                          )}
                        </div>
                        {installProgress.percent !== undefined && (
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: "#2A2420" }}>
                            <div className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${installProgress.percent}%`, background: "linear-gradient(90deg, #A57C00 0%, #CC7722 100%)" }} />
                          </div>
                        )}
                      </div>
                    )}
                    {installError && (
                      <p className="text-[12px] mt-2 flex items-center gap-1.5" style={{ color: "hsl(347 87% 62%)" }}>
                        <AlertCircle size={11} /> {installError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* LM Studio */}
              <div className="section-card">
                <div className="section-card-header">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 flex items-center justify-center"
                      style={{ backgroundColor: "rgba(165,124,0,0.12)", color: "#A57C00", borderRadius: "2px" }}>
                      <Cpu size={13} />
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: "#E2D0B4", letterSpacing: "-0.01em" }}>
                      LM Studio
                    </span>
                  </div>
                  {modelData.lmstudio_error ? (
                    <span className="text-[11px] px-2.5 py-0.5 font-medium"
                      style={{ color: "#8B4A4A", backgroundColor: "rgba(139,74,74,0.08)", border: "1px solid rgba(139,74,74,0.2)", borderRadius: "2px" }}>
                      Unreachable
                    </span>
                  ) : (
                    <span className="text-[11px] px-2.5 py-0.5 font-medium"
                      style={{ backgroundColor: "rgba(165,124,0,0.1)", color: "#A57C00", border: "1px solid rgba(165,124,0,0.22)", borderRadius: "2px" }}>
                      {modelData.lmstudio.length} model{modelData.lmstudio.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {modelData.lmstudio_error ? (
                  <div className="px-5 py-5 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg leading-none mt-0.5">🖥</span>
                      <div>
                        <p className="text-[13.5px] font-semibold text-foreground mb-0.5">LM Studio isn't connected</p>
                        <p className="text-[12.5px]" style={{ color: muted }}>Three quick steps:</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-[12.5px]">
                      {[
                        { n: "1", text: <>Download LM Studio from <a href="https://lmstudio.ai" target="_blank" rel="noreferrer" className="underline" style={{ color: primary }}>lmstudio.ai</a> and open it <span style={{ color: dim }}>(skip if you have it)</span></> },
                        { n: "2", text: <>In LM Studio, browse and download a model. Mistral 7B or Llama 3 are good starting points.</> },
                        { n: "3", text: <>Click the <strong style={{ color: "#B8A080" }}>Local Server</strong> tab → hit <strong style={{ color: "#B8A080" }}>Start Server</strong>. Make sure the port is 1234.</> },
                      ].map(({ n, text }) => (
                        <div key={n} className="flex items-start gap-3 p-3" style={{ background: "#111009", border: "1px solid #2A2420", borderRadius: "3px" }}>
                          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold" style={{ background: "rgba(165,124,0,0.15)", color: "#A57C00", borderRadius: "2px" }}>{n}</div>
                          <p style={{ color: muted }}>{text}</p>
                        </div>
                      ))}
                    </div>
                    <button onClick={refresh}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold transition-all"
                      style={{ background: "rgba(204,119,34,0.07)", border: "1px solid rgba(165,124,0,0.2)", color: primary, borderRadius: "2px" }}>
                      <RefreshCw size={12} /> Check again
                    </button>
                  </div>
                ) : modelData.lmstudio.length === 0 ? (
                  <div className="px-5 py-4 text-[13px]" style={{ color: muted }}>
                    No loaded models. Load a model in LM Studio and enable the local server, then scan again.
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "#2A2420" }}>
                    {modelData.lmstudio.map(m => (
                      <div key={m.name} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#A57C00" }} />
                          <span className="text-[13.5px] font-medium" style={{ color: "#E2D0B4", letterSpacing: "-0.01em" }}>
                            {m.name}
                          </span>
                        </div>
                        <span className="text-[11px] px-2.5 py-1"
                          style={{ color: dim, backgroundColor: "#111009", border: "1px solid #2A2420", borderRadius: "2px" }}>
                          {m.object}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-center pb-4" style={{ color: "#3A2E24", letterSpacing: "0.02em" }}>
                Local models run on your machine. No data leaves your device.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
