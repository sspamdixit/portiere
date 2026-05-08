import asyncio
import json
import os
import platform
import subprocess
import httpx
import psutil
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from portiere.models import OrchestrateRequest
from portiere.orchestrator import Orchestrator
from portiere.settings_store import SettingsStore
from portiere.setup_wizard import stream_wizard, parse_setup_result

app = FastAPI(title="Portiere", version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_settings_store = SettingsStore()
_orchestrator = Orchestrator(_settings_store)


@app.get("/api/healthz")
async def health():
    return {"status": "ok", "service": "portiere"}


@app.post("/api/orchestrate")
async def orchestrate(request: OrchestrateRequest):
    async def generate():
        try:
            async for event in _orchestrator.run(request):
                yield {"data": json.dumps(event)}
        except Exception as e:
            yield {"data": json.dumps({"type": "error", "error": str(e)})}

    return EventSourceResponse(generate())


@app.get("/api/settings")
async def get_settings():
    return _settings_store.get_all()


@app.put("/api/settings")
async def save_settings(request: Request):
    body = await request.json()
    _settings_store.save(body)
    return {"status": "saved"}


@app.get("/api/models")
async def get_models():
    return await _orchestrator.list_models()


@app.get("/api/probe/ollama")
async def probe_ollama():
    settings = _settings_store.get_raw()
    base = settings.ollama_base_url.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.get(f"{base}/api/tags")
            if r.status_code == 200:
                models = [m["name"] for m in r.json().get("models", [])]
                return {"ok": True, "models": models}
            return {"ok": False, "error": f"HTTP {r.status_code}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.get("/api/probe/lmstudio")
async def probe_lmstudio():
    settings = _settings_store.get_raw()
    base = settings.lmstudio_base_url.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.get(f"{base}/models")
            if r.status_code == 200:
                models = [m["id"] for m in r.json().get("data", [])]
                return {"ok": True, "models": models}
            return {"ok": False, "error": f"HTTP {r.status_code}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.post("/api/setup-wizard")
async def setup_wizard(request: Request):
    body = await request.json()
    messages = body.get("messages", [])

    async def generate():
        full_text = ""
        async for chunk_json in stream_wizard(messages):
            yield {"data": chunk_json}
            try:
                obj = json.loads(chunk_json)
                if obj.get("type") == "chunk":
                    full_text += obj.get("content", "")
            except Exception:
                pass
        # After streaming, check if there's a SETUP_RESULT to parse
        result = parse_setup_result(full_text)
        if result:
            yield {"data": json.dumps({"type": "setup_result", "result": result})}

    return EventSourceResponse(generate())


@app.post("/api/ollama/pull")
async def pull_ollama_model(request: Request):
    body = await request.json()
    model_name = body.get("model", "").strip()
    if not model_name:
        return JSONResponse({"error": "model name is required"}, status_code=400)
    settings = _settings_store.get_raw()
    base = settings.ollama_base_url.rstrip("/")

    async def generate():
        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                async with client.stream("POST", f"{base}/api/pull", json={"name": model_name}) as r:
                    async for line in r.aiter_lines():
                        if line.strip():
                            yield {"data": line}
        except Exception as e:
            yield {"data": json.dumps({"error": str(e)})}

    return EventSourceResponse(generate())


def _detect_gpus() -> list[dict] | None:
    gpus = []
    try:
        r = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=4,
        )
        if r.returncode == 0:
            for line in r.stdout.strip().splitlines():
                parts = line.split(",")
                if len(parts) >= 2:
                    name = parts[0].strip()
                    vram_mb = int(parts[1].strip())
                    gpus.append({"name": name, "vram_gb": round(vram_mb / 1024, 1), "vendor": "nvidia"})
    except Exception:
        pass
    if gpus:
        return gpus
    try:
        r = subprocess.run(["rocm-smi", "--showmeminfo", "vram", "--json"], capture_output=True, text=True, timeout=4)
        if r.returncode == 0:
            data = json.loads(r.stdout)
            for dev, info in data.items():
                vram_bytes = int(info.get("VRAM Total Memory (B)", 0))
                gpus.append({"name": dev, "vram_gb": round(vram_bytes / 1024**3, 1), "vendor": "amd"})
    except Exception:
        pass
    return gpus if gpus else None


def _build_recommendations(ram_gb: float, gpus: list | None) -> list[dict]:
    recs = []
    has_gpu = bool(gpus)
    vram_gb = max((g["vram_gb"] for g in gpus), default=0) if gpus else 0
    gpu_name = gpus[0]["name"] if gpus else None

    if has_gpu and vram_gb >= 6:
        if vram_gb >= 20:
            local_model = "llama3.1:70b"
        elif vram_gb >= 12:
            local_model = "llama3.1:8b"
        else:
            local_model = "mistral"
        recs.append({
            "tier": "gpu",
            "label": "Local GPU Stack",
            "tagline": f"Your {gpu_name} ({vram_gb:.0f}GB VRAM) is perfect for local AI",
            "provider": "ollama",
            "model": local_model,
            "badges": ["GPU-accelerated", "Free", "Private"],
            "items": [
                {"role": "Brain", "name": f"Ollama · {local_model}", "note": "Fast GPU inference"},
                {"role": "Writing & Code", "name": "Claude worker", "note": "Optional — add API key later"},
            ],
            "why": "GPU acceleration makes local AI as fast as cloud, with full privacy.",
        })

    if ram_gb >= 16:
        model = "llama3.1:8b" if ram_gb >= 16 else "llama3.2"
        recs.append({
            "tier": "local",
            "label": "Local AI — Free & Private",
            "tagline": f"Your {ram_gb:.0f}GB RAM can run solid local models",
            "provider": "ollama",
            "model": model,
            "badges": ["Free", "Private", "No account"],
            "items": [
                {"role": "Brain", "name": f"Ollama · {model}", "note": "Runs on your machine"},
                {"role": "Writing & Code", "name": "Claude worker", "note": "Optional — add API key later"},
            ],
            "why": "Best for privacy. No monthly costs, no data leaving your device.",
        })
    elif ram_gb >= 8:
        recs.append({
            "tier": "local_light",
            "label": "Lightweight Local",
            "tagline": f"Your {ram_gb:.0f}GB RAM suits smaller local models",
            "provider": "ollama",
            "model": "llama3.2",
            "badges": ["Free", "Private"],
            "items": [
                {"role": "Brain", "name": "Ollama · llama3.2", "note": "Fast 3B model"},
                {"role": "Upgrade anytime", "name": "Add a cloud API key", "note": "OpenAI or Anthropic"},
            ],
            "why": "A compact local model — private and free with no account required.",
        })

    recs.append({
        "tier": "quickstart",
        "label": "Quick Start — Groq (Free)",
        "tagline": "Free cloud AI · no install · no GPU · nothing to configure",
        "provider": "groq",
        "model": "llama-3.3-70b-versatile",
        "badges": ["Free", "Zero Setup", "No install"],
        "items": [
            {"role": "Brain", "name": "Groq · Llama 3.3 70B", "note": "Fast & free"},
            {"role": "Writing & Code", "name": "Groq fallback", "note": "No extra key needed"},
        ],
        "why": "Groq is free, blazing fast, and needs zero local software. One API key from console.groq.com — takes about 60 seconds. No credit card required.",
    })

    recs.append({
        "tier": "cloud",
        "label": "Cloud AI — Maximum Quality",
        "tagline": "GPT-4o quality — works on any machine",
        "provider": "openai",
        "model": "gpt-4o",
        "badges": ["Best quality", "Paid"],
        "items": [
            {"role": "Brain", "name": "OpenAI GPT-4o", "note": "Requires API key"},
            {"role": "Writing & Code", "name": "Claude worker", "note": "Optional — add API key later"},
        ],
        "why": "Maximum capability. Needs an OpenAI API key — pay per use, no monthly subscription required.",
    })

    return recs


@app.get("/api/auto-detect")
async def auto_detect():
    detected = []
    if os.environ.get("GROQ_API_KEY"):
        detected.append({"provider": "groq", "model": "llama-3.3-70b-versatile", "label": "Groq · Llama 3.3 70B"})
    if os.environ.get("OPENAI_API_KEY"):
        detected.append({"provider": "openai", "model": "gpt-4o", "label": "OpenAI · GPT-4o"})
    if os.environ.get("ANTHROPIC_API_KEY"):
        detected.append({"provider": "anthropic", "model": "claude-3-5-sonnet-20241022", "label": "Anthropic · Claude 3.5 Sonnet"})
    return {"detected": detected, "any_found": bool(detected)}


@app.post("/api/auto-detect/apply")
async def apply_auto_detected():
    updates: dict = {}
    if key := os.environ.get("GROQ_API_KEY"):
        updates = {"brain_provider": "groq", "brain_model": "llama-3.3-70b-versatile", "brain_api_key": key, "groq_api_key": key}
    elif key := os.environ.get("OPENAI_API_KEY"):
        updates = {"brain_provider": "openai", "brain_model": "gpt-4o", "brain_api_key": key}
    elif key := os.environ.get("ANTHROPIC_API_KEY"):
        updates = {"brain_provider": "anthropic", "brain_model": "claude-3-5-sonnet-20241022", "brain_api_key": key}
    if updates:
        _settings_store.save(updates)
    return {"ok": True}


@app.get("/api/system-info")
async def get_system_info():
    cpu_cores = psutil.cpu_count(logical=False) or psutil.cpu_count() or 1
    cpu_logical = psutil.cpu_count() or cpu_cores
    freq = psutil.cpu_freq()
    cpu_ghz = round(freq.max / 1000, 1) if freq and freq.max else None
    cpu_model = platform.processor() or platform.machine() or "Unknown CPU"

    mem = psutil.virtual_memory()
    ram_gb = round(mem.total / 1024**3, 1)

    gpus = _detect_gpus()

    recommendations = _build_recommendations(ram_gb, gpus)

    return {
        "os": platform.system(),
        "cpu": {
            "model": cpu_model,
            "cores": cpu_cores,
            "logical": cpu_logical,
            "ghz": cpu_ghz,
        },
        "ram_gb": ram_gb,
        "gpu": gpus,
        "recommendations": recommendations,
    }


@app.get("/api/ollama/install")
async def install_ollama_sse():
    os_name = platform.system()

    async def generate():
        if os_name == "Linux":
            yield {"data": json.dumps({"type": "info", "message": "Detected Linux — running Ollama installer…"})}
            try:
                proc = await asyncio.create_subprocess_shell(
                    "curl -fsSL https://ollama.com/install.sh | sh",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,
                )
                while True:
                    line = await proc.stdout.readline()
                    if not line:
                        break
                    text = line.decode().rstrip()
                    if text:
                        yield {"data": json.dumps({"type": "output", "message": text})}
                rc = await proc.wait()
                if rc == 0:
                    yield {"data": json.dumps({"type": "success", "message": "Ollama installed successfully!"})}
                else:
                    yield {"data": json.dumps({"type": "error", "message": f"Installer exited with code {rc}"})}
            except Exception as e:
                yield {"data": json.dumps({"type": "error", "message": str(e)})}
        elif os_name == "Darwin":
            yield {"data": json.dumps({"type": "platform", "os": "mac", "message": "macOS detected — please download Ollama from ollama.com/download"})}
        else:
            yield {"data": json.dumps({"type": "platform", "os": "windows", "message": "Windows detected — please download Ollama from ollama.com/download"})}

    return EventSourceResponse(generate())


@app.post("/api/ollama/start")
async def start_ollama():
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            try:
                r = await client.get("http://localhost:11434/api/tags")
                if r.status_code == 200:
                    return {"ok": True, "message": "Ollama is already running"}
            except Exception:
                pass
        proc = await asyncio.create_subprocess_exec(
            "ollama", "serve",
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
            start_new_session=True,
        )
        _ = proc
        await asyncio.sleep(2.5)
        async with httpx.AsyncClient(timeout=3.0) as client:
            try:
                r = await client.get("http://localhost:11434/api/tags")
                if r.status_code == 200:
                    return {"ok": True, "message": "Ollama started — models loading"}
            except Exception:
                pass
        return {"ok": True, "message": "Ollama start command sent — may take a few seconds"}
    except FileNotFoundError:
        return {"ok": False, "message": "ollama not found — install it first"}
    except Exception as e:
        return {"ok": False, "message": str(e)}


@app.get("/api/workers")
async def get_workers():
    return {
        "workers": [
            {"name": "claude", "description": "Deep coding, logic, text analysis, and complex reasoning via Anthropic Claude", "requires": "claude_api_key"},
            {"name": "video", "description": "Video generation and manipulation via FAL.ai / Seedance", "requires": "fal_api_key or seedance_api_key"},
            {"name": "local", "description": "File system operations, PC monitoring (CPU/RAM/disk), shell commands", "requires": "none"},
            {"name": "osint", "description": "Domain/IP WHOIS, DNS lookup, HTTP probing, email analysis", "requires": "none"},
        ]
    }
