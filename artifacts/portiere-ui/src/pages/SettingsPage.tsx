import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ChevronRight } from "lucide-react";
import { fetchSettings, saveSettings } from "@/lib/api";

const dim = "hsl(242 17% 36%)";
const muted = "hsl(242 18% 61%)";

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
  const inputStyle = {
    backgroundColor: "hsl(240 18% 9%)",
    border: "1px solid hsl(240 24% 14%)",
    borderRadius: "0.5rem",
    color: "hsl(244 100% 97%)",
    fontSize: "14px",
    padding: "8px 12px",
    outline: "none",
    width: "100%",
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[13px] font-medium text-foreground">{label}</label>
        {description && <span className="text-[11px]" style={{ color: dim }}>{description}</span>}
      </div>
      {options ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, appearance: "auto" }}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <div className="relative">
          <input
            type={secret && !show ? "password" : (type || "text")}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ ...inputStyle, paddingRight: secret ? "2.5rem" : "12px" }}
          />
          {secret && (
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: dim }}
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "hsl(240 18% 9%)", border: "1px solid hsl(240 24% 14%)" }}
    >
      <div className="px-5 py-3" style={{ borderBottom: "1px solid hsl(240 24% 14%)" }}>
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
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
    openai_api_key: "",
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
          ...(Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? (v as string[]).join(", ") : String(v)])
          )),
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
        style={{ height: "48px", borderBottom: "1px solid hsl(240 24% 14%)" }}
      >
        <div className="flex items-center gap-2 text-[14px]">
          <span className="text-foreground">Settings</span>
          <ChevronRight size={14} style={{ color: dim }} />
          <span style={{ color: muted }}>API Keys & Config</span>
        </div>
        <div className="flex items-center gap-3">
          {status === "success" && (
            <div className="flex items-center gap-1.5 text-[13px]" style={{ color: "hsl(142 71% 45%)" }}>
              <CheckCircle size={13} /> Saved
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-1.5 text-[13px] text-destructive" title={errorMsg}>
              <AlertCircle size={13} /> Error
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] transition-all disabled:opacity-50"
            style={{
              backgroundColor: "hsl(246 89% 70% / 0.12)",
              border: "1px solid hsl(246 89% 70% / 0.25)",
              color: "hsl(246 89% 70%)",
            }}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto feed-scroll px-6 py-6 space-y-4">
        <Section title="Brain — Central LLM">
          <Field
            label="Provider"
            description="Routes all orchestration decisions"
            value={String(form.brain_provider)}
            onChange={set("brain_provider")}
            options={[
              { value: "ollama", label: "Ollama (local)" },
              { value: "lmstudio", label: "LM Studio (local)" },
              { value: "openai", label: "OpenAI" },
              { value: "anthropic", label: "Anthropic" },
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

        <Section title="Claude Worker">
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
              { value: "claude-3-5-sonnet-20241022", label: "claude-3-5-sonnet-20241022" },
              { value: "claude-3-5-haiku-20241022", label: "claude-3-5-haiku-20241022" },
              { value: "claude-3-opus-20240229", label: "claude-3-opus-20240229" },
            ]}
          />
        </Section>

        <Section title="Video Worker">
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

        <Section title="Local Worker — Shell">
          <Field
            label="Allow Shell Commands"
            description="Execute system commands"
            value={String(form.allow_shell_commands)}
            onChange={set("allow_shell_commands")}
            options={[
              { value: "false", label: "Disabled (safe)" },
              { value: "true", label: "Enabled (use with caution)" },
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

        <Section title="Local AI Endpoints">
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

        <p className="text-[11px] text-center pb-4" style={{ color: dim }}>
          Settings stored locally at ~/.portiere/settings.json — never transmitted to third parties
        </p>
      </div>
    </div>
  );
}
