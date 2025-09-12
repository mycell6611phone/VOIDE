import { BrowserWindow } from "electron";
import { telemetryEvent, TelemetryPayload } from "@voide/ipc";

export function emitTelemetry(ev: TelemetryPayload) {
  BrowserWindow.getAllWindows().forEach((w) => {
    w.webContents.send(telemetryEvent.name, ev);
  });
}

