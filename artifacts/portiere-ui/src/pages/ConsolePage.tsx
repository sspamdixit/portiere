import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ArrowUp, Paperclip, X, Loader2,
  Film, Globe, Cpu, ChevronRight,
  Sparkles, Search as SearchIcon, Monitor, Check, Copy, RotateCcw,
  Cloud, Mail, Terminal, Download, ExternalLink,
  Image, Languages, Newspaper, TrendingUp, CalendarPlus,
  Plane, PenLine, Mic, MicOff, FileDown, BookOpen,
  Zap, Edit3, ArrowDown, ChevronDown, Brain, Volume2, VolumeX, Headphones,
} from "lucide-react";
import { streamOrchestrate, fetchSettings, type OrchestrateEvent } from "@/lib/api";
import { saveSession } from "@/lib/sessions";
import { useSession } from "@/lib/SessionContext";
import { MarkdownContent } from "@/components/MarkdownContent";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import TemplatesModal from "@/components/TemplatesModal";
import { loadMemory } from "@/lib/memory";

interface FeedEntry { id: number; event: OrchestrateEvent & { _elapsed?: number }; ts: string; }

interface ActivityState {
  message: string;
  pipeline: Array<{ worker: string; label: string; status: "pending" | "active" | "done" }>;
  brainStatus: "thinking" | "done";
  progress: number;
}

const WORKER_LABELS: Record<string, string> = {
  brain: "Brain", claude: "Writing", search: "Search",
  osint: "Research", local: "System", video: "Video",
  weather: "Weather", email: "Email", code_runner: "Code",
  image_gen: "Image", translator: "Translate", news: "News",
  finance: "Finance", reminder: "Calendar",
};

const WORKER_MESSAGES: Record<string, string> = {
  claude:      "Writing...",
  search:      "Searching the web...",
  osint:       "Researching...",
  local:       "Checking your system...",
  video:       "Generating video...",
  weather:     "Getting the forecast...",
  email:       "Composing email...",
  code_runner: "Running code...",
  image_gen:   "Generating image...",
  translator:  "Translating...",
  news:        "Getting news...",
  finance:     "Getting market data...",
  reminder:    "Creating event...",
};

const CARD_META: Record<string, { label: string; Icon: React.FC<{ size?: number }>; color: string }> = {
  claude:      { label: "Response",    Icon: Sparkles,    color: "#CC7722"           },
  search:      { label: "Web Results", Icon: SearchIcon,  color: "#CC7722"           },
  osint:       { label: "Research",    Icon: Globe,       color: "#A57C00"           },
  local:       { label: "System Info", Icon: Monitor,     color: "#6A8A5A"           },
  video:       { label: "Video",       Icon: Film,        color: "#8A5A7A"           },
  weather:     { label: "Weather",     Icon: Cloud,       color: "#5A7A8A"           },
  email:       { label: "Email",       Icon: Mail,        color: "#A57C00"           },
  code_runner: { label: "Code Output", Icon: Terminal,    color: "#6A8A5A"           },
  image_gen:   { label: "Image",       Icon: Image,       color: "#8A5A7A"           },
  translator:  { label: "Translation", Icon: Languages,   color: "#5A7A8A"           },
  news:        { label: "News",        Icon: Newspaper,   color: "#A57C00"           },
  finance:     { label: "Markets",     Icon: TrendingUp,  color: "#6A8A5A"           },
  reminder:    { label: "Calendar",    Icon: CalendarPlus,color: "#CC7722"           },
};

const FOLLOW_UP_CHIPS: Record<string, string[]> = {
  search:      ["Summarize this", "Make a plan", "Find more"],
  claude:      ["Make this shorter", "Turn into bullet points", "Turn into an email"],
  weather:     ["What should I pack?", "Things to do in this weather", "Plan around the forecast"],
  email:       ["Adjust the tone", "Write a follow-up", "Make it more formal"],
  osint:       ["What are the risks", "Write a report", "Check related domains"],
  local:       ["What does this mean?", "How can I improve this?", "Full diagnostic"],
  code_runner: ["Fix any errors", "Add more features", "Explain what this does"],
  video:       ["Generate a variation", "Write a script", "Make it longer"],
  image_gen:   ["Generate a variation", "Try a different style", "More detail"],
  translator:  ["Try another language", "Explain the grammar", "More formal"],
  news:        ["Turn into a report", "What does this mean for me", "Related news"],
  finance:     ["Should I buy or sell?", "Compare with competitors", "Show the trend"],
  reminder:    ["Add another event", "Set a follow-up", "Email myself this"],
};

const QUICK_ACTIONS = [
  {
    icon: Plane, color: "#CC7722", bg: "rgba(204,119,34,0.1)",
    label: "Travel", sub: "Plan trips, find flights & hotels",
    prompt: "Plan a weekend in Milan: flights, hotels, itinerary",
  },
  {
    icon: Newspaper, color: "#A57C00", bg: "rgba(165,124,0,0.1)",
    label: "News", sub: "Latest headlines on any topic",
    prompt: "What's happening in AI and tech today?",
  },
  {
    icon: TrendingUp, color: "#6A8A5A", bg: "rgba(106,138,90,0.1)",
    label: "Finance", sub: "Stocks, crypto & market data",
    prompt: "How is Bitcoin doing today?",
  },
  {
    icon: Image, color: "#8A5A7A", bg: "rgba(138,90,122,0.1)",
    label: "Create", sub: "Generate images & videos",
    prompt: "Generate an image of a futuristic city at sunset",
  },
  {
    icon: PenLine, color: "#CC7722", bg: "rgba(204,119,34,0.1)",
    label: "Write", sub: "Emails, resumes, essays & more",
    prompt: "Help me write a professional bio for LinkedIn",
  },
  {
    icon: Languages, color: "#5A7A8A", bg: "rgba(90,122,138,0.1)",
    label: "Translate", sub: "50+ languages, free & instant",
    prompt: "Say 'I love you' in 10 different languages",
  },
  {
    icon: CalendarPlus, color: "#A57C00", bg: "rgba(165,124,0,0.1)",
    label: "Schedule", sub: "Calendar events & reminders",
    prompt: "Schedule a dentist appointment for tomorrow at 10am",
  },
  {
    icon: SearchIcon, color: "#5A7A8A", bg: "rgba(90,122,138,0.1)",
    label: "Search", sub: "Find anything on the web",
    prompt: "Find a highly-rated therapist near me who takes insurance",
  },
];

