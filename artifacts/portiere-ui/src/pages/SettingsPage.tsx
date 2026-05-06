import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ChevronRight, ChevronDown } from "lucide-react";
import { fetchSettings, saveSettings } from "@/lib/api";

const dim = "hsl(242 17% 36%)";
const muted = "hsl(242 18% 61%)";
const primary = "hsl(246 89% 70%)";

function SelectField({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl px-4 py-3 text-[14px] text-foreground outline-none transition-all pr-10"
        style={{
          backgroundColor: "hsl(240 20% 8%)",
          border: "1px solid hsl(240 24% 14%)",
          color: "hsl(244 100% 97%)",
          cursor: "pointer",
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = "hsl(246 89% 70% / 0.4)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,111,247,0.07)";
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = "hsl(240 24% 14%)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" style={{ color: dim }} />
    </div>
  );
}

interface FieldProps {
  label: string;
  description?: string;
  secret?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  options?: { value: string; label: string }[];
}

function Field({ label, description, secret, value, onChange, placeholder, type, options }: FieldProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-[13px] font-medium text-foreground">{label}</label>
        {description && <span className="text-[11px] tracking-wide" style={{ color: dim }}>{description}</span>}
      </div>
      {options ? (
        <SelectField value={value} onChange={onChange} options={options} />
      ) : (
        <div className="relative">
          <input
            type={secret && !show ? "password" : (type || "text")}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl px-4 py-3 text-[14px] text-foreground outline-none transition-all"
            style={{
              backgroundColor: "hsl(240 20% 8%)",
              border: "1px solid hsl(240 24% 14%)",
              caretColor: primary,
              paddingRight: secret ? "2.75rem" : undefined,
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = "hsl(246 89% 70% / 0.4)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,111,247,0.07)";
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = "hsl(240 24% 14%)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          {secret && (
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
              style={{ color: muted }}
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title, icon, accentColor = primary, children,
}: {
  title: string;
  icon?: React.ReactNode;
  accentColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "hsl(240 18% 9%)",
        border: "1px solid hsl(240 24% 13%)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }}
    >
      <div
        className="flex items-center gap-3 px-5 py-3.5"
        style={{ borderBottom: "1px solid hsl(240 24% 12%)" }}
      >
        {icon && (
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
          >
            {icon}
          </div>
        )}
        <h3 className="text-[13px] font-semibold text-foreground tracking-tight">{title}</h3>
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </div>
  );
}

type FormState = Record<string, string | boolean | string[]>;

export default function SettingsPage() {
  const [form, setForm] = useState<FormState>({
    brain_provider: "ollama",
    brain_model: "llama3.2",
    brain_api_key: "",
    brain_base_url: "http://localhost:11434/v1",
    claude_api_key: "",
    claude_model: "claude-3-5-sonnet-20241022",
    fal_api_key: "",
    seedance_api_key: "",
    ollama_base_url: "http://localhost:11434",
    lmstudio_base_url: "http://localhost:1234/v1",
    allow_shell_commands: "false",
    shell_command_allowlist: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchSettings()
      .then(data => {
        setForm(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? (v as string[]).join(", ") : String(v)])
          ),
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string) => (val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setStatus("idle");
    try {
      const payload: Record<string, unknown> = { ...form };
      if (typeof payload.shell_command_allowlist === "string") {
        payload.shell_command_allowlist = (payload.shell_command_allowlist as string)
          .split(",").map(s => s.trim()).filter(Boolean);
      }
      payload.allow_shell_commands = payload.allow_shell_commands === "true";
      await saveSettings(payload);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={18} className="animate-spin" style={{ color: muted }} />
      </div>
    );
  }

  const provider = String(form.brain_provider);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 flex-shrink-0"
        style={{ height: "48px", borderBottom: "1px solid hsl(240 24% 12%)" }}
      >
        <div className="flex items-center gap-2 text-[14px]">
          <span className="font-medium text-foreground">Settings</span>
          <ChevronRight size={13} style={{ color: "hsl(242 17% 30%)" }} />
          <span className="text-[13px]" style={{ color: muted }}>API Keys & Config</span>
        </div>
        <div className="flex items-center gap-3">
          {status === "success" && (
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "hsl(142 71% 45%)" }}>
              <CheckCircle size={12} /> Saved
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-1.5 text-[12px] text-destructive" title={errorMsg}>
              <AlertCircle size={12} /> Error
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-medium transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, hsl(246 89% 68%) 0%, hsl(258 75% 72%) 100%)",
              color: "white",
              boxShadow: "0 2px 8px rgba(124,111,247,0.3)",
            }}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto feed-scroll px-6 py-5 space-y-4 max-w-2xl w-full">
        <Section
          title="Brain — Central LLM"
          icon={<span className="text-[11px] font-bold select-none">◈</span>}
          accentColor="hsl(246 89% 70%)"
        >
          <Field
            label="Provider"
            description="Routes all orchestration decisions"
            value={String(form.brain_provider)}
            onChange={set("brain_provider")}
            options={[
              { value: "ollama",    label: "Ollama (local)" },
              { value: "lmstudio", label: "LM Studio (local)" },
              { value: "openai",   label: "OpenAI" },
              { value: "anthropic",label: "Anthropic" },
            ]}
          />
          <Field
            label="Model"
            placeholder="llama3.2 / gpt-4o / claude-3-5-sonnet-20241022"
            value={String(form.brain_model)}
            onChange={set("brain_model")}
          />
          {(provider === "ollama" || provider === "lmstudio") ? (
            <Field
              label="Base URL"
              placeholder="http://localhost:11434/v1"
              value={String(form.brain_base_url)}
              onChange={set("brain_base_url")}
            />
          ) : (
            <Field
              label="API Key"
              description="Used as Brain LLM key"
              secret
              placeholder="sk-..."
              value={String(form.brain_api_key)}
              onChange={set("brain_api_key")}
            />
          )}
        </Section>

        <Section
          title="Claude Worker"
          icon={<span className="text-[11px] leading-none">⚡</span>}
          accentColor="hsl(270 70% 72%)"
        >
          <Field
            label="API Key"
            secret
            placeholder="sk-ant-..."
            value={String(form.claude_api_key)}
            onChange={set("claude_api_key")}
          />
          <Field
            label="Model"
            value={String(form.claude_model)}
            onChange={set("claude_model")}
            options={[
              { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
              { value: "claude-3-5-haiku-20241022",  label: "Claude 3.5 Haiku" },
              { value: "claude-3-opus-20240229",     label: "Claude 3 Opus" },
            ]}
          />
        </Section>

        <Section
          title="Video Worker"
          icon={<span className="text-[11px] leading-none">🎬</span>}
          accentColor="hsl(328 80% 68%)"
        >
          <Field
            label="FAL API Key"
            secret
            placeholder="fal_..."
            value={String(form.fal_api_key)}
            onChange={set("fal_api_key")}
          />
          <Field
            label="Seedance API Key"
            secret
            placeholder="sk-..."
            value={String(form.seedance_api_key)}
            onChange={set("seedance_api_key")}
          />
        </Section>

        <Section
          title="Local Worker — Shell"
          icon={<span className="text-[11px] leading-none">💻</span>}
          accentColor="hsl(142 60% 55%)"
        >
          <Field
            label="Allow Shell Commands"
            description="Execute system commands"
            value={String(form.allow_shell_commands)}
            onChange={set("allow_shell_commands")}
            options={[
              { value: "false", label: "Disabled (safe)" },
              { value: "true",  label: "Enabled (use with caution)" },
            ]}
          />
          {String(form.allow_shell_commands) === "true" && (
            <Field
              label="Command Allowlist"
              description="Comma-separated. Empty = allow all."
              placeholder="ls, cat, echo, python3"
              value={String(form.shell_command_allowlist)}
              onChange={set("shell_command_allowlist")}
            />
          )}
        </Section>

        <Section
          title="Local AI Endpoints"
          icon={<span className="text-[11px] leading-none">🔗</span>}
          accentColor="hsl(38 90% 60%)"
        >
          <Field
            label="Ollama Base URL"
            placeholder="http://localhost:11434"
            value={String(form.ollama_base_url)}
            onChange={set("ollama_base_url")}
          />
          <Field
            label="LM Studio Base URL"
            placeholder="http://localhost:1234/v1"
            value={String(form.lmstudio_base_url)}
            onChange={set("lmstudio_base_url")}
          />
        </Section>

        <p className="text-[11px] text-center pb-6 tracking-wide" style={{ color: "hsl(242 17% 32%)" }}>
          Settings stored locally at ~/.portiere/settings.json — never transmitted to third parties
        </p>
      </div>
    </div>
  );
}
