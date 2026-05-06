import { useState } from "react";
import {
  ArrowRight, Check, Copy, ExternalLink, Loader2,
  Cpu, Globe, Zap, HardDrive, ChevronLeft, X,
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
      className="flex items-center gap-1.5 text-[12px] transition-colors flex-shrink-0"
      style={{ color: copied ? green : muted }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 mt-2"
      style={{ backgroundColor: "hsl(240 22% 5%)", border: "1px solid hsl(240 24% 14%)" }}
    >
      <code className="text-[13px] text-foreground font-mono">{children}</code>
      <CopyButton text={children} />
    </div>
  );
}

function KeyInput({
  label, value, onChange, placeholder, hint, link,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint?: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-medium text-foreground">{label}</label>
        {link && (
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[12px] transition-colors"
            style={{ color: primary }}
          >
            {link.label} <ExternalLink size={11} />
          </a>
        )}
      </div>
      <input
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-4 py-3 text-[14px] text-foreground outline-none transition-all"
        style={{
          backgroundColor: "hsl(240 22% 5%)",
          border: `1px solid ${value ? primary + "60" : "hsl(240 24% 14%)"}`,
          caretColor: primary,
        }}
      />
      {hint && <p className="text-[12px]" style={{ color: dim }}>{hint}</p>}
    </div>
  );
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all"
          style={{
            width: i === current ? "20px" : "6px",
            height: "6px",
            backgroundColor: i === current ? primary : "hsl(240 24% 14%)",
          }}
        />
      ))}
    </div>
  );
}

const PROVIDER_OPTIONS: { id: Provider; label: string; sub: string; badge: string; icon: React.ReactNode }[] = [
  {
    id: "ollama",
    label: "Ollama",
    sub: "Free · Runs locally on your machine",
    badge: "Recommended",
    icon: <Cpu size={20} />,
  },
  {
    id: "lmstudio",
    label: "LM Studio",
    sub: "Free · GUI app for local models",
    badge: "Local",
    icon: <HardDrive size={20} />,
  },
  {
    id: "openai",
    label: "OpenAI",
    sub: "GPT-4o · Requires API key",
    badge: "Cloud",
    icon: <Globe size={20} />,
  },
  {
    id: "anthropic",
    label: "Anthropic",
    sub: "Claude as your Brain · Requires API key",
    badge: "Cloud",
    icon: <Zap size={20} />,
  },
];

const OLLAMA_MODELS = [
  { id: "llama3.2", label: "Llama 3.2 3B", note: "Fast, light — good for most tasks" },
  { id: "llama3.1:8b", label: "Llama 3.1 8B", note: "Balanced speed & quality" },
  { id: "mistral", label: "Mistral 7B", note: "Strong reasoning" },
  { id: "gemma3:4b", label: "Gemma 3 4B", note: "Google's compact model" },
];

