const { app, BrowserWindow, ipcMain } = require("electron/main");
const path = require("node:path");
const {
  watcher,
  stopWatcher,
  fileSearch,
  writePathToFile,
  readPathFromFile,
  rescanFolder,
  toggleTestMode,
  // New Medical Functions
  initMedicalWatcher,
  selectMedicalFolder,
  rescanMedicalFolder,
  readMedicalPathFromFile,
} = require("./app.js");
const { dialog, shell } = require("electron");

function createWindow() {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile("index.html");
  // mainWindow.webContents.openDevTools();
}

const handleSearchFile = (event, fileName) => {
  return fileSearch(fileName);
};

const handleRestartSwitch = (event) => {
  stopWatcher();
  return watcher(event);
};

const handleSelectFolder = async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (!result.canceled) {
      writePathToFile(result.filePaths[0]);
      return result.filePaths[0];
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error selecting folder:", error.message);
    return null;
  }
};

const handleGetFolderPath = (event) => {
  return readPathFromFile();
};

const handleStartWatcher = (event) => {
  return watcher(event);
};

const handleRescanFolder = (event) => {
  return rescanFolder(event);
};

const handleToggleTestMode = (event) => {
  return toggleTestMode(event);
};

// Medical Handlers
const handleGetMedicalFolderPath = (event) => {
  return readMedicalPathFromFile();
};

const handleStartMedicalWatcher = (event) => {
  return initMedicalWatcher(event);
};

const handleSelectMedicalFolder = (event) => {
  // This function in app.js handles dialog + saving + starting watcher
  return selectMedicalFolder(event);
};

const handleRescanMedicalFolder = (event) => {
  return rescanMedicalFolder(event);
};

const handleOpenURL = (event, url) => {
  shell.openExternal(url);
};

app.whenReady().then(() => {
  ipcMain.handle("start-watcher", handleStartWatcher);
  ipcMain.handle("rescan-folder", handleRescanFolder);
  ipcMain.handle("search-file", handleSearchFile);
  ipcMain.handle("restart-switch", handleRestartSwitch);
  ipcMain.handle("select-folder", handleSelectFolder);
  ipcMain.handle("get-folder-path", handleGetFolderPath);

  // New IPC Handlers
  ipcMain.handle("start-medical-watcher", handleStartMedicalWatcher);
  ipcMain.handle("select-medical-folder", handleSelectMedicalFolder);
  ipcMain.handle("get-medical-folder-path", handleGetMedicalFolderPath);
  ipcMain.handle("rescan-medical-folder", handleRescanMedicalFolder);

  ipcMain.handle("open-url", handleOpenURL);
  ipcMain.handle("toggle-test-mode", handleToggleTestMode);
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
