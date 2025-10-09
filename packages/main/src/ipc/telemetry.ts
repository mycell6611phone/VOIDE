import { BrowserWindow } from "electron";
import {
  telemetryEvent,
  TelemetryPayload,
  flowRunPayloadsEvent,
  FlowLastRunPayloadsRes,
} from "@voide/ipc";
import { TelemetryEventType } from "@voide/shared";
import { emitSchedulerTelemetry } from "../services/telemetry.js";

export function emitTelemetry(ev: TelemetryPayload) {
  BrowserWindow.getAllWindows().forEach((w) => {
    w.webContents.send(telemetryEvent.name, ev);
  });
  mirrorToSidecar(ev);
}

export function emitNodeState(
  runId: string,
  nodeId: string,
  state: string,
  at: number = Date.now(),
) {
  emitTelemetry({ type: "node_state", runId, nodeId, state, at });
}

export function emitEdgeTransfer(
  runId: string,
  edgeId: string,
  bytes: number,
  at: number = Date.now(),
) {
  emitTelemetry({ type: "edge_transfer", runId, edgeId, bytes, at });
}

export function emitNodeError(
  runId: string,
  nodeId: string,
  message: string,
  at: number = Date.now(),
  code = "runtime_error",
) {
  emitTelemetry({ type: "error", runId, nodeId, code, message, at });
}

export function emitRunPayloads(runId: string, payloads: FlowLastRunPayloadsRes) {
  const payload = { runId, payloads } as const;
  BrowserWindow.getAllWindows().forEach((w) => {
    w.webContents.send(flowRunPayloadsEvent.name, payload);
  });
}

function mirrorToSidecar(ev: TelemetryPayload) {
  switch (ev.type) {
    case "node_state": {
      if (ev.state === "running") {
        emitSchedulerTelemetry({
          type: TelemetryEventType.NodeStart,
          payload: { id: ev.nodeId, span: ev.runId },
        });
      } else if (ev.state === "ok") {
        emitSchedulerTelemetry({
          type: TelemetryEventType.NodeEnd,
          payload: { id: ev.nodeId, span: ev.runId, ok: true },
        });
      } else if (ev.state === "warn") {
        emitSchedulerTelemetry({
          type: TelemetryEventType.SchemaWarn,
          payload: { id: ev.nodeId, span: ev.runId, reason: "warn" },
        });
      } else if (ev.state === "error") {
        emitSchedulerTelemetry({
          type: TelemetryEventType.NodeEnd,
          payload: { id: ev.nodeId, span: ev.runId, ok: false },
        });
        emitSchedulerTelemetry({
          type: TelemetryEventType.Stalled,
          payload: { id: ev.nodeId, span: ev.runId },
        });
      }
      break;
    }
    case "error": {
      emitSchedulerTelemetry({
        type: TelemetryEventType.NodeEnd,
        payload: { id: ev.nodeId, span: ev.runId, ok: false, reason: ev.message },
      });
      emitSchedulerTelemetry({
        type: TelemetryEventType.Stalled,
        payload: { id: ev.nodeId, span: ev.runId, reason: ev.message },
      });
      break;
    }
    case "operation_progress": {
      emitSchedulerTelemetry({
        type: TelemetryEventType.AckClear,
        payload: { id: ev.nodeId, span: ev.runId },
      });
      break;
    }
    default:
      break;
  }
}