// ── Export helpers ─────────────────────────────────────────────────────────
function buildMarkdown(entries: FeedEntry[]): string {
  const lines: string[] = ["# Portiere Conversation", "", `_Exported ${new Date().toLocaleString()}_`, ""];
  for (const { event } of entries) {
    if (event.type === "user_input") {
      lines.push(`## You\n\n${event.content}\n`);
    } else if (event.type === "worker_done") {
      const k = (event.worker || "brain").toLowerCase();
      const meta = CARD_META[k];
      lines.push(`## ${meta?.label ?? "Result"}\n\n${event.content || ""}\n`);
    }
  }
  return lines.join("\n");
}

function downloadFile(content: string, filename: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function downloadWorkerFile(content: string, worker: string) {
  const ext = worker === "code_runner" ? "py" : "md";
  downloadFile(content, `portiere-${worker}-${Date.now()}.${ext}`);
}

// ── Pipeline step ──────────────────────────────────────────────────────────
function PipelineStep({ label, status }: { label: string; status: "pending" | "active" | "done" }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-6 h-6 flex items-center justify-center transition-all duration-400"
        style={{
          borderRadius: "2px",
          backgroundColor: status === "done"
            ? "rgba(106,138,90,0.14)"
            : status === "active"
            ? "rgba(204,119,34,0.18)"
            : "#1A1714",
          border: `1px solid ${status === "done"
            ? "rgba(106,138,90,0.4)"
            : status === "active"
            ? "rgba(204,119,34,0.5)"
            : "#2A2420"}`,
          boxShadow: status === "active" ? "0 0 8px rgba(204,119,34,0.2)" : "none",
        }}
      >
        {status === "done"
          ? <Check size={10} style={{ color: "#6A8A5A" }} />
          : status === "active"
          ? <div className="w-1.5 h-1.5 animate-pulse" style={{ backgroundColor: "#CC7722", borderRadius: "1px" }} />
          : <div className="w-1 h-1" style={{ backgroundColor: "#3A2A1C", borderRadius: "1px" }} />}
      </div>
      <span
        className="text-[10px] font-semibold"
        style={{
          color: status === "done"
            ? "#6A8A5A"
            : status === "active"
            ? "#CC7722"
            : "#4A3A2C",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontSize: "9px",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Activity card ──────────────────────────────────────────────────────────
function ActivityCard({ activity, elapsed }: { activity: ActivityState; elapsed: number }) {
  const { message, pipeline, brainStatus, progress } = activity;
  const allDone = pipeline.length > 0 && pipeline.every(s => s.status === "done");

  return (
    <div
      className="mx-5 mt-3 mb-2 animate-feed-in section-card"
      style={{ padding: "16px" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" style={{ color: "#CC7722" }} />
          <span className="text-[13px] font-semibold" style={{ color: "#E2D0B4", letterSpacing: "-0.01em" }}>
            Working on it
          </span>
        </div>
        <span className="text-[11px] tabular-nums font-medium" style={{ color: "#6A5A48", fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em" }}>
          {elapsed}s
        </span>
      </div>

      <div className="h-[2px] mb-4 overflow-hidden" style={{ backgroundColor: "#2A2420", borderRadius: "1px" }}>
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #A57C00 0%, #CC7722 100%)",
            boxShadow: "0 0 6px rgba(204,119,34,0.4)",
            borderRadius: "1px",
          }}
        />
      </div>

      <div className="flex items-end justify-center gap-1 mb-3">
        <PipelineStep label="Brain" status={brainStatus === "done" ? "done" : "active"} />
        {pipeline.map(step => (
          <div key={step.worker} className="flex items-center gap-1">
            <div
              className="h-px w-4 transition-colors duration-500"
              style={{ backgroundColor: step.status !== "pending" ? "rgba(204,119,34,0.25)" : "#2A2420" }}
            />
            <PipelineStep label={step.label} status={step.status} />
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="h-px w-4" style={{ backgroundColor: allDone ? "rgba(106,138,90,0.3)" : "#2A2420" }} />
          <PipelineStep label="Done" status={allDone ? "done" : "pending"} />
        </div>
      </div>

      <p className="text-[12px] text-center italic" style={{ color: "#6A5A48" }}>{message}</p>
    </div>
  );
}

// ── Search result cards ────────────────────────────────────────────────────
interface SearchResultItem { title: string; snippet: string; url: string; }
interface SearchData { answer?: string; abstract?: string; abstract_url?: string; results?: SearchResultItem[]; }

function SearchResultCards({ data }: { data: SearchData }) {
  const results = data.results || [];
  return (
    <div className="space-y-2">
      {data.answer && (
        <div
          className="px-4 py-3 mb-3"
          style={{ backgroundColor: "rgba(204,119,34,0.07)", border: "1px solid rgba(165,124,0,0.22)", borderRadius: "3px" }}
        >
          <p className="text-[14px] font-semibold" style={{ color: "#E2D0B4", letterSpacing: "-0.01em" }}>{data.answer}</p>
        </div>
      )}
      {data.abstract && (
        <p className="text-[13.5px] leading-relaxed mb-3" style={{ color: "#B8A080" }}>
          {data.abstract}
          {data.abstract_url && (
            <a href={data.abstract_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 ml-2 text-[12px] underline underline-offset-2"
              style={{ color: "#CC7722" }}>
              Source <ExternalLink size={10} />
            </a>
          )}
        </p>
      )}
      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((r, i) => (
            <a
              key={i}
              href={r.url || "#"}
              target="_blank"
              rel="noreferrer"
              className="flex items-start justify-between gap-3 p-3.5 rounded-xl transition-all group"
              style={{ backgroundColor: "#111009", border: "1px solid #2A2420", borderRadius: "3px" }}
              onClick={!r.url ? e => e.preventDefault() : undefined}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(165,124,0,0.3)";
                (e.currentTarget as HTMLElement).style.backgroundColor = "#1A1714";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "#2A2420";
                (e.currentTarget as HTMLElement).style.backgroundColor = "#111009";
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-snug" style={{ color: "#E2D0B4", letterSpacing: "-0.01em" }}>
                  {r.title || r.snippet.slice(0, 70)}
                </p>
                {r.snippet && r.snippet !== r.title && (
                  <p className="text-[12px] mt-0.5 leading-relaxed line-clamp-2" style={{ color: "#8A7A66" }}>
                    {r.snippet.slice(0, 180)}
                  </p>
                )}
                {r.url && (
                  <p className="text-[11px] mt-1 truncate font-mono" style={{ color: "#A57C00" }}>
                    {r.url.replace(/^https?:\/\//, "").slice(0, 60)}
                  </p>
                )}
              </div>
              {r.url && <ExternalLink size={11} className="flex-shrink-0 mt-0.5 opacity-25 group-hover:opacity-55 transition-opacity" style={{ color: "#CC7722" }} />}
            </a>
          ))}
        </div>
      )}
      {results.length === 0 && !data.answer && !data.abstract && (
        <p className="text-[14px]" style={{ color: "#6A5A48" }}>No results found. Try a different search.</p>
      )}
    </div>
  );
}

// ── Worker result card ─────────────────────────────────────────────────────
function WorkerResultCard({ event }: { event: OrchestrateEvent }) {
  const k = (event.worker || "brain").toLowerCase();
  const meta = CARD_META[k] || { label: "Result", Icon: Cpu, color: "#8A7A66" };
  const content = event.content || "";
  const data = event.data as Record<string, unknown> | undefined;
  const videoUrl = data?.video_url as string | undefined;
  const imageUrl = data?.image_url as string | undefined;
  const searchData = (k === "search" && data?.results) ? data as unknown as SearchData : null;

  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-5 my-2.5 animate-feed-in result-card" style={{ borderLeft: `2px solid ${meta.color}80` }}>
      <div className="flex items-center justify-between px-4 py-2.5 result-card-header">
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${meta.color}18`, color: meta.color, borderRadius: "2px" }}
          >
            <meta.Icon size={13} />
          </div>
          <span className="text-[13px] font-semibold" style={{ color: "#E2D0B4", letterSpacing: "0.01em", textTransform: "uppercase", fontSize: "11px" }}>
            {meta.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => downloadWorkerFile(content, k)}
            className="flex items-center gap-1 text-[11px] font-medium transition-all px-2 py-1"
            style={{ color: "#4A3A2C", borderRadius: "2px" }}
            title="Save to file"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "#8A7A66"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "#4A3A2C"; }}
          >
            <Download size={11} />
          </button>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 text-[11px] font-medium transition-all px-2.5 py-1"
            style={{
              color: copied ? "#6A8A5A" : "#4A3A2C",
              backgroundColor: copied ? "rgba(106,138,90,0.08)" : "transparent",
              borderRadius: "2px",
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        {imageUrl ? (
          <div className="space-y-3">
            <img
              src={imageUrl}
              alt={content}
              className="w-full rounded-xl object-cover"
              style={{ maxHeight: "380px", border: "1px solid #2A2420", borderRadius: "3px" }}
            />
            <p className="text-[12px]" style={{ color: "#6A5A48" }}>{content}</p>
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium"
              style={{ color: "#CC7722" }}
            >
              <ExternalLink size={12} /> Open full size
            </a>
          </div>
        ) : searchData ? (
          <SearchResultCards data={searchData} />
        ) : (
          <MarkdownContent content={content} />
        )}
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-[13px] font-medium"
            style={{ color: "#CC7722" }}
          >
            View generated video →
          </a>
        )}
      </div>
    </div>
  );
}

// ── Streaming card ─────────────────────────────────────────────────────────
function StreamingCard({ worker, text }: { worker: string; text: string }) {
  const k = worker.toLowerCase();
  const meta = CARD_META[k] || { label: "Working", Icon: Cpu, color: "#8A7A66" };
  return (
    <div className="mx-5 my-2.5 result-card" style={{ borderLeft: `2px solid ${meta.color}80` }}>
      <div className="flex items-center gap-2.5 px-4 py-2.5 result-card-header">
        <div className="w-6 h-6 flex items-center justify-center" style={{ backgroundColor: `${meta.color}18`, color: meta.color, borderRadius: "2px" }}>
          <meta.Icon size={13} />
        </div>
        <span className="text-[11px] font-semibold" style={{ color: "#E2D0B4", letterSpacing: "0.04em", textTransform: "uppercase" }}>{meta.label}</span>
        <Loader2 size={11} className="animate-spin ml-auto" style={{ color: meta.color, opacity: 0.7 }} />
      </div>
      <div className="px-5 py-4">
        <pre className="mono-output kinetic-reveal" style={{ color: "#9A8870" }}>
          {text}<span className="cursor-blink" />
        </pre>
      </div>
    </div>
  );
}

// ── Complete divider ───────────────────────────────────────────────────────
function CompleteRow({ elapsed }: { elapsed?: number }) {
  return (
    <div className="flex items-center gap-3 py-5 px-6 animate-feed-in">
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #2A2420 60%)" }} />
      <div
        className="flex items-center gap-1.5 text-[11px] font-semibold px-3.5 py-1.5"
        style={{
          color: "#6A8A5A",
          backgroundColor: "rgba(106,138,90,0.07)",
          border: "1px solid rgba(106,138,90,0.22)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontSize: "10px",
          borderRadius: "2px",
        }}
      >
        <Check size={9} strokeWidth={2.5} />
        {elapsed !== undefined ? `Done · ${elapsed}s` : "Done"}
      </div>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #2A2420 40%, transparent)" }} />
    </div>
  );
}

// ── Nixie clock (analog elapsed timer) ────────────────────────────────────
function NixieClock({ seconds, active }: { seconds: number; active: boolean }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : String(secs).padStart(2, "0");
  return (
    <div className="nixie-tube flex items-center">
      <span className={`nixie-digit text-[11px] ${active ? "nixie-digit-active" : ""}`}>
        {display}s
      </span>
    </div>
  );
}

// ── Thinking block (brain routing accordion) ────────────────────────────────
interface BrainRouting { reasoning: string; chain: Array<{ step: number; worker: string; task: string }> }

function ThinkingBlock({ routing }: { routing: BrainRouting }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-5 my-2 animate-feed-in thinking-block">
      <div className="thinking-block-header" onClick={() => setOpen(v => !v)}>
        <Brain size={10} style={{ color: "#A57C00", flexShrink: 0 }} />
        <span className="text-[10px] font-semibold uppercase" style={{ color: "#7A6A4A", letterSpacing: "0.08em" }}>
          Brain Routing
        </span>
        {routing.reasoning && (
          <span className="text-[11px] italic ml-2 flex-1 truncate" style={{ color: "#5A4A38" }}>
            {routing.reasoning}
          </span>
        )}
        <ChevronDown
          size={10}
          style={{
            color: "#5A4A38",
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </div>
      {open && (
        <div className="thinking-block-body">
          <div className="space-y-3">
            {routing.chain.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-bold"
                  style={{
                    background: "rgba(165,124,0,0.12)",
                    border: "1px solid rgba(165,124,0,0.22)",
                    borderRadius: "1px",
                    color: "#A57C00",
                    fontFamily: "var(--app-font-mono)",
                  }}
                >
                  {step.step}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase" style={{ color: "#8A7A5A", letterSpacing: "0.06em" }}>
                    {step.worker}
                  </p>
                  <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: "#5A4A38" }}>
                    {step.task}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── VU Meter panel ────────────────────────────────────────────────────────
const VU_ANIMS = ["vu-bar-active-0","vu-bar-active-1","vu-bar-active-2","vu-bar-active-3","vu-bar-active-4","vu-bar-active-5","vu-bar-active-6"];
const VU_HEIGHTS = [35,55,22,75,48,88,30,62,18,90,42,70,26,58,82,38,65,20,80,44];

function VUMeterPanel({ speaking, listening, lastText, onClose }: {
  speaking: boolean;
  listening: boolean;
  lastText: string;
  onClose: () => void;
}) {
  const active = speaking || listening;
  return (
    <div className="voice-panel w-64 flex-shrink-0 flex flex-col scanlines">
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #1E1A12" }}>
        <div className="flex items-center gap-2">
          <Headphones size={11} style={{ color: "#A57C00", opacity: 0.8 }} />
          <span className="text-[10px] font-semibold uppercase" style={{ color: "#7A6A4A", letterSpacing: "0.1em" }}>Voice Mode</span>
          {active && <div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: speaking ? "#E8940A" : "#6A9ABA" }} />}
        </div>
        <button onClick={onClose} style={{ color: "#4A3A28" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#8A7A5A"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4A3A28"; }}>
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-6">
        <p className="text-[9px] font-semibold uppercase" style={{ color: "#3A2E20", letterSpacing: "0.12em" }}>Signal Level</p>

        <div className="flex items-end justify-center gap-[3px] w-full" style={{ height: "72px" }}>
          {VU_HEIGHTS.map((h, i) => {
            const animClass = active ? VU_ANIMS[i % VU_ANIMS.length] : "";
            const barColor = speaking
              ? i < VU_HEIGHTS.length * 0.65 ? "#C8882C" : "#E8B040"
              : listening ? "#6A8AAA" : "#2A2018";
            const glowColor = speaking
              ? i < VU_HEIGHTS.length * 0.65 ? "rgba(200,136,44,0.35)" : "rgba(232,176,64,0.5)"
              : "none";
            return (
              <div key={i} className={`vu-bar ${animClass}`} style={{
                width: "6px",
                height: active ? undefined : `${Math.max(h * 0.12, 4)}%`,
                backgroundColor: barColor,
                boxShadow: active ? `0 0 5px ${glowColor}` : "none",
                flexShrink: 0,
                minHeight: "2px",
              }} />
            );
          })}
        </div>

        <div className="text-center space-y-2">
          <div className="text-[11px] font-semibold uppercase px-3 py-1.5 inline-flex items-center gap-2"
            style={{
              color: speaking ? "#E8940A" : listening ? "#8AABCA" : "#4A3A28",
              backgroundColor: speaking ? "rgba(232,148,10,0.08)" : listening ? "rgba(106,138,170,0.08)" : "transparent",
              border: `1px solid ${speaking ? "rgba(232,148,10,0.2)" : listening ? "rgba(106,138,170,0.2)" : "rgba(74,58,40,0.25)"}`,
              borderRadius: "2px",
              letterSpacing: "0.1em",
              transition: "all 0.3s ease",
            }}
          >
            {speaking ? <><Volume2 size={10} /> Speaking</> : listening ? <><Mic size={10} /> Listening</> : <><VolumeX size={10} /> Standby</>}
          </div>
          {lastText && (
            <p className="text-[11px] leading-relaxed italic max-w-[170px] mx-auto" style={{ color: "#5A4A38" }}>
              "{lastText.length > 65 ? lastText.slice(0, 65) + "…" : lastText}"
            </p>
          )}
        </div>

        <div className="w-full space-y-1 opacity-25">
          {[0,1,2].map(row => (
            <div key={row} className="flex gap-0.5">
              {Array.from({ length: 20 }, (_, j) => (
                <div key={j} className="flex-1 rounded-sm" style={{
                  height: "2px",
                  backgroundColor: active
                    ? `rgba(200,136,44,${0.12 + ((j * 3 + row * 7) % 10) * 0.07})`
                    : "#1E1A12",
                }} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid #1E1A12" }}>
        <div className="nixie-tube">
          <span className={`nixie-digit text-[11px] ${active ? "nixie-digit-active" : ""}`}>
            {speaking ? "OUT" : listening ? " IN " : "---"}
          </span>
        </div>
        <div className="nixie-tube">
          <span className={`nixie-digit text-[11px] ${active ? "nixie-digit-active" : ""}`}>
            {speaking ? "TALK" : listening ? " MIC" : "IDLE"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Voice input hook ───────────────────────────────────────────────────────
type AnySpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onresult: ((e: any) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

function useVoiceInput(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<AnySpeechRecognition | null>(null);
  const supported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const toggle = useCallback(() => {
    if (!supported) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    const rec: AnySpeechRecognition = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      if (transcript) onTranscript(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  }, [listening, supported, onTranscript]);

  return { listening, toggle, supported };
}

// ── Greeting ───────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Still up?";
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  if (h < 21) return "Good evening.";
  return "Working late?";
}

// ── Main page ──────────────────────────────────────────────────────────────
let idSeq = 0;

export default function ConsolePage() {
  const { loadedSession, setLoadedSession, notifySessionSaved } = useSession();

  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [activity, setActivity] = useState<ActivityState | null>(null);
  const [chunkBuffers, setChunkBuffers] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const [filePath, setFilePath] = useState("");
  const [showFilePath, setShowFilePath] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [lastContext, setLastContext] = useState<string | null>(null);
  const [lastWorker, setLastWorker] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [currentBrain, setCurrentBrain] = useState<{ provider: string; model: string } | null>(null);
  const [memories, setMemories] = useState<string[]>([]);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState("");
  const [brainRoutingMap, setBrainRoutingMap] = useState<Map<number, BrainRouting>>(new Map());
  const runIdRef = useRef(0);
  const ttsRef = useRef<SpeechSynthesisUtterance | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const feedEventsRef = useRef<OrchestrateEvent[]>([]);
  const startTimeRef = useRef<number>(0);

  const { listening, toggle: toggleVoice, supported: voiceSupported } = useVoiceInput((text) => {
    setInput(prev => prev ? prev + " " + text : text);
    inputRef.current?.focus();
  });

  const followUpChips = useMemo(() => {
    if (!lastWorker) return [];
    return (FOLLOW_UP_CHIPS[lastWorker] || ["Tell me more", "Try a different approach", "Summarize this"]).slice(0, 3);
  }, [lastWorker]);

  useEffect(() => {
    if (loadedSession) {
      feedEventsRef.current = loadedSession.events;
      setFeed(loadedSession.events.map(e => ({ id: idSeq++, event: e, ts: "—" })));
      setActivity(null); setChunkBuffers({}); setRunning(false);
      setLastContext(null); setLastWorker(null);
    }
  }, [loadedSession]);

  useEffect(() => {
    if (!running) { setElapsed(0); return; }
    startTimeRef.current = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [feed, chunkBuffers, activity]);

  useEffect(() => {
    fetchSettings()
      .then(s => setCurrentBrain({ provider: String(s.brain_provider || "ollama"), model: String(s.brain_model || "") }))
      .catch(() => {});
  }, []);

  useEffect(() => { setMemories(loadMemory()); }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const now = () => new Date().toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const addEntry = useCallback((event: OrchestrateEvent) => {
    feedEventsRef.current = [...feedEventsRef.current, event];
    setFeed(prev => [...prev, { id: idSeq++, event, ts: now() }]);
  }, []);

  const updateActivity = useCallback((event: OrchestrateEvent) => {
    setActivity(prev => {
      const base: ActivityState = prev || { message: "Starting up...", pipeline: [], brainStatus: "thinking", progress: 8 };
      if (event.type === "brain_thinking") return { ...base, message: "Thinking...", progress: Math.max(base.progress, 15) };
      if (event.type === "brain_decision") {
        const chain = (event.data as Record<string, unknown[]>)?.chain ?? [];
        const pipeline = (chain as Array<Record<string, string>>).map(s => ({
          worker: s.worker, label: WORKER_LABELS[s.worker] || s.worker, status: "pending" as const,
        }));
        return { ...base, brainStatus: "done", pipeline, message: "Planning...", progress: 28 };
      }
      if (event.type === "worker_start") {
        const w = (event.worker || "").toLowerCase();
        const pipeline = base.pipeline.map(s => s.worker === w ? { ...s, status: "active" as const } : s);
        const doneCount = pipeline.filter(s => s.status === "done").length;
        return { ...base, pipeline, message: WORKER_MESSAGES[w] || "Working on it...", progress: 28 + (doneCount / Math.max(1, pipeline.length)) * 62 };
      }
      if (event.type === "worker_thinking") return { ...base, message: event.content || base.message };
      return base;
    });
  }, []);

  const speakText = useCallback((text: string) => {
    if (!voiceMode || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const stripped = text.replace(/#+\s/g, "").replace(/\*\*/g, "").replace(/`{1,3}[^`]*`{1,3}/g, "").slice(0, 500);
    const utterance = new SpeechSynthesisUtterance(stripped);
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.onstart = () => { setIsSpeaking(true); setLastSpokenText(stripped.slice(0, 90)); };
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    ttsRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voiceMode]);

  useEffect(() => {
    if (!voiceMode) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
  }, [voiceMode]);

  const runOrchestration = useCallback((msg: string, filePathArg: string | null, contextArg: string | null) => {
    setRunning(true);
    runIdRef.current += 1;
    setActivity({ message: "Starting up...", pipeline: [], brainStatus: "thinking", progress: 8 });
    const memoriesCurrent = loadMemory();
    const msgWithMemory = memoriesCurrent.length > 0
      ? `[Context about me: ${memoriesCurrent.join(". ")}]\n\n${msg}`
      : msg;
    const cancel = streamOrchestrate(
      msgWithMemory, filePathArg, contextArg,
      (event) => {
        if (["brain_thinking", "chain_step", "worker_start", "worker_thinking"].includes(event.type)) {
          updateActivity(event); return;
        }
        if (event.type === "brain_decision") {
          updateActivity(event);
          const data = event.data as Record<string, unknown>;
          const chain = (data?.chain as Array<Record<string, unknown>>) ?? [];
          const routing: BrainRouting = {
            reasoning: (data?.reasoning as string) || "",
            chain: chain.map(s => ({ step: Number(s.step), worker: String(s.worker), task: String(s.task) })),
          };
          const runId = runIdRef.current;
          setBrainRoutingMap(prev => { const m = new Map(prev); m.set(runId, routing); return m; });
          addEntry({ type: "brain_routing", content: routing.reasoning, data: routing as unknown as Record<string, unknown> });
          return;
        }
        if (event.type === "worker_chunk") {
          const key = event.worker || "unknown";
          setChunkBuffers(prev => ({ ...prev, [key]: (prev[key] || "") + (event.content || "") }));
          return;
        }
        if (event.type === "worker_done") {
          if (event.worker) {
            setChunkBuffers(prev => { const u = { ...prev }; delete u[event.worker!]; return u; });
            setLastWorker(event.worker.toLowerCase());
            setActivity(prev => {
              if (!prev) return prev;
              const pipeline = prev.pipeline.map(s => s.worker === event.worker ? { ...s, status: "done" as const } : s);
              const doneCount = pipeline.filter(s => s.status === "done").length;
              return { ...prev, pipeline, progress: 28 + (doneCount / Math.max(1, pipeline.length)) * 62, message: "Finalizing..." };
            });
            if (event.content) speakText(event.content);
          }
          addEntry(event); return;
        }
        if (event.type === "complete") {
          const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
          const ctx = (event.data as Record<string, unknown>)?.context as string | undefined;
          if (ctx) setLastContext(ctx);
          const enriched = { ...event, _elapsed: secs };
          feedEventsRef.current.push(enriched);
          setFeed(prev => [...prev, { id: idSeq++, event: enriched, ts: now() }]);
          setActivity(null);
          saveSession([...feedEventsRef.current]);
          notifySessionSaved();
          if (document.hidden && "Notification" in window && Notification.permission === "granted") {
            new Notification("Portiere", { body: "Your request is ready" });
          }
          return;
        }
        addEntry(event);
      },
      () => { setRunning(false); stopRef.current = null; setActivity(null); },
      (err) => { addEntry({ type: "error", error: err }); setRunning(false); setActivity(null); },
    );
    stopRef.current = cancel;
  }, [addEntry, updateActivity, notifySessionSaved, speakText]);

  const submit = useCallback(() => {
    const msg = input.trim();
    if (!msg || running) return;
    setInput(""); setLoadedSession(null);
    feedEventsRef.current = [];
    const userEv: OrchestrateEvent = { type: "user_input", content: msg };
    feedEventsRef.current.push(userEv);
    setFeed(prev => lastContext && prev.length > 0
      ? [...prev, { id: idSeq++, event: userEv, ts: now() }]
      : [{ id: idSeq++, event: userEv, ts: now() }]
    );
    runOrchestration(msg, filePath.trim() || null, lastContext);
  }, [input, filePath, running, lastContext, runOrchestration, setLoadedSession]);

  const handleRegenerate = useCallback(() => {
    if (running) return;
    const lastUserEv = [...feedEventsRef.current].reverse().find(e => e.type === "user_input");
    if (!lastUserEv?.content) return;
    const msg = lastUserEv.content;
    feedEventsRef.current = [];
    setFeed([]);
    setActivity(null);
    setChunkBuffers({});
    setLastContext(null);
    setLastWorker(null);
    setLoadedSession(null);
    const userEv: OrchestrateEvent = { type: "user_input", content: msg };
    feedEventsRef.current = [userEv];
    setFeed([{ id: idSeq++, event: userEv, ts: now() }]);
    runOrchestration(msg, null, null);
  }, [running, runOrchestration, setLoadedSession]);

  const handleEditMessage = useCallback((content: string) => {
    setFeed([]);
    feedEventsRef.current = [];
    setActivity(null);
    setChunkBuffers({});
    setLastContext(null);
    setLastWorker(null);
    setLoadedSession(null);
    setInput(content);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [setLoadedSession]);

  const handleFeedScroll = useCallback(() => {
    const el = feedRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  }, []);

  const scrollToBottom = useCallback(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "e") { e.preventDefault(); if (!isEmpty) handleExport(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "t") { e.preventDefault(); setShowTemplates(true); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") { e.preventDefault(); toggleVoice(); return; }
      if (!inInput && e.key === "?") { e.preventDefault(); setShowShortcuts(true); return; }
      if (e.key === "Escape") { setShowShortcuts(false); setShowTemplates(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleVoice]);

  const handleClear = () => {
    setFeed([]); feedEventsRef.current = []; setActivity(null);
    setChunkBuffers({}); setLoadedSession(null); setLastContext(null); setLastWorker(null);
  };

  const handleExport = () => {
    const md = buildMarkdown(feed);
    downloadFile(md, `portiere-${Date.now()}.md`);
  };

  const isEmpty = feed.length === 0 && !running;
  const isComplete = !running && feed.some(e => e.event.type === "complete");

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Modals */}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showTemplates && (
        <TemplatesModal
          onUse={(content) => { setInput(content); inputRef.current?.focus(); }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{ height: "48px", borderBottom: "1px solid #242018" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold" style={{ color: "#E2D0B4", letterSpacing: "-0.01em" }}>
            Chat
          </span>
          {!isEmpty && (
            <>
              <ChevronRight size={12} style={{ color: "#4A3A2C" }} />
              <span className="text-[12.5px] max-w-xs truncate" style={{ color: "#8A7A66" }}>
                {feed.find(e => e.event.type === "user_input")?.event.content?.slice(0, 55) ?? "session"}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {currentBrain && !isEmpty && (
            <div className="flex items-center gap-1.5 text-[11px] px-2 py-1 mr-1"
              style={{ background: "rgba(204,119,34,0.06)", border: "1px solid rgba(165,124,0,0.2)", color: "#CC7722", borderRadius: "2px" }}>
              <span style={{ opacity: 0.6 }}>◈</span>
              <span style={{ letterSpacing: "0em" }}>{currentBrain.model}</span>
            </div>
          )}
          {running && (
            <div className="flex items-center gap-2 mr-2">
              <Loader2 size={11} className="animate-spin" style={{ color: "#CC7722" }} />
              <NixieClock seconds={elapsed} active={true} />
            </div>
          )}
          {isComplete && !running && (
            <div className="flex items-center gap-1.5 text-[12px] mr-1" style={{ color: "#6A8A5A" }}>
              <Check size={11} />
              <span style={{ letterSpacing: "0em" }}>Done</span>
            </div>
          )}
          {!isEmpty && (
            <button
              onClick={handleExport}
              title="Export chat (⌘E)"
              className="flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 transition-all"
              style={{ color: "#4A3A2C", borderRadius: "2px" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.color = "#8A7A66"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "#4A3A2C"; }}
            >
              <FileDown size={13} />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
          <button
            onClick={() => setShowTemplates(true)}
            title="Prompt templates (⌘T)"
            className="flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 transition-all"
            style={{ color: "#4A3A2C", borderRadius: "2px" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.color = "#8A7A66"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "#4A3A2C"; }}
          >
            <BookOpen size={13} />
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts (?)"
            className="flex items-center justify-center w-6 h-6 text-[11px] font-bold transition-all"
            style={{
              color: "#4A3A2C",
              border: "1px solid #2A2420",
              backgroundColor: "#1A1714",
              borderRadius: "2px",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#A57C00"; (e.currentTarget as HTMLElement).style.color = "#CC7722"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#2A2420"; (e.currentTarget as HTMLElement).style.color = "#4A3A2C"; }}
          >
            ?
          </button>
          <button
            onClick={() => setVoiceMode(v => !v)}
            title={voiceMode ? "Exit voice mode" : "Enter voice conversation mode"}
            className="flex items-center justify-center w-7 h-7 transition-all"
            style={{
              color: voiceMode ? "#E8940A" : "#4A3A2C",
              backgroundColor: voiceMode ? "rgba(232,148,10,0.1)" : "transparent",
              border: voiceMode ? "1px solid rgba(232,148,10,0.25)" : "1px solid transparent",
              borderRadius: "2px",
            }}
            onMouseEnter={e => { if (!voiceMode) { (e.currentTarget as HTMLElement).style.color = "#A57C00"; } }}
            onMouseLeave={e => { if (!voiceMode) { (e.currentTarget as HTMLElement).style.color = "#4A3A2C"; } }}
          >
            <Headphones size={13} />
          </button>
          {!isEmpty && (
            <button
              onClick={handleClear}
              className="text-[12px] px-2.5 py-1 transition-all ml-1"
              style={{ color: "#4A3A2C", borderRadius: "2px" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.color = "#8A7A66"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "#4A3A2C"; }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content area: feed + input (+ voice panel if active) */}
      <div className="flex-1 flex min-h-0">
      <div className="flex-1 flex flex-col min-h-0">
      {/* Feed */}
      <div className="flex-1 relative min-h-0">
      <div ref={feedRef} className="h-full overflow-y-auto feed-scroll" onScroll={handleFeedScroll}>
        {isEmpty ? (
          <div className="relative flex flex-col items-center h-full px-6 pt-10 pb-4 overflow-y-auto feed-scroll">
            {/* Dot grid background */}
            <div
              className="absolute inset-0 pointer-events-none dot-grid"
              style={{ opacity: 0.5 }}
            />
            {/* Radial glow — warm amber warmth */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: 0, left: "50%", transform: "translateX(-50%)",
                width: "600px", height: "400px",
                background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(180,110,0,0.06) 0%, transparent 70%)",
              }}
            />

            {/* Hero */}
            <div className="relative flex flex-col items-center text-center mb-8 animate-slide-up">
              <div
                className="relative w-16 h-16 flex items-center justify-center mb-5 animate-float"
                style={{
                  background: "linear-gradient(145deg, rgba(44,30,8,0.7) 0%, rgba(20,14,4,0.5) 100%)",
                  border: "1px solid rgba(204,119,34,0.3)",
                  borderRadius: "4px",
                  boxShadow: "0 0 36px rgba(160,90,0,0.15), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(204,119,34,0.1)",
                }}
              >
                <div
                  className="absolute inset-0 pointer-events-none animate-logo-breathe"
                  style={{ background: "rgba(160,90,0,0.18)", filter: "blur(14px)", transform: "scale(1.3)", borderRadius: "4px" }}
                />
                <span className="relative text-[30px] leading-none select-none" style={{ color: "#CC7722" }}>◈</span>
              </div>
              <h1
                className="text-[34px] mb-3"
                style={{
                  color: "#E8D5B7",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.05,
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 400,
                  fontStyle: "italic",
                }}
              >
                {getGreeting()}
              </h1>
              <p className="text-[14px] max-w-[300px]" style={{ color: "#6A5A48", letterSpacing: "0em", lineHeight: 1.65 }}>
                Search, write, code, run numbers. Or just ask.
              </p>

              {/* Feature pills — industrial tabs */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-5">
                {[
                  { label: "Voice input", icon: Mic },
                  { label: "Templates", icon: BookOpen },
                  { label: "13 capabilities", icon: Zap },
                  { label: "Local & cloud AI", icon: Cpu },
                ].map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 px-3 py-1 text-[11.5px] font-medium"
                    style={{
                      backgroundColor: "rgba(204,119,34,0.06)",
                      border: "1px solid rgba(165,124,0,0.2)",
                      color: "#A57C00",
                      borderRadius: "2px",
                    }}
                  >
                    <Icon size={10} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick action grid */}
            <div
              className="relative grid gap-2.5 w-full mb-6 animate-slide-up"
              style={{ gridTemplateColumns: "repeat(4, 1fr)", maxWidth: "720px", animationDelay: "0.05s" }}
            >
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="quick-action-card"
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: action.bg, color: action.color }}
                  >
                    <action.icon size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold leading-snug" style={{ color: "#E2D0B4", letterSpacing: "-0.01em" }}>
                      {action.label}
                    </p>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "#6A5A48" }}>
                      {action.sub}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <p
              className="relative text-[11.5px] animate-slide-up"
              style={{ color: "#3A2E24", letterSpacing: "0.01em", animationDelay: "0.1s" }}
            >
              <span style={{ opacity: 0.6 }}>⌘K</span>
              <span style={{ opacity: 0.3, margin: "0 6px" }}>·</span>
              <span style={{ opacity: 0.6 }}>⌘T</span> <span style={{ opacity: 0.4 }}>templates</span>
              <span style={{ opacity: 0.3, margin: "0 6px" }}>·</span>
              <span style={{ opacity: 0.6 }}>?</span> <span style={{ opacity: 0.4 }}>shortcuts</span>
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full py-4">
            {feed.map(entry => {
              const { event } = entry;

              if (event.type === "user_input") {
                return (
                  <div key={entry.id} className="flex justify-end px-5 mb-5 mt-3 animate-feed-in">
                    <div className="relative group">
                      <div className="user-bubble px-4 py-3 text-[14px]" style={{ maxWidth: "72vw" }}>
                        {event.content}
                      </div>
                      <button
                        onClick={() => handleEditMessage(event.content || "")}
                        title="Edit and resend"
                        className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "#6A5A48", backgroundColor: "#1A1714", border: "1px solid #2A2420", borderRadius: "2px" }}
                      >
                        <Edit3 size={11} />
                      </button>
                    </div>
                  </div>
                );
              }

              if (event.type === "brain_routing") return <ThinkingBlock key={entry.id} routing={event.data as unknown as BrainRouting} />;

              if (event.type === "worker_done") return <WorkerResultCard key={entry.id} event={event} />;

              if (event.type === "complete") return <CompleteRow key={entry.id} elapsed={(event as OrchestrateEvent & { _elapsed?: number })._elapsed} />;

              if (event.type === "error" || event.type === "worker_error") {
                return (
                  <div
                    key={entry.id}
                    className="mx-5 my-2 p-4 rounded-2xl text-[13px] animate-feed-in"
                    style={{
                      backgroundColor: "rgba(220,53,69,0.06)",
                      border: "1px solid rgba(220,53,69,0.18)",
                      color: "hsl(4 86% 62%)",
                    }}
                  >
                    {event.error || event.content}
                  </div>
                );
              }

              if (event.type === "file_loaded") {
                return (
                  <div key={entry.id} className="flex items-center gap-2 px-6 py-1.5 animate-feed-in">
                    <Paperclip size={11} style={{ color: "#4A3A2C" }} />
                    <span className="text-[12px]" style={{ color: "#6A5A48" }}>{event.content}</span>
                  </div>
                );
              }

              return null;
            })}

            {Object.entries(chunkBuffers).map(([worker, text]) =>
              text ? <StreamingCard key={worker} worker={worker} text={text} /> : null
            )}

            {activity && running && <ActivityCard activity={activity} elapsed={elapsed} />}
          </div>
        )}
      </div>
      {showScrollBtn && !isEmpty && (
        <button
          onClick={scrollToBottom}
          title="Scroll to bottom"
          className="absolute bottom-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full shadow-lg transition-all animate-feed-in"
          style={{ background: "#1A1714", border: "1px solid #2A2420", color: "#6A5A48", borderRadius: "2px" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#CC7722"; (e.currentTarget as HTMLElement).style.borderColor = "#A57C00"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6A5A48"; (e.currentTarget as HTMLElement).style.borderColor = "#2A2420"; }}
        >
          <ArrowDown size={14} />
        </button>
      )}
      </div>

      {/* Input area */}
      <div
        className="flex-shrink-0 px-5 pb-5 pt-3"
        style={{ borderTop: "1px solid #242018" }}
      >
        {/* Context indicator */}
        {lastContext && !running && (
          <div className="flex items-center gap-2 mb-3">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium"
              style={{
                backgroundColor: "rgba(204,119,34,0.07)",
                border: "1px solid rgba(165,124,0,0.25)",
                color: "#CC7722",
                borderRadius: "2px",
              }}
            >
              <RotateCcw size={10} /> Continuing from last result
            </div>
            <button
              onClick={() => { setLastContext(null); setLastWorker(null); }}
              className="text-[11px] px-2.5 py-1.5 transition-colors"
              style={{ color: "#6A5A48", borderRadius: "2px" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              Start fresh
            </button>
          </div>
        )}

        {/* Voice listening indicator */}
        {listening && (
          <div className="flex items-center gap-2 mb-3 animate-feed-in">
            <div
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium"
              style={{
                backgroundColor: "rgba(106,138,170,0.08)",
                border: "1px solid rgba(106,138,170,0.22)",
                color: "#8AABCA",
                borderRadius: "2px",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#6A9ABA" }} />
              Listening, speak now
            </div>
            <button
              onClick={toggleVoice}
              className="text-[11px] px-2.5 py-1.5"
              style={{ color: "#6A5A48", borderRadius: "2px" }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Regenerate */}
        {isComplete && !running && (
          <button
            onClick={handleRegenerate}
            className="flex items-center justify-center gap-1.5 w-full py-2 mb-2 rounded-xl text-[12.5px] font-medium transition-all"
            style={{ border: "1px dashed #2A2420", color: "#6A5A48", borderRadius: "2px" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(165,124,0,0.35)"; e.currentTarget.style.color = "#CC7722"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2420"; e.currentTarget.style.color = "#6A5A48"; }}
          >
            <RotateCcw size={11} /> Try again
          </button>
        )}

        {/* Smart follow-up chips */}
        {isComplete && followUpChips.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {followUpChips.map(s => (
              <button
                key={s}
                onClick={() => { setInput(s); inputRef.current?.focus(); }}
                className="suggestion-chip px-3 py-1.5 rounded-full text-[12px]"
                style={{ color: "#6A5A48" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* File path input */}
        {showFilePath && (
          <div
            className="flex items-center gap-2 mb-2.5 px-4 py-2.5 rounded-2xl"
            style={{ backgroundColor: "#111009", border: "1px solid #2A2420", borderRadius: "3px" }}
          >
            <Paperclip size={11} style={{ color: "#6A5A48" }} />
            <input
              type="text"
              value={filePath}
              onChange={e => setFilePath(e.target.value)}
              placeholder="/path/to/file"
              className="flex-1 bg-transparent text-[13px] text-foreground outline-none"
              style={{ caretColor: "#CC7722" }}
            />
            <button onClick={() => { setShowFilePath(false); setFilePath(""); }}>
              <X size={13} style={{ color: "#6A5A48" }} />
            </button>
          </div>
        )}

        {/* Command bar */}
        <div className="command-bar flex items-end gap-2 px-4 py-3">
          {/* Attach file */}
          <button
            onClick={() => setShowFilePath(v => !v)}
            title="Attach file path"
            className="flex-shrink-0 mb-0.5 transition-all rounded-lg p-1"
            style={{ color: showFilePath || filePath ? "#CC7722" : "#6A5A48" }}
            onMouseEnter={e => { if (!showFilePath && !filePath) (e.currentTarget as HTMLElement).style.color = "#A57C00"; }}
            onMouseLeave={e => { if (!showFilePath && !filePath) (e.currentTarget as HTMLElement).style.color = "#6A5A48"; }}
          >
            <Paperclip size={15} />
          </button>

          {/* Voice input */}
          {voiceSupported && (
            <button
              onClick={toggleVoice}
              title="Voice input (⌘/)"
              className="flex-shrink-0 mb-0.5 transition-all rounded-lg p-1"
              style={{
                color: listening ? "hsl(4 86% 60%)" : "#6A5A48",
                backgroundColor: listening ? "rgba(220,53,69,0.1)" : "transparent",
              }}
              onMouseEnter={e => { if (!listening) (e.currentTarget as HTMLElement).style.color = "#A57C00"; }}
              onMouseLeave={e => { if (!listening) (e.currentTarget as HTMLElement).style.color = "#6A5A48"; }}
            >
              {listening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
          )}

          {/* Templates shortcut */}
          <button
            onClick={() => setShowTemplates(true)}
            title="Prompt templates (⌘T)"
            className="flex-shrink-0 mb-0.5 transition-all rounded-lg p-1"
            style={{ color: "#6A5A48" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#A57C00"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6A5A48"; }}
          >
            <BookOpen size={15} />
          </button>

          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={lastContext ? "Ask a follow-up..." : listening ? "Listening..." : "Ask anything"}
            disabled={running}
            rows={1}
            className="flex-1 bg-transparent text-[14px] text-foreground outline-none resize-none leading-relaxed max-h-36 overflow-y-auto disabled:opacity-40"
            style={{
              minHeight: "1.5rem",
              caretColor: "#CC7722",
              letterSpacing: "-0.01em",
              color: "#E2D0B4",
            }}
          />

          {/* Send / stop */}
          <button
            onClick={running ? () => stopRef.current?.() : submit}
            disabled={!running && !input.trim()}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed"
            style={{
              background: running
                ? "transparent"
                : "linear-gradient(148deg, #7A5200 0%, #CC7722 100%)",
              color: running ? "#6A5A48" : "#E2D0B4",
              border: running ? "1px solid rgba(90,70,44,0.4)" : "1px solid rgba(204,119,34,0.5)",
              boxShadow: running ? "none" : "0 2px 12px rgba(165,124,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
              borderRadius: "2px",
            }}
            onMouseEnter={e => {
              if (!running && input.trim()) {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 18px rgba(165,124,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)";
              }
            }}
            onMouseLeave={e => {
              if (!running) {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(165,124,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)";
              }
            }}
          >
            {running ? <X size={13} /> : <ArrowUp size={14} />}
          </button>
        </div>

        <p className="text-center text-[11px] mt-2" style={{ color: "#3A2E24", letterSpacing: "0em" }}>
          AI makes mistakes. Double-check anything important.
        </p>
      </div>
      </div>{/* end flex-1 flex flex-col */}
      {voiceMode && (
        <VUMeterPanel
          speaking={isSpeaking}
          listening={listening}
          lastText={lastSpokenText}
          onClose={() => { setVoiceMode(false); window.speechSynthesis?.cancel(); setIsSpeaking(false); }}
        />
      )}
      </div>{/* end flex-1 flex min-h-0 */}
    </div>
  );
}
