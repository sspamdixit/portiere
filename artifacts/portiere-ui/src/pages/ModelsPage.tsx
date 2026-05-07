import { useState } from "react";
import { RefreshCw, Cpu, HardDrive, Loader2, AlertCircle, Box, ChevronRight, Sparkles, Search, Globe, Film, Monitor, Check } from "lucide-react";
import { fetchModels, fetchSettings } from "@/lib/api";

const dim = "hsl(242 17% 36%)";
const muted = "hsl(242 18% 61%)";
const green = "hsl(142 71% 45%)";
const primary = "hsl(246 89% 70%)";

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
    Icon: Sparkles,
    label: "Claude — Writing & Coding",
    desc: "Deep reasoning, code generation, drafting emails, analysis, and complex tasks.",
    color: "hsl(270 70% 72%)",
    status: "key" as const,
    key: "claude_api_key",
    keyLabel: "Anthropic API Key",
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
    Icon: Film,
    label: "Video Generation",
    desc: "Generate AI videos via FAL.ai or Seedance from a text prompt.",
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
      <div className="flex items-center justify-between px-6 flex-shrink-0" style={{ height: "48px", borderBottom: "1px solid hsl(240 24% 12%)" }}>
        <div className="flex items-center gap-2 text-[14px]">
          <span className="font-medium text-foreground">Capabilities</span>
          <ChevronRight size={13} style={{ color: "hsl(242 17% 30%)" }} />
          <span className="text-[13px]" style={{ color: muted }}>
            {lastRefresh ? `Local models · ${lastRefresh}` : "What Portiere can do"}
          </span>
        </div>
        <button onClick={refresh} disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-medium transition-all disabled:opacity-50"
          style={{ backgroundColor: "rgba(124,111,247,0.1)", border: "1px solid hsl(246 89% 70% / 0.22)", color: primary }}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Refresh local models
        </button>
      </div>

      <div className="flex-1 overflow-y-auto feed-scroll px-6 py-5 space-y-6 max-w-2xl w-full">
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-2xl text-destructive text-[13px]"
            style={{ backgroundColor: "hsl(347 87% 60% / 0.06)", border: "1px solid hsl(347 87% 60% / 0.18)" }}>
            <AlertCircle size={14} className="flex-shrink-0" /> {error}
          </div>
        )}

        {/* Capability cards */}
        <div>
          <p className="text-[11px] uppercase tracking-widest font-semibold mb-3 px-1" style={{ color: dim }}>
            Available capabilities
          </p>
          <div className="space-y-2">
            {CAPABILITIES.map(({ Icon, label, desc, color, status, key, keyLabel }) => {
              const configured = status === "built-in" || (key ? isKeyConfigured(key) : false);
              return (
                <div key={label} className="flex items-start gap-4 p-4 rounded-2xl"
                  style={{ backgroundColor: "hsl(240 18% 9%)", border: "1px solid hsl(240 24% 13%)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${color}16`, color }}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold text-foreground">{label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          backgroundColor: configured ? "rgba(34,197,94,0.1)" : "hsl(240 24% 13%)",
                          color: configured ? green : dim,
                          border: `1px solid ${configured ? "rgba(34,197,94,0.22)" : "transparent"}`,
                        }}>
                        {status === "built-in" ? "Built-in" : configured ? "Connected" : `Needs ${keyLabel}`}
                      </span>
                    </div>
                    <p className="text-[12px] leading-relaxed" style={{ color: muted }}>{desc}</p>
                  </div>
                  {configured && (
                    <Check size={14} className="flex-shrink-0 mt-1" style={{ color: green }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Local AI models */}
        <div>
          <p className="text-[11px] uppercase tracking-widest font-semibold mb-3 px-1" style={{ color: dim }}>
            Local AI models
          </p>

          {!modelData && !loading && (
            <div className="relative flex flex-col items-center justify-center py-16 gap-4">
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 50% 30% at 50% 50%, rgba(124,111,247,0.05) 0%, transparent 70%)" }} />
              <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "hsl(240 18% 10%)", border: "1px solid hsl(240 24% 14%)" }}>
                <Cpu size={20} style={{ color: "hsl(242 18% 40%)" }} />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-medium text-foreground">Check for local models</p>
                <p className="text-[13px] mt-1" style={{ color: muted }}>Scans Ollama and LM Studio</p>
              </div>
              <button onClick={refresh}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold"
                style={{ background: "linear-gradient(135deg, hsl(246 89% 68%) 0%, hsl(258 75% 72%) 100%)", color: "white", boxShadow: "0 2px 10px rgba(124,111,247,0.35)" }}>
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
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "hsl(240 18% 9%)", border: "1px solid hsl(240 24% 13%)" }}>
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid hsl(240 24% 12%)" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(124,111,247,0.14)", color: primary }}>
                      <Box size={13} />
                    </div>
                    <span className="text-[13px] font-semibold text-foreground">Ollama</span>
                  </div>
                  {modelData.ollama_error ? (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium text-destructive" style={{ backgroundColor: "hsl(347 87% 60% / 0.08)", border: "1px solid hsl(347 87% 60% / 0.18)" }}>
                      Unreachable
                    </span>
                  ) : (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(124,111,247,0.12)", color: primary, border: "1px solid rgba(124,111,247,0.25)" }}>
                      {modelData.ollama.length} model{modelData.ollama.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {modelData.ollama_error ? (
                  <div className="px-5 py-4 text-[13px] flex items-start gap-2.5" style={{ color: muted }}>
                    <AlertCircle size={13} className="text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p>{modelData.ollama_error}</p>
                      <p className="mt-1.5" style={{ color: dim }}>
                        Run <code className="px-1.5 py-0.5 rounded text-[12px] text-foreground" style={{ backgroundColor: "hsl(240 20% 12%)" }}>ollama serve</code> to start.
                      </p>
                    </div>
                  </div>
                ) : modelData.ollama.length === 0 ? (
                  <div className="px-5 py-4 text-[13px]" style={{ color: muted }}>
                    No models installed. Run <code className="px-1.5 py-0.5 rounded text-[12px] text-foreground" style={{ backgroundColor: "hsl(240 20% 12%)" }}>ollama pull llama3.2</code>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "hsl(240 24% 12%)" }}>
                    {modelData.ollama.map(m => (
                      <div key={m.name} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: primary }} />
                          <span className="text-[14px] font-medium text-foreground">{m.name}</span>
                        </div>
                        <span className="text-[12px] flex items-center gap-1.5 px-2 py-0.5 rounded-lg" style={{ color: muted, backgroundColor: "hsl(240 20% 12%)" }}>
                          <HardDrive size={10} /> {m.size_gb} GB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* LM Studio */}
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "hsl(240 18% 9%)", border: "1px solid hsl(240 24% 13%)" }}>
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid hsl(240 24% 12%)" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(167,139,250,0.14)", color: "hsl(270 70% 72%)" }}>
                      <Cpu size={13} />
                    </div>
                    <span className="text-[13px] font-semibold text-foreground">LM Studio</span>
                  </div>
                  {modelData.lmstudio_error ? (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium text-destructive" style={{ backgroundColor: "hsl(347 87% 60% / 0.08)", border: "1px solid hsl(347 87% 60% / 0.18)" }}>
                      Unreachable
                    </span>
                  ) : (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(167,139,250,0.12)", color: "hsl(270 70% 72%)", border: "1px solid rgba(167,139,250,0.25)" }}>
                      {modelData.lmstudio.length} model{modelData.lmstudio.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {modelData.lmstudio_error ? (
                  <div className="px-5 py-4 text-[13px] flex items-start gap-2.5" style={{ color: muted }}>
                    <AlertCircle size={13} className="text-destructive flex-shrink-0 mt-0.5" />
                    <p>Start the LM Studio local server on port 1234.</p>
                  </div>
                ) : modelData.lmstudio.length === 0 ? (
                  <div className="px-5 py-4 text-[13px]" style={{ color: muted }}>
                    No loaded models. Load a model in LM Studio and enable the local server.
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "hsl(240 24% 12%)" }}>
                    {modelData.lmstudio.map(m => (
                      <div key={m.name} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "hsl(270 70% 72%)" }} />
                          <span className="text-[14px] font-medium text-foreground">{m.name}</span>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded-lg" style={{ color: dim, backgroundColor: "hsl(240 17% 12%)" }}>
                          {m.object}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-center pb-4 tracking-wide" style={{ color: "hsl(242 17% 30%)" }}>
                Local models run entirely on your machine — no data leaves your device
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
