from typing import AsyncIterator, Optional
from portiere.brain import Brain
from portiere.models import OrchestrateRequest, SettingsModel, BrainDecision
from portiere.settings_store import SettingsStore
from portiere.workers.claude_worker import ClaudeWorker
from portiere.workers.video_worker import VideoWorker
from portiere.workers.local_worker import LocalWorker
from portiere.workers.osint_worker import OSINTWorker
from portiere.workers.search_worker import SearchWorker
import httpx


class Orchestrator:
    def __init__(self, settings_store: SettingsStore):
        self.settings_store = settings_store

    def _get_worker(self, name: str, settings: SettingsModel):
        workers = {
            "claude":  ClaudeWorker,
            "video":   VideoWorker,
            "local":   LocalWorker,
            "osint":   OSINTWorker,
            "search":  SearchWorker,
        }
        cls = workers.get(name.lower())
        if not cls:
            raise ValueError(f"Unknown worker: '{name}'. Available: {list(workers.keys())}")
        return cls(settings)

    async def run(self, request: OrchestrateRequest) -> AsyncIterator[dict]:
        settings = self.settings_store.get_raw()
        brain = Brain(settings)

        file_content = ""
        if request.file_path:
            try:
                with open(request.file_path, "r", errors="replace") as f:
                    file_content = f.read()
                yield {"type": "file_loaded", "content": f"Loaded: {request.file_path}"}
            except Exception as e:
                yield {"type": "warning", "content": f"Could not load file: {e}"}

        decision: Optional[BrainDecision] = None
        async for event in brain.analyze(
            request.message,
            file_content,
            request.context or "",
        ):
            yield event
            if event["type"] == "brain_done":
                decision = BrainDecision(**event["data"])

        if not decision:
            yield {"type": "error", "error": "Brain failed to produce a routing decision"}
            return

        total_steps = len(decision.chain)
        context = file_content

        for step in decision.chain:
            yield {
                "type": "chain_step",
                "step": step.step,
                "total_steps": total_steps,
                "worker": step.worker,
                "content": f"Step {step.step}/{total_steps}: {step.worker}",
            }
            yield {
                "type": "worker_start",
                "worker": step.worker,
                "step": step.step,
                "content": step.task,
            }

            worker_output = ""
            try:
                worker = self._get_worker(step.worker, settings)
            except ValueError as e:
                yield {"type": "worker_error", "worker": step.worker, "error": str(e)}
                continue

            async for event in worker.execute(step.task, step.parameters, context):
                yield event
                if event["type"] == "worker_done":
                    worker_output = event.get("content", "")
                elif event["type"] == "worker_chunk":
                    worker_output += event.get("content", "")

            if worker_output:
                context = worker_output

        yield {
            "type": "complete",
            "content": "Done.",
            "data": {"context": context[:3000]},
        }

    async def list_models(self) -> dict:
        settings = self.settings_store.get_raw()
        result: dict = {"ollama": [], "lmstudio": []}

        try:
            async with httpx.AsyncClient(timeout=3) as client:
                resp = await client.get(f"{settings.ollama_base_url}/api/tags")
                if resp.status_code == 200:
                    result["ollama"] = [
                        {
                            "name": m.get("name"),
                            "size_gb": round(m.get("size", 0) / 1e9, 2),
                            "modified": m.get("modified_at", ""),
                        }
                        for m in resp.json().get("models", [])
                    ]
        except Exception as e:
            result["ollama_error"] = str(e)

        try:
            async with httpx.AsyncClient(timeout=3) as client:
                resp = await client.get(f"{settings.lmstudio_base_url}/models")
                if resp.status_code == 200:
                    result["lmstudio"] = [
                        {"name": m.get("id"), "object": m.get("object")}
                        for m in resp.json().get("data", [])
                    ]
        except Exception as e:
            result["lmstudio_error"] = str(e)

        return result
