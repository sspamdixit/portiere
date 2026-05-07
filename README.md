# Portiere

A personal AI concierge that runs on your machine. Ask it anything — it routes your request through a chain of specialized workers (search, writing, code, finance, weather, image generation, and more) and streams results back in real time.

Supports local models via Ollama and LM Studio, and cloud providers like OpenAI and Anthropic. Everything is stored locally — no data leaves your device unless you use a cloud API.

---

## Features

### Core

- **Brain routing** — an LLM reads your request and decides which workers to run, in what order, and with what parameters
- **Streaming pipeline** — each worker streams its output as it runs; you see results as they arrive
- **Context chaining** — follow-up questions carry context from the previous response
- **Session history** — conversations are saved locally and accessible from the sidebar

### Workers / Capabilities

| Worker | What it does | Requires |
|---|---|---|
| Web Search | Real-time search via DuckDuckGo | Built-in |
| Weather | Current conditions + 7-day forecast | Built-in |
| News | Latest headlines on any topic | Built-in |
| Finance | Stock prices, crypto rates | Built-in |
| Translator | 50+ languages | Built-in |
| Calendar | Creates .ics event files | Built-in |
| Code Runner | Writes and executes Python | Built-in |
| System Monitor | CPU, RAM, disk, processes | Built-in |
| OSINT / Research | WHOIS, DNS, domain investigation | Built-in |
| Claude (Writing) | Deep reasoning, code, drafting | Anthropic API key |
| Image Generation | AI images via FAL.ai Flux | FAL API key |
| Video Generation | AI video via FAL.ai or Seedance | FAL or Seedance key |
| Email | Compose and send via SMTP | SMTP config (optional) |

### UI Features

- **Voice input** — speak your request instead of typing (`⌘/`)
- **Prompt templates** — 12 built-in templates + save your own (`⌘T`)
- **Export chat** — download any conversation as Markdown (`⌘E`)
- **Pinned sessions** — star conversations to keep them at the top
- **Session search** — filter your history by keyword
- **Keyboard shortcuts** — press `?` to see all shortcuts
- **Smart follow-up chips** — context-aware suggestions after each response
- **Dark theme** — designed for extended use

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite, Tailwind CSS, Wouter, TanStack Query |
| Backend | FastAPI (Python), Server-Sent Events for streaming |
| API bridge | Express (TypeScript) |
| Local AI | Ollama, LM Studio |
| Cloud AI | OpenAI, Anthropic |
| Package manager | pnpm workspaces |

---

## Getting Started

### Prerequisites

- Node.js 20+ and pnpm
- Python 3.11+
- (Optional) [Ollama](https://ollama.com) or [LM Studio](https://lmstudio.ai) for local models

### Install

```bash
pnpm install
pip install -r artifacts/api-server/requirements.txt
```

### Run

Start the frontend:

```bash
PORT=20307 BASE_PATH=/ pnpm --filter @workspace/portiere-ui run dev
```

Start the API server:

```bash
PYTHONPATH=artifacts/api-server uvicorn portiere.main:app --host 0.0.0.0 --port 8080 --reload
```

Then open [http://localhost:20307](http://localhost:20307).

### First launch

On first launch, Portiere shows an onboarding wizard to configure your AI brain provider and any API keys. You can revisit this at any time from **Settings**.

---

## Configuration

All settings are stored in `~/.portiere/settings.json` and editable from the Settings page in the UI.

### AI Brain

The brain routes every request. Choose one:

| Provider | Notes |
|---|---|
| Ollama | Free, runs on your machine. Run `ollama pull llama3.2` to get started. |
| LM Studio | Free desktop app. Enable the local server on port 1234. |
| OpenAI | Cloud. Requires an API key (`sk-...`). |
| Anthropic | Cloud. Requires an API key (`sk-ant-...`). |

### Optional API Keys

| Key | Where to get it | Unlocks |
|---|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | Claude writing + coding |
| `FAL_API_KEY` | [fal.ai](https://fal.ai) | Image + video generation |
| `SEEDANCE_API_KEY` | [seedance.ai](https://seedance.ai) | Video generation (alt) |

### SMTP (optional)

Without SMTP, Portiere drafts emails with a `mailto:` link. With SMTP, it sends them directly. Gmail users: create an App Password at `myaccount.google.com/apppasswords`.

### System Access

Shell command execution is disabled by default. Enable it in Settings → System Access to let Portiere run terminal commands. You can restrict it to an allowlist.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` | Focus input |
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `⌘T` | Open prompt templates |
| `⌘E` | Export conversation |
| `⌘/` | Toggle voice input |
| `?` | Show all shortcuts |
| `Esc` | Close modals |

---

## Project Structure

```
artifacts/
  portiere-ui/          # React frontend
    src/
      pages/            # ConsolePage, SettingsPage, ModelsPage
      components/       # Sidebar, modals, markdown renderer
      lib/              # API client, sessions, templates
  api-server/           # Express shell + FastAPI core
    portiere/
      main.py           # FastAPI app, SSE endpoints
      orchestrator.py   # Brain → worker chain execution
      workers/          # One file per capability
lib/
  api-spec/             # OpenAPI spec
  api-client-react/     # Generated React Query hooks
  db/                   # Drizzle + Postgres (optional)
```

---

## License

MIT
