import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { setupIPC } from "./ipc.js";
import { initDB } from "./services/db.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (process.env.VOIDE_ENABLE_CUDA !== "1")
    app.disableHardwareAcceleration();
let win = null;
function createWindow() {
    win = new BrowserWindow({
        width: 1320,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, "../../preload/dist/preload.js"),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    if (process.env.VITE_DEV_SERVER_URL)
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    else
        win.loadFile(path.join(__dirname, "../../renderer/dist/index.html"));
    win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}
app.whenReady().then(async () => {
    await initDB();
    createWindow();
    setupIPC();
    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0)
        createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin")
    app.quit(); });
