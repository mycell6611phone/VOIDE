import { app, BrowserWindow } from "electron";
import path from "path";

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 900,
  });
  win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
