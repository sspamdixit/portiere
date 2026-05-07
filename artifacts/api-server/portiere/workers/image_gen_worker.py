from typing import AsyncIterator, Any
import httpx
from portiere.workers.base import BaseWorker


class ImageGenWorker(BaseWorker):
    name = "image_gen"
    description = "Generate AI images from a text prompt via FAL.ai (Flux) — portraits, artwork, product renders, concepts"

    async def execute(self, task: str, parameters: dict[str, Any], context: str = "") -> AsyncIterator[dict]:
        prompt = parameters.get("prompt") or task.strip()
        yield {"type": "worker_thinking", "worker": self.name, "content": f"Generating image: {prompt[:80]}..."}

        if not self.settings.fal_api_key:
            yield {
                "type": "worker_done",
                "worker": self.name,
                "content": f"**Image Generation — FAL.ai key required**\n\nTo generate images, add your FAL.ai API key in **Settings → Image & Video**.\n\nPrompt that would be used: _{prompt}_",
                "data": {"prompt": prompt, "image_url": None},
            }
            return

        try:
            image_url = await self._generate(prompt)
            yield {
                "type": "worker_done",
                "worker": self.name,
                "content": f"**Generated image for:** _{prompt}_",
                "data": {"prompt": prompt, "image_url": image_url},
            }
        except Exception as e:
            yield {"type": "worker_error", "worker": self.name, "error": f"Image generation failed: {e}"}

    async def _generate(self, prompt: str) -> str:
        headers = {
            "Authorization": f"Key {self.settings.fal_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "prompt": prompt,
            "image_size": "landscape_4_3",
            "num_images": 1,
            "enable_safety_checker": True,
        }
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                "https://fal.run/fal-ai/flux/schnell",
                json=payload,
                headers=headers,
            )
            r.raise_for_status()
            data = r.json()
            images = data.get("images", [])
            if images:
                return images[0].get("url", "")
            raise ValueError("No image returned from FAL")
