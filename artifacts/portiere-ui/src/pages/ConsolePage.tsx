import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Paperclip, X, Loader2, Brain, Zap, Film, Globe, HardDrive, Cpu, ChevronRight } from "lucide-react";
import { streamOrchestrate, type OrchestrateEvent } from "@/lib/api";

interface FeedEntry {
  id: number;
  event: OrchestrateEvent;
  ts: string;
}

const workerMeta: Record<string, { icon: React.FC<{ size?: number; className?: string }>, cssClass: string, label: string }> = {
  brain:  { icon: Brain,     cssClass: "worker-brain",  label: "Brain"  },
  claude: { icon: Zap,       cssClass: "worker-claude", label: "Claude" },
  video:  { icon: Film,      cssClass: "worker-video",  label: "Video"  },
  local:  { icon: HardDrive, cssClass: "worker-local",  label: "Local"  },
  osint:  { icon: Globe,     cssClass: "worker-osint",  label: "OSINT"  },
};

function WorkerBadge({ worker }: { worker?: string }) {
  const k = (worker || "system").toLowerCase();
  const meta = workerMeta[k] || { icon: Cpu, cssClass: "worker-system", label: (worker || "System") };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium ${meta.cssClass}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

function FeedEventRow({ entry }: { entry: FeedEntry }) {
  const { event, ts } = entry;
  const t = event.type;
  const dim = "hsl(242 17% 36%)";
  const muted = "hsl(242 18% 61%)";

  if (t === "brain_thinking") {
    return (
      <div className="flex items-center gap-2 py-1 px-2">
        <Brain size={12} style={{ color: dim, flexShrink: 0 }} />
        <span className="text-[12px] italic" style={{ color: dim }}>{event.content}</span>
      </div>
    );
  }

  if (t === "brain_decision") {
    return (
      <div className="flex items-center gap-2 py-1 px-2">
        <ChevronRight size={12} style={{ color: muted, flexShrink: 0 }} />
        <span className="text-[13px]" style={{ color: muted }}>{event.content}</span>
      </div>
    );
  }

  if (t === "chain_step") {
    return (
      <div className="flex items-center gap-2 py-0.5 px-2">
        <span className="text-[11px]" style={{ color: dim }}>{event.content}</span>
      </div>
    );
  }

  if (t === "worker_start") {
    return (
      <div className="flex items-center gap-2 py-1 px-2">
        <WorkerBadge worker={event.worker} />
        <span className="text-[13px]" style={{ color: muted }}>{event.content}</span>
      </div>
    );
  }

  if (t === "worker_thinking") {
    return (
      <div className="flex items-center gap-2 py-0.5 px-2">
        <span className="text-[12px] italic" style={{ color: dim }}>{event.content}</span>
      </div>
    );
  }

  if (t === "worker_chunk") return null;

  if (t === "worker_done") {
    return (
      <div className="flex flex-col gap-2 py-2 px-2 mt-1">
        <div className="flex items-center justify-between">
          <WorkerBadge worker={event.worker} />
          <span className="text-[11px]" style={{ color: dim }}>{ts}</span>
        </div>
        {event.content && (
          <div
            className="rounded-xl p-4 mono-output"
            style={{
              backgroundColor: "hsl(240 18% 9%)",
              border: "1px solid hsl(240 24% 14%)",
              color: "hsl(244 100% 97% / 0.85)",
            }}
          >
            {event.content}
          </div>
        )}
        {(event.data as Record<string,unknown>)?.video_url && (
          <a
            href={(event.data as Record<string,unknown>).video_url as string}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] text-primary underline underline-offset-2 px-1"
          >
            View generated video →
          </a>
        )}
      </div>
    );
  }

  if (t === "worker_error" || t === "brain_error") {
    return (
      <div className="flex items-start gap-2 py-1.5 px-2 rounded-lg" style={{ backgroundColor: "hsl(347 87% 60% / 0.06)" }}>
        <WorkerBadge worker={event.worker || "system"} />
        <span className="text-[13px] text-destructive">{event.error}</span>
      </div>
    );
  }

  if (t === "complete") {
    return (
      <div className="flex items-center gap-3 py-3 px-2 my-2">
        <div className="flex-1 h-px" style={{ backgroundColor: "hsl(240 24% 14%)" }} />
        <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "hsl(142 71% 45%)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          Complete
        </div>
        <div className="flex-1 h-px" style={{ backgroundColor: "hsl(240 24% 14%)" }} />
      </div>
    );
  }

  if (t === "error") {
    return (
      <div className="py-1.5 px-2 rounded-lg text-destructive text-[13px]" style={{ backgroundColor: "hsl(347 87% 60% / 0.06)" }}>
        {event.error}
      </div>
    );
  }

  if (t === "file_loaded") {
    return (
      <div className="flex items-center gap-2 py-0.5 px-2">
        <Paperclip size={11} style={{ color: dim }} />
        <span className="text-[12px]" style={{ color: dim }}>{event.content}</span>
      </div>
    );
  }

  return null;
}

