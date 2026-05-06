import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, X, Loader2, ChevronRight, Zap, Brain, Cpu, Film, Globe, HardDrive } from "lucide-react";
import { streamOrchestrate, type OrchestrateEvent } from "@/lib/api";

interface FeedEntry {
  id: number;
  event: OrchestrateEvent;
  ts: string;
}

const workerMeta: Record<string, { icon: React.FC<{ className?: string }>, color: string, label: string }> = {
  brain:  { icon: Brain,     color: "worker-brain",  label: "BRAIN"  },
  claude: { icon: Zap,       color: "worker-claude", label: "CLAUDE" },
  video:  { icon: Film,      color: "worker-video",  label: "VIDEO"  },
  local:  { icon: HardDrive, color: "worker-local",  label: "LOCAL"  },
  osint:  { icon: Globe,     color: "worker-osint",  label: "OSINT"  },
};

function workerBadge(worker?: string) {
  const k = (worker || "system").toLowerCase();
  const meta = workerMeta[k] || { icon: Cpu, color: "worker-system", label: (worker || "SYS").toUpperCase() };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-semibold tracking-wider ${meta.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {meta.label}
    </span>
  );
}

function FeedEventRow({ entry }: { entry: FeedEntry }) {
  const { event, ts } = entry;
  const t = event.type;

  if (t === "brain_thinking") {
    return (
      <div className="flex items-start gap-3 py-1.5 px-3 hover:bg-white/[0.02] rounded group">
        <span className="font-mono text-[10px] text-muted-foreground mt-0.5 w-16 flex-shrink-0">{ts}</span>
        {workerBadge("brain")}
        <span className="text-xs text-foreground/70 italic flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 pulse-dot flex-shrink-0" />
          {event.content}
        </span>
      </div>
    );
  }

  if (t === "brain_decision") {
    return (
      <div className="flex items-start gap-3 py-1.5 px-3 hover:bg-white/[0.02] rounded group">
        <span className="font-mono text-[10px] text-muted-foreground mt-0.5 w-16 flex-shrink-0">{ts}</span>
        {workerBadge("brain")}
        <span className="text-xs text-primary font-medium">{event.content}</span>
      </div>
    );
  }

  if (t === "chain_step") {
    return (
      <div className="flex items-start gap-3 py-2 px-3 my-1 bg-border/30 rounded border-l-2 border-primary/40">
        <span className="font-mono text-[10px] text-muted-foreground mt-0.5 w-16 flex-shrink-0">{ts}</span>
        <ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
        <span className="text-xs font-mono text-primary/90">{event.content}</span>
      </div>
    );
  }

  if (t === "worker_thinking") {
    return (
      <div className="flex items-start gap-3 py-1.5 px-3 hover:bg-white/[0.02] rounded group">
        <span className="font-mono text-[10px] text-muted-foreground mt-0.5 w-16 flex-shrink-0">{ts}</span>
        {workerBadge(event.worker)}
        <span className="text-xs text-foreground/60 italic">{event.content}</span>
      </div>
    );
  }

  if (t === "worker_chunk") {
    return null;
  }

  if (t === "worker_start") {
    return (
      <div className="flex items-start gap-3 py-1.5 px-3 hover:bg-white/[0.02] rounded">
        <span className="font-mono text-[10px] text-muted-foreground mt-0.5 w-16 flex-shrink-0">{ts}</span>
        {workerBadge(event.worker)}
        <span className="text-xs text-foreground/80"><span className="text-muted-foreground">Task: </span>{event.content}</span>
      </div>
    );
  }

  if (t === "worker_done") {
    const hasData = event.data && typeof event.data === "object";
    return (
      <div className="flex flex-col gap-1 py-2 px-3 hover:bg-white/[0.02] rounded">
        <div className="flex items-start gap-3">
          <span className="font-mono text-[10px] text-muted-foreground mt-0.5 w-16 flex-shrink-0">{ts}</span>
          {workerBadge(event.worker)}
          <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1" />
          <span className="text-xs text-foreground/90 font-medium">Done</span>
        </div>
        {event.content && (
          <div className="ml-[calc(4rem+theme(spacing.3)+theme(spacing.16))] mt-1">
            <pre className="mono-output text-foreground/75 bg-card/60 p-2.5 rounded border border-border/50 max-h-64 overflow-y-auto feed-scroll text-xs">
              {event.content}
            </pre>
          </div>
        )}
        {hasData && (event.data as Record<string,unknown>)?.video_url && (
          <div className="ml-[calc(4rem+theme(spacing.3)+theme(spacing.16))] mt-1">
            <a href={(event.data as Record<string,unknown>).video_url as string} target="_blank" rel="noreferrer"
              className="text-xs text-primary underline underline-offset-2">
              View generated video
            </a>
          </div>
        )}
      </div>
    );
  }

  if (t === "worker_error" || t === "brain_error") {
    return (
      <div className="flex items-start gap-3 py-1.5 px-3 rounded bg-destructive/5 border-l-2 border-destructive/50">
        <span className="font-mono text-[10px] text-muted-foreground mt-0.5 w-16 flex-shrink-0">{ts}</span>
        {workerBadge(event.worker || "system")}
        <span className="text-xs text-destructive">{event.error}</span>
      </div>
    );
  }

  if (t === "complete") {
    return (
      <div className="flex items-center gap-3 py-2 px-3 my-1 bg-accent/5 rounded border border-accent/20">
        <span className="font-mono text-[10px] text-muted-foreground w-16 flex-shrink-0">{ts}</span>
        <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
        <span className="text-xs font-mono text-accent font-semibold tracking-wide">ORCHESTRATION COMPLETE</span>
      </div>
    );
  }

  if (t === "error") {
    return (
      <div className="flex items-start gap-3 py-2 px-3 rounded bg-destructive/5 border-l-2 border-destructive/50">
        <span className="font-mono text-[10px] text-muted-foreground mt-0.5 w-16 flex-shrink-0">{ts}</span>
        <span className="text-xs text-destructive font-mono">[ERROR] {event.error}</span>
      </div>
    );
  }

  if (t === "file_loaded") {
    return (
      <div className="flex items-start gap-3 py-1.5 px-3 hover:bg-white/[0.02] rounded">
        <span className="font-mono text-[10px] text-muted-foreground mt-0.5 w-16 flex-shrink-0">{ts}</span>
        {workerBadge("system")}
        <span className="text-xs text-foreground/60">{event.content}</span>
      </div>
    );
  }

  return null;
}

