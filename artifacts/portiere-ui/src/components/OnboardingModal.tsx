import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowRight, Check, Copy, ExternalLink, Loader2,
  Cpu, Zap, ChevronLeft, X, Send,
  Monitor, Server, Sparkles,
  Newspaper, TrendingUp, Languages, CalendarPlus, Image,
  Bot, User as UserIcon,
} from "lucide-react";
import { saveSettings, probeOllama, probeLMStudio, streamWizard } from "@/lib/api";

const bg     = "hsl(238 20% 6%)";
const bg2    = "hsl(238 18% 8%)";
const border = "hsl(238 18% 12%)";
const dim    = "hsl(238 18% 34%)";
const muted  = "hsl(238 18% 52%)";
const primary = "hsl(248 90% 68%)";
const green  = "hsl(152 64% 48%)";

type Provider = "ollama" | "lmstudio" | "openai" | "anthropic";
interface ProbeResult { ok: boolean; models?: string[]; error?: string; }
interface ChatMessage { role: "user" | "assistant"; content: string; }
interface SetupResult {
  profile_name?: string; profile_city?: string;
  profile_occupation?: string; profile_preferences?: string;
  recommended_provider?: Provider; recommendation_reason?: string;
}

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
  { id: "ollama",    label: "Ollama",    sub: "Free · Runs locally on your machine",  badge: "Recommended", badgeGreen: true, Icon: Monitor },
  { id: "lmstudio", label: "LM Studio", sub: "Free · GUI desktop app",               badge: "Local",        Icon: Cpu },
  { id: "openai",   label: "OpenAI",    sub: "GPT-4o · Requires API key",             badge: "Cloud",        Icon: Server },
  { id: "anthropic",label: "Anthropic", sub: "Claude as Brain · Requires API key",   badge: "Cloud",        Icon: Zap },
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