let idSeq = 0;

const SUGGESTIONS = [
  "Check my CPU and memory usage",
  "Look up info about example.com",
  "Write a Python merge sort function",
  "Scan the digital footprint of openai.com",
];

export default function ConsolePage() {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [chunkBuffers, setChunkBuffers] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const [filePath, setFilePath] = useState("");
  const [showFilePath, setShowFilePath] = useState(false);
  const [running, setRunning] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const now = () =>
    new Date().toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const addEntry = useCallback((event: OrchestrateEvent) => {
    setFeed(prev => [...prev, { id: idSeq++, event, ts: now() }]);
  }, []);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [feed, chunkBuffers]);

  const submit = useCallback(() => {
    const msg = input.trim();
    if (!msg || running) return;
    setInput("");
    setRunning(true);
    setChunkBuffers({});
    addEntry({ type: "user_input", content: msg });

    const cancel = streamOrchestrate(
      msg,
      filePath.trim() || null,
      (event) => {
        if (event.type === "worker_chunk") {
          const key = event.worker || "unknown";
          setChunkBuffers(prev => ({ ...prev, [key]: (prev[key] || "") + (event.content || "") }));
        } else {
          if (event.type === "worker_done" && event.worker) {
            setChunkBuffers(prev => { const u = { ...prev }; delete u[event.worker!]; return u; });
          }
          addEntry(event);
        }
      },
      () => { setRunning(false); stopRef.current = null; },
      (err) => { addEntry({ type: "error", error: err }); setRunning(false); },
    );
    stopRef.current = cancel;
  }, [input, filePath, running, addEntry]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
    if (e.key === "l" && e.ctrlKey) { e.preventDefault(); setFeed([]); }
  };

  const isEmpty = feed.length === 0;
  const isComplete = !running && feed.some(e => e.event.type === "complete");

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 flex-shrink-0"
        style={{ height: "48px", borderBottom: "1px solid hsl(240 24% 14%)" }}
      >
        <div className="flex items-center gap-2 text-[14px]">
          <span className="text-foreground">Chat</span>
          {!isEmpty && (
            <>
              <ChevronRight size={14} style={{ color: "hsl(242 17% 36%)" }} />
              <span style={{ color: "hsl(242 18% 61%)" }}>
                {feed.find(e => e.event.type === "user_input")?.event.content?.slice(0, 40) ?? "session"}
                {(feed.find(e => e.event.type === "user_input")?.event.content?.length ?? 0) > 40 ? "…" : ""}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {running && (
            <div className="flex items-center gap-1.5" style={{ color: "hsl(246 89% 70%)" }}>
              <Loader2 size={13} className="animate-spin" />
              <span className="text-[12px]">Running</span>
            </div>
          )}
          {isComplete && (
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "hsl(142 71% 45%)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
              Complete
            </div>
          )}
          {!isEmpty && (
            <button
              onClick={() => { setFeed([]); setChunkBuffers({}); }}
              className="text-[12px] transition-colors px-2 py-1 rounded-md"
              style={{ color: "hsl(242 17% 36%)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "hsl(244 100% 97%)")}
              onMouseLeave={e => (e.currentTarget.style.color = "hsl(242 17% 36%)")}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto feed-scroll">
        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 px-8">
            <div>
              <p className="text-[22px] font-semibold text-foreground tracking-tight">What should Portiere do?</p>
              <p className="text-[14px] mt-2" style={{ color: "hsl(242 18% 61%)" }}>
                Send a command and the Brain will route it to the right worker.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="suggestion-chip px-4 py-2 rounded-full text-[13px] transition-all"
                  style={{
                    backgroundColor: "hsl(240 18% 9%)",
                    border: "1px solid hsl(240 24% 14%)",
                    color: "hsl(242 18% 61%)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full px-6 py-6 flex flex-col gap-1">
            {feed.map(entry => {
              if (entry.event.type === "user_input") {
                return (
                  <div key={entry.id} className="flex flex-col items-end w-full gap-1 mb-4 mt-2">
                    <span className="text-[11px]" style={{ color: "hsl(242 17% 36%)" }}>You</span>
                    <p className="text-[15px] text-foreground leading-relaxed text-right max-w-[65%]">
                      {entry.event.content}
                    </p>
                  </div>
                );
              }
              return <FeedEventRow key={entry.id} entry={entry} />;
            })}

            {/* Active streaming buffers */}
            {Object.entries(chunkBuffers).map(([worker, text]) =>
              text ? (
                <div key={worker} className="flex flex-col gap-2 py-2 px-2 mt-1">
                  <div className="flex items-center gap-2">
                    <WorkerBadge worker={worker} />
                    <Loader2 size={12} className="animate-spin" style={{ color: "hsl(242 17% 36%)" }} />
                  </div>
                  <div
                    className="rounded-xl p-4 mono-output"
                    style={{
                      backgroundColor: "hsl(240 18% 9%)",
                      border: "1px solid hsl(240 24% 14%)",
                      color: "hsl(244 100% 97% / 0.8)",
                    }}
                  >
                    {text}<span className="cursor-blink" />
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-6 pb-5 pt-3" style={{ borderTop: "1px solid hsl(240 24% 14%)" }}>
        {/* Suggestion chips (after a run completes) */}
        {isComplete && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {SUGGESTIONS.slice(0, 3).map(s => (
              <button
                key={s}
                onClick={() => { setInput(s); inputRef.current?.focus(); }}
                className="suggestion-chip px-3 py-1.5 rounded-full text-[12px]"
                style={{
                  backgroundColor: "hsl(240 18% 9%)",
                  border: "1px solid hsl(240 24% 14%)",
                  color: "hsl(242 18% 61%)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* File path row */}
        {showFilePath && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-[11px]" style={{ color: "hsl(242 17% 36%)" }}>File:</span>
            <input
              type="text"
              value={filePath}
              onChange={e => setFilePath(e.target.value)}
              placeholder="/path/to/file"
              className="flex-1 bg-transparent text-[13px] text-foreground outline-none"
              style={{ color: "hsl(244 100% 97%)", caretColor: "hsl(246 89% 70%)" }}
            />
            <button onClick={() => { setShowFilePath(false); setFilePath(""); }}>
              <X size={13} style={{ color: "hsl(242 17% 36%)" }} />
            </button>
          </div>
        )}

        {/* Command bar */}
        <div className="command-bar flex items-end gap-2 px-4 py-3">
          <button
            onClick={() => setShowFilePath(v => !v)}
            title="Attach file path"
            className="flex-shrink-0 transition-colors mb-0.5"
            style={{ color: showFilePath || filePath ? "hsl(246 89% 70%)" : "hsl(242 17% 36%)" }}
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
            className="flex-1 bg-transparent text-[14px] text-foreground outline-none resize-none leading-relaxed max-h-36 overflow-y-auto disabled:opacity-50"
            style={{
              minHeight: "1.5rem",
              caretColor: "hsl(246 89% 70%)",
            }}
          />
          <button
            onClick={running ? () => stopRef.current?.() : submit}
            disabled={!running && !input.trim()}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              backgroundColor: running ? "transparent" : "hsl(246 89% 70%)",
              color: running ? "hsl(347 87% 60%)" : "hsl(240 22% 5%)",
              border: running ? "1px solid hsl(347 87% 60% / 0.4)" : "none",
            }}
          >
            {running ? <X size={14} /> : <ArrowUp size={14} />}
          </button>
        </div>

        <p className="text-center text-[11px] mt-2" style={{ color: "hsl(242 17% 36%)" }}>
          Portiere uses AI — always verify important results
        </p>
      </div>
    </div>
  );
}
