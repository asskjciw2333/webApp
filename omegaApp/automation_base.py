from abc import ABC, abstractmethod
from enum import Enum
import time
from typing import Dict, Any


class AutomationStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"


class AutomationBase(ABC):
    def __init__(self, instance_id: str):
        self.instance_id = instance_id
        self.status = AutomationStatus.PENDING
        self.progress = 0
        self.start_time = None
        self.end_time = None

    @abstractmethod
    def run(self) -> None:
        pass

    def start(self) -> None:
        self.status = AutomationStatus.RUNNING
        self.start_time = time.time()
        self.run()

    def update_progress(self, progress: int) -> None:
        self.progress = progress

    def complete(self) -> None:
        self.status = AutomationStatus.COMPLETED
        self.progress = 101
        self.end_time = time.time()

    def fail(self, error_message: str) -> None:
        self.status = AutomationStatus.FAILED
        self.end_time = time.time()

    def get_status(self) -> Dict[str, Any]:
        return {
            "instance_id": self.instance_id,
            "status": self.status.value,
            "progress": self.progress,
            "start_time": self.start_time,
            "end_time": self.end_time
        }