// ─── Wizard Chat UI (Step 0) ─────────────────────────────────────────────
function WizardStep({
  onComplete,
}: {
  onComplete: (result: SetupResult, provider: Provider) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [done, setDone] = useState(false);
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  // Kick off the first wizard message automatically
  useEffect(() => {
    sendToWizard([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const sendToWizard = useCallback((history: ChatMessage[]) => {
    setStreaming(true);
    setStreamingText("");
    setError(null);
    let accumulated = "";

    const cancel = streamWizard(
      history,
      (chunk) => {
        if (chunk.type === "chunk") {
          accumulated += chunk.content ?? "";
          // Strip any partial SETUP_RESULT block from display
          const display = accumulated.replace(/<SETUP_RESULT>[\s\S]*/, "").trimEnd();
          setStreamingText(display);
        }
        if (chunk.type === "setup_result" && chunk.result) {
          setSetupResult(chunk.result as SetupResult);
        }
        if (chunk.type === "error") {
          setError(chunk.content ?? "Something went wrong.");
        }
      },
      () => {
        setStreaming(false);
        const display = accumulated.replace(/<SETUP_RESULT>[\s\S]*/, "").trimEnd();
        if (display) {
          setMessages(prev => [...prev, { role: "assistant", content: display }]);
        }
        setStreamingText("");
        if (accumulated.includes("<SETUP_RESULT>")) setDone(true);
      },
    );
    cancelRef.current = cancel;
  }, []);

  const handleSend = useCallback(() => {
    const msg = input.trim();
    if (!msg || streaming) return;
    const newHistory: ChatMessage[] = [...messages, { role: "user", content: msg }];
    setMessages(newHistory);
    setInput("");
    sendToWizard(newHistory);
  }, [input, messages, streaming, sendToWizard]);

  const handleAccept = () => {
    if (!setupResult) return;
    const provider = (setupResult.recommended_provider as Provider) || "openai";
    onComplete(setupResult, provider);
  };

  const handleSkipWizard = () => {
    cancelRef.current?.();
    onComplete({}, "openai");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, hsl(248 82% 60%) 0%, hsl(264 68% 66%) 100%)", boxShadow: "0 4px 14px rgba(109,95,234,0.4)" }}>
          <span className="text-white text-[16px] font-bold leading-none select-none">◈</span>
        </div>
        <div>
          <h1 className="text-[18px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Welcome to Portiere</h1>
          <p className="text-[12px] mt-0.5" style={{ color: muted }}>Let's get you set up in 2 minutes</p>
        </div>
      </div>

      {/* Chat area */}
      <div
        className="flex flex-col gap-3 overflow-y-auto feed-scroll"
        style={{ maxHeight: "320px", minHeight: "180px" }}
      >
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
              style={{
                backgroundColor: m.role === "assistant" ? "rgba(109,95,234,0.15)" : "rgba(109,95,234,0.25)",
                color: primary,
              }}
            >
              {m.role === "assistant" ? <Bot size={12} /> : <UserIcon size={12} />}
            </div>
            <div
              className="px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed max-w-[85%]"
              style={{
                background: m.role === "user"
                  ? "linear-gradient(135deg, hsl(248 82% 58%) 0%, hsl(264 68% 64%) 100%)"
                  : bg2,
                border: m.role === "assistant" ? `1px solid ${border}` : "none",
                color: m.role === "user" ? "rgba(255,255,255,0.97)" : "hsl(240 20% 88%)",
                borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {/* Streaming assistant bubble */}
        {streaming && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
              style={{ backgroundColor: "rgba(109,95,234,0.15)", color: primary }}>
              <Bot size={12} />
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed max-w-[85%]"
              style={{ background: bg2, border: `1px solid ${border}`, color: "hsl(240 20% 88%)", borderRadius: "18px 18px 18px 4px", whiteSpace: "pre-wrap" }}>
              {streamingText || <span className="inline-flex gap-1 items-center">
                <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: primary, animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: primary, animationDelay: "150ms" }} />
                <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: primary, animationDelay: "300ms" }} />
              </span>}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-3.5 py-2.5 rounded-2xl text-[13px]"
            style={{ backgroundColor: "rgba(220,53,69,0.07)", border: "1px solid rgba(220,53,69,0.2)", color: "hsl(4 86% 62%)" }}>
            {error} — <button className="underline" onClick={() => sendToWizard(messages)}>retry</button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Recommendation card (when done) */}
      {done && setupResult?.recommended_provider && (
        <div className="p-4 rounded-2xl animate-feed-in"
          style={{ background: "rgba(109,95,234,0.08)", border: "1px solid rgba(109,95,234,0.22)" }}>
          <p className="text-[12px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "hsl(248 90% 70%)", letterSpacing: "0.06em" }}>
            Recommendation
          </p>
          <p className="text-[14px] font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>
            {PROVIDER_OPTIONS.find(p => p.id === setupResult.recommended_provider)?.label ?? setupResult.recommended_provider}
          </p>
          {setupResult.recommendation_reason && (
            <p className="text-[12.5px] mt-1" style={{ color: muted }}>{setupResult.recommendation_reason}</p>
          )}
        </div>
      )}

      {/* Input */}
      {!done && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl"
          style={{ background: bg2, border: `1.5px solid ${border}` }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Reply here..."
            disabled={streaming}
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: "hsl(240 20% 92%)", caretColor: primary }}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="w-7 h-7 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: "linear-gradient(135deg, hsl(248 82% 60%) 0%, hsl(264 68% 64%) 100%)", color: "white" }}
          >
            <Send size={12} />
          </button>
        </div>
      )}

      {/* Skip / Accept */}
      <div className="flex items-center justify-between">
        <button onClick={handleSkipWizard} className="text-[12px] transition-colors"
          style={{ color: dim }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = muted}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = dim}>
          Skip setup →
        </button>
        {done && (
          <button onClick={handleAccept}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all"
            style={{ background: "linear-gradient(135deg, hsl(248 82% 60%) 0%, hsl(264 68% 64%) 100%)", color: "white", boxShadow: "0 2px 10px rgba(109,95,234,0.38)" }}>
            Apply & continue <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────
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
  const [wizardProfile, setWizardProfile] = useState<SetupResult>({});

  const totalSteps = provider === "ollama" || provider === "lmstudio" ? 4 : 3;
  const isFinalStep = (step >= 2 && provider === "anthropic" && step === 3) || (provider !== "anthropic" && step === 4);

  const handleWizardComplete = (result: SetupResult, recommended: Provider) => {
    setWizardProfile(result);
    setProvider(recommended);
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
    if (claudeKey) p.claude_api_key = claudeKey;
    // Apply profile from wizard
    if (wizardProfile.profile_name)        p.profile_name = wizardProfile.profile_name;
    if (wizardProfile.profile_city)        p.profile_city = wizardProfile.profile_city;
    if (wizardProfile.profile_occupation)  p.profile_occupation = wizardProfile.profile_occupation;
    if (wizardProfile.profile_preferences) p.profile_preferences = wizardProfile.profile_preferences;
    await saveSettings(p).catch(() => {});
    setSaving(false);
    onDone();
  };

  const handleSkip = async () => { await saveSettings({ first_launch: false }).catch(() => {}); onDone(); };

  const canContinue = () => {
    if (step === 2 && provider === "openai")    return openaiKey.trim().length > 5;
    if (step === 2 && provider === "anthropic") return anthropicKey.trim().length > 5;
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

          {/* ── Step 0: Groq Wizard ── */}
          {step === 0 && (
            <WizardStep onComplete={handleWizardComplete} />
          )}

          {/* ── Step 1: Provider ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              {wizardProfile.profile_name && (
                <div className="px-4 py-2.5 rounded-xl text-[13px]"
                  style={{ background: "rgba(109,95,234,0.07)", border: "1px solid rgba(109,95,234,0.18)", color: "hsl(248 90% 76%)" }}>
                  ✓ Profile saved — welcome, {wizardProfile.profile_name.split(" ")[0]}! Now let's connect your Brain.
                </div>
              )}
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>Step 1 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Choose your AI Brain</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>
                  {wizardProfile.recommendation_reason
                    ? `Portiere suggests: ${wizardProfile.recommendation_reason}`
                    : "The Brain routes all your requests. Local models are free; cloud APIs need a key."}
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
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-foreground">{label}</span>
                        {id === wizardProfile.recommended_provider && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                            style={{ backgroundColor: "rgba(109,95,234,0.15)", color: primary }}>
                            AI Pick
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

          {/* ── Step 2: Ollama setup ── */}
          {step === 2 && provider === "ollama" && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: dim }}>Step 2 of {totalSteps}</p>
                <h2 className="text-[18px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>Install Ollama</h2>
                <p className="text-[13px] mt-1" style={{ color: muted }}>Runs AI locally for free — no GPU required for small models.</p>
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
                    style={{ backgroundColor: "rgba(109,95,234,0.1)", border: "1px solid hsl(248 90% 68% / 0.22)", color: primary }}>
                    {probing ? <Loader2 size={13} className="animate-spin" /> : <Monitor size={13} />}
                    {probing ? "Testing…" : "Test Ollama connection"}
                  </button>
                  {probeResult && (
                    <div className="mt-2 p-3 rounded-xl text-[13px]"
                      style={{ backgroundColor: probeResult.ok ? "rgba(34,197,94,0.07)" : "rgba(244,63,94,0.07)", border: `1px solid ${probeResult.ok ? "rgba(34,197,94,0.2)" : "rgba(244,63,94,0.2)"}`, color: probeResult.ok ? green : "hsl(4 86% 60%)" }}>
                      {probeResult.ok ? `✓ Connected — ${probeResult.models?.length ?? 0} model(s) installed` : `✗ ${probeResult.error}`}
                    </div>
                  )}
                </div>
              </div>
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
                  <h2 className="text-[20px] font-semibold text-foreground" style={{ letterSpacing: "-0.025em" }}>
                    {wizardProfile.profile_name ? `You're all set, ${wizardProfile.profile_name.split(" ")[0]}!` : "You're all set!"}
                  </h2>
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