const OPENAI_MODELS = [
  { id: "gpt-4o", label: "GPT-4o", note: "Best quality" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", note: "Faster & cheaper" },
];

const CLAUDE_MODELS = [
  { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", note: "Best overall" },
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", note: "Fast & efficient" },
];

interface Props { onDone: () => void; }

export default function OnboardingModal({ onDone }: Props) {
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

  const handleProbe = async () => {
    setProbing(true);
    setProbeResult(null);
    const result = provider === "ollama" ? await probeOllama() : await probeLMStudio();
    setProbeResult(result);
    setProbing(false);
  };

  const handleFinish = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = { first_launch: false };

    if (provider === "ollama") {
      payload.brain_provider = "ollama";
      payload.brain_model = ollamaModel;
      payload.brain_base_url = "http://localhost:11434/v1";
    } else if (provider === "lmstudio") {
      payload.brain_provider = "lmstudio";
      payload.brain_model = "local-model";
      payload.brain_base_url = "http://localhost:1234/v1";
    } else if (provider === "openai") {
      payload.brain_provider = "openai";
      payload.brain_model = openaiModel;
      payload.brain_api_key = openaiKey;
    } else {
      payload.brain_provider = "anthropic";
      payload.brain_model = anthropicModel;
      payload.brain_api_key = anthropicKey;
    }

    if (claudeKey) payload.claude_api_key = claudeKey;

    await saveSettings(payload).catch(() => {});
    setSaving(false);
    onDone();
  };

  const handleSkip = async () => {
    await saveSettings({ first_launch: false }).catch(() => {});
    onDone();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(9, 9, 14, 0.92)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="relative w-full max-w-[540px] rounded-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: "hsl(240 18% 9%)",
          border: "1px solid hsl(240 24% 14%)",
          maxHeight: "90vh",
        }}
      >
        {/* Skip */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
          style={{ color: dim }}
          title="Skip setup"
        >
          <X size={16} />
        </button>

        <div className="overflow-y-auto flex-1 p-8">
          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[22px] text-primary">◈</span>
                  <span className="text-[18px] font-semibold text-foreground">Welcome to Portiere</span>
                </div>
                <p className="text-[15px] leading-relaxed" style={{ color: muted }}>
                  Portiere is an AI orchestrator — it routes your natural language commands to specialized AI workers.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { icon: "🧠", title: "Brain LLM", desc: "Routes every command to the right worker" },
                  { icon: "⚡", title: "Claude Worker", desc: "Coding, writing, and complex reasoning" },
                  { icon: "🔍", title: "OSINT Worker", desc: "Domain, DNS, and web reconnaissance" },
                  { icon: "💻", title: "Local Worker", desc: "System stats, files, and shell commands" },
                ].map(item => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: "hsl(240 22% 5%)", border: "1px solid hsl(240 24% 14%)" }}
                  >
                    <span className="text-[18px] flex-shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{item.title}</p>
                      <p className="text-[12px]" style={{ color: muted }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[13px]" style={{ color: dim }}>
                Let's take 2 minutes to connect your first AI model. You can change everything later in Settings.
              </p>
            </div>
          )}

          {/* Step 1 — Choose Provider */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-[12px] uppercase tracking-wider font-medium mb-2" style={{ color: dim }}>Step 1 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground">Choose your Brain LLM</h2>
                <p className="text-[14px] mt-1" style={{ color: muted }}>
                  The Brain routes all commands. You can use a local model (free) or a cloud API.
                </p>
              </div>

              <div className="space-y-2">
                {PROVIDER_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setProvider(opt.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                    style={{
                      backgroundColor: provider === opt.id ? "rgba(124,111,247,0.1)" : "hsl(240 22% 5%)",
                      border: `1px solid ${provider === opt.id ? "hsl(246 89% 70% / 0.4)" : "hsl(240 24% 14%)"}`,
                    }}
                  >
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: provider === opt.id ? "rgba(124,111,247,0.2)" : "hsl(240 24% 14%)", color: provider === opt.id ? primary : muted }}
                    >
                      {opt.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-foreground">{opt.label}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: opt.badge === "Recommended" ? "rgba(34,197,94,0.12)" : "hsl(240 24% 14%)",
                            color: opt.badge === "Recommended" ? green : dim,
                          }}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[12px] mt-0.5" style={{ color: muted }}>{opt.sub}</p>
                    </div>
                    {provider === opt.id && <Check size={16} style={{ color: primary, flexShrink: 0 }} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Provider-specific setup */}
          {step === 2 && provider === "ollama" && (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-[12px] uppercase tracking-wider font-medium mb-2" style={{ color: dim }}>Step 2 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground">Install Ollama</h2>
                <p className="text-[14px] mt-1" style={{ color: muted }}>
                  Ollama lets you run AI models locally for free — no GPU required for small models.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[13px] font-medium text-foreground mb-1">1. Install Ollama</p>
                  <p className="text-[12px] mb-1" style={{ color: muted }}>macOS (Homebrew)</p>
                  <CodeBlock>brew install ollama</CodeBlock>
                  <p className="text-[12px] mt-2 mb-1" style={{ color: muted }}>Linux / macOS (direct)</p>
                  <CodeBlock>curl -fsSL https://ollama.com/install.sh | sh</CodeBlock>
                  <a
                    href="https://ollama.com/download"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] mt-2"
                    style={{ color: primary }}
                  >
                    Windows installer at ollama.com/download <ExternalLink size={11} />
                  </a>
                </div>

                <div>
                  <p className="text-[13px] font-medium text-foreground mb-1">2. Start Ollama</p>
                  <CodeBlock>ollama serve</CodeBlock>
                </div>

                <div>
                  <p className="text-[13px] font-medium text-foreground mb-2">3. Pick a model to pull</p>
                  <div className="space-y-2">
                    {OLLAMA_MODELS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setOllamaModel(m.id)}
                        className="w-full flex items-center justify-between p-3 rounded-lg text-left transition-all"
                        style={{
                          backgroundColor: ollamaModel === m.id ? "rgba(124,111,247,0.1)" : "hsl(240 22% 5%)",
                          border: `1px solid ${ollamaModel === m.id ? "hsl(246 89% 70% / 0.35)" : "hsl(240 24% 14%)"}`,
                        }}
                      >
                        <div>
                          <span className="text-[13px] font-medium text-foreground">{m.label}</span>
                          <span className="text-[12px] ml-2" style={{ color: muted }}>{m.note}</span>
                        </div>
                        {ollamaModel === m.id && <Check size={13} style={{ color: primary }} />}
                      </button>
                    ))}
                  </div>
                  <CodeBlock>{`ollama pull ${ollamaModel}`}</CodeBlock>
                </div>

                <div>
                  <p className="text-[13px] font-medium text-foreground mb-2">4. Test connection</p>
                  <button
                    onClick={handleProbe}
                    disabled={probing}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all disabled:opacity-50"
                    style={{ backgroundColor: "rgba(124,111,247,0.12)", border: "1px solid hsl(246 89% 70% / 0.25)", color: primary }}
                  >
                    {probing ? <Loader2 size={14} className="animate-spin" /> : <Cpu size={14} />}
                    {probing ? "Testing…" : "Test Ollama connection"}
                  </button>
                  {probeResult && (
                    <div
                      className="mt-2 p-3 rounded-lg text-[13px]"
                      style={{
                        backgroundColor: probeResult.ok ? "rgba(34,197,94,0.08)" : "rgba(244,63,94,0.08)",
                        border: `1px solid ${probeResult.ok ? "rgba(34,197,94,0.2)" : "rgba(244,63,94,0.2)"}`,
                        color: probeResult.ok ? green : "hsl(347 87% 60%)",
                      }}
                    >
                      {probeResult.ok
                        ? `✓ Connected — ${probeResult.models?.length ?? 0} model(s) installed`
                        : `✗ ${probeResult.error}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && provider === "lmstudio" && (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-[12px] uppercase tracking-wider font-medium mb-2" style={{ color: dim }}>Step 2 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground">Set up LM Studio</h2>
                <p className="text-[14px] mt-1" style={{ color: muted }}>
                  LM Studio is a desktop app for running models locally with a friendly GUI.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    step: "1",
                    title: "Download LM Studio",
                    content: (
                      <a href="https://lmstudio.ai" target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[13px]" style={{ color: primary }}>
                        Download at lmstudio.ai <ExternalLink size={12} />
                      </a>
                    ),
                  },
                  {
                    step: "2",
                    title: "Load a model",
                    content: <p className="text-[13px]" style={{ color: muted }}>Open LM Studio → Browse → download any GGUF model (e.g. Mistral 7B)</p>,
                  },
                  {
                    step: "3",
                    title: "Start the local server",
                    content: <p className="text-[13px]" style={{ color: muted }}>In LM Studio → Local Server → Start Server (port 1234)</p>,
                  },
                ].map(item => (
                  <div key={item.step} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
                      style={{ backgroundColor: "rgba(124,111,247,0.15)", color: primary }}>
                      {item.step}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground mb-1">{item.title}</p>
                      {item.content}
                    </div>
                  </div>
                ))}

                <div>
                  <button
                    onClick={handleProbe}
                    disabled={probing}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all disabled:opacity-50"
                    style={{ backgroundColor: "rgba(124,111,247,0.12)", border: "1px solid hsl(246 89% 70% / 0.25)", color: primary }}
                  >
                    {probing ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />}
                    {probing ? "Testing…" : "Test LM Studio connection"}
                  </button>
                  {probeResult && (
                    <div
                      className="mt-2 p-3 rounded-lg text-[13px]"
                      style={{
                        backgroundColor: probeResult.ok ? "rgba(34,197,94,0.08)" : "rgba(244,63,94,0.08)",
                        border: `1px solid ${probeResult.ok ? "rgba(34,197,94,0.2)" : "rgba(244,63,94,0.2)"}`,
                        color: probeResult.ok ? green : "hsl(347 87% 60%)",
                      }}
                    >
                      {probeResult.ok
                        ? `✓ Connected — ${probeResult.models?.length ?? 0} model(s) loaded`
                        : `✗ ${probeResult.error ?? "Not reachable. Is the server running?"}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && provider === "openai" && (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-[12px] uppercase tracking-wider font-medium mb-2" style={{ color: dim }}>Step 2 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground">Connect OpenAI</h2>
                <p className="text-[14px] mt-1" style={{ color: muted }}>
                  Enter your OpenAI API key. You can find it in the OpenAI dashboard.
                </p>
              </div>

              <KeyInput
                label="OpenAI API Key"
                value={openaiKey}
                onChange={setOpenaiKey}
                placeholder="sk-..."
                hint="Your key is stored locally and never transmitted to third parties."
                link={{ href: "https://platform.openai.com/api-keys", label: "Get API key" }}
              />

              <div>
                <label className="text-[13px] font-medium text-foreground block mb-2">Model</label>
                <div className="space-y-2">
                  {OPENAI_MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setOpenaiModel(m.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg text-left transition-all"
                      style={{
                        backgroundColor: openaiModel === m.id ? "rgba(124,111,247,0.1)" : "hsl(240 22% 5%)",
                        border: `1px solid ${openaiModel === m.id ? "hsl(246 89% 70% / 0.35)" : "hsl(240 24% 14%)"}`,
                      }}
                    >
                      <div>
                        <span className="text-[13px] font-medium text-foreground">{m.label}</span>
                        <span className="text-[12px] ml-2" style={{ color: muted }}>{m.note}</span>
                      </div>
                      {openaiModel === m.id && <Check size={13} style={{ color: primary }} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && provider === "anthropic" && (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-[12px] uppercase tracking-wider font-medium mb-2" style={{ color: dim }}>Step 2 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground">Connect Anthropic</h2>
                <p className="text-[14px] mt-1" style={{ color: muted }}>
                  Use Claude as your Brain LLM. Enter your Anthropic API key below.
                </p>
              </div>

              <KeyInput
                label="Anthropic API Key"
                value={anthropicKey}
                onChange={setAnthropicKey}
                placeholder="sk-ant-..."
                hint="Your key is stored locally and never transmitted to third parties."
                link={{ href: "https://console.anthropic.com/settings/keys", label: "Get API key" }}
              />

              <div>
                <label className="text-[13px] font-medium text-foreground block mb-2">Model</label>
                <div className="space-y-2">
                  {CLAUDE_MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setAnthropicModel(m.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg text-left transition-all"
                      style={{
                        backgroundColor: anthropicModel === m.id ? "rgba(124,111,247,0.1)" : "hsl(240 22% 5%)",
                        border: `1px solid ${anthropicModel === m.id ? "hsl(246 89% 70% / 0.35)" : "hsl(240 24% 14%)"}`,
                      }}
                    >
                      <div>
                        <span className="text-[13px] font-medium text-foreground">{m.label}</span>
                        <span className="text-[12px] ml-2" style={{ color: muted }}>{m.note}</span>
                      </div>
                      {anthropicModel === m.id && <Check size={13} style={{ color: primary }} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Claude Worker (for local/openai users) */}
          {step === 3 && provider !== "anthropic" && (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-[12px] uppercase tracking-wider font-medium mb-2" style={{ color: dim }}>Step 3 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground">Add Claude for coding</h2>
                <p className="text-[14px] mt-1" style={{ color: muted }}>
                  The Claude worker handles complex coding, analysis, and writing tasks — it's the best at those.
                  This step is <strong className="text-foreground">optional</strong>.
                </p>
              </div>

              <div
                className="p-4 rounded-xl"
                style={{ backgroundColor: "rgba(124,111,247,0.06)", border: "1px solid hsl(246 89% 70% / 0.15)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} style={{ color: primary }} />
                  <span className="text-[13px] font-medium text-foreground">Claude Worker</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "hsl(240 24% 14%)", color: muted }}>Optional</span>
                </div>
                <ul className="space-y-1">
                  {["Code generation & debugging", "Document analysis", "Complex multi-step reasoning", "Creative writing"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-[13px]" style={{ color: muted }}>
                      <Check size={12} style={{ color: green }} /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              <KeyInput
                label="Anthropic API Key"
                value={claudeKey}
                onChange={setClaudeKey}
                placeholder="sk-ant-..."
                hint="Leave blank to skip — you can add it later in Settings."
                link={{ href: "https://console.anthropic.com/settings/keys", label: "Get API key" }}
              />
            </div>
          )}

          {/* Final step — Done */}
          {((provider === "anthropic" && step === 3) || (provider !== "anthropic" && step === 4)) && (
            <div className="flex flex-col items-center gap-6 py-4 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
              >
                <Check size={28} style={{ color: green }} />
              </div>
              <div>
                <h2 className="text-[20px] font-semibold text-foreground">You're all set!</h2>
                <p className="text-[14px] mt-2" style={{ color: muted }}>
                  Portiere is ready. You can always update your configuration in the Settings page.
                </p>
              </div>
              <div className="w-full space-y-2 text-left">
                {[
                  { label: "Brain LLM", value: provider.charAt(0).toUpperCase() + provider.slice(1) },
                  { label: "Model", value: provider === "ollama" ? ollamaModel : provider === "openai" ? openaiModel : provider === "anthropic" ? anthropicModel : "Local model" },
                  { label: "Claude Worker", value: (claudeKey || provider === "anthropic") ? "Enabled" : "Not configured" },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center text-[13px] px-4 py-2.5 rounded-lg"
                    style={{ backgroundColor: "hsl(240 22% 5%)", border: "1px solid hsl(240 24% 14%)" }}>
                    <span style={{ color: muted }}>{item.label}</span>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-8 py-5 flex-shrink-0"
          style={{ borderTop: "1px solid hsl(240 24% 14%)" }}
        >
          <div className="flex items-center gap-4">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 text-[13px] transition-colors"
                style={{ color: muted }}
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <StepDots total={totalSteps + 1} current={step} />
          </div>

          {/* Final step */}
          {((provider === "anthropic" && step === 3) || (provider !== "anthropic" && step === 4)) ? (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-medium transition-all disabled:opacity-60"
              style={{ backgroundColor: primary, color: "hsl(240 22% 5%)" }}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {saving ? "Saving…" : "Launch Portiere"}
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-medium transition-all"
              style={{ backgroundColor: primary, color: "hsl(240 22% 5%)" }}
            >
              {step === 0 ? "Get Started" : "Continue"}
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
