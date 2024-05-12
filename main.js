const { app, BrowserWindow, ipcMain } = require("electron/main");
const path = require("node:path");
const {
  watcher,
  stopWatcher,
  fileSearch,
  writePathToFile,
  readPathFromFile,
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

const handleOpenURL = (event, url) => {
  shell.openExternal(url);
};

app.whenReady().then(() => {
  ipcMain.handle("start-watcher", handleStartWatcher);
  ipcMain.handle("search-file", handleSearchFile);
  ipcMain.handle("restart-switch", handleRestartSwitch);
  ipcMain.handle("select-folder", handleSelectFolder);
  ipcMain.handle("get-folder-path", handleGetFolderPath);
  ipcMain.handle("open-url", handleOpenURL);
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
