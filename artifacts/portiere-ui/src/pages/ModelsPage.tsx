import { useState } from "react";
import { RefreshCw, Cpu, HardDrive, Loader2, AlertCircle, Box, ChevronRight } from "lucide-react";
import { fetchModels } from "@/lib/api";

const dim = "hsl(242 17% 36%)";
const muted = "hsl(242 18% 61%)";

interface OllamaModel { name: string; size_gb: number; modified: string; }
interface LMStudioModel { name: string; object: string; }
interface ModelsData {
  ollama: OllamaModel[];
  lmstudio: LMStudioModel[];
  ollama_error?: string;
  lmstudio_error?: string;
}

function ProviderCard({
  title, icon, accentColor, count, error, empty, children,
}: {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  count?: number;
  error?: string;
  empty?: string;
  children?: React.ReactNode;
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
      {/* Card header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid hsl(240 24% 12%)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
          >
            {icon}
          </div>
          <span className="text-[13px] font-semibold text-foreground">{title}</span>
        </div>
        {count !== undefined && !error && (
          <span
            className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: `${accentColor}14`,
              color: accentColor,
              border: `1px solid ${accentColor}28`,
            }}
          >
            {count} model{count !== 1 ? "s" : ""}
          </span>
        )}
        {error && (
          <span
            className="text-[11px] px-2.5 py-0.5 rounded-full font-medium text-destructive"
            style={{ backgroundColor: "hsl(347 87% 60% / 0.08)", border: "1px solid hsl(347 87% 60% / 0.18)" }}
          >
            Unreachable
          </span>
        )}
      </div>

      {/* Card body */}
      {error ? (
        <div className="px-5 py-4 text-[13px]" style={{ color: muted }}>
          <div className="flex items-start gap-2.5">
            <AlertCircle size={13} className="text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p>{error}</p>
              {title === "Ollama" && (
                <p className="mt-1.5" style={{ color: dim }}>
                  Run{" "}
                  <code
                    className="text-foreground px-1.5 py-0.5 rounded text-[12px]"
                    style={{ backgroundColor: "hsl(240 20% 12%)" }}
                  >
                    ollama serve
                  </code>{" "}
                  to start.
                </p>
              )}
              {title === "LM Studio" && (
                <p className="mt-1.5" style={{ color: dim }}>Start the LM Studio local server on port 1234.</p>
              )}
            </div>
          </div>
        </div>
      ) : children ? (
        <div className="divide-y" style={{ borderColor: "hsl(240 24% 12%)" }}>
          {children}
        </div>
      ) : (
        <div className="px-5 py-4 text-[13px]" style={{ color: muted }}>{empty}</div>
      )}
    </div>
  );
}

export default function ModelsPage() {
  const [data, setData] = useState<ModelsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchModels();
      setData(result);
      setLastRefresh(new Date().toLocaleTimeString("en", { hour12: false }));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 flex-shrink-0"
        style={{ height: "48px", borderBottom: "1px solid hsl(240 24% 12%)" }}
      >
        <div className="flex items-center gap-2 text-[14px]">
          <span className="font-medium text-foreground">Workers</span>
          <ChevronRight size={13} style={{ color: "hsl(242 17% 30%)" }} />
          <span className="text-[13px]" style={{ color: muted }}>
            {lastRefresh ? `Refreshed ${lastRefresh}` : "Local AI Models"}
          </span>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[13px] font-medium transition-all disabled:opacity-50"
          style={{
            backgroundColor: "rgba(124,111,247,0.1)",
            border: "1px solid hsl(246 89% 70% / 0.22)",
            color: "hsl(246 89% 70%)",
          }}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto feed-scroll px-6 py-5 space-y-4 max-w-2xl w-full">
        {error && (
          <div
            className="flex items-center gap-2 p-4 rounded-2xl text-destructive text-[13px]"
            style={{ backgroundColor: "hsl(347 87% 60% / 0.06)", border: "1px solid hsl(347 87% 60% / 0.18)" }}
          >
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {!data && !loading && (
          <div className="relative flex flex-col items-center justify-center py-28 gap-5">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 50% 30% at 50% 50%, rgba(124,111,247,0.05) 0%, transparent 70%)" }}
            />
            <div
              className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: "hsl(240 18% 10%)",
                border: "1px solid hsl(240 24% 14%)",
              }}
            >
              <Cpu size={22} style={{ color: "hsl(242 18% 42%)" }} />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-medium text-foreground">Scan for local models</p>
              <p className="text-[13px] mt-1" style={{ color: muted }}>
                Checks Ollama and LM Studio endpoints
              </p>
            </div>
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, hsl(246 89% 68%) 0%, hsl(258 75% 72%) 100%)",
                color: "white",
                boxShadow: "0 2px 10px rgba(124,111,247,0.35)",
              }}
            >
              <RefreshCw size={13} />
              Refresh now
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="relative">
              <Loader2 size={24} className="animate-spin" style={{ color: "hsl(246 89% 70%)" }} />
            </div>
            <p className="text-[13px]" style={{ color: muted }}>Probing local AI endpoints…</p>
          </div>
        )}

        {data && !loading && (
          <>
            <ProviderCard
              title="Ollama"
              icon={<Box size={14} />}
              accentColor="hsl(246 89% 70%)"
              count={data.ollama_error ? undefined : data.ollama.length}
              error={data.ollama_error}
              empty="No models installed. Pull one with: ollama pull llama3.2"
            >
              {data.ollama.map(m => (
                <div key={m.name} className="flex items-center justify-between px-5 py-3 group">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: "hsl(246 89% 70%)" }}
                    />
                    <span className="text-[14px] text-foreground font-medium">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[12px] flex items-center gap-1.5 px-2 py-0.5 rounded-lg"
                      style={{
                        color: muted,
                        backgroundColor: "hsl(240 20% 12%)",
                      }}
                    >
                      <HardDrive size={10} /> {m.size_gb} GB
                    </span>
                    {m.modified && (
                      <span className="text-[11px]" style={{ color: dim }}>
                        {new Date(m.modified).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </ProviderCard>

            <ProviderCard
              title="LM Studio"
              icon={<Cpu size={14} />}
              accentColor="hsl(270 70% 72%)"
              count={data.lmstudio_error ? undefined : data.lmstudio.length}
              error={data.lmstudio_error}
              empty="No loaded models. Load a model in LM Studio and enable the local server."
            >
              {data.lmstudio.map(m => (
                <div key={m.name} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: "hsl(270 70% 72%)" }}
                    />
                    <span className="text-[14px] text-foreground font-medium">{m.name}</span>
                  </div>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-lg"
                    style={{ color: dim, backgroundColor: "hsl(240 17% 12%)" }}
                  >
                    {m.object}
                  </span>
                </div>
              ))}
            </ProviderCard>

            <p className="text-[11px] text-center pb-6 tracking-wide" style={{ color: "hsl(242 17% 32%)" }}>
              Local models are not transmitted externally · Configure endpoints in Settings
            </p>
          </>
        )}
      </div>
    </div>
  );
}
