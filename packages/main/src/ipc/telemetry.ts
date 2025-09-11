import { BrowserWindow } from "electron";
import { telemetryEvent, RunLog } from "@voide/ipc";

export function emitTelemetry(log: RunLog) {
  BrowserWindow.getAllWindows().forEach((w) => {
    w.webContents.send(telemetryEvent.name, log);
  });
}

