from typing import AsyncIterator, Any
from portiere.workers.base import BaseWorker
from portiere.models import SettingsModel
import asyncio
import os
import json


class LocalWorker(BaseWorker):
    name = "local"
    description = "File system operations, PC monitoring via psutil, and local shell commands"

    async def execute(
        self,
        task: str,
        parameters: dict[str, Any],
        context: str = "",
    ) -> AsyncIterator[dict]:
        action = parameters.get("action", "monitor")

        if action == "monitor" or "monitor" in task.lower() or "system" in task.lower() or "cpu" in task.lower() or "memory" in task.lower():
            async for event in self._system_monitor(parameters):
                yield event

        elif action == "read_file" or "read" in task.lower():
            path = parameters.get("path") or self._extract_path(task, context)
            async for event in self._read_file(path):
                yield event

        elif action == "list_dir" or "list" in task.lower() or "ls" in task.lower():
            path = parameters.get("path", ".") or self._extract_path(task, context) or "."
            async for event in self._list_dir(path):
                yield event

        elif action == "shell" or "run" in task.lower() or "execute" in task.lower():
            if not self.settings.allow_shell_commands:
                yield {"type": "worker_error", "worker": self.name, "error": "Shell commands are disabled. Enable them in Settings > Local Worker."}
                return
            cmd = parameters.get("command") or task
            async for event in self._run_shell(cmd):
                yield event

        else:
            async for event in self._system_monitor(parameters):
                yield event

    def _extract_path(self, task: str, context: str) -> str:
        import re
        combined = task + " " + context
        matches = re.findall(r'["\']([^"\']+\.[a-zA-Z]{1,10})["\']|(/[\w/\-.]+)', combined)
        for m in matches:
            candidate = m[0] or m[1]
            if candidate:
                return candidate
        return "."

    async def _system_monitor(self, parameters: dict) -> AsyncIterator[dict]:
        try:
            import psutil
            yield {"type": "worker_thinking", "worker": self.name, "content": "Collecting system metrics..."}

            cpu = psutil.cpu_percent(interval=1)
            mem = psutil.virtual_memory()
            disk = psutil.disk_usage("/")
            net = psutil.net_io_counters()
            procs = []
            for p in sorted(psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]), key=lambda x: x.info.get("cpu_percent", 0) or 0, reverse=True)[:10]:
                try:
                    procs.append(p.info)
                except Exception:
                    pass

            data = {
                "cpu_percent": cpu,
                "cpu_count": psutil.cpu_count(),
                "memory": {
                    "total_gb": round(mem.total / 1e9, 2),
                    "used_gb": round(mem.used / 1e9, 2),
                    "percent": mem.percent,
                },
                "disk": {
                    "total_gb": round(disk.total / 1e9, 2),
                    "used_gb": round(disk.used / 1e9, 2),
                    "percent": disk.percent,
                },
                "network": {
                    "bytes_sent_mb": round(net.bytes_sent / 1e6, 2),
                    "bytes_recv_mb": round(net.bytes_recv / 1e6, 2),
                },
                "top_processes": procs,
            }

            summary = (
                f"CPU: {cpu}% | RAM: {mem.percent}% ({round(mem.used/1e9,1)}/{round(mem.total/1e9,1)} GB) | "
                f"Disk: {disk.percent}% used"
            )
            yield {"type": "worker_done", "worker": self.name, "content": summary, "data": data}

        except ImportError:
            yield {"type": "worker_error", "worker": self.name, "error": "psutil not installed. Run: pip install psutil"}
        except Exception as e:
            yield {"type": "worker_error", "worker": self.name, "error": str(e)}

    async def _read_file(self, path: str) -> AsyncIterator[dict]:
        if not path:
            yield {"type": "worker_error", "worker": self.name, "error": "No file path specified"}
            return
        yield {"type": "worker_thinking", "worker": self.name, "content": f"Reading file: {path}"}
        try:
            if not os.path.exists(path):
                yield {"type": "worker_error", "worker": self.name, "error": f"File not found: {path}"}
                return
            with open(path, "r", errors="replace") as f:
                content = f.read()
            size = os.path.getsize(path)
            preview = content[:5000] + ("...[truncated]" if len(content) > 5000 else "")
            yield {"type": "worker_done", "worker": self.name, "content": preview, "data": {"path": path, "size_bytes": size, "lines": content.count("\n")}}
        except Exception as e:
            yield {"type": "worker_error", "worker": self.name, "error": str(e)}

    async def _list_dir(self, path: str) -> AsyncIterator[dict]:
        yield {"type": "worker_thinking", "worker": self.name, "content": f"Listing directory: {path}"}
        try:
            entries = []
            for entry in os.scandir(path):
                entries.append({
                    "name": entry.name,
                    "is_dir": entry.is_dir(),
                    "size": entry.stat().st_size if not entry.is_dir() else None,
                })
            entries.sort(key=lambda x: (not x["is_dir"], x["name"]))
            summary = f"Found {len(entries)} entries in {path}"
            yield {"type": "worker_done", "worker": self.name, "content": summary, "data": {"path": path, "entries": entries}}
        except Exception as e:
            yield {"type": "worker_error", "worker": self.name, "error": str(e)}

    async def _run_shell(self, command: str) -> AsyncIterator[dict]:
        allowlist = self.settings.shell_command_allowlist
        if allowlist:
            base_cmd = command.strip().split()[0]
            if base_cmd not in allowlist:
                yield {"type": "worker_error", "worker": self.name, "error": f"Command '{base_cmd}' not in allowlist: {allowlist}"}
                return

        yield {"type": "worker_thinking", "worker": self.name, "content": f"Executing: {command}"}
        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=30)
            output = stdout.decode(errors="replace")
            yield {"type": "worker_done", "worker": self.name, "content": output, "data": {"exit_code": proc.returncode}}
        except asyncio.TimeoutError:
            yield {"type": "worker_error", "worker": self.name, "error": "Command timed out (30s)"}
        except Exception as e:
            yield {"type": "worker_error", "worker": self.name, "error": str(e)}
