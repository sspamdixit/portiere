import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ChevronRight, ChevronDown, Sparkles, Film, Monitor, User, Mail } from "lucide-react";
import { fetchSettings, saveSettings } from "@/lib/api";

const dim = "hsl(242 17% 36%)";
const muted = "hsl(242 18% 61%)";
const primary = "hsl(246 89% 70%)";
const green = "hsl(142 71% 45%)";

function SelectField({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl px-4 py-3 text-[14px] text-foreground outline-none pr-10"
        style={{ backgroundColor: "hsl(240 20% 8%)", border: "1px solid hsl(240 24% 14%)", cursor: "pointer" }}
        onFocus={e => { e.currentTarget.style.borderColor = "hsl(246 89% 70% / 0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,111,247,0.07)"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "hsl(240 24% 14%)"; e.currentTarget.style.boxShadow = "none"; }}>
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
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-[13px] font-medium text-foreground">{label}</label>
        {description && <span className="text-[11px] tracking-wide" style={{ color: dim }}>{description}</span>}
      </div>
      {options ? (
        <SelectField value={value} onChange={onChange} options={options} />
      ) : (
        <div className="relative">
          <input type={secret && !show ? "password" : (type || "text")} value={value}
            onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full rounded-xl px-4 py-3 text-[14px] text-foreground outline-none transition-all"
            style={{ backgroundColor: "hsl(240 20% 8%)", border: "1px solid hsl(240 24% 14%)", caretColor: primary, paddingRight: secret ? "2.75rem" : undefined }}
            onFocus={e => { e.currentTarget.style.borderColor = "hsl(246 89% 70% / 0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,111,247,0.07)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "hsl(240 24% 14%)"; e.currentTarget.style.boxShadow = "none"; }} />
          {secret && (
            <button type="button" onClick={() => setShow(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70" style={{ color: muted }}>
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CapabilityCard({ title, icon, iconColor, iconBg, statusLabel, statusOk, children }: {
  title: string; icon: React.ReactNode; iconColor: string; iconBg: string;
  statusLabel: string; statusOk: boolean; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{ backgroundColor: "hsl(240 18% 9%)", border: "1px solid hsl(240 24% 13%)" }}>
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid hsl(240 24% 12%)" }}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: iconBg, color: iconColor }}>
            {icon}
          </div>
          <span className="text-[13px] font-semibold text-foreground">{title}</span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: statusOk ? "rgba(34,197,94,0.1)" : "hsl(240 24% 13%)", color: statusOk ? green : dim, border: `1px solid ${statusOk ? "rgba(34,197,94,0.25)" : "transparent"}` }}>
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

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 size={18} className="animate-spin" style={{ color: muted }} /></div>;
  }

  const provider = form.brain_provider;
  const hasClaudeKey = form.claude_api_key.length > 5;
  const hasFalKey = form.fal_api_key.length > 5;
  const hasSmtp = form.smtp_host.length > 2 && form.smtp_user.length > 2;
  const hasProfile = !!(form.profile_name || form.profile_city);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 flex-shrink-0"
        style={{ height: "48px", borderBottom: "1px solid hsl(240 24% 12%)" }}>
        <div className="flex items-center gap-2 text-[14px]">
          <span className="font-medium text-foreground">Settings</span>
          <ChevronRight size={13} style={{ color: "hsl(242 17% 30%)" }} />
          <span className="text-[13px]" style={{ color: muted }}>AI & Capabilities</span>
        </div>
        <div className="flex items-center gap-3">
          {status === "success" && (
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: green }}>
              <CheckCircle size={12} /> Saved
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-1.5 text-[12px] text-destructive" title={errorMsg}>
              <AlertCircle size={12} /> Error
            </div>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, hsl(246 89% 68%) 0%, hsl(258 75% 72%) 100%)", color: "white", boxShadow: "0 2px 8px rgba(124,111,247,0.3)" }}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto feed-scroll px-6 py-5 space-y-4 max-w-2xl w-full">

        {/* About You */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "hsl(240 18% 9%)", border: "1px solid hsl(240 24% 13%)" }}>
          <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: "1px solid hsl(240 24% 12%)" }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(34,197,94,0.14)", color: "hsl(142 60% 55%)" }}>
              <User size={13} />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-foreground">About You</h3>
              <p className="text-[11px] mt-0.5" style={{ color: dim }}>
                {hasProfile ? "Portiere knows your context" : "Tell Portiere about yourself for personalized responses"}
              </p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-[13px] leading-relaxed" style={{ color: muted }}>
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
          </div>
        </div>

        {/* Your AI */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "hsl(240 18% 9%)", border: "1px solid hsl(240 24% 13%)" }}>
          <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: "1px solid hsl(240 24% 12%)" }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(124,111,247,0.14)", color: primary }}>
              <span className="text-[11px] font-bold">◈</span>
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-foreground">Your AI</h3>
              <p className="text-[11px] mt-0.5" style={{ color: dim }}>The Brain that routes all your requests</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Provider" value={provider} onChange={set("brain_provider")}
              options={[
                { value: "ollama",    label: "Ollama — free, runs on your machine" },
                { value: "lmstudio", label: "LM Studio — free, desktop app" },
                { value: "openai",   label: "OpenAI — GPT-4o" },
                { value: "anthropic",label: "Anthropic — Claude as Brain" },
              ]} />
            <Field label="Model" placeholder="llama3.2 / gpt-4o / claude-3-5-sonnet-20241022"
              value={form.brain_model} onChange={set("brain_model")} />
            {(provider === "ollama" || provider === "lmstudio") ? (
              <Field label="Local endpoint" placeholder="http://localhost:11434/v1"
                value={form.brain_base_url} onChange={set("brain_base_url")} />
            ) : (
              <Field label="API Key" secret placeholder="sk-..."
                value={form.brain_api_key} onChange={set("brain_api_key")} />
            )}
          </div>
        </div>

        {/* Capabilities heading */}
        <p className="text-[12px] font-semibold tracking-widest uppercase px-1" style={{ color: dim }}>Capabilities</p>

        {/* Claude */}
        <CapabilityCard title="Claude — Coding & Deep Writing"
          icon={<Sparkles size={13} />} iconColor="hsl(270 70% 72%)" iconBg="rgba(167,139,250,0.14)"
          statusLabel={hasClaudeKey ? "Connected" : "Not configured"} statusOk={hasClaudeKey}>
          <Field label="Anthropic API Key" secret placeholder="sk-ant-..."
            value={form.claude_api_key} onChange={set("claude_api_key")} />
          <Field label="Model" value={form.claude_model} onChange={set("claude_model")} options={[
            { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
            { value: "claude-3-5-haiku-20241022",  label: "Claude 3.5 Haiku (faster)" },
            { value: "claude-3-opus-20240229",     label: "Claude 3 Opus (most powerful)" },
          ]} />
        </CapabilityCard>

        {/* Email / SMTP */}
        <CapabilityCard title="Email — Send via SMTP"
          icon={<Mail size={13} />} iconColor="hsl(38 90% 60%)" iconBg="rgba(245,158,11,0.14)"
          statusLabel={hasSmtp ? "Configured" : "Not configured"} statusOk={hasSmtp}>
          <p className="text-[13px] leading-relaxed" style={{ color: muted }}>
            Without this, Portiere drafts emails with a mailto link to open your email app. With SMTP, it sends them directly.
          </p>
          <Field label="SMTP Host" placeholder="smtp.gmail.com · smtp.mail.yahoo.com · smtp.office365.com"
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
            <Field label="Password" secret placeholder="App password (not main password)"
              value={form.smtp_password} onChange={set("smtp_password")} />
          </div>
          <Field label="From address" placeholder="Alex Smith <alex@gmail.com>"
            value={form.smtp_from} onChange={set("smtp_from")} />
          <p className="text-[12px] p-3 rounded-xl" style={{ color: dim, backgroundColor: "hsl(240 22% 7%)", border: "1px solid hsl(240 24% 12%)" }}>
            <strong className="text-foreground/60">Gmail tip:</strong> Enable 2-step verification, then create an App Password at myaccount.google.com/apppasswords — use that instead of your main password.
          </p>
        </CapabilityCard>

        {/* Video */}
        <CapabilityCard title="Video Generation"
          icon={<Film size={13} />} iconColor="hsl(328 80% 68%)" iconBg="rgba(244,114,182,0.14)"
          statusLabel={hasFalKey ? "Connected" : "Not configured"} statusOk={hasFalKey}>
          <Field label="FAL API Key" secret placeholder="fal_..."
            value={form.fal_api_key} onChange={set("fal_api_key")} />
          <Field label="Seedance API Key" secret placeholder="sk-..."
            value={form.seedance_api_key} onChange={set("seedance_api_key")} />
        </CapabilityCard>

        {/* System access */}
        <CapabilityCard title="System Access"
          icon={<Monitor size={13} />} iconColor="hsl(142 60% 55%)" iconBg="rgba(34,197,94,0.14)"
          statusLabel="Built-in" statusOk={true}>
          <Field label="Shell Commands" description="Lets Portiere run terminal commands"
            value={form.allow_shell_commands} onChange={set("allow_shell_commands")}
            options={[
              { value: "false", label: "Disabled — monitoring only (safe)" },
              { value: "true",  label: "Enabled — can run shell commands" },
            ]} />
          {form.allow_shell_commands === "true" && (
            <Field label="Allowed Commands" description="Leave blank to allow all"
              placeholder="ls, cat, echo, python3" value={form.shell_command_allowlist} onChange={set("shell_command_allowlist")} />
          )}
        </CapabilityCard>

        {/* Advanced */}
        <details className="group">
          <summary className="cursor-pointer text-[12px] font-medium list-none flex items-center gap-2 py-1 px-1 select-none" style={{ color: dim }}>
            <ChevronRight size={13} className="transition-transform group-open:rotate-90" />
            Advanced — Local AI endpoints
          </summary>
          <div className="mt-3 rounded-2xl overflow-hidden" style={{ backgroundColor: "hsl(240 18% 9%)", border: "1px solid hsl(240 24% 13%)" }}>
            <div className="p-5 space-y-4">
              <Field label="Ollama Base URL" placeholder="http://localhost:11434" value={form.ollama_base_url} onChange={set("ollama_base_url")} />
              <Field label="LM Studio Base URL" placeholder="http://localhost:1234/v1" value={form.lmstudio_base_url} onChange={set("lmstudio_base_url")} />
            </div>
          </div>
        </details>

        <p className="text-[11px] text-center pb-6 tracking-wide" style={{ color: "hsl(242 17% 30%)" }}>
          Everything stored locally — nothing leaves your device
        </p>
      </div>
    </div>
  );
}
