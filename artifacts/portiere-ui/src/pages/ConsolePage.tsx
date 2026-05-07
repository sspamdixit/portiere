import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ArrowUp, Paperclip, X, Loader2,
  Film, Globe, Cpu, ChevronRight,
  Sparkles, Search as SearchIcon, Monitor, Check, Copy, RotateCcw,
  Cloud, Mail, Terminal, Download, ExternalLink,
  Image, Languages, Newspaper, TrendingUp, CalendarPlus,
  Plane, Zap, PenLine,
} from "lucide-react";
import { streamOrchestrate, type OrchestrateEvent } from "@/lib/api";
import { saveSession } from "@/lib/sessions";
import { useSession } from "@/lib/SessionContext";
import { MarkdownContent } from "@/components/MarkdownContent";

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
  claude:      "Writing a thoughtful response...",
  search:      "Searching the web...",
  osint:       "Scanning and researching...",
  local:       "Checking your system...",
  video:       "Generating your video...",
  weather:     "Fetching the latest forecast...",
  email:       "Composing your email...",
  code_runner: "Running your code...",
  image_gen:   "Generating your image...",
  translator:  "Translating...",
  news:        "Fetching latest news...",
  finance:     "Fetching market data...",
  reminder:    "Creating your event...",
};

const CARD_META: Record<string, { label: string; Icon: React.FC<{ size?: number }>; color: string }> = {
  claude:      { label: "Response",    Icon: Sparkles,    color: "hsl(270 70% 72%)" },
  search:      { label: "Web Results", Icon: SearchIcon,  color: "hsl(248 90% 70%)" },
  osint:       { label: "Research",    Icon: Globe,       color: "hsl(38 90% 60%)"  },
  local:       { label: "System Info", Icon: Monitor,     color: "hsl(142 60% 55%)" },
  video:       { label: "Video",       Icon: Film,        color: "hsl(328 80% 68%)" },
  weather:     { label: "Weather",     Icon: Cloud,       color: "hsl(200 80% 65%)" },
  email:       { label: "Email",       Icon: Mail,        color: "hsl(38 90% 60%)"  },
  code_runner: { label: "Code Output", Icon: Terminal,    color: "hsl(142 60% 55%)" },
  image_gen:   { label: "Image",       Icon: Image,       color: "hsl(310 70% 68%)" },
  translator:  { label: "Translation", Icon: Languages,   color: "hsl(185 70% 58%)" },
  news:        { label: "News",        Icon: Newspaper,   color: "hsl(25 90% 62%)"  },
  finance:     { label: "Markets",     Icon: TrendingUp,  color: "hsl(142 60% 55%)" },
  reminder:    { label: "Calendar",    Icon: CalendarPlus,color: "hsl(248 90% 70%)" },
};

const FOLLOW_UP_CHIPS: Record<string, string[]> = {
  search:      ["Summarize these results", "Make a detailed plan", "Find more"],
  claude:      ["Make this shorter", "Turn into bullet points", "Draft as email"],
  weather:     ["What should I pack?", "Best activities for this weather", "Plan around forecast"],
  email:       ["Adjust the tone", "Write a follow-up", "Make it more formal"],
  osint:       ["What are the risks?", "Write a report", "Check related domains"],
  local:       ["What does this mean?", "How can I improve this?", "Full diagnostic"],
  code_runner: ["Fix any errors", "Add more features", "Explain what this does"],
  video:       ["Generate a variation", "Write a script", "Make it longer"],
  image_gen:   ["Generate a variation", "Try a different style", "More detail"],
  translator:  ["Translate to another language", "Explain the grammar", "More formal"],
  news:        ["Summarize into a report", "What does this mean for me?", "Related news"],
  finance:     ["Should I buy or sell?", "Compare with competitors", "Show the trend"],
  reminder:    ["Add another event", "Set a follow-up", "Email myself this"],
};

