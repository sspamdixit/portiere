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
  title,
  icon,
  accentColor,
  count,
  error,
  empty,
  children,
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
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "hsl(240 18% 9%)", border: "1px solid hsl(240 24% 14%)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid hsl(240 24% 14%)" }}
      >
        <div className="flex items-center gap-2.5">
          <span style={{ color: accentColor }}>{icon}</span>
          <span className="text-[13px] font-semibold text-foreground">{title}</span>
        </div>
        {count !== undefined && !error && (
          <span
            className="text-[11px] px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${accentColor}14`,
              color: accentColor,
              border: `1px solid ${accentColor}30`,
            }}
          >
            {count} model{count !== 1 ? "s" : ""}
          </span>
        )}
        {error && (
          <span className="text-[11px] px-2 py-0.5 rounded-full text-destructive"
            style={{ backgroundColor: "hsl(347 87% 60% / 0.08)", border: "1px solid hsl(347 87% 60% / 0.2)" }}>
            Unreachable
          </span>
        )}
      </div>
      {error ? (
        <div className="px-5 py-4 text-[13px]" style={{ color: muted }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={13} className="text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p>{error}</p>
              {title === "Ollama" && (
                <p className="mt-1.5" style={{ color: dim }}>
                  Run <code className="text-foreground/80 bg-white/5 px-1.5 py-0.5 rounded text-[12px]">ollama serve</code> to start.
                </p>
              )}
              {title === "LM Studio" && (
                <p className="mt-1.5" style={{ color: dim }}>Start the LM Studio local server on port 1234.</p>
              )}
            </div>
          </div>
        </div>
      ) : children ? (
        <div className="divide-y" style={{ borderColor: "hsl(240 24% 14%)" }}>{children}</div>
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
        style={{ height: "48px", borderBottom: "1px solid hsl(240 24% 14%)" }}
      >
        <div className="flex items-center gap-2 text-[14px]">
          <span className="text-foreground">Workers</span>
          <ChevronRight size={14} style={{ color: dim }} />
          <span style={{ color: muted }}>
            {lastRefresh ? `Refreshed ${lastRefresh}` : "Local AI Models"}
          </span>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] transition-all disabled:opacity-50"
          style={{
            backgroundColor: "hsl(246 89% 70% / 0.12)",
            border: "1px solid hsl(246 89% 70% / 0.25)",
            color: "hsl(246 89% 70%)",
          }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto feed-scroll px-6 py-6 space-y-4">
        {error && (
          <div
            className="flex items-center gap-2 p-4 rounded-xl text-destructive text-[13px]"
            style={{ backgroundColor: "hsl(347 87% 60% / 0.06)", border: "1px solid hsl(347 87% 60% / 0.2)" }}
          >
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {!data && !loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4" style={{ opacity: 0.5 }}>
            <Cpu size={32} style={{ color: muted }} />
            <p className="text-[14px]" style={{ color: muted }}>Click Refresh to scan for local models</p>
            <p className="text-[13px]" style={{ color: dim }}>Checks Ollama and LM Studio endpoints</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={22} className="animate-spin text-primary" />
            <p className="text-[13px]" style={{ color: muted }}>Probing local AI endpoints…</p>
          </div>
        )}

        {data && !loading && (
          <>
            <ProviderCard
              title="Ollama"
              icon={<Box size={15} />}
              accentColor="hsl(246 89% 70%)"
              count={data.ollama_error ? undefined : data.ollama.length}
              error={data.ollama_error}
              empty="No models installed. Pull one with: ollama pull llama3.2"
            >
              {data.ollama.map(m => (
                <div key={m.name} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-[14px] text-foreground">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] flex items-center gap-1" style={{ color: muted }}>
                      <HardDrive size={11} /> {m.size_gb} GB
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
              icon={<Cpu size={15} />}
              accentColor="hsl(270 70% 72%)"
              count={data.lmstudio_error ? undefined : data.lmstudio.length}
              error={data.lmstudio_error}
              empty="No loaded models. Load a model in LM Studio and enable the local server."
            >
              {data.lmstudio.map(m => (
                <div key={m.name} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "hsl(270 70% 72%)" }} />
                    <span className="text-[14px] text-foreground">{m.name}</span>
                  </div>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded"
                    style={{ color: dim, backgroundColor: "hsl(240 17% 10%)" }}
                  >
                    {m.object}
                  </span>
                </div>
              ))}
            </ProviderCard>

            <p className="text-[11px] text-center pb-4" style={{ color: dim }}>
              Local models are not transmitted externally · Configure endpoints in Settings
            </p>
          </>
        )}
      </div>
    </div>
  );
}
