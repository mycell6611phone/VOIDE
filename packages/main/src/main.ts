
// ESM main process entry for Electron + Vite renderer
import { app, BrowserWindow, session, shell } from 'electron';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupIPC } from './ipc.js';
import { initDB, closeDB } from './services/db.js';
import { registerHandlers } from './ipc/handlers.js';
import { shutdownOrchestrator } from './orchestrator/engine.js';

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
const PRELOAD_BUNDLE_PATH = path.join(__dirname, '../../preload/dist/preload.js');

let mainWindow: BrowserWindow | null = null;
let chatWindow: BrowserWindow | null = null;
let exitRequested = false;
let shutdownSequence: Promise<void> | null = null;

async function performGracefulShutdown() {
  if (shutdownSequence) {
    return shutdownSequence;
  }

  shutdownSequence = (async () => {
    try {
      await shutdownOrchestrator();
    } catch (error) {
      console.error("Failed to shutdown orchestrator:", error);
    } finally {
      try {
        await closeDB();
      } catch (error) {
        console.error("Failed to close database during shutdown:", error);
      }
    }
  })();

  return shutdownSequence;
}

async function requestAppExit() {
  if (!exitRequested) {
    exitRequested = true;
  }

  await performGracefulShutdown();
  app.quit();
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';
}

// Free-mode defaults
if (!process.env.VOIDE_FREE) process.env.VOIDE_FREE = '1';

// Optional CUDA toggle
if (process.env.VOIDE_ENABLE_CUDA !== '1') app.disableHardwareAcceleration();

function blockNetworkRequests() {
  const sess = session.defaultSession;
  // allow local dev and devtools while keeping file:// blocked-for-everything policy
  const isDevEnvironment = process.env.NODE_ENV === 'development' || !app.isPackaged;

  sess.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url || '';

    // always allow local files
    if (url.startsWith('file://')) return callback({ cancel: false });

    // development allowances
    if (isDevEnvironment) {
      // allow Vite / local dev servers and localhost IPs
      if (
        url.startsWith('http://localhost') ||
        url.startsWith('https://localhost') ||
        url.startsWith('http://127.0.0.1') ||
        url.startsWith('https://127.0.0.1') ||
        url.startsWith('http://[::1]') ||
        url.startsWith('https://[::1]') ||
        url.startsWith('dev://') ||
        url.startsWith('devtools://') ||
        url.includes('chrome-devtools-frontend.appspot.com')
      ) {
        return callback({ cancel: false });
      }

      // allow local websockets used by dev servers
      if (url.startsWith('ws://localhost') || url.startsWith('wss://localhost')) {
        return callback({ cancel: false });
      }
    }

    // default: block
    return callback({ cancel: true });
  });
}

async function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: PRELOAD_BUNDLE_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  const devUrl = resolveRendererDevServerURL();
  if (devUrl) {
    await mainWindow.loadURL(devUrl);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (!exitRequested) {
      event.preventDefault();
      void requestAppExit();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

async function createChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
    if (chatWindow.isMinimized()) chatWindow.restore();
    chatWindow.focus();
    return chatWindow;
  }

  chatWindow = new BrowserWindow({
    width: 600,
    height: 760,
    minWidth: 420,
    minHeight: 480,
    title: 'VOIDE Chat',
    webPreferences: {
      preload: PRELOAD_BUNDLE_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  chatWindow.once('ready-to-show', () => chatWindow?.show());

  const devUrl = resolveRendererDevServerURL();
  if (devUrl) {
    await chatWindow.loadURL(`${devUrl}#/chat`);
  } else {
    await chatWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'), { hash: 'chat' });
  }

  chatWindow.on('closed', () => {
    chatWindow = null;
  });

  return chatWindow;
}

app.whenReady().then(async () => {
  blockNetworkRequests();
  await initDB().catch(() => {}); // keep free-mode resilient
  setupIPC();
  registerHandlers({
    openChatWindow: createChatWindow,
    exitApplication: requestAppExit,
  });
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', (event) => {
  if (!exitRequested) {
    event.preventDefault();
    void requestAppExit();
  }
});

