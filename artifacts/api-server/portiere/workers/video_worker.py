from typing import AsyncIterator, Any
from portiere.workers.base import BaseWorker
from portiere.models import SettingsModel
import httpx
import asyncio


class VideoWorker(BaseWorker):
    name = "video"
    description = "Video generation and manipulation via FAL.ai / Seedance"

    async def execute(
        self,
        task: str,
        parameters: dict[str, Any],
        context: str = "",
    ) -> AsyncIterator[dict]:
        fal_key = self.settings.fal_api_key
        seedance_key = self.settings.seedance_api_key

        if not fal_key and not seedance_key:
            yield {"type": "worker_error", "worker": self.name, "error": "No video API key configured. Add FAL_API_KEY or Seedance key in Settings > Vault."}
            return

        prompt = task
        if context:
            prompt = f"{task}\n\nContext: {context}"

        yield {"type": "worker_thinking", "worker": self.name, "content": f"Preparing video generation prompt..."}

        if fal_key:
            async for event in self._run_fal(prompt, parameters, fal_key):
                yield event
        elif seedance_key:
            async for event in self._run_seedance(prompt, parameters, seedance_key):
                yield event

    async def _run_fal(self, prompt: str, parameters: dict, api_key: str) -> AsyncIterator[dict]:
        model = parameters.get("model", "fal-ai/fast-svd-lcm")
        yield {"type": "worker_thinking", "worker": self.name, "content": f"Submitting job to FAL.ai ({model})..."}

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                headers = {"Authorization": f"Key {api_key}", "Content-Type": "application/json"}
                payload = {
                    "prompt": prompt,
                    "num_inference_steps": parameters.get("steps", 4),
                }
                resp = await client.post(
                    f"https://queue.fal.run/{model}",
                    json=payload,
                    headers=headers,
                )
                resp.raise_for_status()
                data = resp.json()
                request_id = data.get("request_id")

                if not request_id:
                    yield {"type": "worker_error", "worker": self.name, "error": f"No request_id in FAL response: {data}"}
                    return

                yield {"type": "worker_thinking", "worker": self.name, "content": f"Job queued (ID: {request_id}). Polling for result..."}

                for _ in range(60):
                    await asyncio.sleep(3)
                    status_resp = await client.get(
                        f"https://queue.fal.run/{model}/requests/{request_id}/status",
                        headers=headers,
                    )
                    status_data = status_resp.json()
                    status = status_data.get("status", "")
                    yield {"type": "worker_thinking", "worker": self.name, "content": f"Status: {status}"}

                    if status == "COMPLETED":
                        result_resp = await client.get(
                            f"https://queue.fal.run/{model}/requests/{request_id}",
                            headers=headers,
                        )
                        result = result_resp.json()
                        video_url = result.get("video", {}).get("url") or result.get("output", {}).get("video_url")
                        yield {"type": "worker_done", "worker": self.name, "content": f"Video generated successfully!", "data": {"video_url": video_url, "raw": result}}
                        return
                    elif status in ("FAILED", "CANCELLED"):
                        yield {"type": "worker_error", "worker": self.name, "error": f"Job {status}: {status_data}"}
                        return

                yield {"type": "worker_error", "worker": self.name, "error": "Timeout waiting for video generation"}

        except Exception as e:
            yield {"type": "worker_error", "worker": self.name, "error": str(e)}

    async def _run_seedance(self, prompt: str, parameters: dict, api_key: str) -> AsyncIterator[dict]:
        yield {"type": "worker_thinking", "worker": self.name, "content": "Submitting to Seedance API..."}
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                payload = {"prompt": prompt, "duration": parameters.get("duration", 5)}
                resp = await client.post("https://api.seedance.ai/v1/generate", json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                yield {"type": "worker_done", "worker": self.name, "content": "Seedance video generated!", "data": data}
        except Exception as e:
            yield {"type": "worker_error", "worker": self.name, "error": str(e)}
