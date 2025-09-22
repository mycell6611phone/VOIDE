"""
experimenter.py

Purpose
Scaffold for hypothesis-driven self-tests and what-if experiments.
No business logic. Methods raise NotImplementedError.

Integration
- core_loop may call Experimenter to validate plans or improvements
- self_critic suggestions can be turned into hypotheses here
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

__all__ = [
    "ExperimentStatus",
    "Hypothesis",
    "Observation",
    "Experiment",
    "ExperimentResult",
    "Experimenter",
]


class ExperimentStatus(Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


@dataclass
class Hypothesis:
    id: str
    statement: str
    variables: Dict[str, Any] = field(default_factory=dict)
    metrics: List[str] = field(default_factory=list)  # names of metrics to collect
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Observation:
    name: str
    value: Any
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Experiment:
    id: str
    hypothesis_id: str
    plan: List[str] = field(default_factory=list)  # ordered steps (natural language)
    environment: Dict[str, Any] = field(default_factory=dict)  # e.g., model versions, seeds
    status: ExperimentStatus = ExperimentStatus.PENDING
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class ExperimentResult:
    hypothesis_id: str
    success: Optional[bool] = None
    metrics: Dict[str, float] = field(default_factory=dict)
    observations: List[Observation] = field(default_factory=list)
    notes: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)


class Experimenter:
    """Scaffold API for designing and running self-experiments."""

    def init(self, *, namespace: str = "default", policy: Optional[Dict[str, Any]] = None) -> None:
        """Initialize the experimenter namespace and policy."""

        self.namespace = namespace
        self.policy = policy or {}
        # No initialization logic in scaffold.

    def propose_hypothesis(self, context: Dict[str, Any]) -> Hypothesis:
        """Create a Hypothesis from critique or metrics.

        Args:
            context: Minimal context dict (e.g., failing tests, latency, cost).

        Returns:
            Hypothesis: Proposed hypothesis object.

        Raises:
            NotImplementedError: Always in scaffold.
        """

        raise NotImplementedError("Experimenter.propose_hypothesis is a scaffold.")

    def design_experiment(self, hypothesis: Hypothesis) -> Experiment:
        """Produce an Experiment plan to test a hypothesis.

        Raises:
            NotImplementedError: Always in scaffold.
        """

        raise NotImplementedError("Experimenter.design_experiment is a scaffold.")

    def run(self, experiment: Experiment) -> List[Observation]:
        """Execute an experiment plan and collect observations.

        Raises:
            NotImplementedError: Always in scaffold.
        """

        raise NotImplementedError("Experimenter.run is a scaffold.")

    def evaluate(self, experiment: Experiment, observations: List[Observation]) -> ExperimentResult:
        """Score results against hypothesis metrics and decide success.

        Raises:
            NotImplementedError: Always in scaffold.
        """

        raise NotImplementedError("Experimenter.evaluate is a scaffold.")

    def record(self, result: ExperimentResult) -> None:
        """Record result for future memory/training.

        Raises:
            NotImplementedError: Always in scaffold.
        """

        raise NotImplementedError("Experimenter.record is a scaffold.")

    def list_results(self, *, limit: Optional[int] = None) -> List[ExperimentResult]:
        """List past results for audits.

        Raises:
            NotImplementedError: Always in scaffold.
        """

        raise NotImplementedError("Experimenter.list_results is a scaffold.")
