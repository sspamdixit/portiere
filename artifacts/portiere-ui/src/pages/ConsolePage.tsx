import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ArrowUp, Paperclip, X, Loader2,
  Film, Globe, Cpu, ChevronRight,
  Sparkles, Search as SearchIcon, Monitor, Check, Copy, RotateCcw,
  Cloud, Mail, Terminal, Download, ExternalLink,
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
};

const CARD_META: Record<string, { label: string; Icon: React.FC<{ size?: number }>; color: string }> = {
  claude:      { label: "Response",    Icon: Sparkles,    color: "hsl(270 70% 72%)" },
  search:      { label: "Web Results", Icon: SearchIcon,  color: "hsl(246 89% 70%)" },
  osint:       { label: "Research",    Icon: Globe,       color: "hsl(38 90% 60%)"  },
  local:       { label: "System Info", Icon: Monitor,     color: "hsl(142 60% 55%)" },
  video:       { label: "Video",       Icon: Film,        color: "hsl(328 80% 68%)" },
  weather:     { label: "Weather",     Icon: Cloud,       color: "hsl(200 80% 65%)" },
  email:       { label: "Email",       Icon: Mail,        color: "hsl(38 90% 60%)"  },
  code_runner: { label: "Code Output", Icon: Terminal,    color: "hsl(142 60% 55%)" },
};

const FOLLOW_UP_CHIPS: Record<string, string[]> = {
  search:      ["Summarize these results", "Make a detailed plan from this", "Find more information"],
  claude:      ["Make this shorter", "Turn into bullet points", "Draft this as an email"],
  weather:     ["What should I pack?", "Best activities for this weather", "Plan around the forecast"],
  email:       ["Adjust the tone", "Write a follow-up email", "Make it more formal"],
  osint:       ["What are the risks here?", "Write a report on this", "Check related domains"],
  local:       ["What does this mean?", "How can I improve this?", "Run a full diagnostic"],
  code_runner: ["Fix any errors", "Add more features", "Explain what this does"],
  video:       ["Generate a variation", "Write a script for this", "Make it longer"],
};

