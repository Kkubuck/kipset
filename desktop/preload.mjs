import { contextBridge, ipcRenderer } from "electron";

const nativeBridge = Object.freeze({
  isNative: true,
  platform: process.platform === "darwin" ? "macos" : "windows",
  haptic: async () => {},
  saveImage: (dataUrl, fileName) => ipcRenderer.invoke(
    "kipset:save-image",
    dataUrl,
    fileName,
  ),
  loadState: () => ipcRenderer.invoke("kipset:load-state"),
  saveState: (state) => ipcRenderer.invoke("kipset:save-state", state),
  openExternal: (url) => ipcRenderer.invoke("kipset:open-external", url),
});

contextBridge.exposeInMainWorld("KipsetNative", nativeBridge);
