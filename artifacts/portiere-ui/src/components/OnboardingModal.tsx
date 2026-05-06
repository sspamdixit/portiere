import { useState } from "react";
import {
  ArrowRight, Check, Copy, ExternalLink, Loader2,
  Cpu, Globe, Zap, HardDrive, ChevronLeft, X,
  Brain, Monitor, Server,
} from "lucide-react";
import { saveSettings, probeOllama, probeLMStudio } from "@/lib/api";

const dim = "hsl(242 17% 36%)";
const muted = "hsl(242 18% 61%)";
const primary = "hsl(246 89% 70%)";
const green = "hsl(142 71% 45%)";

type Provider = "ollama" | "lmstudio" | "openai" | "anthropic";
interface ProbeResult { ok: boolean; models?: string[]; error?: string; }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-[11px] font-medium transition-all flex-shrink-0 px-2.5 py-1 rounded-md"
      style={{
        color: copied ? green : muted,
        backgroundColor: copied ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mt-2"
      style={{ backgroundColor: "hsl(240 22% 5%)", border: "1px solid hsl(240 24% 14%)" }}
    >
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
            className="flex items-center gap-1 text-[12px] transition-opacity hover:opacity-80"
            style={{ color: primary }}>
            {link.label} <ExternalLink size={10} />
          </a>
        )}
      </div>
      <input
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-[14px] text-foreground outline-none transition-all"
        style={{
          backgroundColor: "hsl(240 22% 5%)",
          border: `1px solid ${value ? "hsl(246 89% 70% / 0.4)" : "hsl(240 24% 14%)"}`,
          caretColor: primary,
          boxShadow: value ? "0 0 0 3px rgba(124,111,247,0.07)" : "none",
        }}
      />
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
            width: i === current ? "18px" : "5px",
            height: "5px",
            background: i === current
              ? "linear-gradient(90deg, hsl(246 89% 70%), hsl(258 75% 72%))"
              : i < current ? "hsl(246 89% 70% / 0.35)" : "hsl(240 24% 16%)",
          }}
        />
      ))}
    </div>
  );
}

const WORKER_CARDS = [
  {
    Icon: Brain, iconColor: "hsl(246 89% 72%)",
    iconBg: "rgba(124,111,247,0.14)",
    title: "Brain LLM",
    desc: "Routes every command to the right worker",
  },
  {
    Icon: Zap, iconColor: "hsl(270 70% 75%)",
    iconBg: "rgba(167,139,250,0.14)",
    title: "Claude Worker",
    desc: "Coding, writing, and complex reasoning",
  },
  {
    Icon: Globe, iconColor: "hsl(38 90% 60%)",
    iconBg: "rgba(245,158,11,0.14)",
    title: "OSINT Worker",
    desc: "Domain, DNS, and web reconnaissance",
  },
  {
    Icon: HardDrive, iconColor: "hsl(142 60% 55%)",
    iconBg: "rgba(34,197,94,0.14)",
    title: "Local Worker",
    desc: "System stats, files, and shell commands",
  },
];

const PROVIDER_OPTIONS: {
  id: Provider; label: string; sub: string; badge: string; badgeGreen?: boolean;
  Icon: React.FC<{ size?: number }>;
}[] = [
  { id: "ollama",    label: "Ollama",    sub: "Free · Runs locally on your machine", badge: "Recommended", badgeGreen: true, Icon: Monitor },
  { id: "lmstudio", label: "LM Studio", sub: "Free · GUI desktop app",              badge: "Local",        Icon: Cpu     },
  { id: "openai",   label: "OpenAI",    sub: "GPT-4o · Requires API key",            badge: "Cloud",        Icon: Server  },
  { id: "anthropic",label: "Anthropic", sub: "Claude as Brain · Requires API key",  badge: "Cloud",        Icon: Zap     },
];

