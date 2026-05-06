import { useState } from "react";
import { RefreshCw, Cpu, HardDrive, Loader2, AlertCircle, Box } from "lucide-react";
import { fetchModels } from "@/lib/api";

interface OllamaModel {
  name: string;
  size_gb: number;
  modified: string;
}

interface LMStudioModel {
  name: string;
  object: string;
}

interface ModelsData {
  ollama: OllamaModel[];
  lmstudio: LMStudioModel[];
  ollama_error?: string;
  lmstudio_error?: string;
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
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/40 flex-shrink-0">
        <div>
          <h1 className="font-mono text-sm font-bold text-foreground">MODEL MANAGER</h1>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
            Locally installed AI models · {lastRefresh ? `Last refresh: ${lastRefresh}` : "Not yet fetched"}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded font-mono text-xs text-primary transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto feed-scroll px-5 py-5 space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded text-destructive text-xs font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {!data && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
            <Cpu className="w-8 h-8 text-muted-foreground" />
            <p className="font-mono text-sm text-muted-foreground">Click Refresh to scan for local models</p>
            <p className="font-mono text-xs text-muted-foreground/60">Checks Ollama and LM Studio endpoints</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="font-mono text-xs text-muted-foreground">Probing local AI endpoints...</p>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Ollama */}
            <div className="bg-card border border-card-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Box className="w-3.5 h-3.5 text-primary" />
                  <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-foreground/80">Ollama</h3>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    data.ollama_error
                      ? "text-destructive border-destructive/30 bg-destructive/5"
                      : "text-accent border-accent/30 bg-accent/5"
                  }`}>
                    {data.ollama_error ? "UNREACHABLE" : `${data.ollama.length} MODEL${data.ollama.length !== 1 ? "S" : ""}`}
                  </span>
                </div>
              </div>

              {data.ollama_error ? (
                <div className="p-4 text-xs font-mono text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1.5 text-destructive" />
                  {data.ollama_error}
                  <br />
                  <span className="text-muted-foreground/60 mt-1 block">Ensure Ollama is running: <code className="text-foreground/70">ollama serve</code></span>
                </div>
              ) : data.ollama.length === 0 ? (
                <div className="p-4 text-xs font-mono text-muted-foreground">
                  No models installed. Pull one with: <code className="text-foreground/70 bg-muted px-1.5 py-0.5 rounded">ollama pull llama3.2</code>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {data.ollama.map(m => (
                    <div key={m.name} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                        <span className="font-mono text-sm text-foreground">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {m.size_gb} GB
                        </span>
                        {m.modified && (
                          <span className="font-mono text-[10px] text-muted-foreground/60">
                            {new Date(m.modified).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LM Studio */}
            <div className="bg-card border border-card-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-[hsl(270_70%_70%)]" />
                  <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-foreground/80">LM Studio</h3>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    data.lmstudio_error
                      ? "text-destructive border-destructive/30 bg-destructive/5"
                      : "text-[hsl(270_70%_70%)] border-[hsl(270_70%_70%)/0.3] bg-[hsl(270_70%_70%)/0.05]"
                  }`}>
                    {data.lmstudio_error ? "UNREACHABLE" : `${data.lmstudio.length} MODEL${data.lmstudio.length !== 1 ? "S" : ""}`}
                  </span>
                </div>
              </div>

              {data.lmstudio_error ? (
                <div className="p-4 text-xs font-mono text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1.5 text-destructive" />
                  {data.lmstudio_error}
                  <br />
                  <span className="text-muted-foreground/60 mt-1 block">Start the LM Studio local server on port 1234.</span>
                </div>
              ) : data.lmstudio.length === 0 ? (
                <div className="p-4 text-xs font-mono text-muted-foreground">
                  No loaded models. Load a model in LM Studio and enable the local server.
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {data.lmstudio.map(m => (
                    <div key={m.name} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(270_70%_70%)] flex-shrink-0" />
                        <span className="font-mono text-sm text-foreground">{m.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded">
                        {m.object}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pb-4">
              <p className="font-mono text-[10px] text-muted-foreground/60 text-center">
                Local models are not transmitted externally. Configure endpoints in Vault → Settings.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
