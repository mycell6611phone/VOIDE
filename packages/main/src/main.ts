
// ESM main process entry for Electron + Vite renderer
import { app, BrowserWindow, session, shell } from 'electron';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupIPC } from './ipc.js';
import { initDB } from './services/db.js';
import { registerHandlers } from './ipc/handlers.js';

const DEFAULT_RENDERER_DEV_PORT = 5173;

function resolveRendererDevServerURL(): string | undefined {
  const explicitUrl = process.env.VITE_DEV_SERVER_URL;
  if (explicitUrl) return explicitUrl;

  if (app.isPackaged) return undefined;

  const envPort = Number.parseInt(process.env.VITE_RENDERER_PORT ?? '', 10);
  const port = Number.isInteger(envPort) && envPort > 0 ? envPort : DEFAULT_RENDERER_DEV_PORT;
  const resolvedUrl = `http://localhost:${port}`;

  if (!process.env.VITE_RENDERER_PORT) process.env.VITE_RENDERER_PORT = String(port);
  process.env.VITE_DEV_SERVER_URL = resolvedUrl;
  return resolvedUrl;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Free-mode defaults
if (!process.env.VOIDE_FREE) process.env.VOIDE_FREE = '1';

// Optional CUDA toggle
if (process.env.VOIDE_ENABLE_CUDA !== '1') app.disableHardwareAcceleration();

function blockNetworkRequests() {
  const sess = session.defaultSession;
  sess.webRequest.onBeforeRequest((details, callback) => {
    try {
      const url = details.url;
      if (url.startsWith('file://')) return callback({ cancel: false });
      if (process.env.NODE_ENV === 'development' && url.startsWith('dev://')) return callback({ cancel: false });
      return callback({ cancel: true });
    } catch {
      return callback({ cancel: true });
    }
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  const devUrl = resolveRendererDevServerURL();
  if (devUrl) {
    await win.loadURL(devUrl);
  } else {
    await win.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  blockNetworkRequests();
  await initDB().catch(() => {}); // keep free-mode resilient
  setupIPC();
  registerHandlers();
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

