from pydantic import BaseModel
from typing import Any, Optional


class OrchestrateRequest(BaseModel):
    message: str
    file_path: Optional[str] = None
    session_id: Optional[str] = None
    context: Optional[str] = None


class ChainStep(BaseModel):
    step: int
    worker: str
    task: str
    parameters: dict[str, Any] = {}


class BrainDecision(BaseModel):
    chain: list[ChainStep]
    reasoning: str


class ExecutionEvent(BaseModel):
    type: str
    content: Optional[str] = None
    worker: Optional[str] = None
    step: Optional[int] = None
    total_steps: Optional[int] = None
    data: Optional[Any] = None
    error: Optional[str] = None


class SettingsModel(BaseModel):
    first_launch: bool = True

    # Brain / LLM
    brain_provider: str = "ollama"
    brain_model: str = "llama3.2"
    brain_api_key: Optional[str] = None
    brain_base_url: str = "http://localhost:11434/v1"

    # Workers
    claude_api_key: Optional[str] = None
    claude_model: str = "claude-3-5-sonnet-20241022"
    openai_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    fal_api_key: Optional[str] = None
    seedance_api_key: Optional[str] = None

    # Local AI endpoints
    ollama_base_url: str = "http://localhost:11434"
    lmstudio_base_url: str = "http://localhost:1234/v1"

    # System access
    allow_shell_commands: bool = False
    shell_command_allowlist: list[str] = []

    # Email / SMTP
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from: Optional[str] = None
    smtp_tls: bool = True

    # User profile — injected into every Brain prompt for personalization
    profile_name: Optional[str] = None
    profile_city: Optional[str] = None
    profile_occupation: Optional[str] = None
    profile_preferences: Optional[str] = None