const QUICK_ACTIONS = [
  {
    icon: Plane, color: "hsl(248 90% 70%)", bg: "rgba(109,95,234,0.12)",
    label: "Travel", sub: "Plan trips, find flights & hotels",
    prompt: "Plan a weekend trip to Milan — flights, hotels, and itinerary",
  },
  {
    icon: Newspaper, color: "hsl(25 90% 62%)", bg: "rgba(249,115,22,0.12)",
    label: "News", sub: "Latest headlines on any topic",
    prompt: "What's happening in AI and tech today?",
  },
  {
    icon: TrendingUp, color: "hsl(142 60% 55%)", bg: "rgba(34,197,94,0.12)",
    label: "Finance", sub: "Stocks, crypto & market data",
    prompt: "How is Bitcoin doing today?",
  },
  {
    icon: Image, color: "hsl(310 70% 68%)", bg: "rgba(192,132,252,0.12)",
    label: "Create", sub: "Generate images & videos",
    prompt: "Generate an image of a futuristic city at sunset",
  },
  {
    icon: PenLine, color: "hsl(270 70% 72%)", bg: "rgba(167,139,250,0.12)",
    label: "Write", sub: "Emails, resumes, essays & more",
    prompt: "Help me write a professional bio for LinkedIn",
  },
  {
    icon: Languages, color: "hsl(185 70% 58%)", bg: "rgba(20,184,166,0.12)",
    label: "Translate", sub: "50+ languages, free & instant",
    prompt: "Say 'I love you' in 10 different languages",
  },
  {
    icon: CalendarPlus, color: "hsl(248 90% 70%)", bg: "rgba(109,95,234,0.12)",
    label: "Schedule", sub: "Calendar events & reminders",
    prompt: "Schedule a dentist appointment for tomorrow at 10am",
  },
  {
    icon: SearchIcon, color: "hsl(200 80% 65%)", bg: "rgba(96,165,250,0.12)",
    label: "Search", sub: "Find anything on the web",
    prompt: "Find a highly-rated therapist near me who takes insurance",
  },
];

