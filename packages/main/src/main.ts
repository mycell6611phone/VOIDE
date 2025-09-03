import { app, BrowserWindow } from "electron";
import path from "path";
import { setupIPC } from "./ipc";

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    // Dev mode: load from Vite server
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // Production build: load packaged index.html
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
app.whenReady().then(() => {
  setupIPC();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