const ALL_SUGGESTIONS = [
  "Plan a weekend trip to Milan",
  "Help me write a cold pitch email",
  "Build a to-do app in Python",
  "Find a therapist near me who takes insurance",
  "What's the weather this weekend?",
  "Check my computer's performance",
  "Find flights to Barcelona next Friday",
  "Help me write my resume summary",
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
          backgroundColor: status === "done" ? "rgba(34,197,94,0.15)" : status === "active" ? "rgba(124,111,247,0.22)" : "hsl(240 20% 11%)",
          border: `1.5px solid ${status === "done" ? "rgba(34,197,94,0.45)" : status === "active" ? "rgba(124,111,247,0.6)" : "hsl(240 20% 16%)"}`,
          boxShadow: status === "active" ? "0 0 10px rgba(124,111,247,0.28)" : "none",
        }}
      >
        {status === "done"
          ? <Check size={11} style={{ color: "hsl(142 68% 50%)" }} />
          : status === "active"
          ? <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "hsl(246 89% 74%)" }} />
          : <div className="w-1 h-1 rounded-full" style={{ backgroundColor: "hsl(242 17% 32%)" }} />}
      </div>
      <span
        className="text-[10px] font-semibold tracking-wide"
        style={{
          color: status === "done" ? "hsl(142 68% 52%)" : status === "active" ? "hsl(246 89% 76%)" : "hsl(242 17% 34%)",
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
        background: "hsl(240 22% 7%)",
        border: "1px solid hsl(240 20% 12%)",
        boxShadow: "0 0 0 1px rgba(124,111,247,0.04), 0 4px 24px rgba(0,0,0,0.28)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" style={{ color: "hsl(246 89% 70%)" }} />
          <span className="text-[13px] font-semibold" style={{ color: "hsl(244 30% 88%)", letterSpacing: "-0.01em" }}>
            Working on it
          </span>
        </div>
        <span className="text-[11px] tabular-nums" style={{ color: "hsl(242 17% 38%)", fontVariantNumeric: "tabular-nums" }}>
          {elapsed}s
        </span>
      </div>
      <div className="h-[3px] rounded-full mb-4 overflow-hidden" style={{ backgroundColor: "hsl(240 20% 12%)" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, hsl(246 89% 65%) 0%, hsl(258 72% 72%) 100%)",
            boxShadow: "0 0 8px rgba(124,111,247,0.5)",
          }}
        />
      </div>
      <div className="flex items-end justify-center gap-1 mb-3">
        <PipelineStep label="Brain" status={brainStatus === "done" ? "done" : "active"} />
        {pipeline.map(step => (
          <div key={step.worker} className="flex items-center gap-1">
            <div
              className="h-px w-5 transition-colors duration-500"
              style={{ backgroundColor: step.status !== "pending" ? "rgba(124,111,247,0.35)" : "hsl(240 20% 15%)" }}
            />
            <PipelineStep label={step.label} status={step.status} />
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="h-px w-5" style={{ backgroundColor: allDone ? "rgba(34,197,94,0.35)" : "hsl(240 20% 15%)" }} />
          <PipelineStep label="Done" status={allDone ? "done" : "pending"} />
        </div>
      </div>
      <p className="text-[12px] text-center" style={{ color: "hsl(242 18% 48%)" }}>{message}</p>
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
          style={{ backgroundColor: "rgba(124,111,247,0.09)", border: "1px solid rgba(124,111,247,0.2)" }}
        >
          <p className="text-[14px] font-semibold" style={{ color: "hsl(244 30% 95%)", letterSpacing: "-0.01em" }}>{data.answer}</p>
        </div>
      )}
      {data.abstract && (
        <p className="text-[13.5px] leading-relaxed mb-3" style={{ color: "hsl(244 30% 82%)" }}>
          {data.abstract}
          {data.abstract_url && (
            <a href={data.abstract_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 ml-2 text-[12px] underline underline-offset-2"
              style={{ color: "hsl(246 89% 72%)" }}>
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
                backgroundColor: "hsl(240 24% 6%)",
                border: "1px solid hsl(240 20% 11%)",
              }}
              onClick={!r.url ? e => e.preventDefault() : undefined}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(246 89% 70% / 0.3)";
                (e.currentTarget as HTMLElement).style.backgroundColor = "hsl(240 22% 7%)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(240 20% 11%)";
                (e.currentTarget as HTMLElement).style.backgroundColor = "hsl(240 24% 6%)";
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-snug" style={{ color: "hsl(244 30% 93%)", letterSpacing: "-0.01em" }}>
                  {r.title || r.snippet.slice(0, 70)}
                </p>
                {r.snippet && r.snippet !== r.title && (
                  <p className="text-[12px] mt-0.5 leading-relaxed line-clamp-2" style={{ color: "hsl(242 18% 52%)" }}>
                    {r.snippet.slice(0, 180)}
                  </p>
                )}
                {r.url && (
                  <p className="text-[11px] mt-1 truncate font-mono" style={{ color: "hsl(246 89% 66%)" }}>
                    {r.url.replace(/^https?:\/\//, "").slice(0, 60)}
                  </p>
                )}
              </div>
              {r.url && <ExternalLink size={11} className="flex-shrink-0 mt-0.5 opacity-30 group-hover:opacity-60 transition-opacity" style={{ color: "hsl(246 89% 70%)" }} />}
            </a>
          ))}
        </div>
      )}
      {results.length === 0 && !data.answer && !data.abstract && (
        <p className="text-[14px]" style={{ color: "hsl(242 18% 48%)" }}>No results found. Try a different search.</p>
      )}
    </div>
  );
}

