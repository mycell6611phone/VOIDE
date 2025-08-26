"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const ipc_1 = require("./ipc");
const db_1 = require("./services/db");
let win = null;
function createWindow() {
    win = new electron_1.BrowserWindow({
        width: 1320,
        height: 900,
        webPreferences: {
            preload: path_1.default.join(__dirname, "../../preload/dist/preload.js"),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    if (process.env.VITE_DEV_SERVER_URL)
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    else
        win.loadFile(path_1.default.join(__dirname, "../../renderer/dist/index.html"));
    win.webContents.setWindowOpenHandler(({ url }) => { electron_1.shell.openExternal(url); return { action: 'deny' }; });
}
electron_1.app.whenReady().then(async () => {
    await (0, db_1.initDB)();
    createWindow();
    (0, ipc_1.setupIPC)();
    electron_1.app.on("activate", () => { if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow(); });
});
electron_1.app.on("window-all-closed", () => { if (process.platform !== "darwin")
    electron_1.app.quit(); });
