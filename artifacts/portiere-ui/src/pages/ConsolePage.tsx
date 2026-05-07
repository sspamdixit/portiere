import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ArrowUp, Paperclip, X, Loader2, Brain,
  Film, Globe, HardDrive, Cpu, ChevronRight,
  Sparkles, Search as SearchIcon, Monitor, Check, Copy,
} from "lucide-react";
import { streamOrchestrate, type OrchestrateEvent } from "@/lib/api";
import { saveSession } from "@/lib/sessions";
import { useSession } from "@/lib/SessionContext";

interface FeedEntry { id: number; event: OrchestrateEvent & { _elapsed?: number }; ts: string; }

interface ActivityState {
  message: string;
  pipeline: Array<{ worker: string; label: string; status: "pending" | "active" | "done" }>;
  brainStatus: "thinking" | "done";
  progress: number;
}

const WORKER_LABELS: Record<string, string> = {
  brain: "Brain", claude: "Writing", search: "Searching",
  osint: "Research", local: "System", video: "Video",
};

const WORKER_MESSAGES: Record<string, string> = {
  claude: "Writing a response for you...",
  search: "Searching the web...",
  osint:  "Scanning and researching...",
  local:  "Checking your system...",
  video:  "Generating your video...",
};

const CARD_META: Record<string, { label: string; Icon: React.FC<{ size?: number }>; color: string }> = {
  claude: { label: "Response",    Icon: Sparkles,    color: "hsl(270 70% 72%)" },
  search: { label: "Web Results", Icon: SearchIcon,  color: "hsl(246 89% 70%)" },
  osint:  { label: "Research",    Icon: Globe,       color: "hsl(38 90% 60%)"  },
  local:  { label: "System Info", Icon: Monitor,     color: "hsl(142 60% 55%)" },
  video:  { label: "Video",       Icon: Film,        color: "hsl(328 80% 68%)" },
};

const ALL_SUGGESTIONS = [
  "Plan a weekend trip to Milan",
  "Help me write a cold pitch email",
  "Build a to-do app in Python",
  "Find a therapist near Brooklyn who takes insurance",
  "What's trending in AI today?",
  "Check my computer's performance",
  "Find flights to Barcelona next Friday",
  "Help me write my resume summary",
];

