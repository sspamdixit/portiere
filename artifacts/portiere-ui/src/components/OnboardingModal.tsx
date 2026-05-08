import { useState, useEffect, useCallback } from "react";
import {
  ArrowRight, Check, Copy, ExternalLink, Loader2,
  Cpu, Zap, ChevronLeft, X,
  Monitor, Server, Sparkles,
  HardDrive, MemoryStick, Wifi,
} from "lucide-react";
import {
  saveSettings, probeOllama, probeLMStudio,
  fetchSystemInfo, fetchAutoDetect, applyAutoDetect,
  type SystemInfo, type SystemRecommendation, type AutoDetectEntry,
} from "@/lib/api";

const bg     = "hsl(238 20% 6%)";
const bg2    = "hsl(238 18% 8%)";
const border = "hsl(238 18% 12%)";
const dim    = "hsl(238 18% 34%)";
const muted  = "hsl(238 18% 52%)";
const primary = "hsl(248 90% 68%)";
const green  = "hsl(152 64% 48%)";

type Provider = "ollama" | "lmstudio" | "openai" | "anthropic" | "groq";
interface ProbeResult { ok: boolean; models?: string[]; error?: string; }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-[11px] font-medium transition-all flex-shrink-0 px-2.5 py-1 rounded-md"
      style={{ color: copied ? green : muted, backgroundColor: copied ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)" }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mt-2"
      style={{ backgroundColor: "hsl(238 22% 5%)", border: `1px solid ${border}` }}>
      <code className="text-[13px] text-foreground font-mono">{children}</code>
      <CopyButton text={children} />
    </div>
  );
}

function KeyInput({ label, value, onChange, placeholder, hint, link }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; hint?: string; link?: { href: string; label: string };
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-medium text-foreground">{label}</label>
        {link && (
          <a href={link.href} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-[12px]" style={{ color: primary }}>
            {link.label} <ExternalLink size={10} />
          </a>
        )}
      </div>
      <input type="password" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-[14px] text-foreground outline-none transition-all"
        style={{ backgroundColor: "hsl(238 22% 5%)", border: `1px solid ${value ? "hsl(248 90% 68% / 0.4)" : border}`, caretColor: primary, boxShadow: value ? "0 0 0 3px rgba(109,95,234,0.07)" : "none" }} />
      {hint && <p className="text-[12px]" style={{ color: dim }}>{hint}</p>}
    </div>
  );
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? "18px" : "5px", height: "5px",
            background: i === current
              ? "linear-gradient(90deg, hsl(248 90% 68%), hsl(262 75% 70%))"
              : i < current ? "hsl(248 90% 68% / 0.35)" : "hsl(238 18% 14%)",
          }} />
      ))}
    </div>
  );
}

function RadioCard<T extends string>({ id, selected, onSelect, children }: {
  id: T; selected: T; onSelect: (id: T) => void; children: React.ReactNode;
}) {
  const active = id === selected;
  return (
    <button onClick={() => onSelect(id)} className="w-full text-left transition-all duration-150"
      style={{ padding: "12px 14px", borderRadius: "12px", backgroundColor: active ? "rgba(109,95,234,0.1)" : bg2, border: `1px solid ${active ? "hsl(248 90% 68% / 0.38)" : border}` }}>
      {children}
      {active && <span className="float-right"><Check size={13} style={{ color: primary }} /></span>}
    </button>
  );
}

const PROVIDER_OPTIONS: { id: Provider; label: string; sub: string; badge: string; badgeGreen?: boolean; Icon: React.FC<{ size?: number }> }[] = [
  { id: "groq",      label: "Groq",      sub: "Free cloud AI · llama-3.3-70b · no install",  badge: "Free",  badgeGreen: true, Icon: Zap },
  { id: "ollama",    label: "Ollama",    sub: "Free · Runs locally on your machine",           badge: "Local", badgeGreen: true, Icon: Monitor },
  { id: "lmstudio", label: "LM Studio", sub: "Free · GUI desktop app",                        badge: "Local",                  Icon: Cpu },
  { id: "openai",   label: "OpenAI",    sub: "GPT-4o · Requires paid API key",                badge: "Cloud",                  Icon: Server },
  { id: "anthropic",label: "Anthropic", sub: "Claude as Brain · Requires API key",            badge: "Cloud",                  Icon: Zap },
];

