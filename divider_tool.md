Drop‑in Integration Points

Decoding: add token‑mask grammars for schema‑first emission; bind to Protobuf at the boundary.

Control plane: place Dividers between generation, tools, memory, and evaluators; log rule fires.

Causal layer: keep a lightweight SCM and counterfactual tester as a callable module; gate on its verdict.

Tool synthesis: codegen → sandbox → attach behind a Divider; fall back on failure.

Appendix A — Minimal Divider Gate (Python, ready to use)

File: divider.py
from typing import Any, Callable, Dict, List, Optional

RouteHandler = Callable[[Dict[str, Any]], None]
Rule = Callable[[Dict[str, Any]], bool]

class Divider:
    """
    AND/OR logic gate with remote triggers for reactive orchestration.
    - add_rule(fn): register a boolean rule on the data packet
    - add_trigger(name): declare an external trigger
    - set_trigger(name, state=True): activate/deactivate trigger
    - connect_output(name, handler): attach handlers for 'pass'|'divert'|'trigger'
    - route(data): evaluate + dispatch
    Safety: max_steps prevents runaway recursion when used in loops.
    """
    __slots__ = ("mode", "rules", "triggers", "outputs", "max_steps", "_steps")

    def __init__(self, mode: str = "AND", max_steps: int = 100):
        m = mode.upper()
        if m not in ("AND", "OR"):
            raise ValueError("mode must be 'AND' or 'OR'")
        self.mode: str = m
        self.rules: List[Rule] = []
        self.triggers: Dict[str, bool] = {}
        self.outputs: Dict[str, RouteHandler] = {}
        self.max_steps: int = max(1, max_steps)
        self._steps: int = 0

    # --- configuration ---
    def add_rule(self, rule: Rule) -> None:
        self.rules.append(rule)

    def add_trigger(self, name: str) -> None:
        self.triggers[name] = False

    def set_trigger(self, name: str, state: bool = True) -> None:
        if name not in self.triggers:
            raise KeyError(f"unknown trigger: {name}")
        self.triggers[name] = state

    def connect_output(self, name: str, handler: RouteHandler) -> None:
        if name not in ("pass", "divert", "trigger"):
            raise ValueError("output name must be 'pass', 'divert', or 'trigger'")
        self.outputs[name] = handler

    # --- evaluation ---
    def _rules_pass(self, data: Dict[str, Any]) -> bool:
        if not self.rules:
            return True
        results = (r(data) for r in self.rules)
        return all(results) if self.mode == "AND" else any(results)

    def _has_trigger(self) -> bool:
        return any(self.triggers.values())

    # --- routing ---
    def route(self, data: Dict[str, Any]) -> None:
        if self._steps >= self.max_steps:
            # prevent runaway loops
            if "divert" in self.outputs:
                self.outputs["divert"]({**data, "_error": "max_steps_exceeded"})
            return
        self._steps += 1

        if self._has_trigger() and "trigger" in self.outputs:
            self.outputs["trigger"](data)
            return

        if self._rules_pass(data):
            handler = self.outputs.get("pass")
        else:
            handler = self.outputs.get("divert")

        if handler:
            handler(data)

File: example_usage.py

from divider import Divider

def to_llm(pkt): print("→ LLM", pkt)
def to_debate(pkt): print("→ Debate", pkt)
def to_log(pkt): print("→ Log (trigger)", pkt)

if __name__ == "__main__":
    gate = Divider(mode="AND", max_steps=16)
    gate.add_rule(lambda p: p.get("schema_valid", False))
    gate.add_rule(lambda p: p.get("content_type") == "code")

    gate.add_trigger("timeout")
    gate.connect_output("pass", to_llm)
    gate.connect_output("divert", to_debate)
    gate.connect_output("trigger", to_log)

    gate.route({"schema_valid": True, "content_type": "code"})
    gate.route({"schema_valid": False, "content_type": "text"})

    gate.set_trigger("timeout", True)
    gate.route({"schema_valid": True, "content_type": "code"})


from divider import Divider

def to_llm(pkt): print("→ LLM", pkt)
def to_debate(pkt): print("→ Debate", pkt)
def to_log(pkt): print("→ Log (trigger)", pkt)

if __name__ == "__main__":
    gate = Divider(mode="AND", max_steps=16)
    gate.add_rule(lambda p: p.get("schema_valid", False))
    gate.add_rule(lambda p: p.get("content_type") == "code")

    gate.add_trigger("timeout")
    gate.connect_output("pass", to_llm)
    gate.connect_output("divert", to_debate)
    gate.connect_output("trigger", to_log)

    gate.route({"schema_valid": True, "content_type": "code"})
    gate.route({"schema_valid": False, "content_type": "text"})

    gate.set_trigger("timeout", True)
    gate.route({"schema_valid": True, "content_type": "code"})

Appendix B — Protobuf boundary (schema‑first I/O)

File: router.proto

syntax = "proto3";
package voide;

message Packet {
  string content_type = 1;   // "text", "code", "json", "binary"
  bool schema_valid   = 2;   // upstream validator result
  double uncertainty  = 3;   // 0.0..1.0 from evaluator
  bytes payload       = 4;   // raw content or encoded data
}
Bind model outputs to this schema via token‑mask grammars or a JSON‑to‑Proto adapter, then feed Packet through Dividers. Strict boundary, flexible interior.
