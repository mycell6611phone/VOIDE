import path from "path";
import { fileURLToPath } from "url";
import { setupIPC } from "./ipc.js";
import { initDB } from "./services/db.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (process.env.VOIDE_ENABLE_CUDA !== "1")
    app.disableHardwareAcceleration();
let win = null;
// Ensure VOIDE runs in "free" mode by default.
if (!process.env.VOIDE_FREE) {
    process.env.VOIDE_FREE = "1";
}
function blockNetworkRequests() {
    // Block http/https and websocket requests from the renderer process.
    const allowedProtocols = new Set(["file:"]);
    if (process.env.VITE_DEV_SERVER_URL) {
        // Allow dev:// protocol during development for Vite dev server
        allowedProtocols.add("dev:");
    }
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        try {
            const protocol = new URL(details.url).protocol;
            if (!allowedProtocols.has(protocol)) {
                return callback({ cancel: true });
            }
        }
        catch {
            return callback({ cancel: true });
        }
        callback({});
    });
    // Block network access from the main process as well.
    const block = () => {
        throw new Error("Network access is disabled in VOIDE_FREE mode");
    };
    http.request = block;
    http.get = block;
    https.request = block;
    https.get = block;
}
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
    blockNetworkRequests();
    await initDB();
    createWindow();
    setupIPC();
    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0)
        createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin")
    app.quit(); });
