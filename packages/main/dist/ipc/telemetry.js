import { BrowserWindow } from "electron";
import { telemetryEvent } from "@voide/ipc";
export function emitTelemetry(ev) {
    BrowserWindow.getAllWindows().forEach((w) => {
        w.webContents.send(telemetryEvent.name, ev);
    });
}
