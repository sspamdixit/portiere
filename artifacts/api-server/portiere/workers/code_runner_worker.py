import asyncio
import os
import re
import tempfile
from typing import AsyncIterator, Any
from portiere.workers.base import BaseWorker


class CodeRunnerWorker(BaseWorker):
    name = "code_runner"
    description = "Execute Python code directly and return live output — for scripts, calculations, data processing"

    TIMEOUT = 20  # seconds

    async def execute(self, task: str, parameters: dict[str, Any], context: str = "") -> AsyncIterator[dict]:
        code = (
            parameters.get("code")
            or self._extract_code(task)
            or self._extract_code(context)
        )

        if not code:
            # Treat the whole task as raw Python if no code block found
            code = task.strip()

        yield {"type": "worker_thinking", "worker": self.name, "content": "Running your code..."}

        stdout, stderr, timed_out = await self._run(code)

        if timed_out:
            yield {"type": "worker_error", "worker": self.name,
                   "error": f"Code execution timed out after {self.TIMEOUT} seconds."}
            return

        lines = []
        # Show the code block
        lines.append("**Code ran:**")
        lines.append(f"```python\n{code.strip()}\n```")

        if stdout.strip():
            lines.append("**Output:**")
            lines.append(f"```\n{stdout.strip()}\n```")

        if stderr.strip():
            lines.append("**Stderr / Errors:**")
            lines.append(f"```\n{stderr.strip()}\n```")

        if not stdout.strip() and not stderr.strip():
            lines.append("*Code ran successfully with no output.*")

        content = "\n\n".join(lines)
        yield {
            "type": "worker_done",
            "worker": self.name,
            "content": content,
            "data": {"code": code, "stdout": stdout, "stderr": stderr},
        }

    def _extract_code(self, text: str) -> str:
        if not text:
            return ""
        # Fenced code block (```python or ```py or ```)
        m = re.search(r"```(?:python|py)?\s*\n(.*?)```", text, re.DOTALL)
        if m:
            return m.group(1).strip()
        # Indented block (4 spaces)
        lines = text.split("\n")
        code_lines = [l[4:] for l in lines if l.startswith("    ")]
        if len(code_lines) >= 3:
            return "\n".join(code_lines)
        return ""

    async def _run(self, code: str) -> tuple[str, str, bool]:
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(
                suffix=".py", mode="w", delete=False, encoding="utf-8"
            ) as f:
                f.write(code)
                tmp_path = f.name

            proc = await asyncio.create_subprocess_exec(
                "python3", tmp_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    proc.communicate(), timeout=self.TIMEOUT
                )
                return stdout_bytes.decode(errors="replace"), stderr_bytes.decode(errors="replace"), False
            except asyncio.TimeoutError:
                try:
                    proc.kill()
                except Exception:
                    pass
                return "", "", True
        except Exception as e:
            return "", str(e), False
        finally:
            if tmp_path:
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass
