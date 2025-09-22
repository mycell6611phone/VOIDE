"""
interface.py

Purpose
Scaffold for I/O handling across CLI/GUI/API frontends.
Integration
- core_loop perceives via Interface.fetch_event()
- results and critiques flow out via Interface.send_output()
- cost and token usage displayed via Interface.report_usage()
- secrets (API keys) requested via Interface.get_secret()
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

__all__ = [
    "EventType",
    "UserEvent",
    "OutputMessage",
    "TokenUsage",
    "Interface",
    "CLIInterface",
]


class EventType(Enum):
    TEXT = "TEXT"  # freeform text instruction
    FILE = "FILE"  # file path(s) or blob(s)
    BUTTON = "BUTTON"  # GUI button id
    PLAN_CONFIRM = "PLAN_CONFIRM"
    ABORT = "ABORT"


@dataclass
class UserEvent:
    type: EventType
    payload: Dict[str, Any] = field(default_factory=dict)
    ts: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class OutputMessage:
    kind: str  # e.g., "RESULT", "ERROR", "CRITIQUE", "NOTICE"
    payload: Dict[str, Any] = field(default_factory=dict)
    ts: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TokenUsage:
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


class Interface:
    """Abstract I/O adapter."""

    def fetch_event(self, *, timeout_s: Optional[int] = None) -> UserEvent:
        """Block or poll for the next user/system event.

        Raises:
            NotImplementedError: Always in scaffold.
        """

        raise NotImplementedError("Interface.fetch_event is a scaffold.")

    def send_output(self, message: OutputMessage) -> None:
        """Emit a message to the active frontend.

        Raises:
            NotImplementedError: Always in scaffold.
        """

        raise NotImplementedError("Interface.send_output is a scaffold.")

    def ask_confirm(self, prompt: str, *, default: bool = True) -> bool:
        """Request a yes/no confirmation from the user.

        Raises:
            NotImplementedError: Always in scaffold.
        """

        raise NotImplementedError("Interface.ask_confirm is a scaffold.")

    def choose(self, prompt: str, options: List[str], *, multi: bool = False) -> List[str]:
        """Offer a deterministic choice list; return selection(s).

        Raises:
            NotImplementedError: Always in scaffold.
        """

        raise NotImplementedError("Interface.choose is a scaffold.")

    def get_secret(self, key_name: str) -> str:
        """Return a secret (e.g., API key) from a managed store or prompt.

        Raises:
            NotImplementedError: Always in scaffold.
        """

        raise NotImplementedError("Interface.get_secret is a scaffold.")

    def report_usage(self, usages: List[TokenUsage]) -> None:
        """Display token/cost usage records.

        Raises:
            NotImplementedError: Always in scaffold.
        """

        raise NotImplementedError("Interface.report_usage is a scaffold.")

    def notify(self, title: str, body: str, *, level: str = "info") -> None:
        """Lightweight notification channel.

        Raises:
            NotImplementedError: Always in scaffold.
        """

        raise NotImplementedError("Interface.notify is a scaffold.")


class CLIInterface(Interface):
    """CLI adapter scaffold. All methods raise in this scaffold."""

    def fetch_event(self, *, timeout_s: Optional[int] = None) -> UserEvent:  # type: ignore[override]
        raise NotImplementedError("CLIInterface.fetch_event is a scaffold.")

    def send_output(self, message: OutputMessage) -> None:  # type: ignore[override]
        raise NotImplementedError("CLIInterface.send_output is a scaffold.")

    def ask_confirm(self, prompt: str, *, default: bool = True) -> bool:  # type: ignore[override]
        raise NotImplementedError("CLIInterface.ask_confirm is a scaffold.")

    def choose(self, prompt: str, options: List[str], *, multi: bool = False) -> List[str]:  # type: ignore[override]
        raise NotImplementedError("CLIInterface.choose is a scaffold.")

    def get_secret(self, key_name: str) -> str:  # type: ignore[override]
        raise NotImplementedError("CLIInterface.get_secret is a scaffold.")

    def report_usage(self, usages: List[TokenUsage]) -> None:  # type: ignore[override]
        raise NotImplementedError("CLIInterface.report_usage is a scaffold.")

    def notify(self, title: str, body: str, *, level: str = "info") -> None:  # type: ignore[override]
        raise NotImplementedError("CLIInterface.notify is a scaffold.")