function downloadFile(content: string, worker: string) {
  const ext = worker === "code_runner" ? "py" : "md";
  const name = `portiere-${worker}-${Date.now()}.${ext}`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Pipeline step ────────────────────────────────────────────────────────
function PipelineStep({ label, status }: { label: string; status: "pending" | "active" | "done" }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-400"
        style={{
          backgroundColor: status === "done"
            ? "rgba(34,197,94,0.14)"
            : status === "active"
            ? "rgba(109,95,234,0.2)"
            : "hsl(238 18% 10%)",
          border: `1.5px solid ${status === "done"
            ? "rgba(34,197,94,0.4)"
            : status === "active"
            ? "rgba(109,95,234,0.55)"
            : "hsl(238 18% 15%)"}`,
          boxShadow: status === "active" ? "0 0 10px rgba(109,95,234,0.25)" : "none",
        }}
      >
        {status === "done"
          ? <Check size={10} style={{ color: "hsl(152 64% 52%)" }} />
          : status === "active"
          ? <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "hsl(248 90% 72%)" }} />
          : <div className="w-1 h-1 rounded-full" style={{ backgroundColor: "hsl(238 18% 30%)" }} />}
      </div>
      <span
        className="text-[10px] font-semibold tracking-wide"
        style={{
          color: status === "done"
            ? "hsl(152 64% 52%)"
            : status === "active"
            ? "hsl(248 90% 75%)"
            : "hsl(238 18% 32%)",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Activity card ────────────────────────────────────────────────────────
function ActivityCard({ activity, elapsed }: { activity: ActivityState; elapsed: number }) {
  const { message, pipeline, brainStatus, progress } = activity;
  const allDone = pipeline.length > 0 && pipeline.every(s => s.status === "done");

  return (
    <div
      className="mx-5 mt-3 mb-2 p-4 rounded-2xl animate-feed-in"
      style={{
        background: "hsl(238 18% 7%)",
        border: "1px solid hsl(238 18% 11%)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.22)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" style={{ color: "hsl(248 90% 68%)" }} />
          <span className="text-[13px] font-semibold" style={{ color: "hsl(240 20% 88%)", letterSpacing: "-0.01em" }}>
            Working on it
          </span>
        </div>
        <span className="text-[11px] tabular-nums" style={{ color: "hsl(238 18% 36%)", fontVariantNumeric: "tabular-nums" }}>
          {elapsed}s
        </span>
      </div>

      <div className="h-[3px] rounded-full mb-4 overflow-hidden" style={{ backgroundColor: "hsl(238 18% 12%)" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, hsl(248 82% 62%) 0%, hsl(264 68% 68%) 100%)",
            boxShadow: "0 0 8px rgba(109,95,234,0.5)",
          }}
        />
      </div>

      <div className="flex items-end justify-center gap-1 mb-3">
        <PipelineStep label="Brain" status={brainStatus === "done" ? "done" : "active"} />
        {pipeline.map(step => (
          <div key={step.worker} className="flex items-center gap-1">
            <div
              className="h-px w-4 transition-colors duration-500"
              style={{ backgroundColor: step.status !== "pending" ? "rgba(109,95,234,0.3)" : "hsl(238 18% 14%)" }}
            />
            <PipelineStep label={step.label} status={step.status} />
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="h-px w-4" style={{ backgroundColor: allDone ? "rgba(34,197,94,0.3)" : "hsl(238 18% 14%)" }} />
          <PipelineStep label="Done" status={allDone ? "done" : "pending"} />
        </div>
      </div>

      <p className="text-[12px] text-center" style={{ color: "hsl(238 18% 44%)" }}>{message}</p>
    </div>
  );
}

// ─── Search result cards ─────────────────────────────────────────────────
interface SearchResultItem { title: string; snippet: string; url: string; }
interface SearchData { answer?: string; abstract?: string; abstract_url?: string; results?: SearchResultItem[]; }

function SearchResultCards({ data }: { data: SearchData }) {
  const results = data.results || [];
  return (
    <div className="space-y-2">
      {data.answer && (
        <div
          className="px-4 py-3 rounded-xl mb-3"
          style={{ backgroundColor: "rgba(109,95,234,0.08)", border: "1px solid rgba(109,95,234,0.18)" }}
        >
          <p className="text-[14px] font-semibold" style={{ color: "hsl(240 20% 95%)", letterSpacing: "-0.01em" }}>{data.answer}</p>
        </div>
      )}
      {data.abstract && (
        <p className="text-[13.5px] leading-relaxed mb-3" style={{ color: "hsl(240 16% 80%)" }}>
          {data.abstract}
          {data.abstract_url && (
            <a href={data.abstract_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 ml-2 text-[12px] underline underline-offset-2"
              style={{ color: "hsl(248 90% 72%)" }}>
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
              style={{
                backgroundColor: "hsl(238 20% 6%)",
                border: "1px solid hsl(238 18% 11%)",
              }}
              onClick={!r.url ? e => e.preventDefault() : undefined}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(109,95,234,0.28)";
                (e.currentTarget as HTMLElement).style.backgroundColor = "hsl(238 18% 7%)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(238 18% 11%)";
                (e.currentTarget as HTMLElement).style.backgroundColor = "hsl(238 20% 6%)";
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-snug" style={{ color: "hsl(240 20% 93%)", letterSpacing: "-0.01em" }}>
                  {r.title || r.snippet.slice(0, 70)}
                </p>
                {r.snippet && r.snippet !== r.title && (
                  <p className="text-[12px] mt-0.5 leading-relaxed line-clamp-2" style={{ color: "hsl(238 18% 50%)" }}>
                    {r.snippet.slice(0, 180)}
                  </p>
                )}
                {r.url && (
                  <p className="text-[11px] mt-1 truncate font-mono" style={{ color: "hsl(248 90% 64%)" }}>
                    {r.url.replace(/^https?:\/\//, "").slice(0, 60)}
                  </p>
                )}
              </div>
              {r.url && <ExternalLink size={11} className="flex-shrink-0 mt-0.5 opacity-25 group-hover:opacity-55 transition-opacity" style={{ color: "hsl(248 90% 70%)" }} />}
            </a>
          ))}
        </div>
      )}
      {results.length === 0 && !data.answer && !data.abstract && (
        <p className="text-[14px]" style={{ color: "hsl(238 18% 46%)" }}>No results found. Try a different search.</p>
      )}
    </div>
  );
}

// ─── Worker result card ───────────────────────────────────────────────────
function WorkerResultCard({ event }: { event: OrchestrateEvent }) {
  const k = (event.worker || "brain").toLowerCase();
  const meta = CARD_META[k] || { label: "Result", Icon: Cpu, color: "hsl(238 18% 55%)" };
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
    <div
      className="mx-5 my-2.5 animate-feed-in"
      style={{
        borderRadius: "16px",
        overflow: "hidden",
        background: "hsl(238 18% 7%)",
        border: "1px solid hsl(238 18% 11%)",
        borderLeft: `3px solid ${meta.color}60`,
        boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid hsl(238 18% 10%)", background: "hsl(238 20% 6%)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
          >
            <meta.Icon size={13} />
          </div>
          <span className="text-[13px] font-semibold" style={{ color: "hsl(240 20% 92%)", letterSpacing: "-0.01em" }}>
            {meta.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => downloadFile(content, k)}
            className="flex items-center gap-1 text-[11px] font-medium transition-all px-2 py-1 rounded-lg"
            style={{ color: "hsl(238 18% 36%)" }}
            title="Save to file"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "hsl(238 18% 52%)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "hsl(238 18% 36%)"; }}
          >
            <Download size={11} />
          </button>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 text-[11px] font-medium transition-all px-2.5 py-1 rounded-lg"
            style={{
              color: copied ? "hsl(152 64% 52%)" : "hsl(238 18% 40%)",
              backgroundColor: copied ? "rgba(34,197,94,0.08)" : "transparent",
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
              style={{ maxHeight: "380px", border: "1px solid hsl(238 18% 13%)" }}
            />
            <p className="text-[12px]" style={{ color: "hsl(238 18% 46%)" }}>{content}</p>
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium"
              style={{ color: "hsl(248 90% 70%)" }}
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
            style={{ color: "hsl(248 90% 72%)" }}
          >
            View generated video →
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Streaming card ────────────────────────────────────────────────────────
function StreamingCard({ worker, text }: { worker: string; text: string }) {
  const k = worker.toLowerCase();
  const meta = CARD_META[k] || { label: "Working", Icon: Cpu, color: "hsl(238 18% 55%)" };
  return (
    <div
      className="mx-5 my-2.5"
      style={{
        borderRadius: "16px",
        overflow: "hidden",
        background: "hsl(238 18% 7%)",
        border: "1px solid hsl(238 18% 11%)",
        borderLeft: `3px solid ${meta.color}60`,
        boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
      }}
    >
      <div
        className="flex items-center gap-2.5 px-4 py-2.5"
        style={{ borderBottom: "1px solid hsl(238 18% 10%)", background: "hsl(238 20% 6%)" }}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>
          <meta.Icon size={13} />
        </div>
        <span className="text-[13px] font-semibold" style={{ color: "hsl(240 20% 92%)", letterSpacing: "-0.01em" }}>{meta.label}</span>
        <Loader2 size={11} className="animate-spin ml-auto" style={{ color: meta.color, opacity: 0.65 }} />
      </div>
      <div className="px-5 py-4">
        <pre className="mono-output" style={{ color: "hsl(240 16% 78% / 0.7)" }}>
          {text}<span className="cursor-blink" />
        </pre>
      </div>
    </div>
  );
}

// ─── Complete divider ──────────────────────────────────────────────────────
function CompleteRow({ elapsed }: { elapsed?: number }) {
  return (
    <div className="flex items-center gap-3 py-5 px-6 animate-feed-in">
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(238 18% 11%) 50%)" }} />
      <div
        className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full"
        style={{
          color: "hsl(152 64% 48%)",
          backgroundColor: "rgba(34,197,94,0.07)",
          border: "1px solid rgba(34,197,94,0.15)",
          letterSpacing: "0.02em",
        }}
      >
        <Check size={10} /> Done{elapsed !== undefined ? ` · ${elapsed}s` : ""}
      </div>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, hsl(238 18% 11%) 50%, transparent)" }} />
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
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

  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const feedEventsRef = useRef<OrchestrateEvent[]>([]);
  const startTimeRef = useRef<number>(0);

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

  const now = () => new Date().toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const addEntry = useCallback((event: OrchestrateEvent) => {
    feedEventsRef.current = [...feedEventsRef.current, event];
    setFeed(prev => [...prev, { id: idSeq++, event, ts: now() }]);
  }, []);

  const updateActivity = useCallback((event: OrchestrateEvent) => {
    setActivity(prev => {
      const base: ActivityState = prev || { message: "Waking up the Brain...", pipeline: [], brainStatus: "thinking", progress: 8 };
      if (event.type === "brain_thinking") return { ...base, message: "Understanding your request...", progress: Math.max(base.progress, 15) };
      if (event.type === "brain_decision") {
        const chain = (event.data as Record<string, unknown[]>)?.chain ?? [];
        const pipeline = (chain as Array<Record<string, string>>).map(s => ({
          worker: s.worker, label: WORKER_LABELS[s.worker] || s.worker, status: "pending" as const,
        }));
        return { ...base, brainStatus: "done", pipeline, message: "Planning the best approach...", progress: 28 };
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

  const submit = useCallback(() => {
    const msg = input.trim();
    if (!msg || running) return;
    setInput(""); setRunning(true); setLoadedSession(null);
    setActivity({ message: "Waking up the Brain...", pipeline: [], brainStatus: "thinking", progress: 8 });
    feedEventsRef.current = [];

    const userEv: OrchestrateEvent = { type: "user_input", content: msg };
    feedEventsRef.current.push(userEv);
    setFeed(prev => lastContext && prev.length > 0
      ? [...prev, { id: idSeq++, event: userEv, ts: now() }]
      : [{ id: idSeq++, event: userEv, ts: now() }]
    );

    const cancel = streamOrchestrate(
      msg, filePath.trim() || null, lastContext,
      (event) => {
        if (["brain_thinking", "brain_decision", "chain_step", "worker_start", "worker_thinking"].includes(event.type)) {
          updateActivity(event); return;
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
          return;
        }
        addEntry(event);
      },
      () => { setRunning(false); stopRef.current = null; setActivity(null); },
      (err) => { addEntry({ type: "error", error: err }); setRunning(false); setActivity(null); },
    );
    stopRef.current = cancel;
  }, [input, filePath, running, lastContext, addEntry, updateActivity, notifySessionSaved, setLoadedSession]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleClear = () => {
    setFeed([]); feedEventsRef.current = []; setActivity(null);
    setChunkBuffers({}); setLoadedSession(null); setLastContext(null); setLastWorker(null);
  };

  const isEmpty = feed.length === 0 && !running;
  const isComplete = !running && feed.some(e => e.event.type === "complete");

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 flex-shrink-0"
        style={{ height: "48px", borderBottom: "1px solid hsl(238 18% 8%)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold" style={{ color: "hsl(240 20% 84%)", letterSpacing: "-0.015em" }}>
            Chat
          </span>
          {!isEmpty && (
            <>
              <ChevronRight size={12} style={{ color: "hsl(238 18% 26%)" }} />
              <span className="text-[12.5px] max-w-xs truncate" style={{ color: "hsl(238 18% 42%)" }}>
                {feed.find(e => e.event.type === "user_input")?.event.content?.slice(0, 55) ?? "session"}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {running && (
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "hsl(248 90% 70%)" }}>
              <Loader2 size={11} className="animate-spin" />
              <span style={{ letterSpacing: "-0.01em" }}>{elapsed}s</span>
            </div>
          )}
          {isComplete && !running && (
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "hsl(152 64% 50%)" }}>
              <Check size={11} />
              <span style={{ letterSpacing: "-0.01em" }}>Done</span>
            </div>
          )}
          {!isEmpty && (
            <button
              onClick={handleClear}
              className="text-[12px] px-2.5 py-1 rounded-lg transition-all"
              style={{ color: "hsl(238 18% 36%)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "hsl(238 18% 52%)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "hsl(238 18% 36%)"; }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto feed-scroll">
        {isEmpty ? (
          <div className="flex flex-col items-center h-full px-6 pt-10 pb-4 overflow-y-auto feed-scroll">
            {/* Hero */}
            <div className="flex flex-col items-center text-center mb-8 animate-slide-up">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{
                  background: "linear-gradient(135deg, rgba(109,95,234,0.2) 0%, rgba(109,95,234,0.07) 100%)",
                  border: "1px solid rgba(109,95,234,0.22)",
                  boxShadow: "0 0 40px rgba(109,95,234,0.12)",
                }}
              >
                <span className="text-[26px] leading-none select-none" style={{ color: "hsl(248 90% 72%)" }}>◈</span>
              </div>
              <h1
                className="text-[26px] font-semibold mb-2"
                style={{ color: "hsl(240 20% 96%)", letterSpacing: "-0.035em", lineHeight: 1.2 }}
              >
                What can I do for you?
              </h1>
              <p className="text-[14px]" style={{ color: "hsl(238 18% 46%)", letterSpacing: "-0.01em" }}>
                Your personal AI concierge — from flights to finance, code to creativity.
              </p>
            </div>

            {/* Quick action grid */}
            <div
              className="grid gap-2.5 w-full mb-6 animate-slide-up"
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
                    <p className="text-[12.5px] font-semibold leading-snug" style={{ color: "hsl(240 20% 92%)", letterSpacing: "-0.01em" }}>
                      {action.label}
                    </p>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "hsl(238 18% 42%)" }}>
                      {action.sub}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <p
              className="text-[11px] animate-slide-up"
              style={{ color: "hsl(238 18% 28%)", letterSpacing: "0.02em", animationDelay: "0.1s" }}
            >
              ⌘K to focus · Shift+Enter for new line
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full py-4">
            {feed.map(entry => {
              const { event } = entry;

              if (event.type === "user_input") {
                return (
                  <div key={entry.id} className="flex justify-end px-5 mb-5 mt-3 animate-feed-in">
                    <div className="user-bubble px-4 py-3 text-[14px]" style={{ maxWidth: "72%" }}>
                      {event.content}
                    </div>
                  </div>
                );
              }

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
                    <Paperclip size={11} style={{ color: "hsl(238 18% 32%)" }} />
                    <span className="text-[12px]" style={{ color: "hsl(238 18% 34%)" }}>{event.content}</span>
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

      {/* Input area */}
      <div
        className="flex-shrink-0 px-5 pb-5 pt-3"
        style={{ borderTop: "1px solid hsl(238 18% 8%)" }}
      >
        {/* Context indicator */}
        {lastContext && !running && (
          <div className="flex items-center gap-2 mb-3">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{
                backgroundColor: "rgba(109,95,234,0.09)",
                border: "1px solid rgba(109,95,234,0.2)",
                color: "hsl(248 90% 72%)",
              }}
            >
              <RotateCcw size={10} /> Following up on previous result
            </div>
            <button
              onClick={() => { setLastContext(null); setLastWorker(null); }}
              className="text-[11px] px-2.5 py-1.5 rounded-full transition-colors"
              style={{ color: "hsl(238 18% 38%)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              Start fresh
            </button>
          </div>
        )}

        {/* Smart follow-up chips */}
        {isComplete && followUpChips.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {followUpChips.map(s => (
              <button
                key={s}
                onClick={() => { setInput(s); inputRef.current?.focus(); }}
                className="suggestion-chip px-3 py-1.5 rounded-full text-[12px]"
                style={{ color: "hsl(238 18% 46%)" }}
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
            style={{ backgroundColor: "hsl(238 18% 7%)", border: "1.5px solid hsl(238 18% 13%)" }}
          >
            <Paperclip size={11} style={{ color: "hsl(238 18% 38%)" }} />
            <input
              type="text"
              value={filePath}
              onChange={e => setFilePath(e.target.value)}
              placeholder="/path/to/file"
              className="flex-1 bg-transparent text-[13px] text-foreground outline-none"
              style={{ caretColor: "hsl(248 90% 70%)" }}
            />
            <button onClick={() => { setShowFilePath(false); setFilePath(""); }}>
              <X size={13} style={{ color: "hsl(238 18% 40%)" }} />
            </button>
          </div>
        )}

        {/* Command bar */}
        <div className="command-bar flex items-end gap-2 px-4 py-3">
          <button
            onClick={() => setShowFilePath(v => !v)}
            title="Attach file path"
            className="flex-shrink-0 mb-0.5 transition-all rounded-lg p-1"
            style={{ color: showFilePath || filePath ? "hsl(248 90% 70%)" : "hsl(238 18% 34%)" }}
            onMouseEnter={e => { if (!showFilePath && !filePath) (e.currentTarget as HTMLElement).style.color = "hsl(238 18% 52%)"; }}
            onMouseLeave={e => { if (!showFilePath && !filePath) (e.currentTarget as HTMLElement).style.color = "hsl(238 18% 34%)"; }}
          >
            <Paperclip size={15} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={lastContext ? "Ask a follow-up..." : "Ask me anything..."}
            disabled={running}
            rows={1}
            className="flex-1 bg-transparent text-[14px] text-foreground outline-none resize-none leading-relaxed max-h-36 overflow-y-auto disabled:opacity-40"
            style={{
              minHeight: "1.5rem",
              caretColor: "hsl(248 90% 70%)",
              letterSpacing: "-0.01em",
              color: "hsl(240 20% 92%)",
            }}
          />
          <button
            onClick={running ? () => stopRef.current?.() : submit}
            disabled={!running && !input.trim()}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed"
            style={{
              background: running
                ? "transparent"
                : "linear-gradient(135deg, hsl(248 82% 60%) 0%, hsl(264 70% 64%) 100%)",
              color: running ? "hsl(4 86% 62%)" : "white",
              border: running ? "1.5px solid hsl(4 86% 56% / 0.35)" : "none",
              boxShadow: running ? "none" : "0 2px 12px rgba(109,95,234,0.4)",
            }}
          >
            {running ? <X size={13} /> : <ArrowUp size={14} />}
          </button>
        </div>

        <p className="text-center text-[11px] mt-2" style={{ color: "hsl(238 18% 24%)", letterSpacing: "0.01em" }}>
          Portiere uses AI — always verify important results
        </p>
      </div>
    </div>
  );
}
