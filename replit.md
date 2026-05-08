# Portiere

A local-first orchestration platform with a Master-Worker architecture. Users send natural language commands to a central Brain LLM, which routes tasks to specialized workers (Claude, Video, Local system, OSINT) with real-time SSE streaming of the execution feed.

## Run & Operate

- API: `PYTHONPATH=/home/runner/workspace/artifacts/api-server uvicorn portiere.main:app --host 0.0.0.0 --port $PORT --reload`
- Frontend: `pnpm --filter @workspace/portiere-ui run dev`
- Install Python deps: `pip install -r artifacts/api-server/requirements.txt`
- No database required. Settings stored at `~/.portiere/settings.json`

## Stack

- **Backend**: Python 3 + FastAPI + uvicorn + SSE (sse-starlette)
- **Frontend**: React + Vite + Tailwind CSS v4
- **Workers**: anthropic, openai (Ollama-compat), httpx, psutil, python-whois, dnspython
- **Persistence**: JSON file at `~/.portiere/settings.json`

## Where things live

- `artifacts/api-server/portiere/` — FastAPI Python backend
  - `main.py` — App entry point, routes
  - `brain.py` — Central LLM router (OpenAI-compat / Anthropic / Ollama / LM Studio)
  - `orchestrator.py` — Chain execution, SSE streaming
  - `workers/` — claude, video, local, osint workers
  - `settings_store.py` — JSON-based settings vault
- `artifacts/portiere-ui/src/` — React + Tailwind frontend
  - `pages/ConsolePage.tsx` — Main orchestration console + execution feed
  - `pages/SettingsPage.tsx` — Settings vault (Brain, Claude, Email, Video, Shell)
  - `pages/ModelsPage.tsx` — Local model manager + capabilities reference
  - `components/OnboardingModal.tsx` — Hardware scan + first-run setup flow
  - `components/Sidebar.tsx` — Navigation sidebar
  - `lib/api.ts` — SSE streaming + API helpers

## Architecture decisions

- **SSE over WebSocket**: Server-Sent Events used for one-directional execution feed streaming. Simpler to implement with FastAPI and works over standard HTTP proxies.
- **OpenAI-compat protocol**: Brain uses the OpenAI chat completions API format for maximum compatibility (works with Ollama, LM Studio, and OpenAI simultaneously).
- **JSON Brain prompt**: Brain is prompted to return a `{"chain": [...], "reasoning": "..."}` JSON object for structured routing decisions.
- **Local-first settings**: API keys stored in `~/.portiere/settings.json`, never transmitted to third parties.
- **Worker chaining**: Output of each worker step is passed as `context` to the next step, enabling multi-step pipelines.

## Product

- **Console**: Real-time orchestration feed showing Brain thinking, worker routing, and streamed output. Suggestion chips in empty state and after each run.
- **Settings**: Centralized vault for Brain provider (Groq/Ollama/LM Studio/OpenAI/Anthropic), Claude key, FAL.ai/Seedance video keys, SMTP email, and shell command allowlist.
- **Model Manager**: Lists installed Ollama and LM Studio models with live endpoint probe. Also serves as the capabilities reference (13 workers).
- **Onboarding**: Hardware scan on first launch recommends the best local or cloud setup for the machine.
- **13 Workers**: Web Search, Weather, Live News, Finance, Translator, Calendar, Claude (writing/coding), Email, Code Runner, OSINT, System Monitor, Image Generation, Video Generation.

## User preferences

- Warm ember dark palette: `#0D0A07` bg, `#CC7722` amber primary, `#E2D0B4` foreground, `#4A3A2C` border
- Typography: Inter (UI), Cormorant Garamond (display headings)
- Clean readable feed: user messages right-aligned, brain trace stays dim, worker outputs in clean cards (not raw pre blocks)
- No "AI" in any user-facing copy. No em dashes anywhere in UI text.
- Suggestion chips after each completed run; disclaimer below input bar
- Local-first philosophy. No mandatory cloud dependencies.
- PyInstaller packaging support via `PYTHONPATH=artifacts/api-server` entrypoint

## Gotchas

- The `PYTHONPATH` must point to `artifacts/api-server/` for Python module resolution.
- Shell commands are disabled by default. Enable in Settings under Local worker.
- Brain requires a configured provider before orchestration works (default: Ollama localhost).
- SSE streaming uses standard `text/event-stream` format; client must parse `data: {...}\n\n`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure details.
- FastAPI docs available at `/api/docs` (Swagger UI).
