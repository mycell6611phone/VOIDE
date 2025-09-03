"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
let win = null;
function createWindow() {
    win = new electron_1.BrowserWindow({
        width: 1320,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
        },
    });
    if (process.env.VITE_DEV_SERVER_URL) {
        // Dev mode: load from Vite server
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    }
    else {
        // Production build: load packaged index.html
        win.loadFile(path_1.default.join(__dirname, "../renderer/index.html"));
    }
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on("activate", () => { if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow(); });
});
electron_1.app.on("window-all-closed", () => { if (process.platform !== "darwin")
    electron_1.app.quit(); });
