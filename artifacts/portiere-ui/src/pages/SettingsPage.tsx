import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ChevronRight, ChevronDown, Sparkles, Film, Monitor, User, Mail, Brain } from "lucide-react";
import { fetchSettings, saveSettings } from "@/lib/api";
import { loadMemory, saveMemory } from "@/lib/memory";

const dim = "hsl(238 18% 32%)";
const muted = "hsl(238 18% 50%)";
const primary = "hsl(248 90% 68%)";
const green = "hsl(152 64% 48%)";

function SelectField({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="portiere-input portiere-select pr-10"
        onFocus={e => {
          e.currentTarget.style.borderColor = "hsl(246 89% 70% / 0.45)";
          e.currentTarget.style.boxShadow = "0 0 0 3px hsl(246 89% 70% / 0.07)";
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = "hsl(240 20% 12%)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" style={{ color: dim }} />
    </div>
  );
}

function Field({ label, description, secret, value, onChange, placeholder, type, options }: {
  label: string; description?: string; secret?: boolean;
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
  options?: { value: string; label: string }[];
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[13px] font-medium" style={{ color: "hsl(244 30% 88%)", letterSpacing: "-0.01em" }}>
          {label}
        </label>
        {description && (
          <span className="text-[11px]" style={{ color: "hsl(242 17% 36%)", letterSpacing: "0.01em" }}>
            {description}
          </span>
        )}
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
            className="portiere-input"
            style={{ paddingRight: secret ? "2.75rem" : undefined }}
            onFocus={e => {
              e.currentTarget.style.borderColor = "hsl(246 89% 70% / 0.45)";
              e.currentTarget.style.boxShadow = "0 0 0 3px hsl(246 89% 70% / 0.07)";
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = "hsl(240 20% 12%)";
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

function SectionCard({ title, icon, iconColor, iconBg, statusLabel, statusOk, children }: {
  title: string; icon: React.ReactNode; iconColor: string; iconBg: string;
  statusLabel: string; statusOk: boolean; children: React.ReactNode;
}) {
  return (
    <div className="section-card mb-3">
      <div className="section-card-header">
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: iconBg, color: iconColor }}
          >
            {icon}
          </div>
          <span className="text-[13px] font-semibold" style={{ color: "hsl(244 30% 94%)", letterSpacing: "-0.01em" }}>
            {title}
          </span>
        </div>
        <span
          className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
          style={{
            backgroundColor: statusOk ? "rgba(34,197,94,0.1)" : "hsl(240 20% 11%)",
            color: statusOk ? green : "hsl(242 17% 40%)",
            border: `1px solid ${statusOk ? "rgba(34,197,94,0.25)" : "transparent"}`,
            letterSpacing: "0.01em",
          }}
        >
          {statusLabel}
        </span>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

type FormState = Record<string, string>;

export default function SettingsPage() {
  const [form, setForm] = useState<FormState>({
    brain_provider: "ollama", brain_model: "llama3.2",
    brain_api_key: "", brain_base_url: "http://localhost:11434/v1",
    claude_api_key: "", claude_model: "claude-3-5-sonnet-20241022",
    fal_api_key: "", seedance_api_key: "",
    ollama_base_url: "http://localhost:11434", lmstudio_base_url: "http://localhost:1234/v1",
    allow_shell_commands: "false", shell_command_allowlist: "",
    profile_name: "", profile_city: "", profile_occupation: "", profile_preferences: "",
    smtp_host: "", smtp_port: "587", smtp_user: "", smtp_password: "", smtp_from: "", smtp_tls: "true",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [memText, setMemText] = useState("");
  const [memSaved, setMemSaved] = useState(false);

  useEffect(() => {
    fetchSettings()
      .then(data => setForm(prev => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? (v as string[]).join(", ") : String(v === null || v === undefined ? "" : v)])
        ),
      })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const facts = loadMemory();
    setMemText(facts.join("\n"));
  }, []);

  const set = (key: string) => (val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true); setStatus("idle");
    try {
      const payload: Record<string, unknown> = { ...form };
      if (typeof payload.shell_command_allowlist === "string") {
        payload.shell_command_allowlist = (payload.shell_command_allowlist as string).split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      payload.allow_shell_commands = payload.allow_shell_commands === "true";
      payload.smtp_tls = payload.smtp_tls === "true";
      payload.smtp_port = parseInt(String(payload.smtp_port)) || 587;
      for (const key of ["profile_name", "profile_city", "profile_occupation", "profile_preferences",
                          "smtp_host", "smtp_user", "smtp_password", "smtp_from"]) {
        if (!payload[key]) payload[key] = null;
      }
      await saveSettings(payload);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      setErrorMsg(String(e)); setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMemory = () => {
    const facts = memText.split("\n").map(s => s.trim()).filter(Boolean);
    saveMemory(facts);
    setMemSaved(true);
    setTimeout(() => setMemSaved(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={18} className="animate-spin" style={{ color: muted }} />
      </div>
    );
  }

  const provider = form.brain_provider;
  const hasClaudeKey = form.claude_api_key.length > 5;
  const hasFalKey = form.fal_api_key.length > 5;
  const hasSmtp = form.smtp_host.length > 2 && form.smtp_user.length > 2;
  const hasProfile = !!(form.profile_name || form.profile_city);
  const memoryCount = memText.split("\n").map(s => s.trim()).filter(Boolean).length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 flex-shrink-0"
        style={{ height: "46px", borderBottom: "1px solid hsl(240 20% 9%)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold" style={{ color: "hsl(244 30% 85%)", letterSpacing: "-0.01em" }}>Settings</span>
          <ChevronRight size={12} style={{ color: "hsl(242 17% 28%)" }} />
          <span className="text-[13px]" style={{ color: muted }}>AI & Capabilities</span>
        </div>
        <div className="flex items-center gap-3">
          {status === "success" && (
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: green }}>
              <CheckCircle size={12} /> Saved
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "hsl(347 87% 62%)" }} title={errorMsg}>
              <AlertCircle size={12} /> Error
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, hsl(246 89% 64%) 0%, hsl(258 72% 68%) 100%)",
              color: "white",
              boxShadow: "0 2px 10px rgba(124,111,247,0.32)",
              letterSpacing: "-0.01em",
            }}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto feed-scroll px-6 py-5 space-y-4 max-w-2xl w-full">

        {/* About You */}
        <SectionCard
          title="About You"
          icon={<User size={14} />}
          iconColor="hsl(142 60% 55%)"
          iconBg="rgba(34,197,94,0.14)"
          statusLabel={hasProfile ? "Personalized" : "Not set"}
          statusOk={hasProfile}
        >
          <p className="text-[13px] leading-relaxed" style={{ color: muted, letterSpacing: "-0.005em" }}>
            Injected into every request — "find a therapist near me" works because Portiere knows your city. Emails are signed with your name.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Your name" placeholder="Alex" value={form.profile_name} onChange={set("profile_name")} />
            <Field label="City / location" placeholder="New York, NY" value={form.profile_city} onChange={set("profile_city")} />
          </div>
          <Field label="What you do" placeholder="Product designer, student, startup founder..."
            value={form.profile_occupation} onChange={set("profile_occupation")} />
          <Field label="Preferences" description="anything Portiere should always know"
            placeholder="morning flights, vegetarian, concise answers, prefer email over phone..."
            value={form.profile_preferences} onChange={set("profile_preferences")} />
        </SectionCard>

        {/* AI Memory */}
        <SectionCard
          title="AI Memory"
          icon={<Brain size={13} />}
          iconColor="hsl(38 90% 62%)"
          iconBg="rgba(245,158,11,0.14)"
          statusLabel={memoryCount > 0 ? `${memoryCount} fact${memoryCount !== 1 ? "s" : ""}` : "Empty"}
          statusOk={memoryCount > 0}
        >
          <p className="text-[13px] leading-relaxed" style={{ color: muted, letterSpacing: "-0.005em" }}>
            Facts Portiere remembers across all conversations. Injected silently into every message — one fact per line.
          </p>
          <textarea
            value={memText}
            onChange={e => setMemText(e.target.value)}
            placeholder={"I'm vegetarian\nI live in San Francisco\nI work in tech\nI prefer concise answers"}
            rows={5}
            className="portiere-input w-full resize-none text-[13px] leading-relaxed"
            style={{ fontFamily: "inherit", caretColor: "hsl(248 90% 70%)" }}
            onFocus={e => {
              e.currentTarget.style.borderColor = "hsl(246 89% 70% / 0.45)";
              e.currentTarget.style.boxShadow = "0 0 0 3px hsl(246 89% 70% / 0.07)";
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = "hsl(240 20% 12%)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-[12px]" style={{ color: dim }}>Stored locally — never sent anywhere except your AI.</p>
            <button
              onClick={handleSaveMemory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={{
                background: memSaved ? "rgba(34,197,94,0.1)" : "rgba(109,95,234,0.1)",
                border: `1px solid ${memSaved ? "rgba(34,197,94,0.25)" : "rgba(109,95,234,0.22)"}`,
                color: memSaved ? green : primary,
              }}
            >
              {memSaved ? <><CheckCircle size={11} /> Saved</> : "Save memory"}
            </button>
          </div>
        </SectionCard>

        {/* Your AI */}
        <SectionCard
          title="Your AI Brain"
          icon={<span className="text-[12px] font-bold">◈</span>}
          iconColor={primary}
          iconBg="rgba(124,111,247,0.16)"
          statusLabel={provider === "ollama" || provider === "lmstudio" ? "Local · no key needed" : "Cloud"}
          statusOk={true}
        >
          <Field label="Provider" value={provider} onChange={set("brain_provider")}
            options={[
              { value: "ollama",     label: "Ollama — free, runs on your machine" },
              { value: "lmstudio",   label: "LM Studio — free, desktop app" },
              { value: "openai",     label: "OpenAI — GPT-4o" },
              { value: "anthropic",  label: "Anthropic — Claude as Brain" },
            ]}
          />
          <Field label="Model" placeholder="llama3.2 / gpt-4o / claude-3-5-sonnet-20241022"
            value={form.brain_model} onChange={set("brain_model")} />
          {(provider === "ollama" || provider === "lmstudio") ? (
            <div
              className="p-4 rounded-xl text-[13px] leading-relaxed"
              style={{ background: "rgba(109,95,234,0.06)", border: "1px solid rgba(109,95,234,0.15)" }}
            >
              <p className="font-medium mb-1.5" style={{ color: "hsl(248 80% 76%)" }}>
                {provider === "ollama" ? "🦙 No API key needed" : "🖥 No API key needed"}
              </p>
              <p style={{ color: muted }}>
                Portiere talks directly to {provider === "ollama" ? "Ollama" : "LM Studio"} running on your computer.
                Just keep the app open while you use Portiere.
              </p>
              <p className="mt-2 text-[12px]" style={{ color: dim }}>
                Not connected? Go to <strong style={{ color: "hsl(240 16% 56%)" }}>Capabilities</strong> in the sidebar to check the status and get setup help.
              </p>
            </div>
          ) : (
            <Field label="API Key" secret placeholder="sk-..."
              value={form.brain_api_key} onChange={set("brain_api_key")} />
          )}
        </SectionCard>

        {/* Capabilities label */}
        <p
          className="text-[10px] font-semibold px-1"
          style={{ color: "hsl(242 17% 34%)", letterSpacing: "0.06em", textTransform: "uppercase" }}
        >
          Capabilities
        </p>

        {/* Claude */}
        <SectionCard
          title="Claude — Writing & Coding"
          icon={<Sparkles size={13} />}
          iconColor="hsl(270 70% 72%)"
          iconBg="rgba(167,139,250,0.14)"
          statusLabel={hasClaudeKey ? "Connected" : "Not configured"}
          statusOk={hasClaudeKey}
        >
          <Field label="Anthropic API Key" secret placeholder="sk-ant-..."
            value={form.claude_api_key} onChange={set("claude_api_key")} />
          <Field label="Model" value={form.claude_model} onChange={set("claude_model")} options={[
            { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet — best overall" },
            { value: "claude-3-5-haiku-20241022",  label: "Claude 3.5 Haiku — faster" },
            { value: "claude-3-opus-20240229",     label: "Claude 3 Opus — most powerful" },
          ]} />
        </SectionCard>

        {/* Email */}
        <SectionCard
          title="Email — Send via SMTP"
          icon={<Mail size={13} />}
          iconColor="hsl(38 90% 60%)"
          iconBg="rgba(245,158,11,0.14)"
          statusLabel={hasSmtp ? "Configured" : "Not configured"}
          statusOk={hasSmtp}
        >
          <p className="text-[13px] leading-relaxed" style={{ color: muted, letterSpacing: "-0.005em" }}>
            Without this, Portiere drafts emails with a mailto link to open your email app. With SMTP, it sends them directly.
          </p>
          <Field label="SMTP Host" placeholder="smtp.gmail.com · smtp.office365.com"
            value={form.smtp_host} onChange={set("smtp_host")} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Port" placeholder="587" value={form.smtp_port} onChange={set("smtp_port")} />
            <Field label="Security" value={form.smtp_tls} onChange={set("smtp_tls")} options={[
              { value: "true",  label: "STARTTLS (port 587)" },
              { value: "false", label: "None / SSL (port 25/465)" },
            ]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email / Username" placeholder="you@gmail.com"
              value={form.smtp_user} onChange={set("smtp_user")} />
            <Field label="Password" secret placeholder="App password"
              value={form.smtp_password} onChange={set("smtp_password")} />
          </div>
          <Field label="From address" placeholder="Alex Smith <alex@gmail.com>"
            value={form.smtp_from} onChange={set("smtp_from")} />
          <p
            className="text-[12px] p-3.5 rounded-xl leading-relaxed"
            style={{ color: dim, backgroundColor: "hsl(240 22% 6%)", border: "1px solid hsl(240 20% 11%)" }}
          >
            <strong style={{ color: "hsl(244 30% 70%)" }}>Gmail tip:</strong> Enable 2-step verification, then create an App Password at myaccount.google.com/apppasswords — use that instead of your main password.
          </p>
        </SectionCard>

        {/* Video */}
        <SectionCard
          title="Video Generation"
          icon={<Film size={13} />}
          iconColor="hsl(328 80% 68%)"
          iconBg="rgba(244,114,182,0.14)"
          statusLabel={hasFalKey ? "Connected" : "Not configured"}
          statusOk={hasFalKey}
        >
          <Field label="FAL API Key" secret placeholder="fal_..."
            value={form.fal_api_key} onChange={set("fal_api_key")} />
          <Field label="Seedance API Key" secret placeholder="sk-..."
            value={form.seedance_api_key} onChange={set("seedance_api_key")} />
        </SectionCard>

        {/* System */}
        <SectionCard
          title="System Access"
          icon={<Monitor size={13} />}
          iconColor="hsl(142 60% 55%)"
          iconBg="rgba(34,197,94,0.14)"
          statusLabel="Built-in"
          statusOk={true}
        >
          <Field
            label="Shell Commands"
            description="lets Portiere run terminal commands"
            value={form.allow_shell_commands}
            onChange={set("allow_shell_commands")}
            options={[
              { value: "false", label: "Disabled — monitoring only (safe)" },
              { value: "true",  label: "Enabled — can run shell commands" },
            ]}
          />
          {form.allow_shell_commands === "true" && (
            <Field label="Allowed Commands" description="Leave blank to allow all"
              placeholder="ls, cat, echo, python3"
              value={form.shell_command_allowlist} onChange={set("shell_command_allowlist")} />
          )}
        </SectionCard>

        {/* Advanced */}
        <details className="group">
          <summary
            className="cursor-pointer text-[12px] font-medium list-none flex items-center gap-2 py-1 px-1 select-none transition-colors"
            style={{ color: dim }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "hsl(242 18% 52%)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = dim}
          >
            <ChevronRight size={13} className="transition-transform group-open:rotate-90" />
            Advanced — Local AI endpoints
          </summary>
          <div className="mt-3 section-card">
            <div className="p-5 space-y-4">
              <Field label="Ollama Base URL" placeholder="http://localhost:11434"
                value={form.ollama_base_url} onChange={set("ollama_base_url")} />
              <Field label="LM Studio Base URL" placeholder="http://localhost:1234/v1"
                value={form.lmstudio_base_url} onChange={set("lmstudio_base_url")} />
            </div>
          </div>
        </details>

        <p
          className="text-[11px] text-center pb-6"
          style={{ color: "hsl(242 17% 28%)", letterSpacing: "0.02em" }}
        >
          Everything stored locally — nothing leaves your device
        </p>
      </div>
    </div>
  );
}
