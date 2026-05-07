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
