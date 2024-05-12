const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("electronAPI", {
  onSwitch: () => ipcRenderer.invoke("on-switch"),
  offSwitch: () => ipcRenderer.invoke("off-switch"),
  searchFile: (fileName) => ipcRenderer.invoke("search-file", fileName),
  restartSwitch: () => ipcRenderer.invoke("restart-switch"),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  getFolderPath: () => ipcRenderer.invoke("get-folder-path"),
  startWatcher: () => ipcRenderer.invoke("start-watcher"),
  openURL: (url) => ipcRenderer.invoke("open-url", url),
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
});
