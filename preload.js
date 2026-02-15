const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("electronAPI", {
  onSwitch: () => ipcRenderer.invoke("on-switch"),
  offSwitch: () => ipcRenderer.invoke("off-switch"),
  searchFile: (fileName) => ipcRenderer.invoke("search-file", fileName),
  restartSwitch: () => ipcRenderer.invoke("restart-switch"),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  getFolderPath: () => ipcRenderer.invoke("get-folder-path"),
  startWatcher: () => ipcRenderer.invoke("start-watcher"),
  rescanFolder: () => ipcRenderer.invoke("rescan-folder"),

  // Medical Folder API
  selectMedicalFolder: () => ipcRenderer.invoke("select-medical-folder"),
  getMedicalFolderPath: () => ipcRenderer.invoke("get-medical-folder-path"),
  startMedicalWatcher: () => ipcRenderer.invoke("start-medical-watcher"),
  rescanMedicalFolder: () => ipcRenderer.invoke("rescan-medical-folder"),

  toggleTestMode: () => ipcRenderer.invoke("toggle-test-mode"),
  openURL: (url) => ipcRenderer.invoke("open-url", url),
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
});