// ─── Worker result card ───────────────────────────────────────────────────
function WorkerResultCard({ event }: { event: OrchestrateEvent }) {
  const k = (event.worker || "brain").toLowerCase();
  const meta = CARD_META[k] || { label: "Result", Icon: Cpu, color: "hsl(242 18% 55%)" };
  const content = event.content || "";
  const data = event.data as Record<string, unknown> | undefined;
  const videoUrl = data?.video_url as string | undefined;
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
        background: "hsl(240 20% 8%)",
        borderTop: "1px solid hsl(240 20% 12%)",
        borderRight: "1px solid hsl(240 20% 12%)",
        borderBottom: "1px solid hsl(240 20% 12%)",
        borderLeft: `3px solid ${meta.color}70`,
        boxShadow: "0 2px 20px rgba(0,0,0,0.24), 0 1px 4px rgba(0,0,0,0.12)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid hsl(240 20% 11%)", background: "hsl(240 22% 7%)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
          >
            <meta.Icon size={13} />
          </div>
          <span className="text-[13px] font-semibold" style={{ color: "hsl(244 30% 92%)", letterSpacing: "-0.01em" }}>
            {meta.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => downloadFile(content, k)}
            className="flex items-center gap-1 text-[11px] font-medium transition-all px-2 py-1 rounded-lg hover:bg-white/[0.05]"
            style={{ color: "hsl(242 17% 38%)" }}
            title="Save to file"
          >
            <Download size={11} />
          </button>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 text-[11px] font-medium transition-all px-2.5 py-1 rounded-lg"
            style={{
              color: copied ? "hsl(142 68% 52%)" : "hsl(242 17% 42%)",
              backgroundColor: copied ? "rgba(34,197,94,0.08)" : "transparent",
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="px-5 py-4">
        {searchData ? (
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
            style={{ color: "hsl(246 89% 72%)" }}
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
  const meta = CARD_META[k] || { label: "Working", Icon: Cpu, color: "hsl(242 18% 55%)" };
  return (
    <div
      className="mx-5 my-2.5"
      style={{
        borderRadius: "16px",
        overflow: "hidden",
        background: "hsl(240 20% 8%)",
        borderTop: "1px solid hsl(240 20% 12%)",
        borderRight: "1px solid hsl(240 20% 12%)",
        borderBottom: "1px solid hsl(240 20% 12%)",
        borderLeft: `3px solid ${meta.color}70`,
        boxShadow: "0 2px 20px rgba(0,0,0,0.24)",
      }}
    >
      <div
        className="flex items-center gap-2.5 px-4 py-2.5"
        style={{ borderBottom: "1px solid hsl(240 20% 11%)", background: "hsl(240 22% 7%)" }}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}>
          <meta.Icon size={13} />
        </div>
        <span className="text-[13px] font-semibold" style={{ color: "hsl(244 30% 92%)", letterSpacing: "-0.01em" }}>{meta.label}</span>
        <Loader2 size={11} className="animate-spin ml-auto" style={{ color: meta.color, opacity: 0.7 }} />
      </div>
      <div className="px-5 py-4">
        <pre className="mono-output" style={{ color: "hsl(244 30% 82% / 0.75)" }}>
          {text}<span className="cursor-blink" />
        </pre>
      </div>
    </div>
  );
}

// ─── Complete divider ──────────────────────────────────────────────────────
function CompleteRow({ elapsed }: { elapsed?: number }) {
  return (
    <div className="flex items-center gap-3 py-5 px-5 animate-feed-in">
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(240 20% 12%) 50%)" }} />
      <div
        className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full"
        style={{
          color: "hsl(142 68% 48%)",
          backgroundColor: "rgba(34,197,94,0.07)",
          border: "1px solid rgba(34,197,94,0.18)",
          letterSpacing: "0.02em",
        }}
      >
        <Check size={10} /> Done{elapsed !== undefined ? ` · ${elapsed}s` : ""}
      </div>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, hsl(240 20% 12%) 50%, transparent)" }} />
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

  const suggestions = useMemo(
    () => [...ALL_SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 4),
    []
  );

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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 flex-shrink-0"
        style={{ height: "46px", borderBottom: "1px solid hsl(240 20% 9%)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold" style={{ color: "hsl(244 30% 85%)", letterSpacing: "-0.01em" }}>
            Chat
          </span>
          {!isEmpty && (
            <>
              <ChevronRight size={12} style={{ color: "hsl(242 17% 28%)" }} />
              <span className="text-[12.5px] max-w-xs truncate" style={{ color: "hsl(242 18% 46%)" }}>
                {feed.find(e => e.event.type === "user_input")?.event.content?.slice(0, 55) ?? "session"}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {running && (
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "hsl(246 89% 72%)" }}>
              <Loader2 size={11} className="animate-spin" />
              <span style={{ letterSpacing: "-0.01em" }}>Working · {elapsed}s</span>
            </div>
          )}
          {isComplete && !running && (
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "hsl(142 68% 50%)" }}>
              <Check size={11} />
              <span style={{ letterSpacing: "-0.01em" }}>Done</span>
            </div>
          )}
          {!isEmpty && (
            <button
              onClick={handleClear}
              className="text-[12px] px-2.5 py-1 rounded-lg transition-all hover:bg-white/[0.04]"
              style={{ color: "hsl(242 17% 38%)" }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto feed-scroll">
        {isEmpty ? (
          <div className="relative flex flex-col items-center justify-center h-full text-center gap-8 px-8 overflow-hidden">
            {/* Dot grid background */}
            <div
              className="absolute inset-0 pointer-events-none dot-grid"
              style={{ opacity: 0.45 }}
            />
            {/* Radial glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 52% 36% at 50% 48%, rgba(124,111,247,0.09) 0%, transparent 72%)" }}
            />
            <div className="relative flex flex-col items-center gap-5">
              {/* Icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(124,111,247,0.18) 0%, rgba(124,111,247,0.07) 100%)",
                  border: "1px solid rgba(124,111,247,0.25)",
                  boxShadow: "0 0 40px rgba(124,111,247,0.14), 0 0 0 1px rgba(255,255,255,0.03) inset",
                }}
              >
                <span className="text-[30px] leading-none select-none" style={{ color: "hsl(246 89% 74%)" }}>◈</span>
              </div>
              <div>
                <p
                  className="text-[24px] font-semibold tracking-tight"
                  style={{ color: "hsl(244 30% 96%)", letterSpacing: "-0.03em" }}
                >
                  What should Portiere do?
                </p>
                <p className="text-[14px] mt-2" style={{ color: "hsl(242 18% 50%)", letterSpacing: "-0.01em" }}>
                  Describe anything — flights, code, research, emails, planning.
                </p>
              </div>
            </div>
            {/* Suggestion chips */}
            <div className="relative flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="suggestion-chip px-4 py-2 rounded-full text-[13px]"
                  style={{
                    backgroundColor: "hsl(240 20% 8%)",
                    border: "1px solid hsl(240 20% 13%)",
                    color: "hsl(242 18% 52%)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[11px] absolute bottom-6" style={{ color: "hsl(242 17% 26%)", letterSpacing: "0.02em" }}>
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
                      backgroundColor: "hsl(347 87% 60% / 0.06)",
                      border: "1px solid hsl(347 87% 60% / 0.2)",
                      color: "hsl(347 87% 68%)",
                    }}
                  >
                    {event.error || event.content}
                  </div>
                );
              }

              if (event.type === "file_loaded") {
                return (
                  <div key={entry.id} className="flex items-center gap-2 px-6 py-1.5 animate-feed-in">
                    <Paperclip size={11} style={{ color: "hsl(242 17% 34%)" }} />
                    <span className="text-[12px]" style={{ color: "hsl(242 17% 36%)" }}>{event.content}</span>
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
        style={{ borderTop: "1px solid hsl(240 20% 9%)" }}
      >
        {/* Context indicator */}
        {lastContext && !running && (
          <div className="flex items-center gap-2 mb-3">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{
                backgroundColor: "rgba(124,111,247,0.1)",
                border: "1px solid rgba(124,111,247,0.22)",
                color: "hsl(246 89% 74%)",
              }}
            >
              <RotateCcw size={10} /> Following up on previous result
            </div>
            <button
              onClick={() => { setLastContext(null); setLastWorker(null); }}
              className="text-[11px] px-2.5 py-1.5 rounded-full transition-colors hover:bg-white/[0.04]"
              style={{ color: "hsl(242 17% 40%)" }}
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
                style={{
                  backgroundColor: "hsl(240 20% 8%)",
                  border: "1px solid hsl(240 20% 13%)",
                  color: "hsl(242 18% 50%)",
                }}
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
            style={{ backgroundColor: "hsl(240 22% 7%)", border: "1.5px solid hsl(240 20% 13%)" }}
          >
            <Paperclip size={11} style={{ color: "hsl(242 17% 40%)" }} />
            <input
              type="text"
              value={filePath}
              onChange={e => setFilePath(e.target.value)}
              placeholder="/path/to/file"
              className="flex-1 bg-transparent text-[13px] text-foreground outline-none"
              style={{ caretColor: "hsl(246 89% 70%)" }}
            />
            <button onClick={() => { setShowFilePath(false); setFilePath(""); }}>
              <X size={13} style={{ color: "hsl(242 17% 42%)" }} />
            </button>
          </div>
        )}

        {/* Command bar */}
        <div className="command-bar flex items-end gap-2 px-4 py-3">
          <button
            onClick={() => setShowFilePath(v => !v)}
            title="Attach file path"
            className="flex-shrink-0 mb-0.5 transition-all rounded-lg p-0.5 hover:bg-white/[0.05]"
            style={{ color: showFilePath || filePath ? "hsl(246 89% 72%)" : "hsl(242 17% 36%)" }}
          >
            <Paperclip size={15} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={lastContext ? "Ask a follow-up question..." : "What should Portiere do next?"}
            disabled={running}
            rows={1}
            className="flex-1 bg-transparent text-[14px] text-foreground outline-none resize-none leading-relaxed max-h-36 overflow-y-auto disabled:opacity-40"
            style={{
              minHeight: "1.5rem",
              caretColor: "hsl(246 89% 70%)",
              letterSpacing: "-0.01em",
            }}
          />
          <button
            onClick={running ? () => stopRef.current?.() : submit}
            disabled={!running && !input.trim()}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed"
            style={{
              background: running
                ? "transparent"
                : "linear-gradient(135deg, hsl(246 89% 64%) 0%, hsl(258 72% 68%) 100%)",
              color: running ? "hsl(347 87% 65%)" : "white",
              border: running ? "1.5px solid hsl(347 87% 60% / 0.35)" : "none",
              boxShadow: running ? "none" : "0 2px 12px rgba(124,111,247,0.4)",
            }}
          >
            {running ? <X size={13} /> : <ArrowUp size={14} />}
          </button>
        </div>

        <p className="text-center text-[11px] mt-2" style={{ color: "hsl(242 17% 27%)", letterSpacing: "0.01em" }}>
          Portiere uses AI — always verify important results
        </p>
      </div>
    </div>
  );
}
