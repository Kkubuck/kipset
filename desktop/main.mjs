import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  powerSaveBlocker,
  shell,
} from "electron";
import { copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = join(desktopDirectory, "..");
const appHtml = join(projectDirectory, "desktop-dist", "index.html");
const appIcon = join(projectDirectory, "desktop-resources", "icon.png");

let mainWindow;
let displaySleepBlocker;

const safePngName = (fileName) => {
  const candidate = basename(String(fileName || "kipset-result.png"));
  const safe = candidate.replace(/[^a-zA-Z0-9._-]/g, "-");
  return safe.toLowerCase().endsWith(".png") ? safe : `${safe}.png`;
};

const assertTrustedFrame = (event) => {
  if (!event.senderFrame.url.startsWith("file://")) {
    throw new Error("Untrusted app frame");
  }
};

ipcMain.handle("kipset:save-image", async (event, dataUrl, fileName) => {
  assertTrustedFrame(event);

  const marker = "data:image/png;base64,";
  if (typeof dataUrl !== "string" || !dataUrl.startsWith(marker)) {
    throw new Error("Expected a PNG data URL");
  }

  const encoded = dataUrl.slice(marker.length);
  if (encoded.length > 32_000_000) throw new Error("Result image is too large");

  const ownerWindow = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(ownerWindow, {
    title: "Save KIPSET Story",
    defaultPath: join(app.getPath("pictures"), safePngName(fileName)),
    filters: [{ name: "PNG image", extensions: ["png"] }],
  });

  if (result.canceled || !result.filePath) return false;
  await writeFile(result.filePath, Buffer.from(encoded, "base64"));
  return true;
});

ipcMain.handle("kipset:load-state", async (event) => {
  assertTrustedFrame(event);
  try {
    return JSON.parse(await readFile(join(app.getPath("userData"), "kipset-state.json"), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
});

ipcMain.handle("kipset:save-state", async (event, state) => {
  assertTrustedFrame(event);
  const serialized = JSON.stringify(state);
  if (serialized.length > 12_000_000) throw new Error("Local state is too large");
  const storageDirectory = app.getPath("userData");
  const stateFile = join(storageDirectory, "kipset-state.json");
  const temporaryFile = join(storageDirectory, "kipset-state.tmp");
  await mkdir(storageDirectory, { recursive: true });
  await writeFile(temporaryFile, serialized, "utf8");
  try {
    await rename(temporaryFile, stateFile);
  } catch (error) {
    if (!["EEXIST", "EPERM"].includes(error?.code)) throw error;
    await copyFile(temporaryFile, stateFile);
    await rm(temporaryFile, { force: true });
  }
  return true;
});

ipcMain.handle("kipset:open-external", async (event, target) => {
  assertTrustedFrame(event);
  const parsed = new URL(String(target));
  const allowedHosts = ["crossfit.com", "library.crossfit.com", "pacompendium.com", "eparmedx.com", "github.com"];
  if (parsed.protocol !== "https:" || !allowedHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) {
    throw new Error("External destination is not allowed");
  }
  await shell.openExternal(parsed.href);
  return true;
});

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 820,
    minHeight: 650,
    useContentSize: true,
    show: false,
    title: "KIPSET",
    icon: appIcon,
    backgroundColor: "#000000",
    autoHideMenuBar: process.platform !== "darwin",
    webPreferences: {
      preload: join(desktopDirectory, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) event.preventDefault();
  });
  mainWindow.webContents.on("before-input-event", (event, input) => {
    const isFullscreenShortcut = input.type === "keyDown" && (
      input.key === "F11"
      || (process.platform === "darwin" && input.key.toLowerCase() === "f" && input.meta && input.control)
    );
    if (!isFullscreenShortcut) return;
    event.preventDefault();
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => { mainWindow = undefined; });

  await mainWindow.loadFile(appHtml);
};

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

app.whenReady().then(async () => {
  if (process.platform === "darwin") {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: app.name, submenu: [{ role: "about" }, { type: "separator" }, { role: "services" }, { type: "separator" }, { role: "hide" }, { role: "hideOthers" }, { role: "unhide" }, { type: "separator" }, { role: "quit" }] },
      { label: "Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
      { label: "View", submenu: [{ role: "togglefullscreen" }] },
      { label: "Window", submenu: [{ role: "minimize" }, { role: "zoom" }, { role: "front" }] },
    ]));
  } else {
    Menu.setApplicationMenu(null);
  }
  displaySleepBlocker = powerSaveBlocker.start("prevent-display-sleep");
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  if (displaySleepBlocker !== undefined && powerSaveBlocker.isStarted(displaySleepBlocker)) {
    powerSaveBlocker.stop(displaySleepBlocker);
  }
});
