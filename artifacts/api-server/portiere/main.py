import json
import os
import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from portiere.models import OrchestrateRequest
from portiere.orchestrator import Orchestrator
from portiere.settings_store import SettingsStore

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
