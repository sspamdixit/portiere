from abc import ABC, abstractmethod
from typing import AsyncIterator, Any
from portiere.models import SettingsModel


class BaseWorker(ABC):
    name: str = "base"
    description: str = ""

    def __init__(self, settings: SettingsModel):
        self.settings = settings

    @abstractmethod
    async def execute(
        self,
        task: str,
        parameters: dict[str, Any],
        context: str = "",
    ) -> AsyncIterator[dict]:
        pass