// ─── Pipeline step indicator ────────────────────────────────────────────────
function PipelineStep({ label, status }: { label: string; status: "pending" | "active" | "done" }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          backgroundColor:
            status === "done"   ? "rgba(34,197,94,0.14)"   :
            status === "active" ? "rgba(124,111,247,0.2)"  :
            "hsl(240 18% 12%)",
          border: `1.5px solid ${
            status === "done"   ? "rgba(34,197,94,0.4)"   :
            status === "active" ? "rgba(124,111,247,0.55)" :
            "hsl(240 24% 18%)"
          }`,
          boxShadow: status === "active" ? "0 0 10px rgba(124,111,247,0.3)" : "none",
        }}
      >
        {status === "done" ? (
          <Check size={12} style={{ color: "hsl(142 71% 45%)" }} />
        ) : status === "active" ? (
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "hsl(246 89% 72%)" }} />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "hsl(242 17% 32%)" }} />
        )}
      </div>
      <span
        className="text-[10px] font-semibold tracking-wide"
        style={{
          color:
            status === "done"   ? "hsl(142 71% 50%)"  :
            status === "active" ? "hsl(246 89% 74%)"  :
            "hsl(242 17% 36%)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Progress / activity card ────────────────────────────────────────────────
function ActivityCard({ activity, elapsed }: { activity: ActivityState; elapsed: number }) {
  const { message, pipeline, brainStatus, progress } = activity;
  const allDone = pipeline.length > 0 && pipeline.every(s => s.status === "done");

  return (
    <div
      className="mx-5 mt-4 mb-2 p-4 rounded-2xl animate-feed-in"
      style={{
        backgroundColor: "hsl(240 20% 8%)",
        border: "1px solid hsl(240 24% 14%)",
        boxShadow: "0 0 0 1px rgba(124,111,247,0.05), 0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 size={13} className="animate-spin" style={{ color: "hsl(246 89% 70%)" }} />
          <span className="text-[13px] font-semibold text-foreground">Portiere is working</span>
        </div>
        <span
          className="text-[12px] tabular-nums font-medium"
          style={{ color: "hsl(242 17% 40%)" }}
        >
          {elapsed}s
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-1 rounded-full mb-4 overflow-hidden"
        style={{ backgroundColor: "hsl(240 24% 13%)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, hsl(246 89% 65%) 0%, hsl(258 75% 72%) 100%)",
            boxShadow: "0 0 8px rgba(124,111,247,0.45)",
          }}
        />
      </div>

      {/* Pipeline steps */}
      <div className="flex items-end justify-center gap-1 mb-3">
        <PipelineStep label="Brain" status={brainStatus === "done" ? "done" : "active"} />
        {pipeline.map((step, i) => (
          <div key={step.worker} className="flex items-center gap-1">
            <div
              className="h-px w-6 transition-colors duration-500"
              style={{
                backgroundColor:
                  step.status !== "pending" ? "rgba(124,111,247,0.35)" : "hsl(240 24% 16%)",
              }}
            />
            <PipelineStep label={step.label} status={step.status} />
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div
            className="h-px w-6 transition-colors duration-500"
            style={{ backgroundColor: allDone ? "rgba(34,197,94,0.3)" : "hsl(240 24% 16%)" }}
          />
          <PipelineStep label="Done" status={allDone ? "done" : "pending"} />
        </div>
      </div>

      {/* Status text */}
      <p className="text-[12px] text-center" style={{ color: "hsl(242 18% 52%)" }}>
        {message}
      </p>
    </div>
  );
}

// ─── Worker result card ────────────────────────────────────────────────────
function WorkerResultCard({ event }: { event: OrchestrateEvent }) {
  const k = (event.worker || "brain").toLowerCase();
  const meta = CARD_META[k] || { label: "Result", Icon: Cpu, color: "hsl(242 18% 55%)" };
  const content = event.content || "";
  const videoUrl = (event.data as Record<string, unknown>)?.video_url as string | undefined;
  const isCode = content.includes("```") ||
    (content.split("\n").some(l => l.startsWith("    ") || l.startsWith("\t")) && content.split("\n").length > 4);

  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="mx-5 my-2.5 rounded-2xl overflow-hidden animate-feed-in"
      style={{
        backgroundColor: "hsl(240 18% 9%)",
        border: "1px solid hsl(240 24% 13%)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid hsl(240 24% 12%)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
          >
            <meta.Icon size={13} />
          </div>
          <span className="text-[13px] font-semibold text-foreground">{meta.label}</span>
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[11px] font-medium transition-all px-2 py-1 rounded-md"
          style={{
            color: copied ? "hsl(142 71% 50%)" : "hsl(242 17% 40%)",
            backgroundColor: copied ? "rgba(34,197,94,0.07)" : "transparent",
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {isCode ? (
          <pre
            className="mono-output whitespace-pre-wrap break-words"
            style={{ color: "hsl(244 100% 97% / 0.82)", fontSize: "13px", lineHeight: "1.7" }}
          >
            {content}
          </pre>
        ) : (
          <p
            className="whitespace-pre-wrap break-words leading-relaxed"
            style={{ color: "hsl(244 100% 97% / 0.82)", fontSize: "14px" }}
          >
            {content}
          </p>
        )}
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-medium"
            style={{ color: "hsl(246 89% 72%)" }}
          >
            View generated video →
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Streaming card ───────────────────────────────────────────────────────
function StreamingCard({ worker, text }: { worker: string; text: string }) {
  const k = worker.toLowerCase();
  const meta = CARD_META[k] || { label: "Working", Icon: Cpu, color: "hsl(242 18% 55%)" };
  return (
    <div
      className="mx-5 my-2.5 rounded-2xl overflow-hidden"
      style={{ backgroundColor: "hsl(240 18% 9%)", border: "1px solid hsl(240 24% 13%)" }}
    >
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderBottom: "1px solid hsl(240 24% 12%)" }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
        >
          <meta.Icon size={13} />
        </div>
        <span className="text-[13px] font-semibold text-foreground">{meta.label}</span>
        <Loader2 size={11} className="animate-spin ml-0.5" style={{ color: meta.color }} />
      </div>
      <div className="px-5 py-4">
        <pre
          className="mono-output whitespace-pre-wrap break-words"
          style={{ color: "hsl(244 100% 97% / 0.72)", fontSize: "13px", lineHeight: "1.7" }}
        >
          {text}
          <span className="cursor-blink" />
        </pre>
      </div>
    </div>
  );
}

// ─── Complete row ─────────────────────────────────────────────────────────
function CompleteRow({ elapsed }: { elapsed?: number }) {
  return (
    <div className="flex items-center gap-3 py-5 px-5 animate-feed-in">
      <div
        className="flex-1 h-px"
        style={{ background: "linear-gradient(90deg, transparent, hsl(240 24% 14%) 40%)" }}
      />
      <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide" style={{ color: "hsl(142 71% 45%)" }}>
        <Check size={11} />
        Done{elapsed !== undefined ? ` · ${elapsed}s` : ""}
      </div>
      <div
        className="flex-1 h-px"
        style={{ background: "linear-gradient(90deg, hsl(240 24% 14%) 60%, transparent)" }}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
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

  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const feedEventsRef = useRef<OrchestrateEvent[]>([]);
  const startTimeRef = useRef<number>(0);

  const suggestions = useMemo(
    () => [...ALL_SUGGESTIONS].sort(() => Math.random() - 0.5).slice(0, 4),
    []
  );

  // Load session from sidebar click
  useEffect(() => {
    if (loadedSession) {
      feedEventsRef.current = loadedSession.events;
      setFeed(loadedSession.events.map(e => ({ id: idSeq++, event: e, ts: "—" })));
      setActivity(null);
      setChunkBuffers({});
      setRunning(false);
    }
  }, [loadedSession]);

  // Elapsed timer while running
  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now();
      const t = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      return () => clearInterval(t);
    } else {
      setElapsed(0);
    }
  }, [running]);

  // Auto-scroll
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [feed, chunkBuffers, activity]);

  const now = () =>
    new Date().toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const addEntry = useCallback((event: OrchestrateEvent) => {
    feedEventsRef.current = [...feedEventsRef.current, event];
    setFeed(prev => [...prev, { id: idSeq++, event, ts: now() }]);
  }, []);

  const updateActivity = useCallback((event: OrchestrateEvent) => {
    setActivity(prev => {
      const base: ActivityState = prev || {
        message: "Waking up the Brain...",
        pipeline: [],
        brainStatus: "thinking",
        progress: 8,
      };

      if (event.type === "brain_thinking") {
        return { ...base, message: "Understanding your request...", progress: Math.max(base.progress, 15) };
      }

      if (event.type === "brain_decision") {
        const chain = (event.data as Record<string, unknown[]>)?.chain ?? [];
        const pipeline = (chain as Array<Record<string, string>>).map(s => ({
          worker: s.worker,
          label: WORKER_LABELS[s.worker] || s.worker,
          status: "pending" as const,
        }));
        return { ...base, brainStatus: "done", pipeline, message: "Planning the best approach...", progress: 28 };
      }

      if (event.type === "worker_start") {
        const w = (event.worker || "").toLowerCase();
        const pipeline = base.pipeline.map(s => s.worker === w ? { ...s, status: "active" as const } : s);
        const doneCount = pipeline.filter(s => s.status === "done").length;
        const progress = 28 + (doneCount / Math.max(1, pipeline.length)) * 62;
        return { ...base, pipeline, message: WORKER_MESSAGES[w] || "Working on it...", progress };
      }

      if (event.type === "worker_thinking") {
        return { ...base, message: event.content || base.message };
      }

      return base;
    });
  }, []);

  const submit = useCallback(() => {
    const msg = input.trim();
    if (!msg || running) return;
    setInput("");
    setRunning(true);
    setLoadedSession(null);
    setActivity({ message: "Waking up the Brain...", pipeline: [], brainStatus: "thinking", progress: 8 });
    feedEventsRef.current = [];

    const userEv: OrchestrateEvent = { type: "user_input", content: msg };
    feedEventsRef.current.push(userEv);
    setFeed([{ id: idSeq++, event: userEv, ts: now() }]);

    const cancel = streamOrchestrate(
      msg,
      filePath.trim() || null,
      (event) => {
        // Brain and routing events → activity card only
        if (["brain_thinking", "brain_decision", "chain_step", "worker_start", "worker_thinking"].includes(event.type)) {
          updateActivity(event);
          return;
        }

        // Streaming chunks → buffer
        if (event.type === "worker_chunk") {
          const key = event.worker || "unknown";
          setChunkBuffers(prev => ({ ...prev, [key]: (prev[key] || "") + (event.content || "") }));
          return;
        }

        // Worker done → mark pipeline step, clear buffer, show result card
        if (event.type === "worker_done") {
          if (event.worker) {
            setChunkBuffers(prev => { const u = { ...prev }; delete u[event.worker!]; return u; });
            setActivity(prev => {
              if (!prev) return prev;
              const pipeline = prev.pipeline.map(s =>
                s.worker === event.worker ? { ...s, status: "done" as const } : s
              );
              const doneCount = pipeline.filter(s => s.status === "done").length;
              const progress = 28 + (doneCount / Math.max(1, pipeline.length)) * 62;
              return { ...prev, pipeline, progress, message: "Finalizing..." };
            });
          }
          addEntry(event);
          return;
        }

        // Complete → save session, hide activity card
        if (event.type === "complete") {
          const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
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
  }, [input, filePath, running, addEntry, updateActivity, notifySessionSaved, setLoadedSession]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
    if (e.key === "l" && e.ctrlKey) { e.preventDefault(); handleClear(); }
  };

  const handleClear = () => {
    setFeed([]); feedEventsRef.current = [];
    setActivity(null); setChunkBuffers({});
    setLoadedSession(null);
  };

  const isEmpty = feed.length === 0 && !running;
  const isComplete = !running && feed.some(e => e.event.type === "complete");

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 flex-shrink-0"
        style={{ height: "48px", borderBottom: "1px solid hsl(240 24% 12%)" }}
      >
        <div className="flex items-center gap-2 text-[14px]">
          <span className="font-medium text-foreground">Chat</span>
          {!isEmpty && (
            <>
              <ChevronRight size={13} style={{ color: "hsl(242 17% 30%)" }} />
              <span className="text-[13px] max-w-xs truncate" style={{ color: "hsl(242 18% 52%)" }}>
                {feed.find(e => e.event.type === "user_input")?.event.content?.slice(0, 50) ?? "session"}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {running && (
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "hsl(246 89% 72%)" }}>
              <Loader2 size={12} className="animate-spin" />
              Working · {elapsed}s
            </div>
          )}
          {isComplete && (
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "hsl(142 71% 48%)" }}>
              <Check size={11} />
              Done
            </div>
          )}
          {!isEmpty && (
            <button
              onClick={handleClear}
              className="text-[12px] px-2.5 py-1 rounded-lg transition-all hover:bg-white/[0.04]"
              style={{ color: "hsl(242 17% 40%)" }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto feed-scroll">
        {isEmpty ? (
          /* ── Empty state ── */
          <div className="relative flex flex-col items-center justify-center h-full text-center gap-7 px-8 overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 55% 38% at 50% 48%, rgba(124,111,247,0.07) 0%, transparent 72%)" }}
            />
            <div className="relative flex flex-col items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(124,111,247,0.18) 0%, rgba(124,111,247,0.06) 100%)",
                  border: "1px solid rgba(124,111,247,0.22)",
                  boxShadow: "0 0 28px rgba(124,111,247,0.12)",
                }}
              >
                <span className="text-[26px] leading-none" style={{ color: "hsl(246 89% 72%)" }}>◈</span>
              </div>
              <div>
                <p className="text-[22px] font-semibold text-foreground tracking-tight">
                  What should Portiere do?
                </p>
                <p className="text-[14px] mt-1.5" style={{ color: "hsl(242 18% 52%)" }}>
                  Describe anything — flights, code, research, emails, planning.
                </p>
              </div>
            </div>
            <div className="relative flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="suggestion-chip px-4 py-2 rounded-full text-[13px]"
                  style={{
                    backgroundColor: "hsl(240 18% 9%)",
                    border: "1px solid hsl(240 24% 14%)",
                    color: "hsl(242 18% 55%)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Feed entries ── */
          <div className="max-w-3xl mx-auto w-full py-5">
            {feed.map(entry => {
              const { event } = entry;

              if (event.type === "user_input") {
                return (
                  <div key={entry.id} className="flex flex-col items-end px-5 mb-6 mt-4 animate-feed-in">
                    <span
                      className="text-[10px] uppercase tracking-widest font-semibold mb-1.5"
                      style={{ color: "hsl(242 17% 34%)" }}
                    >
                      You
                    </span>
                    <p
                      className="text-[15px] font-medium leading-relaxed text-right"
                      style={{ color: "hsl(244 100% 97%)", maxWidth: "68%" }}
                    >
                      {event.content}
                    </p>
                  </div>
                );
              }

              if (event.type === "worker_done") {
                return <WorkerResultCard key={entry.id} event={event} />;
              }

              if (event.type === "complete") {
                return <CompleteRow key={entry.id} elapsed={(event as OrchestrateEvent & { _elapsed?: number })._elapsed} />;
              }

              if (event.type === "error" || event.type === "worker_error") {
                return (
                  <div
                    key={entry.id}
                    className="mx-5 my-2 p-4 rounded-2xl text-[13px] text-destructive animate-feed-in"
                    style={{ backgroundColor: "hsl(347 87% 60% / 0.06)", border: "1px solid hsl(347 87% 60% / 0.18)" }}
                  >
                    {event.error || event.content}
                  </div>
                );
              }

              if (event.type === "file_loaded") {
                return (
                  <div key={entry.id} className="flex items-center gap-2 px-6 py-1 animate-feed-in">
                    <Paperclip size={11} style={{ color: "hsl(242 17% 36%)" }} />
                    <span className="text-[12px]" style={{ color: "hsl(242 17% 36%)" }}>{event.content}</span>
                  </div>
                );
              }

              return null;
            })}

            {/* Streaming buffers */}
            {Object.entries(chunkBuffers).map(([worker, text]) =>
              text ? <StreamingCard key={worker} worker={worker} text={text} /> : null
            )}

            {/* Activity / progress card */}
            {activity && running && (
              <ActivityCard activity={activity} elapsed={elapsed} />
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div
        className="flex-shrink-0 px-5 pb-5 pt-3"
        style={{ borderTop: "1px solid hsl(240 24% 12%)" }}
      >
        {/* Post-completion suggestion chips */}
        {isComplete && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {suggestions.slice(0, 3).map(s => (
              <button
                key={s}
                onClick={() => { setInput(s); inputRef.current?.focus(); }}
                className="suggestion-chip px-3 py-1.5 rounded-full text-[12px]"
                style={{
                  backgroundColor: "hsl(240 18% 9%)",
                  border: "1px solid hsl(240 24% 14%)",
                  color: "hsl(242 18% 52%)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* File path row */}
        {showFilePath && (
          <div
            className="flex items-center gap-2 mb-2 px-4 py-2 rounded-xl"
            style={{ backgroundColor: "hsl(240 17% 8%)", border: "1px solid hsl(240 24% 14%)" }}
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
              <X size={13} style={{ color: "hsl(242 17% 40%)" }} />
            </button>
          </div>
        )}

        {/* Command bar */}
        <div className="command-bar flex items-end gap-2 px-4 py-3">
          <button
            onClick={() => setShowFilePath(v => !v)}
            title="Attach file path"
            className="flex-shrink-0 mb-0.5 transition-opacity hover:opacity-70"
            style={{ color: showFilePath || filePath ? "hsl(246 89% 70%)" : "hsl(242 17% 38%)" }}
          >
            <Paperclip size={15} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What should Portiere do next?"
            disabled={running}
            rows={1}
            className="flex-1 bg-transparent text-[14px] text-foreground outline-none resize-none leading-relaxed max-h-36 overflow-y-auto disabled:opacity-40"
            style={{ minHeight: "1.5rem", caretColor: "hsl(246 89% 70%)" }}
          />
          <button
            onClick={running ? () => stopRef.current?.() : submit}
            disabled={!running && !input.trim()}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            style={{
              background: running
                ? "transparent"
                : "linear-gradient(135deg, hsl(246 89% 68%) 0%, hsl(258 75% 72%) 100%)",
              color: running ? "hsl(347 87% 65%)" : "white",
              border: running ? "1px solid hsl(347 87% 60% / 0.35)" : "none",
              boxShadow: running ? "none" : "0 2px 8px rgba(124,111,247,0.35)",
            }}
          >
            {running ? <X size={14} /> : <ArrowUp size={14} />}
          </button>
        </div>

        <p
          className="text-center text-[11px] mt-2.5 tracking-wide"
          style={{ color: "hsl(242 17% 30%)" }}
        >
          Portiere uses AI — always verify important results
        </p>
      </div>
    </div>
  );
}