const OLLAMA_MODELS = [
  { id: "llama3.2",    label: "Llama 3.2 3B",  note: "Fast & light" },
  { id: "llama3.1:8b", label: "Llama 3.1 8B",  note: "Balanced" },
  { id: "mistral",     label: "Mistral 7B",     note: "Strong reasoning" },
  { id: "gemma3:4b",   label: "Gemma 3 4B",     note: "Google" },
];
const OPENAI_MODELS = [
  { id: "gpt-4o",      label: "GPT-4o",      note: "Best quality" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", note: "Faster & cheaper" },
];
const CLAUDE_MODELS = [
  { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", note: "Best overall" },
  { id: "claude-3-5-haiku-20241022",  label: "Claude 3.5 Haiku",  note: "Fast" },
];
const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", note: "Best quality · free" },
  { id: "llama-3.1-8b-instant",    label: "Llama 3.1 8B Instant",    note: "Fastest" },
];

const TIER_COLORS: Record<string, { accent: string; bg: string; border: string }> = {
  gpu:         { accent: "hsl(142 60% 55%)",  bg: "rgba(34,197,94,0.06)",   border: "rgba(34,197,94,0.2)"  },
  local:       { accent: primary,              bg: "rgba(109,95,234,0.08)",  border: "rgba(109,95,234,0.22)" },
  local_light: { accent: primary,              bg: "rgba(109,95,234,0.08)",  border: "rgba(109,95,234,0.22)" },
  quickstart:  { accent: "hsl(152 64% 48%)",  bg: "rgba(34,197,94,0.07)",   border: "rgba(34,197,94,0.22)" },
  cloud:       { accent: "hsl(200 80% 65%)",  bg: "rgba(56,189,248,0.06)",  border: "rgba(56,189,248,0.18)" },
};

function SpecPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl flex-1 min-w-0"
      style={{ backgroundColor: bg2, border: `1px solid ${border}` }}>
      <div style={{ color: primary, flexShrink: 0 }}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: dim }}>{label}</p>
        <p className="text-[12.5px] font-semibold text-foreground truncate" style={{ letterSpacing: "-0.01em" }}>{value}</p>
      </div>
    </div>
  );
}