const OLLAMA_MODELS = [
  { id: "llama3.2",    label: "Llama 3.2 3B",  note: "Fast & light" },
  { id: "llama3.1:8b", label: "Llama 3.1 8B",  note: "Balanced"     },
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

function RadioCard<T extends string>({
  id, selected, onSelect, children,
}: { id: T; selected: T; onSelect: (id: T) => void; children: React.ReactNode }) {
  const active = id === selected;
  return (
    <button
      onClick={() => onSelect(id)}
      className="w-full text-left transition-all duration-150"
      style={{
        padding: "12px 14px",
        borderRadius: "12px",
        backgroundColor: active ? "rgba(124,111,247,0.1)" : "hsl(240 22% 6%)",
        border: `1px solid ${active ? "hsl(246 89% 70% / 0.4)" : "hsl(240 24% 13%)"}`,
        boxShadow: active ? "0 0 0 1px hsl(246 89% 70% / 0.08)" : "none",
      }}
    >
      {children}
      {active && (
        <span className="float-right">
          <Check size={13} style={{ color: primary }} />
        </span>
      )}
    </button>
  );
}

export default function OnboardingModal({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState<Provider>("ollama");
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicModel, setAnthropicModel] = useState("claude-3-5-sonnet-20241022");
  const [claudeKey, setClaudeKey] = useState("");
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [probing, setProbing] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalSteps = provider === "ollama" || provider === "lmstudio" ? 4 : 3;
  const isFinalStep = (provider === "anthropic" && step === 3) || (provider !== "anthropic" && step === 4);

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
    if (claudeKey) p.claude_api_key = claudeKey;
    await saveSettings(p).catch(() => {});
    setSaving(false);
    onDone();
  };

  const handleSkip = async () => {
    await saveSettings({ first_launch: false }).catch(() => {});
    onDone();
  };

  const canContinue = () => {
    if (step === 2 && provider === "openai")    return openaiKey.trim().length > 5;
    if (step === 2 && provider === "anthropic") return anthropicKey.trim().length > 5;
    return true;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(9,9,14,0.88)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="relative w-full max-w-[520px] rounded-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: "hsl(240 20% 8%)",
          border: "1px solid hsl(240 24% 14%)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          maxHeight: "90vh",
        }}
      >
        {/* Top accent line */}
        <div className="h-[2px] w-full flex-shrink-0"
          style={{ background: "linear-gradient(90deg, transparent 0%, hsl(246 89% 68%) 30%, hsl(258 75% 72%) 70%, transparent 100%)" }}
        />

        {/* Close */}
        <button
          onClick={handleSkip}
          className="absolute top-5 right-5 p-1.5 rounded-lg transition-all hover:bg-white/[0.06]"
          style={{ color: dim }}
          title="Skip setup"
        >
          <X size={15} />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-7 py-7">

          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, hsl(246 89% 65%) 0%, hsl(258 75% 72%) 100%)",
                    boxShadow: "0 4px 12px rgba(124,111,247,0.4)",
                  }}
                >
                  <span className="text-white text-[18px] font-bold leading-none select-none">◈</span>
                </div>
                <div>
                  <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Welcome to Portiere</h1>
                  <p className="text-[13px] mt-0.5" style={{ color: muted }}>Your local-first AI orchestrator</p>
                </div>
              </div>

              <p className="text-[14px] leading-relaxed" style={{ color: muted }}>
                Portiere routes your natural language commands to specialized AI workers — coding, OSINT, system monitoring, and more.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {WORKER_CARDS.map(({ Icon, iconColor, iconBg, title, desc }) => (
                  <div
                    key={title}
                    className="flex items-start gap-3 p-3.5 rounded-xl"
                    style={{ backgroundColor: "hsl(240 22% 6%)", border: "1px solid hsl(240 24% 12%)" }}
                  >
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                      style={{ backgroundColor: iconBg, color: iconColor }}
                    >
                      <Icon size={15} />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">{title}</p>
                      <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: dim }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[13px]" style={{ color: dim }}>
                Let's connect your first AI model — takes about 2 minutes. You can change everything later in Settings.
              </p>
            </div>
          )}

          {/* Step 1 — Provider */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>
                  Step 1 of {totalSteps}
                </p>
                <h2 className="text-[18px] font-semibold text-foreground tracking-tight">Choose your Brain LLM</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>
                  The Brain routes all commands. Local models are free; cloud APIs need a key.
                </p>
              </div>

              <div className="space-y-2">
                {PROVIDER_OPTIONS.map(({ id, label, sub, badge, badgeGreen, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setProvider(id)}
                    className="w-full flex items-center gap-3.5 p-3.5 rounded-xl text-left transition-all duration-150"
                    style={{
                      backgroundColor: provider === id ? "rgba(124,111,247,0.1)" : "hsl(240 22% 6%)",
                      border: `1px solid ${provider === id ? "hsl(246 89% 70% / 0.38)" : "hsl(240 24% 13%)"}`,
                    }}
                  >
                    <div
                      className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: provider === id ? "rgba(124,111,247,0.18)" : "hsl(240 24% 13%)",
                        color: provider === id ? primary : muted,
                      }}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-foreground">{label}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                          style={{
                            backgroundColor: badgeGreen ? "rgba(34,197,94,0.1)" : "hsl(240 24% 14%)",
                            color: badgeGreen ? green : dim,
                          }}
                        >
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

          {/* Step 2 — Ollama setup */}
          {step === 2 && provider === "ollama" && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>Step 2 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground tracking-tight">Install Ollama</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>Runs AI models locally for free — no GPU required for small models.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-[12px] font-semibold text-foreground mb-2">1. Install</p>
                  <p className="text-[12px] mb-1" style={{ color: dim }}>macOS</p>
                  <CodeBlock>brew install ollama</CodeBlock>
                  <p className="text-[12px] mt-2 mb-1" style={{ color: dim }}>Linux / macOS (direct)</p>
                  <CodeBlock>curl -fsSL https://ollama.com/install.sh | sh</CodeBlock>
                  <a href="https://ollama.com/download" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] mt-2" style={{ color: primary }}>
                    Windows installer <ExternalLink size={10} />
                  </a>
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-foreground mb-2">2. Start Ollama</p>
                  <CodeBlock>ollama serve</CodeBlock>
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-foreground mb-2">3. Pick a model</p>
                  <div className="space-y-1.5">
                    {OLLAMA_MODELS.map(m => (
                      <RadioCard key={m.id} id={m.id} selected={ollamaModel} onSelect={setOllamaModel}>
                        <span className="text-[13px] font-medium text-foreground">{m.label}</span>
                        <span className="text-[12px] ml-2" style={{ color: muted }}>{m.note}</span>
                      </RadioCard>
                    ))}
                  </div>
                  <CodeBlock>{`ollama pull ${ollamaModel}`}</CodeBlock>
                </div>

                <div>
                  <p className="text-[12px] font-semibold text-foreground mb-2">4. Test connection</p>
                  <button onClick={handleProbe} disabled={probing}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all disabled:opacity-50"
                    style={{ backgroundColor: "rgba(124,111,247,0.1)", border: "1px solid hsl(246 89% 70% / 0.22)", color: primary }}>
                    {probing ? <Loader2 size={13} className="animate-spin" /> : <Monitor size={13} />}
                    {probing ? "Testing…" : "Test Ollama connection"}
                  </button>
                  {probeResult && (
                    <div className="mt-2 p-3 rounded-xl text-[13px]" style={{
                      backgroundColor: probeResult.ok ? "rgba(34,197,94,0.07)" : "rgba(244,63,94,0.07)",
                      border: `1px solid ${probeResult.ok ? "rgba(34,197,94,0.2)" : "rgba(244,63,94,0.2)"}`,
                      color: probeResult.ok ? green : "hsl(347 87% 60%)",
                    }}>
                      {probeResult.ok
                        ? `✓ Connected — ${probeResult.models?.length ?? 0} model(s) installed`
                        : `✗ ${probeResult.error}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — LM Studio */}
          {step === 2 && provider === "lmstudio" && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>Step 2 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground tracking-tight">Set up LM Studio</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>Desktop app for running AI models locally with a GUI.</p>
              </div>

              <div className="space-y-4">
                {[
                  { n: "1", title: "Download LM Studio",
                    content: <a href="https://lmstudio.ai" target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[13px]" style={{ color: primary }}>
                      lmstudio.ai <ExternalLink size={11} />
                    </a> },
                  { n: "2", title: "Load a model",
                    content: <p className="text-[13px]" style={{ color: muted }}>Browse → download a GGUF model (e.g. Mistral 7B)</p> },
                  { n: "3", title: "Enable the local server",
                    content: <p className="text-[13px]" style={{ color: muted }}>Local Server tab → Start Server on port 1234</p> },
                ].map(({ n, title, content }) => (
                  <div key={n} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
                      style={{ backgroundColor: "rgba(124,111,247,0.14)", color: primary }}>
                      {n}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground mb-1">{title}</p>
                      {content}
                    </div>
                  </div>
                ))}

                <button onClick={handleProbe} disabled={probing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all disabled:opacity-50"
                  style={{ backgroundColor: "rgba(124,111,247,0.1)", border: "1px solid hsl(246 89% 70% / 0.22)", color: primary }}>
                  {probing ? <Loader2 size={13} className="animate-spin" /> : <Cpu size={13} />}
                  {probing ? "Testing…" : "Test LM Studio connection"}
                </button>
                {probeResult && (
                  <div className="p-3 rounded-xl text-[13px]" style={{
                    backgroundColor: probeResult.ok ? "rgba(34,197,94,0.07)" : "rgba(244,63,94,0.07)",
                    border: `1px solid ${probeResult.ok ? "rgba(34,197,94,0.2)" : "rgba(244,63,94,0.2)"}`,
                    color: probeResult.ok ? green : "hsl(347 87% 60%)",
                  }}>
                    {probeResult.ok
                      ? `✓ Connected — ${probeResult.models?.length ?? 0} model(s) loaded`
                      : `✗ ${probeResult.error ?? "Not reachable. Is the server running on port 1234?"}`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2 — OpenAI */}
          {step === 2 && provider === "openai" && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>Step 2 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground tracking-tight">Connect OpenAI</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>Enter your API key to use GPT-4o as your Brain.</p>
              </div>
              <KeyInput label="OpenAI API Key" value={openaiKey} onChange={setOpenaiKey}
                placeholder="sk-..." hint="Stored locally — never transmitted to third parties."
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

          {/* Step 2 — Anthropic */}
          {step === 2 && provider === "anthropic" && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>Step 2 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground tracking-tight">Connect Anthropic</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>Use Claude as your Brain LLM.</p>
              </div>
              <KeyInput label="Anthropic API Key" value={anthropicKey} onChange={setAnthropicKey}
                placeholder="sk-ant-..." hint="Stored locally — never transmitted to third parties."
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

          {/* Step 3 — Claude Worker (non-Anthropic) */}
          {step === 3 && provider !== "anthropic" && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>Step 3 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground tracking-tight">Add Claude for coding</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>
                  Optional — Claude excels at coding, writing, and complex reasoning tasks.
                </p>
              </div>

              <div className="p-4 rounded-xl" style={{
                backgroundColor: "rgba(124,111,247,0.06)",
                border: "1px solid hsl(246 89% 70% / 0.14)",
              }}>
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={13} style={{ color: primary }} />
                  <span className="text-[13px] font-semibold text-foreground">Claude Worker</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "hsl(240 24% 14%)", color: dim }}>
                    Optional
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {["Code generation & debugging", "Document analysis", "Multi-step reasoning", "Creative writing"].map(f => (
                    <div key={f} className="flex items-center gap-1.5 text-[12px]" style={{ color: muted }}>
                      <Check size={11} style={{ color: green, flexShrink: 0 }} /> {f}
                    </div>
                  ))}
                </div>
              </div>

              <KeyInput label="Anthropic API Key" value={claudeKey} onChange={setClaudeKey}
                placeholder="sk-ant-..." hint="Leave blank to skip — add it later in Settings."
                link={{ href: "https://console.anthropic.com/settings/keys", label: "Get API key" }} />
            </div>
          )}

          {/* Final step — Done */}
          {isFinalStep && (
            <div className="flex flex-col items-center gap-6 py-4 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.06) 100%)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  boxShadow: "0 0 20px rgba(34,197,94,0.1)",
                }}
              >
                <Check size={26} style={{ color: green }} />
              </div>
              <div>
                <h2 className="text-[20px] font-semibold text-foreground tracking-tight">You're all set!</h2>
                <p className="text-[14px] mt-1.5" style={{ color: muted }}>
                  Update your configuration anytime in Settings.
                </p>
              </div>
              <div className="w-full space-y-2 text-left">
                {[
                  { label: "Brain LLM", value: provider.charAt(0).toUpperCase() + provider.slice(1) },
                  { label: "Model", value: provider === "ollama" ? ollamaModel : provider === "openai" ? openaiModel : provider === "anthropic" ? anthropicModel : "Local model" },
                  { label: "Claude Worker", value: (claudeKey || provider === "anthropic") ? "Enabled" : "Not configured" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center text-[13px] px-4 py-2.5 rounded-xl"
                    style={{ backgroundColor: "hsl(240 22% 6%)", border: "1px solid hsl(240 24% 13%)" }}>
                    <span style={{ color: muted }}>{label}</span>
                    <span className="font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div
          className="flex items-center justify-between px-7 py-5 flex-shrink-0"
          style={{ borderTop: "1px solid hsl(240 24% 12%)" }}
        >
          <div className="flex items-center gap-4">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 text-[13px] transition-opacity hover:opacity-70"
                style={{ color: muted }}>
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <StepDots total={totalSteps + 1} current={step} />
          </div>

          {isFinalStep ? (
            <button onClick={handleFinish} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, hsl(246 89% 68%) 0%, hsl(258 75% 72%) 100%)",
                color: "white",
                boxShadow: "0 2px 12px rgba(124,111,247,0.4)",
              }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? "Saving…" : "Launch Portiere"}
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canContinue()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: canContinue()
                  ? "linear-gradient(135deg, hsl(246 89% 68%) 0%, hsl(258 75% 72%) 100%)"
                  : "hsl(240 18% 14%)",
                color: canContinue() ? "white" : muted,
                boxShadow: canContinue() ? "0 2px 12px rgba(124,111,247,0.35)" : "none",
              }}
            >
              {step === 0 ? "Get Started" : "Continue"}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
