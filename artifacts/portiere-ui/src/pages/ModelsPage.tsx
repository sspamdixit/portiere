import { useState } from "react";
import { RefreshCw, Cpu, HardDrive, Loader2, AlertCircle, Box, ChevronRight, Sparkles, Search, Globe, Film, Monitor, Check, Cloud, Mail, Terminal, Image, Languages, Newspaper, TrendingUp, CalendarPlus, ExternalLink, Copy } from "lucide-react";
import { fetchModels, fetchSettings } from "@/lib/api";

const dim = "hsl(238 18% 32%)";
const muted = "hsl(238 18% 50%)";
const green = "hsl(152 64% 48%)";
const primary = "hsl(248 90% 68%)";

interface OllamaModel { name: string; size_gb: number; modified: string; }
interface LMStudioModel { name: string; object: string; }
interface ModelsData {
  ollama: OllamaModel[];
  lmstudio: LMStudioModel[];
  ollama_error?: string;
  lmstudio_error?: string;
}

const CAPABILITIES = [
  {
    Icon: Search,
    label: "Web Search",
    desc: "Real-time search — flights, therapists, news, products, and anything on the web.",
    color: primary,
    status: "built-in" as const,
  },
  {
    Icon: Cloud,
    label: "Weather",
    desc: "Current conditions and 7-day forecast for any city worldwide. No API key needed.",
    color: "hsl(200 80% 65%)",
    status: "built-in" as const,
  },
  {
    Icon: Newspaper,
    label: "Live News",
    desc: "Latest headlines on any topic — tech, world events, sports, finance. No API key needed.",
    color: "hsl(25 90% 62%)",
    status: "built-in" as const,
  },
  {
    Icon: TrendingUp,
    label: "Finance & Markets",
    desc: "Real-time stock prices and crypto rates — TSLA, AAPL, Bitcoin, Ethereum, and more.",
    color: "hsl(142 60% 55%)",
    status: "built-in" as const,
  },
  {
    Icon: Languages,
    label: "Translator",
    desc: "Translate text to and from 50+ languages instantly. No API key needed.",
    color: "hsl(185 70% 58%)",
    status: "built-in" as const,
  },
  {
    Icon: CalendarPlus,
    label: "Calendar & Reminders",
    desc: "Create calendar events as .ics files — import into Google Calendar, Outlook, or Apple Calendar.",
    color: "hsl(246 89% 70%)",
    status: "built-in" as const,
  },
  {
    Icon: Sparkles,
    label: "Claude — Writing & Coding",
    desc: "Deep reasoning, code generation, drafting emails, analysis, and complex tasks.",
    color: "hsl(270 70% 72%)",
    status: "key" as const,
    key: "claude_api_key",
    keyLabel: "Anthropic API Key",
  },
  {
    Icon: Mail,
    label: "Email",
    desc: "Compose and send emails. Sends via SMTP if configured, otherwise creates a mailto draft.",
    color: "hsl(38 90% 60%)",
    status: "smtp" as const,
    key: "smtp_host",
    keyLabel: "SMTP Host",
  },
  {
    Icon: Terminal,
    label: "Code Runner",
    desc: "Write and execute Python code — see output instantly in the feed.",
    color: "hsl(142 60% 55%)",
    status: "built-in" as const,
  },
  {
    Icon: Globe,
    label: "Research & OSINT",
    desc: "Domain investigation, DNS/WHOIS lookups, and digital footprinting.",
    color: "hsl(38 90% 60%)",
    status: "built-in" as const,
  },
  {
    Icon: Monitor,
    label: "System Monitor",
    desc: "CPU, RAM, battery, disk usage, and file system access.",
    color: "hsl(142 60% 55%)",
    status: "built-in" as const,
  },
  {
    Icon: Image,
    label: "Image Generation",
    desc: "Generate AI images via FAL.ai Flux from any text description — portraits, artwork, concepts.",
    color: "hsl(310 70% 68%)",
    status: "key" as const,
    key: "fal_api_key",
    keyLabel: "FAL API Key",
  },
  {
    Icon: Film,
    label: "Video Generation",
    desc: "Generate AI video clips via FAL.ai or Seedance from a text prompt.",
    color: "hsl(328 80% 68%)",
    status: "key" as const,
    key: "fal_api_key",
    keyLabel: "FAL API Key",
  },
];