function ComboCard({ rec, selected, onSelect, index, isEasiest }: {
  rec: SystemRecommendation;
  selected: boolean;
  onSelect: () => void;
  index: number;
  isEasiest?: boolean;
}) {
  const colors = TIER_COLORS[rec.tier] ?? TIER_COLORS.cloud;
  return (
    <button
      onClick={onSelect}
      className="w-full text-left transition-all duration-200 animate-feed-in"
      style={{
        animationDelay: `${index * 80}ms`,
        padding: "14px 16px",
        borderRadius: "16px",
        backgroundColor: selected ? colors.bg : bg2,
        border: `1.5px solid ${selected ? colors.border : border}`,
        boxShadow: selected ? `0 0 0 1px ${colors.border}` : "none",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[13.5px] font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>
              {rec.label}
            </span>
            {isEasiest && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                style={{ backgroundColor: "rgba(34,197,94,0.12)", color: green, border: "1px solid rgba(34,197,94,0.25)" }}>
                Easiest
              </span>
            )}
            {rec.badges.slice(0, 2).map(b => (
              <span key={b} className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                style={{ backgroundColor: selected ? colors.bg : "hsl(238 18% 11%)", color: selected ? colors.accent : dim, border: `1px solid ${selected ? colors.border : "transparent"}` }}>
                {b}
              </span>
            ))}
          </div>
          <p className="text-[12px] mb-3" style={{ color: muted }}>{rec.tagline}</p>
          <div className="space-y-1.5">
            {rec.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold flex-shrink-0"
                  style={{ backgroundColor: "hsl(238 18% 11%)", color: dim }}>{item.role}</span>
                <span className="text-[12px] font-medium" style={{ color: selected ? "hsl(240 20% 86%)" : muted }}>{item.name}</span>
                <span className="text-[11px]" style={{ color: dim }}>· {item.note}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
            style={{
              backgroundColor: selected ? colors.accent : "transparent",
              border: `1.5px solid ${selected ? colors.accent : border}`,
            }}>
            {selected && <Check size={11} color="white" />}
          </div>
        </div>
      </div>
      {selected && rec.why && (
        <p className="mt-3 pt-3 text-[12px] leading-relaxed"
          style={{ color: muted, borderTop: `1px solid ${colors.border}` }}>
          {rec.why}
        </p>
      )}
    </button>
  );
}

function PulsingDot({ delay = 0 }: { delay?: number }) {
  return (
    <span className="inline-block w-1.5 h-1.5 rounded-full animate-bounce"
      style={{ backgroundColor: primary, animationDelay: `${delay}ms` }} />
  );
}

// ─── Hardware Scan Step (Step 0) ──────────────────────────────────────────────
function HardwareScanStep({
  onComplete,
}: {
  onComplete: (provider: Provider, model: string, autoApply?: boolean) => void;
}) {
  const [phase, setPhase] = useState<"scanning" | "done" | "error">("scanning");
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [autoDetected, setAutoDetected] = useState<AutoDetectEntry | null>(null);
  const [selected, setSelected] = useState<number>(0);
  const [errMsg, setErrMsg] = useState("");
  const [applying, setApplying] = useState(false);
  const [showAllRecs, setShowAllRecs] = useState(false);

  useEffect(() => {
    const minDelay = new Promise(r => setTimeout(r, 900));
    const infoFetch = fetchSystemInfo();
    const detectFetch = fetchAutoDetect().catch(() => ({ detected: [], any_found: false }));
    Promise.all([minDelay, infoFetch, detectFetch])
      .then(([, info, detect]) => {
        setSysInfo(info as SystemInfo);
        if (detect.any_found && detect.detected.length > 0) {
          setAutoDetected(detect.detected[0]);
        }
        setPhase("done");
      })
      .catch(e => {
        setErrMsg(String(e));
        setPhase("error");
      });
  }, []);

  const handleAutoStart = useCallback(async () => {
    if (!autoDetected) return;
    setApplying(true);
    await applyAutoDetect().catch(() => {});
    onComplete(autoDetected.provider as Provider, autoDetected.model, true);
  }, [autoDetected, onComplete]);

  const handleAccept = useCallback(() => {
    if (!sysInfo) return;
    const rec = sysInfo.recommendations[selected];
    if (!rec) return;
    onComplete(rec.provider as Provider, rec.model);
  }, [sysInfo, selected, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete("groq", "llama-3.3-70b-versatile");
  }, [onComplete]);

  const cpuShortName = (model: string) => {
    const m = model.replace(/\(R\)|\(TM\)/gi, "").trim();
    if (m.length > 36) return m.slice(0, 34) + "…";
    return m || "Unknown CPU";
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, hsl(248 82% 60%) 0%, hsl(264 68% 66%) 100%)", boxShadow: "0 4px 14px rgba(109,95,234,0.4)" }}>
          <span className="text-white text-[16px] font-bold leading-none select-none">◈</span>
        </div>
        <div>
          <h1 className="text-[18px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Welcome to Portiere</h1>
          <p className="text-[12px] mt-0.5" style={{ color: muted }}>
            {phase === "scanning" ? "Scanning your machine to find the best AI setup" : "Pick the setup that works best for you"}
          </p>
        </div>
      </div>

      {/* Scanning state */}
      {phase === "scanning" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
            style={{ backgroundColor: bg2, border: `1px solid ${border}` }}>
            <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: primary }} />
            <span className="text-[13px]" style={{ color: muted }}>
              Detecting CPU, RAM and GPU&ensp;
              <PulsingDot delay={0} />&thinsp;
              <PulsingDot delay={150} />&thinsp;
              <PulsingDot delay={300} />
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["CPU", "RAM", "GPU"].map(label => (
              <div key={label} className="h-16 rounded-xl animate-pulse"
                style={{ backgroundColor: bg2, border: `1px solid ${border}` }}>
                <div className="h-full flex items-center justify-center">
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: dim }}>{label}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-2xl animate-pulse"
                style={{ backgroundColor: bg2, border: `1px solid ${border}`, animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {phase === "error" && (
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-2xl text-[13px]"
            style={{ backgroundColor: "rgba(220,53,69,0.06)", border: "1px solid rgba(220,53,69,0.18)" }}>
            <p className="font-semibold mb-1" style={{ color: "hsl(4 86% 66%)" }}>Couldn't scan system info</p>
            <p style={{ color: muted }}>{errMsg || "The API server may not be running yet."}</p>
          </div>
          <p className="text-[13px]" style={{ color: muted }}>
            No worries — you can choose your AI setup manually on the next step.
          </p>
        </div>
      )}

      {/* Results state */}
      {phase === "done" && sysInfo && (
        <div className="flex flex-col gap-4">
          {/* Auto-detected banner */}
          {autoDetected && !showAllRecs && (
            <div className="flex flex-col gap-3 p-4 rounded-2xl"
              style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.22)" }}>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(34,197,94,0.18)" }}>
                  <Check size={11} style={{ color: green }} />
                </div>
                <span className="text-[12px] font-semibold" style={{ color: green }}>API key detected in your environment</span>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>{autoDetected.label}</p>
                <p className="text-[12px] mt-0.5" style={{ color: muted }}>Configured from your environment variables — no setup needed.</p>
              </div>
              <button
                onClick={handleAutoStart}
                disabled={applying}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13.5px] font-semibold transition-all disabled:opacity-50"
                style={{ backgroundColor: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.3)", color: green }}>
                {applying ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                {applying ? "Starting…" : "Start now — already configured ✓"}
              </button>
              <button onClick={() => setShowAllRecs(true)}
                className="text-[11.5px] text-center transition-colors"
                style={{ color: dim }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = muted}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = dim}>
                Or choose a different setup →
              </button>
            </div>
          )}

          {/* Spec pills */}
          {(!autoDetected || showAllRecs) && (
            <div className="grid grid-cols-3 gap-2">
              <SpecPill icon={<Cpu size={13} />} label="CPU" value={cpuShortName(sysInfo.cpu.model)} />
              <SpecPill icon={<MemoryStick size={13} />} label="RAM" value={`${sysInfo.ram_gb} GB`} />
              <SpecPill
                icon={<HardDrive size={13} />}
                label="GPU"
                value={sysInfo.gpu?.[0] ? `${sysInfo.gpu[0].vram_gb}GB VRAM` : "No GPU"}
              />
            </div>
          )}

          {/* Recommendations */}
          {(!autoDetected || showAllRecs) && (
            <div>
              <p className="text-[11px] uppercase tracking-widest font-semibold mb-2.5 px-0.5"
                style={{ color: dim }}>
                Best AI setups for your machine
              </p>
              <div className="space-y-2.5">
                {sysInfo.recommendations.map((rec, i) => (
                  <ComboCard
                    key={rec.tier + i}
                    rec={rec}
                    selected={selected === i}
                    onSelect={() => setSelected(i)}
                    index={i}
                    isEasiest={rec.tier === "quickstart"}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      {(!autoDetected || showAllRecs) && (
        <div className="flex items-center justify-between pt-1">
          <button onClick={handleSkip} className="text-[12px] transition-colors"
            style={{ color: dim }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = muted}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = dim}>
            Skip →
          </button>
          <button
            onClick={phase === "error" ? () => onComplete("groq", "llama-3.3-70b-versatile") : handleAccept}
            disabled={phase === "scanning"}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, hsl(248 82% 60%) 0%, hsl(264 68% 64%) 100%)",
              color: "white",
              boxShadow: phase !== "scanning" ? "0 2px 10px rgba(109,95,234,0.38)" : "none",
            }}>
            {phase === "error" ? "Choose manually" : "Apply & continue"}
            <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────
export default function OnboardingModal({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState<Provider>("groq");
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicModel, setAnthropicModel] = useState("claude-3-5-sonnet-20241022");
  const [groqKey, setGroqKey] = useState("");
  const [groqModel, setGroqModel] = useState("llama-3.3-70b-versatile");
  const [claudeKey, setClaudeKey] = useState("");
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [probing, setProbing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hwRecommendedProvider, setHwRecommendedProvider] = useState<Provider | null>(null);

  // groq/anthropic: 2 numbered steps before final
  // openai: 3 numbered steps (key + optional claude) before final
  // ollama/lmstudio: 4 numbered steps before final
  const totalSteps =
    provider === "ollama" || provider === "lmstudio" ? 4
    : provider === "openai" ? 3
    : 2; // groq & anthropic

  const isFinalStep =
    ((provider === "anthropic" || provider === "groq") && step === 3) ||
    ((provider === "ollama" || provider === "lmstudio" || provider === "openai") && step === 4);

  const handleHardwareScanComplete = (recommendedProvider: Provider, recommendedModel: string, autoApply?: boolean) => {
    setProvider(recommendedProvider);
    setHwRecommendedProvider(recommendedProvider);
    if (recommendedProvider === "ollama")    setOllamaModel(recommendedModel);
    if (recommendedProvider === "openai")    setOpenaiModel(recommendedModel);
    if (recommendedProvider === "anthropic") setAnthropicModel(recommendedModel);
    if (recommendedProvider === "groq")      setGroqModel(recommendedModel);

    if (autoApply) {
      saveSettings({ first_launch: false }).catch(() => {});
      onDone();
      return;
    }
    setStep(1);
  };

  const handleProbe = async () => {
    setProbing(true); setProbeResult(null);
    const r = provider === "ollama" ? await probeOllama() : await probeLMStudio();
    setProbeResult(r); setProbing(false);
  };

  const handleFinish = async () => {
    setSaving(true);
    const p: Record<string, unknown> = { first_launch: false };
    if (provider === "ollama")    { p.brain_provider = "ollama";    p.brain_model = ollamaModel;    p.brain_base_url = "http://localhost:11434/v1"; }
    if (provider === "lmstudio") { p.brain_provider = "lmstudio";  p.brain_model = "local-model";  p.brain_base_url = "http://localhost:1234/v1"; }
    if (provider === "openai")   { p.brain_provider = "openai";    p.brain_model = openaiModel;    p.brain_api_key = openaiKey; }
    if (provider === "anthropic"){ p.brain_provider = "anthropic"; p.brain_model = anthropicModel; p.brain_api_key = anthropicKey; }
    if (provider === "groq")     { p.brain_provider = "groq";      p.brain_model = groqModel;      p.brain_api_key = groqKey; p.groq_api_key = groqKey; }
    if (claudeKey) p.claude_api_key = claudeKey;
    await saveSettings(p).catch(() => {});
    setSaving(false);
    onDone();
  };

  const handleSkip = async () => { await saveSettings({ first_launch: false }).catch(() => {}); onDone(); };

  const canContinue = () => {
    if (step === 2 && provider === "openai")    return openaiKey.trim().length > 5;
    if (step === 2 && provider === "anthropic") return anthropicKey.trim().length > 5;
    if (step === 2 && provider === "groq")      return groqKey.trim().length > 5;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(8,8,13,0.9)", backdropFilter: "blur(12px)" }}>
      <div className="relative w-full max-w-[520px] rounded-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: bg, border: `1px solid ${border}`, boxShadow: "0 24px 64px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)", maxHeight: "92vh" }}>

        {/* Top accent bar */}
        <div className="h-[2px] w-full flex-shrink-0"
          style={{ background: "linear-gradient(90deg, transparent 0%, hsl(248 82% 66%) 30%, hsl(264 70% 70%) 70%, transparent 100%)" }} />

        {/* Close / skip button */}
        {step !== 0 && (
          <button onClick={handleSkip}
            className="absolute top-4 right-4 p-1.5 rounded-lg transition-all hover:bg-white/[0.06]"
            style={{ color: dim }} title="Skip setup">
            <X size={15} />
          </button>
        )}

        <div className="overflow-y-auto flex-1 px-7 py-6 feed-scroll">

          {/* ── Step 0: Hardware Scan ── */}
          {step === 0 && (
            <HardwareScanStep onComplete={handleHardwareScanComplete} />
          )}

          {/* ── Step 1: Provider ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>Step 1 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Confirm your AI Brain</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>
                  Pre-selected based on your hardware. Change if you prefer.
                </p>
              </div>
              <div className="space-y-2">
                {PROVIDER_OPTIONS.map(({ id, label, sub, badge, badgeGreen, Icon }) => (
                  <button key={id} onClick={() => setProvider(id)}
                    className="w-full flex items-center gap-3.5 p-3.5 rounded-xl text-left transition-all duration-150"
                    style={{ backgroundColor: provider === id ? "rgba(109,95,234,0.1)" : bg2, border: `1px solid ${provider === id ? "hsl(248 90% 68% / 0.38)" : border}` }}>
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: provider === id ? "rgba(109,95,234,0.18)" : border, color: provider === id ? primary : muted }}>
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-foreground">{label}</span>
                        {id === "groq" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                            style={{ backgroundColor: "rgba(34,197,94,0.1)", color: green, border: "1px solid rgba(34,197,94,0.2)" }}>
                            Easiest
                          </span>
                        )}
                        {id === hwRecommendedProvider && id !== "groq" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                            style={{ backgroundColor: "rgba(109,95,234,0.15)", color: primary }}>
                            Recommended for your PC
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                          style={{ backgroundColor: badgeGreen ? "rgba(34,197,94,0.1)" : "hsl(238 18% 12%)", color: badgeGreen ? green : dim }}>
                          {badge}
                        </span>
                      </div>
                      <p className="text-[12px] mt-0.5" style={{ color: muted }}>{sub}</p>
                    </div>
                    {provider === id && <Check size={14} style={{ color: primary, flexShrink: 0 }} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Groq ── */}
          {step === 2 && provider === "groq" && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>Step 2 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Connect Groq (Free)</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>
                  One free API key — the fastest setup possible. No local installs, no monthly bill.
                </p>
              </div>

              {/* Quick steps */}
              <div className="space-y-3">
                {[
                  {
                    n: "1", title: "Create a free Groq account",
                    content: (
                      <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium mt-1"
                        style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: green }}>
                        <ExternalLink size={10} /> console.groq.com — No credit card needed
                      </a>
                    ),
                  },
                  {
                    n: "2", title: 'Click "Create API Key" and copy it',
                    content: <p className="text-[12.5px] mt-0.5" style={{ color: muted }}>Takes about 60 seconds total.</p>,
                  },
                  {
                    n: "3", title: "Paste it below",
                    content: (
                      <div className="mt-2">
                        <KeyInput
                          label=""
                          value={groqKey}
                          onChange={setGroqKey}
                          placeholder="gsk_..."
                          hint="Stored locally — never sent to third parties."
                        />
                      </div>
                    ),
                  },
                ].map(({ n, title, content }) => (
                  <div key={n} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
                      style={{ backgroundColor: "rgba(34,197,94,0.12)", color: green }}>{n}</div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-foreground">{title}</p>
                      {content}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl flex items-start gap-2.5"
                style={{ backgroundColor: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.16)" }}>
                <Wifi size={13} style={{ color: green, flexShrink: 0, marginTop: "2px" }} />
                <p className="text-[12px] leading-relaxed" style={{ color: muted }}>
                  With Groq, both the Brain <em>and</em> the Writing worker run via Groq — so you don't need an Anthropic key for most tasks.
                </p>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-foreground block mb-2">Model</label>
                <div className="space-y-1.5">
                  {GROQ_MODELS.map(m => (
                    <RadioCard key={m.id} id={m.id} selected={groqModel} onSelect={setGroqModel}>
                      <span className="text-[13px] font-medium text-foreground">{m.label}</span>
                      <span className="text-[12px] ml-2" style={{ color: muted }}>{m.note}</span>
                    </RadioCard>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Ollama setup ── */}
          {step === 2 && provider === "ollama" && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>Step 2 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Get Ollama running</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>Free, private AI on your computer — no account, no usage limits.</p>
              </div>

              <div className="p-4 rounded-2xl" style={{ background: bg2, border: `1px solid ${border}` }}>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
                    style={{ background: "rgba(109,95,234,0.2)", color: primary }}>1</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground mb-2">Download Ollama <span className="font-normal text-[12px]" style={{ color: dim }}>(skip if already installed)</span></p>
                    <div className="flex flex-wrap gap-2">
                      <a href="https://ollama.com/download/mac" target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium"
                        style={{ background: "rgba(109,95,234,0.1)", border: "1px solid hsl(248 90% 68% / 0.22)", color: primary }}>
                        <ExternalLink size={10} /> macOS
                      </a>
                      <a href="https://ollama.com/download/windows" target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium"
                        style={{ background: "rgba(109,95,234,0.1)", border: "1px solid hsl(248 90% 68% / 0.22)", color: primary }}>
                        <ExternalLink size={10} /> Windows
                      </a>
                    </div>
                    <p className="text-[11px] mt-2 mb-1" style={{ color: dim }}>Linux</p>
                    <CodeBlock>curl -fsSL https://ollama.com/install.sh | sh</CodeBlock>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl" style={{ background: bg2, border: `1px solid ${border}` }}>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
                    style={{ background: "rgba(109,95,234,0.2)", color: primary }}>2</div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-foreground mb-1">Open Ollama</p>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: muted }}>
                      <strong style={{ color: "hsl(240 20% 84%)" }}>macOS / Windows:</strong> Open the app — look for the 🦙 icon in your menu bar or taskbar.
                    </p>
                    <p className="text-[12px] mt-1.5" style={{ color: dim }}>
                      Linux: run <code className="px-1.5 py-0.5 rounded-md text-[11px]" style={{ background: "hsl(238 22% 6%)", border: `1px solid ${border}`, color: "hsl(240 20% 86%)" }}>ollama serve</code> in a terminal window.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl" style={{ background: bg2, border: `1px solid ${border}` }}>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
                    style={{ background: "rgba(109,95,234,0.2)", color: primary }}>3</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground mb-2">Download a model <span className="font-normal text-[12px]" style={{ color: dim }}>(skip if you have one)</span></p>
                    <div className="space-y-1.5 mb-3">
                      {OLLAMA_MODELS.map(m => (
                        <RadioCard key={m.id} id={m.id} selected={ollamaModel} onSelect={setOllamaModel}>
                          <span className="text-[13px] font-medium text-foreground">{m.label}</span>
                          <span className="text-[12px] ml-2" style={{ color: muted }}>{m.note}</span>
                        </RadioCard>
                      ))}
                    </div>
                    <p className="text-[12px] mb-1.5" style={{ color: dim }}>Open Terminal and run:</p>
                    <CodeBlock>{`ollama pull ${ollamaModel}`}</CodeBlock>
                    <p className="text-[11.5px] mt-2" style={{ color: dim }}>Takes 2–5 minutes (1–5 GB depending on model). Come back when it's done.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleProbe}
                disabled={probing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[14px] font-semibold transition-all duration-200 disabled:opacity-60"
                style={{
                  background: probeResult?.ok
                    ? "rgba(34,197,94,0.1)"
                    : "linear-gradient(135deg, hsl(248 82% 60%) 0%, hsl(264 68% 64%) 100%)",
                  border: probeResult?.ok ? "1px solid rgba(34,197,94,0.3)" : "none",
                  color: probeResult?.ok ? green : "white",
                  boxShadow: probeResult?.ok ? "none" : "0 2px 12px rgba(109,95,234,0.35)",
                }}
              >
                {probing ? (
                  <><Loader2 size={15} className="animate-spin" /> Checking…</>
                ) : probeResult?.ok ? (
                  <><Check size={15} /> Ollama is running — {probeResult.models?.length ?? 0} model{(probeResult.models?.length ?? 0) !== 1 ? "s" : ""} ready</>
                ) : (
                  <>Done with the steps above? Test it</>
                )}
              </button>

              {probeResult && !probeResult.ok && (
                <div className="p-4 rounded-2xl text-[13px]" style={{ background: "rgba(220,53,69,0.06)", border: "1px solid rgba(220,53,69,0.18)" }}>
                  <p className="font-semibold mb-1.5" style={{ color: "hsl(4 86% 66%)" }}>Couldn't find Ollama</p>
                  <p className="leading-relaxed" style={{ color: muted }}>
                    Make sure Ollama is open first — look for the 🦙 icon in your menu bar or taskbar. If you just installed it, try opening it now and clicking Test again.
                  </p>
                </div>
              )}
              {probeResult?.ok && !(probeResult.models?.length) && (
                <div className="p-4 rounded-2xl text-[13px]" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <p className="font-semibold mb-1" style={{ color: "hsl(38 90% 64%)" }}>Ollama is running, but no models found yet</p>
                  <p style={{ color: muted }}>Run the <code className="px-1 py-0.5 rounded text-[11px]" style={{ background: "hsl(238 22% 6%)", border: `1px solid ${border}` }}>ollama pull</code> command in step 3 above, then test again.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: LM Studio ── */}
          {step === 2 && provider === "lmstudio" && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>Step 2 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Set up LM Studio</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>Desktop app for running AI models locally with a GUI.</p>
              </div>
              <div className="space-y-4">
                {[
                  { n: "1", title: "Download LM Studio", content: <a href="https://lmstudio.ai" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px]" style={{ color: primary }}>lmstudio.ai <ExternalLink size={11} /></a> },
                  { n: "2", title: "Load a model", content: <p className="text-[13px]" style={{ color: muted }}>Browse → download a GGUF model (e.g. Mistral 7B)</p> },
                  { n: "3", title: "Enable local server", content: <p className="text-[13px]" style={{ color: muted }}>Local Server tab → Start Server on port 1234</p> },
                ].map(({ n, title, content }) => (
                  <div key={n} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
                      style={{ backgroundColor: "rgba(109,95,234,0.14)", color: primary }}>{n}</div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground mb-1">{title}</p>
                      {content}
                    </div>
                  </div>
                ))}
                <button onClick={handleProbe} disabled={probing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all disabled:opacity-50"
                  style={{ backgroundColor: "rgba(109,95,234,0.1)", border: "1px solid hsl(248 90% 68% / 0.22)", color: primary }}>
                  {probing ? <Loader2 size={13} className="animate-spin" /> : <Cpu size={13} />}
                  {probing ? "Testing…" : "Test LM Studio connection"}
                </button>
                {probeResult && (
                  <div className="p-3 rounded-xl text-[13px]"
                    style={{ backgroundColor: probeResult.ok ? "rgba(34,197,94,0.07)" : "rgba(244,63,94,0.07)", border: `1px solid ${probeResult.ok ? "rgba(34,197,94,0.2)" : "rgba(244,63,94,0.2)"}`, color: probeResult.ok ? green : "hsl(4 86% 60%)" }}>
                    {probeResult.ok ? `✓ Connected — ${probeResult.models?.length ?? 0} model(s) loaded` : `✗ ${probeResult.error ?? "Not reachable. Is the server running on port 1234?"}`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: OpenAI ── */}
          {step === 2 && provider === "openai" && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>Step 2 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Connect OpenAI</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>Enter your API key to use GPT-4o as your Brain.</p>
              </div>
              <KeyInput label="OpenAI API Key" value={openaiKey} onChange={setOpenaiKey}
                placeholder="sk-..." hint="Stored locally — never sent to third parties."
                link={{ href: "https://platform.openai.com/api-keys", label: "Get API key" }} />
              <div>
                <label className="text-[13px] font-semibold text-foreground block mb-2">Model</label>
                <div className="space-y-1.5">
                  {OPENAI_MODELS.map(m => (
                    <RadioCard key={m.id} id={m.id} selected={openaiModel} onSelect={setOpenaiModel}>
                      <span className="text-[13px] font-medium text-foreground">{m.label}</span>
                      <span className="text-[12px] ml-2" style={{ color: muted }}>{m.note}</span>
                    </RadioCard>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Anthropic ── */}
          {step === 2 && provider === "anthropic" && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>Step 2 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Connect Anthropic</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>Use Claude as your Brain — best overall quality.</p>
              </div>
              <KeyInput label="Anthropic API Key" value={anthropicKey} onChange={setAnthropicKey}
                placeholder="sk-ant-..." hint="Stored locally — never sent to third parties."
                link={{ href: "https://console.anthropic.com/settings/keys", label: "Get API key" }} />
              <div>
                <label className="text-[13px] font-semibold text-foreground block mb-2">Model</label>
                <div className="space-y-1.5">
                  {CLAUDE_MODELS.map(m => (
                    <RadioCard key={m.id} id={m.id} selected={anthropicModel} onSelect={setAnthropicModel}>
                      <span className="text-[13px] font-medium text-foreground">{m.label}</span>
                      <span className="text-[12px] ml-2" style={{ color: muted }}>{m.note}</span>
                    </RadioCard>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3 (local): Optional Claude key ── */}
          {step === 3 && (provider === "ollama" || provider === "lmstudio") && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>Step 3 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Add Claude (optional)</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>
                  Claude unlocks deep writing, coding, and email drafting. Add later in Settings if you prefer.
                </p>
              </div>
              <KeyInput label="Anthropic API Key" value={claudeKey} onChange={setClaudeKey}
                placeholder="sk-ant-..." hint="Leave blank to skip — Search, Weather, and System Monitor work without it."
                link={{ href: "https://console.anthropic.com/settings/keys", label: "Get API key" }} />
            </div>
          )}

          {/* ── Step 3 (OpenAI): Optional Claude worker ── */}
          {step === 3 && provider === "openai" && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>Step 3 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Add Claude worker (optional)</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>Claude handles writing and coding tasks. Skip and add later if you prefer.</p>
              </div>
              <KeyInput label="Anthropic API Key (Claude worker)" value={claudeKey} onChange={setClaudeKey}
                placeholder="sk-ant-..." hint="Leave blank to skip."
                link={{ href: "https://console.anthropic.com/settings/keys", label: "Get API key" }} />
            </div>
          )}

          {/* ── Final step ── */}
          {isFinalStep && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-4 text-center py-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(248 82% 60%) 0%, hsl(264 68% 64%) 100%)", boxShadow: "0 4px 20px rgba(109,95,234,0.45)" }}>
                  <Sparkles size={24} style={{ color: "white" }} />
                </div>
                <div>
                  <h2 className="text-[20px] font-semibold text-foreground" style={{ letterSpacing: "-0.025em" }}>You're all set!</h2>
                  <p className="text-[14px] mt-1" style={{ color: muted }}>Portiere is ready. Tell it anything.</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  "Plan a weekend trip to Milan",
                  "What's the weather in Tokyo?",
                  "Help me write a cold email",
                  "Check my system performance",
                ].map(s => (
                  <div key={s} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                    style={{ backgroundColor: bg2, border: `1px solid ${border}` }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "hsl(248 90% 68% / 0.6)" }} />
                    <span className="text-[13px]" style={{ color: muted }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer — only shown for steps 1+ */}
        {step >= 1 && (
          <div className="flex items-center justify-between px-7 py-5 flex-shrink-0"
            style={{ borderTop: `1px solid ${border}` }}>
            <StepDots total={totalSteps + 1} current={step} />
            <div className="flex items-center gap-3">
              {step > 1 && !isFinalStep && (
                <button onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] transition-all hover:bg-white/[0.04]"
                  style={{ color: muted }}>
                  <ChevronLeft size={14} /> Back
                </button>
              )}
              {isFinalStep ? (
                <button onClick={handleFinish} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, hsl(248 82% 60%) 0%, hsl(264 68% 64%) 100%)", color: "white", boxShadow: "0 2px 8px rgba(109,95,234,0.35)" }}>
                  {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                  {saving ? "Saving…" : "Start using Portiere"}
                  {!saving && <ArrowRight size={14} />}
                </button>
              ) : (
                <button onClick={() => setStep(s => s + 1)} disabled={!canContinue()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, hsl(248 82% 60%) 0%, hsl(264 68% 64%) 100%)", color: "white", boxShadow: canContinue() ? "0 2px 8px rgba(109,95,234,0.35)" : "none" }}>
                  Continue <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
