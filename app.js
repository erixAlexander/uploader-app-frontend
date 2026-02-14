const fs = require("fs-extra");
const axios = require("axios");
const chokidar = require("chokidar"); // Import chokidar
const path = require("path");
const { dialog } = require("electron");
const crypto = require("crypto");

// Variables
let folderPath = null;
const PROD_URL = "https://uploader-app-service-tpdnlyeuqa-uc.a.run.app/api";
const TEST_URL = "http://localhost:8000/api";
let currentApiUrl = PROD_URL; // Default to PROD
let testModeTimeout = null;

const dummyToken = "dummy-auth-token";

// Helper to get URL
const getApiUrl = () => currentApiUrl;

// Function to switch modes
const toggleTestMode = (event) => {
  if (currentApiUrl === PROD_URL) {
    // Switch to TEST
    currentApiUrl = TEST_URL;
    // Set 30 minute timer to revert
    if (testModeTimeout) clearTimeout(testModeTimeout);
    testModeTimeout = setTimeout(
      () => {
        currentApiUrl = PROD_URL;
        if (testModeTimeout) clearTimeout(testModeTimeout);
        testModeTimeout = null;
        // Notify renderer
        if (event && event.sender) {
          event.sender.send("mode-changed", "PROD");
        }
      },
      30 * 60 * 1000,
    ); // 30 minutes
    return "TEST";
  } else {
    // Switch back to PROD manually
    currentApiUrl = PROD_URL;
    if (testModeTimeout) clearTimeout(testModeTimeout);
    testModeTimeout = null;
    return "PROD";
  }
};

// Function to log errors to a file
const errorLogger = (
  errorMessage,
  serverErrorMessage,
  fileExtension,
  fileName,
) => {
  const logMessage = `${new Date().toISOString()} - Error uploading file: ${errorMessage}, Server error: ${
    serverErrorMessage || "No server error message or no response from server"
  }, File Extension: ${fileExtension || "No file"}, File Name: ${
    fileName || "No file"
  }\n`;

  const logDir = path.join(__dirname, "logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  fs.appendFile(path.join(logDir, "error.log"), logMessage, (err) => {
    // if (err) console.error("Error writing to log file:", err);
  });
};

// Function to upload a file to the API
let status = "ON";
async function uploadFile(filePath, event) {
  // Get the file extension and name
  const fileExtension = path.extname(filePath);
  const fileName = path.basename(filePath);

  // Check if the file extension is allowed
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".pdf"];
  if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
    return;
  }

  try {
    // Check file stats first
    const stats = await fs.stat(filePath);
    const mtime = stats.mtime;

    // Safety check: Limit file size to 300MB to prevent memory crashes
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB > 300) {
      errorLogger(
        "File too large (>300MB)",
        "Skipped by client safety limit",
        fileExtension,
        fileName,
      );
      return;
    }

    // Read the file data
    const fileData = await fs.readFile(filePath);

    // Optimization: Convert to base64 ONCE to save memory
    const base64Data = fileData.toString("base64");

    // Create a hash of the file data
    // We update hash in parts to avoid creating a huge string in memory
    const hash = crypto.createHash("sha256");
    // Equivalent to: fileName + mtime.getTime() + base64Data
    hash.update(fileName + mtime.getTime());
    hash.update(base64Data);
    const fileHash = hash.digest("hex");

    // Send the file data to the API
    await axios.post(
      getApiUrl() + "/file-upload",
      {
        fileData: base64Data,
        fileExtension,
        fileName,
        fileHash,
      },
      {
        headers: {
          Authorization: `Bearer ${dummyToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    // Send a message to the renderer process
    if (status !== "ON") {
      event.sender.send("from-main", "ON");
      status = "ON";
    }
  } catch (error) {
    const knownErrors = [
      "File already exists",
      "Invalid email format",
      "Invalid file format",
      "User not found",
      "Invalid file data",
      "Invalid file extension",
    ];

    if (knownErrors.includes(error?.response?.data?.message)) {
      if (status !== "ON") {
        event.sender.send("from-main", "ON");
        status = "ON";
      }
    } else {
      errorLogger(
        error?.message,
        error?.response?.data?.message,
        fileExtension,
        fileName,
      );
      if (status !== "OFF") {
        event.sender.send("from-main", "OFF");
        status = "OFF";
      }
    }
  }
}

// Function to search for a file in the API
const fileSearch = async (fileName) => {
  try {
    const response = await axios.post(getApiUrl() + "/find", {
      fileName,
      headers: {
        Authorization: `Bearer ${dummyToken}`,
      },
    });
    return response.data;
  } catch (error) {
    // console.error("Error searching for file:", error.message);
    return { error: error.message };
  }
};

// Function to write the path to the folder to a file
const writePathToFile = (filePath) => {
  const dir = path.join(__dirname, "./config");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFile(path.join(dir, "folderPath.txt"), filePath, (err) => {
    if (err) throw err;
    // console.log("The file path has been saved!");
  });
};

// Function to read the path from the file
const readPathFromFile = () => {
  return fs.readFileSync(
    path.join(__dirname, "./config/folderPath.txt"),
    "utf8",
  );
};

// Watch the folder for changes
let watcherInstance = null;

// Function to start the watcher
const startWatcher = async (folderPath, event) => {
  if (watcherInstance) {
    watcherInstance.close();
  }
  // Changed ignoreInitial to true to avoid re-uploading all files on startup
  watcherInstance = chokidar.watch(folderPath, { ignoreInitial: true });
  watcherInstance.on("add", async (filePath) => {
    try {
      await uploadFile(filePath, event);
    } catch (error) {
      console.error("Error uploading file:", error.message);
    }
  });
  // console.log("Watcher started");
  return;
};

// Function to manually rescan the folder
const rescanFolder = async (event) => {
  const currentFolderPath = readPathFromFile();
  if (
    !currentFolderPath ||
    currentFolderPath === "" ||
    !fs.existsSync(currentFolderPath)
  ) {
    return;
  }

  try {
    const files = await fs.readdir(currentFolderPath);
    for (const file of files) {
      const fullPath = path.join(currentFolderPath, file);
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isFile()) {
          // We reuse the existing upload logic
          await uploadFile(fullPath, event);
        }
      } catch (err) {
        console.error("Error processing file during scan:", file, err.message);
      }
    }
  } catch (error) {
    console.error("Error rescanning folder:", error.message);
  }
};

// Function to watch the folder
const watcher = async (event) => {
  folderPath = readPathFromFile();
  try {
    if (
      folderPath === undefined ||
      folderPath === null ||
      folderPath === "" ||
      !fs.existsSync(folderPath)
    ) {
      const result = await dialog.showOpenDialog({
        properties: ["openDirectory"],
      });
      if (!result.canceled) {
        writePathToFile(result.filePaths[0]);
        folderPath = result.filePaths[0];
        return await startWatcher(folderPath, event);
      } else {
        event.sender.send("from-main", "OFF");
        status = "OFF";
      }
    } else {
      return await startWatcher(folderPath, event);
    }
  } catch (error) {
    // console.error("Error starting watcher:", error.message);
  }
};

// Function to stop the watcher
const stopWatcher = () => {
  if (watcherInstance) {
    watcherInstance.close();
    watcherInstance = null;
    // console.log("Watcher stopped");
  }
};

//export the watcher and stop watcher functions
module.exports = {
  watcher,
  stopWatcher,
  watcherInstance,
  fileSearch,
  writePathToFile,
  readPathFromFile,
  rescanFolder,
  toggleTestMode,
};