export default function CapabilitiesPage() {
  const [modelData, setModelData] = useState<ModelsData | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      const [models, cfg] = await Promise.all([fetchModels(), fetchSettings()]);
      setModelData(models);
      setSettings(Object.fromEntries(Object.entries(cfg).map(([k, v]) => [k, String(v)])));
      setLastRefresh(new Date().toLocaleTimeString("en", { hour12: false }));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const isKeyConfigured = (key: string) => (settings[key] || "").length > 5;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 flex-shrink-0"
        style={{ height: "46px", borderBottom: "1px solid hsl(240 20% 9%)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold" style={{ color: "hsl(244 30% 85%)", letterSpacing: "-0.01em" }}>
            Capabilities
          </span>
          <ChevronRight size={12} style={{ color: "hsl(242 17% 28%)" }} />
          <span className="text-[13px]" style={{ color: muted }}>
            {lastRefresh ? `Local models · ${lastRefresh}` : "What Portiere can do"}
          </span>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-medium transition-all disabled:opacity-50"
          style={{
            backgroundColor: "rgba(124,111,247,0.1)",
            border: "1px solid hsl(246 89% 70% / 0.22)",
            color: primary,
            letterSpacing: "-0.01em",
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

        {/* Capability cards */}
        <div>
          <p className="text-[10px] uppercase font-semibold mb-3 px-1" style={{ color: "hsl(242 17% 34%)", letterSpacing: "0.06em" }}>
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
                    backgroundColor: "hsl(240 20% 8%)",
                    border: "1px solid hsl(240 20% 12%)",
                    borderLeft: configured ? `3px solid ${color}55` : "1px solid hsl(240 20% 12%)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${color}16`, color }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold" style={{ color: "hsl(244 30% 93%)", letterSpacing: "-0.01em" }}>
                        {label}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          backgroundColor: configured ? "rgba(34,197,94,0.1)" : "hsl(240 20% 12%)",
                          color: configured ? green : "hsl(242 17% 40%)",
                          border: `1px solid ${configured ? "rgba(34,197,94,0.25)" : "transparent"}`,
                          letterSpacing: "0.01em",
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
          <p className="text-[10px] uppercase font-semibold mb-3 px-1" style={{ color: "hsl(242 17% 34%)", letterSpacing: "0.06em" }}>
            Local AI models
          </p>

          {!modelData && !loading && (
            <div className="relative flex flex-col items-center justify-center py-16 gap-4">
              <div
                className="absolute inset-0 pointer-events-none dot-grid"
                style={{ opacity: 0.35, borderRadius: "16px" }}
              />
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 50% 30% at 50% 50%, rgba(124,111,247,0.06) 0%, transparent 70%)" }} />
              <div
                className="relative w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "hsl(240 20% 9%)", border: "1px solid hsl(240 20% 13%)" }}
              >
                <Cpu size={20} style={{ color: "hsl(242 18% 38%)" }} />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold" style={{ color: "hsl(244 30% 88%)", letterSpacing: "-0.01em" }}>
                  Check for local models
                </p>
                <p className="text-[13px] mt-1" style={{ color: muted }}>Scans Ollama and LM Studio</p>
              </div>
              <button
                onClick={refresh}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold"
                style={{
                  background: "linear-gradient(135deg, hsl(246 89% 64%) 0%, hsl(258 72% 68%) 100%)",
                  color: "white",
                  boxShadow: "0 2px 12px rgba(124,111,247,0.38)",
                  letterSpacing: "-0.01em",
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
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: "rgba(124,111,247,0.14)", color: primary }}
                    >
                      <Box size={13} />
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: "hsl(244 30% 92%)", letterSpacing: "-0.01em" }}>
                      Ollama
                    </span>
                  </div>
                  {modelData.ollama_error ? (
                    <span
                      className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                      style={{ color: "hsl(347 87% 62%)", backgroundColor: "hsl(347 87% 60% / 0.08)", border: "1px solid hsl(347 87% 60% / 0.2)" }}
                    >
                      Unreachable
                    </span>
                  ) : (
                    <span
                      className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: "rgba(124,111,247,0.12)", color: primary, border: "1px solid rgba(124,111,247,0.25)" }}
                    >
                      {modelData.ollama.length} model{modelData.ollama.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {modelData.ollama_error ? (
                  <div className="px-5 py-5 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg leading-none mt-0.5">🦙</span>
                      <div>
                        <p className="text-[13.5px] font-semibold text-foreground mb-0.5">Ollama isn't running</p>
                        <p className="text-[12.5px]" style={{ color: muted }}>Follow these steps to get it working:</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: "hsl(238 22% 6%)", border: "1px solid hsl(238 18% 12%)" }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold" style={{ background: "rgba(109,95,234,0.18)", color: primary }}>1</div>
                        <div className="flex-1">
                          <p className="text-[12.5px] font-medium text-foreground mb-1">Download Ollama <span className="font-normal" style={{ color: dim }}>(skip if you have it)</span></p>
                          <a href="https://ollama.com/download" target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[12px] font-medium"
                            style={{ color: primary }}>
                            ollama.com/download <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: "hsl(238 22% 6%)", border: "1px solid hsl(238 18% 12%)" }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold" style={{ background: "rgba(109,95,234,0.18)", color: primary }}>2</div>
                        <div>
                          <p className="text-[12.5px] font-medium text-foreground mb-1">Open the Ollama app</p>
                          <p className="text-[12px] leading-relaxed" style={{ color: muted }}>
                            Look for the 🦙 icon in your menu bar (Mac) or taskbar (Windows). It starts automatically when you open it.
                          </p>
                          <p className="text-[11.5px] mt-1.5" style={{ color: dim }}>
                            Linux: run <code className="px-1.5 py-0.5 rounded text-[11px]" style={{ background: "hsl(238 22% 5%)", border: "1px solid hsl(238 18% 14%)", color: "hsl(240 20% 84%)" }}>ollama serve</code> in a terminal
                          </p>
                        </div>
                      </div>
                    </div>
                    <button onClick={refresh}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                      style={{ background: "rgba(109,95,234,0.1)", border: "1px solid hsl(248 90% 68% / 0.22)", color: primary }}>
                      <RefreshCw size={12} /> Check again
                    </button>
                  </div>
                ) : modelData.ollama.length === 0 ? (
                  <div className="px-5 py-5 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg leading-none mt-0.5">✓</span>
                      <div>
                        <p className="text-[13.5px] font-semibold mb-0.5" style={{ color: green }}>Ollama is running</p>
                        <p className="text-[12.5px]" style={{ color: muted }}>Now download a model to get started.</p>
                      </div>
                    </div>
                    <p className="text-[12.5px] font-medium" style={{ color: "hsl(240 16% 68%)" }}>Open Terminal and paste this:</p>
                    <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                      style={{ backgroundColor: "hsl(238 22% 5%)", border: "1px solid hsl(238 18% 12%)" }}>
                      <code className="text-[13px] font-mono" style={{ color: "hsl(240 20% 90%)" }}>ollama pull llama3.2</code>
                      <button
                        onClick={() => navigator.clipboard.writeText("ollama pull llama3.2")}
                        className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md flex-shrink-0"
                        style={{ color: muted, background: "rgba(255,255,255,0.04)" }}>
                        <Copy size={10} /> Copy
                      </button>
                    </div>
                    <p className="text-[12px]" style={{ color: dim }}>Llama 3.2 is 2 GB — downloads in a few minutes. Fast, free, and great for most everyday tasks.</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { name: "llama3.1:8b", desc: "Smarter · 5 GB" },
                        { name: "mistral",     desc: "Reasoning · 4 GB" },
                      ].map(({ name, desc }) => (
                        <button key={name}
                          onClick={() => navigator.clipboard.writeText(`ollama pull ${name}`)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11.5px] transition-colors"
                          style={{ background: "hsl(238 18% 7%)", border: "1px solid hsl(238 18% 12%)" }}
                          title={`Copy: ollama pull ${name}`}>
                          <code style={{ color: "hsl(240 20% 78%)" }}>{name}</code>
                          <span style={{ color: dim }}>·</span>
                          <span style={{ color: dim }}>{desc}</span>
                          <Copy size={9} style={{ color: dim, marginLeft: 2 }} />
                        </button>
                      ))}
                    </div>
                    <button onClick={refresh}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                      style={{ background: "rgba(109,95,234,0.1)", border: "1px solid hsl(248 90% 68% / 0.22)", color: primary }}>
                      <RefreshCw size={12} /> I pulled a model — scan again
                    </button>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "hsl(240 20% 11%)" }}>
                    {modelData.ollama.map(m => (
                      <div key={m.name} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: primary }} />
                          <span className="text-[13.5px] font-medium" style={{ color: "hsl(244 30% 90%)", letterSpacing: "-0.01em" }}>
                            {m.name}
                          </span>
                        </div>
                        <span
                          className="text-[11px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                          style={{ color: muted, backgroundColor: "hsl(240 22% 7%)", border: "1px solid hsl(240 20% 11%)" }}
                        >
                          <HardDrive size={10} /> {m.size_gb} GB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* LM Studio */}
              <div className="section-card">
                <div className="section-card-header">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: "rgba(167,139,250,0.14)", color: "hsl(270 70% 72%)" }}
                    >
                      <Cpu size={13} />
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: "hsl(244 30% 92%)", letterSpacing: "-0.01em" }}>
                      LM Studio
                    </span>
                  </div>
                  {modelData.lmstudio_error ? (
                    <span
                      className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                      style={{ color: "hsl(347 87% 62%)", backgroundColor: "hsl(347 87% 60% / 0.08)", border: "1px solid hsl(347 87% 60% / 0.2)" }}
                    >
                      Unreachable
                    </span>
                  ) : (
                    <span
                      className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: "rgba(167,139,250,0.12)", color: "hsl(270 70% 72%)", border: "1px solid rgba(167,139,250,0.25)" }}
                    >
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
                        { n: "2", text: <>In LM Studio, browse and download a model — Mistral 7B or Llama 3 are good starting points</> },
                        { n: "3", text: <>Click the <strong style={{ color: "hsl(240 20% 82%)" }}>Local Server</strong> tab → hit <strong style={{ color: "hsl(240 20% 82%)" }}>Start Server</strong>. Make sure the port is 1234.</> },
                      ].map(({ n, text }) => (
                        <div key={n} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "hsl(238 22% 6%)", border: "1px solid hsl(238 18% 12%)" }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold" style={{ background: "rgba(167,139,250,0.18)", color: "hsl(270 70% 72%)" }}>{n}</div>
                          <p style={{ color: muted }}>{text}</p>
                        </div>
                      ))}
                    </div>
                    <button onClick={refresh}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                      style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.22)", color: "hsl(270 70% 72%)" }}>
                      <RefreshCw size={12} /> Check again
                    </button>
                  </div>
                ) : modelData.lmstudio.length === 0 ? (
                  <div className="px-5 py-4 text-[13px]" style={{ color: muted }}>
                    No loaded models. Load a model in LM Studio and enable the local server, then scan again.
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "hsl(240 20% 11%)" }}>
                    {modelData.lmstudio.map(m => (
                      <div key={m.name} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "hsl(270 70% 72%)" }} />
                          <span className="text-[13.5px] font-medium" style={{ color: "hsl(244 30% 90%)", letterSpacing: "-0.01em" }}>
                            {m.name}
                          </span>
                        </div>
                        <span
                          className="text-[11px] px-2.5 py-1 rounded-lg"
                          style={{ color: dim, backgroundColor: "hsl(240 22% 7%)", border: "1px solid hsl(240 20% 11%)" }}
                        >
                          {m.object}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-center pb-4" style={{ color: "hsl(242 17% 28%)", letterSpacing: "0.02em" }}>
                Local models run entirely on your machine — no data leaves your device
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