let idSeq = 0;

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

  const now = () => new Date().toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const addEntry = useCallback((event: OrchestrateEvent) => {
    setFeed(prev => [...prev, { id: idSeq++, event, ts: now() }]);
  }, []);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [feed]);

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
          setChunkBuffers(prev => {
            const updated = { ...prev, [key]: (prev[key] || "") + (event.content || "") };
            return updated;
          });
        } else {
          if (event.type === "worker_done" && event.worker) {
            setChunkBuffers(prev => {
              const updated = { ...prev };
              delete updated[event.worker!];
              return updated;
            });
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const userInputRows = feed.filter(e => e.event.type === "user_input");

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/40 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(40_90%_60%)/0.6]" />
            <span className="w-2.5 h-2.5 rounded-full bg-accent/60" />
          </div>
          <span className="font-mono text-xs text-muted-foreground">portiere — orchestration console</span>
        </div>
        <div className="flex items-center gap-2">
          {running && (
            <div className="flex items-center gap-1.5 text-primary">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="font-mono text-[10px]">RUNNING</span>
            </div>
          )}
          <button
            onClick={() => setFeed([])}
            className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-border/50"
          >
            CLEAR
          </button>
        </div>
      </div>

      {/* Execution Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto feed-scroll px-2 py-2 space-y-0.5">
        {feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 opacity-40">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-mono text-sm text-foreground">Portiere is ready</p>
              <p className="font-mono text-xs text-muted-foreground mt-1">Type a command below to begin orchestration</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-md text-left mt-2">
              {["Check my CPU and memory usage", "Look up info about example.com", "Write a Python merge sort function", "Scan the digital footprint of openai.com"].map(s => (
                <button key={s} onClick={() => setInput(s)} className="text-left px-3 py-2 rounded border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-[11px] font-mono text-muted-foreground hover:text-foreground">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          feed.map(entry => {
            if (entry.event.type === "user_input") {
              return (
                <div key={entry.id} className="flex items-start gap-3 py-2 px-3 my-2 bg-primary/5 rounded border-l-2 border-primary/60">
                  <span className="font-mono text-[10px] text-muted-foreground mt-0.5 w-16 flex-shrink-0">{entry.ts}</span>
                  <span className="text-[10px] font-mono font-bold text-primary/80 mt-0.5">YOU</span>
                  <span className="text-sm text-foreground">{entry.event.content}</span>
                </div>
              );
            }
            return <FeedEventRow key={entry.id} entry={entry} />;
          })
        )}

        {/* Active streaming buffers */}
        {Object.entries(chunkBuffers).map(([worker, text]) => text ? (
          <div key={worker} className="flex flex-col gap-1 py-2 px-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-muted-foreground w-16 flex-shrink-0">{now()}</span>
              {workerBadge(worker)}
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            </div>
            <div className="ml-[calc(4rem+theme(spacing.3)+theme(spacing.16))] mt-1">
              <pre className="mono-output text-foreground/75 bg-card/60 p-2.5 rounded border border-border/50 max-h-48 overflow-y-auto feed-scroll text-xs">
                {text}<span className="cursor-blink" />
              </pre>
            </div>
          </div>
        ) : null)}
      </div>

      {/* Command Bar */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-card/20">
        {showFilePath && (
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[10px] text-muted-foreground">FILE PATH:</span>
            <input
              type="text"
              value={filePath}
              onChange={e => setFilePath(e.target.value)}
              placeholder="/path/to/file.py"
              className="flex-1 bg-transparent font-mono text-xs text-foreground placeholder-muted-foreground/50 outline-none border-b border-border/50 pb-0.5"
            />
            <button onClick={() => { setShowFilePath(false); setFilePath(""); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="command-bar flex items-end gap-2 p-3">
          <button
            onClick={() => setShowFilePath(v => !v)}
            title="Attach file path"
            className={`flex-shrink-0 p-1.5 rounded transition-colors ${showFilePath || filePath ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a command to the Brain… (Enter to send, Shift+Enter for newline)"
            disabled={running}
            rows={1}
            className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder-muted-foreground/40 outline-none resize-none leading-relaxed max-h-32 overflow-y-auto disabled:opacity-50"
            style={{ minHeight: "1.5rem" }}
          />
          <button
            onClick={running ? () => stopRef.current?.() : submit}
            disabled={!running && !input.trim()}
            className={`flex-shrink-0 p-2 rounded transition-all ${
              running
                ? "text-destructive hover:bg-destructive/10"
                : "text-primary hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed"
            }`}
          >
            {running ? <X className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground/50 text-center mt-1.5">
          {userInputRows.length > 0 ? `${userInputRows.length} command${userInputRows.length !== 1 ? "s" : ""} this session` : "Enter ↵ to send · Shift+Enter for newline · Ctrl+L to clear"}
        </p>
      </div>
    </div>
  );
}
