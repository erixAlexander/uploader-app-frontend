const restartBtn = document.getElementById("btn-restart");
const statustext = document.getElementById("status");
const searchInput = document.getElementById("search");
const searchBtn = document.getElementById("btn-search");
const searcResult = document.getElementById("search-result");
const selectFolderBtn = document.getElementById("btn-div");
const rescanBtn = document.getElementById("btn-rescan");
const pathText = document.getElementById("tag-path");
const testModeBtn = document.getElementById("btn-test-mode");

let appStatus = null;

// Function to update Test Mode Button UI
const updateTestModeUI = (mode) => {
  if (mode === "TEST") {
    testModeBtn.classList.add("active");
    testModeBtn.innerText = "Modo Pruebas (ON)";
  } else {
    testModeBtn.classList.remove("active");
    testModeBtn.innerText = "Test Mode";
  }
};

window.addEventListener("DOMContentLoaded", async () => {
  try {
    // Activate listener to get status from main
    window.electronAPI.receive("from-main", (value) => {
      appStatus = value;
      if (value === "ON") {
        statustext.innerText = "ON";
        statustext.classList.add("on");
        statustext.classList.remove("off");
      } else {
        statustext.innerText = "OFF";
        statustext.classList.add("off");
        statustext.classList.remove("on");

        // Set a timeout to check the status a few minutes later
        setTimeout(
          async () => {
            if (appStatus === "ON") {
              await window.electronAPI.restartSwitch();
            }
          },
          1 * 60 * 1000,
        ); // 5 minutes
      }
    });

    // Listener for Test Mode changes (from timer or manual toggle)
    window.electronAPI.receive("mode-changed", (mode) => {
      updateTestModeUI(mode);
    });

    // Start watcher
    await window.electronAPI.startWatcher();

    // Add listener to rescan button
    rescanBtn.addEventListener("click", async () => {
      // Create a temporary message element for loading state
      const message = document.createElement("div");
      message.innerText = "Escaneando carpeta...";
      message.style.position = "fixed";
      message.style.top = "20px";
      message.style.left = "50%";
      message.style.transform = "translateX(-50%)";
      message.style.backgroundColor = "#2196F3"; // Blue for loading
      message.style.color = "white";
      message.style.padding = "10px 20px";
      message.style.borderRadius = "5px";
      message.style.zIndex = "1000";
      message.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
      document.body.appendChild(message);

      try {
        await window.electronAPI.rescanFolder();

        // Update message to success state
        message.innerText = "Carpeta reescaneada correctamente";
        message.style.backgroundColor = "#4caf50"; // Green for success

        // Remove the message after 10 seconds
        setTimeout(() => {
          if (document.body.contains(message)) {
            document.body.removeChild(message);
          }
        }, 10000); // 10 seconds
      } catch (error) {
        console.error(error);
        // Update message to error state
        message.innerText = "Error al reescanear la carpeta";
        message.style.backgroundColor = "#f44336"; // Red for error

        // Remove after 5 seconds
        setTimeout(() => {
          if (document.body.contains(message)) {
            document.body.removeChild(message);
          }
        }, 5000);
      }
    });

    // Get folder path
    const folderPath = await window.electronAPI.getFolderPath();
    pathText.innerText = folderPath;

    // Check status every hour and restart watcher if status is "OFF"
    setInterval(
      async () => {
        if (appStatus === "OFF") {
          await window.electronAPI.restartSwitch();
        }
      },
      20 * 60 * 1000,
    ); // 30 minutes

    // Add event listener to search result
    searcResult.addEventListener("click", (event) => {
      event.preventDefault();

      // Copy URL to clipboard and open url in browser
      if (event.target.tagName === "A") {
        const url = event.target.getAttribute("data-url");
        navigator.clipboard
          .writeText(url)
          .then(() => {
            alert("URL copiada al portapapeles");
            window.electronAPI.openURL(url);
          })
          .catch((err) => {
            console.error("No se pudo copiar la URL: ", err);
          });
      }
    });

    // Listener for Test Mode Button
    testModeBtn.addEventListener("click", async () => {
      try {
        const mode = await window.electronAPI.toggleTestMode();
        updateTestModeUI(mode);
      } catch (error) {
        console.error("Error toggling test mode:", error);
      }
    });
  } catch (error) {
    console.error(error);
  }
});

searchBtn.addEventListener("click", async () => {
  const fileName = searchInput.value;
  if (!fileName || fileName === "") {
    searcResult.innerText = "Ingrese un nombre de archivo";
    return;
  }

  // Get data from file name
  const parts = fileName.split("-");
  const dataWithExtension = parts[parts.length - 1];
  const data = dataWithExtension.split(".")[0];

  try {
    // Search file
    const response = await window.electronAPI.searchFile(fileName);
    if (response.error) {
      searcResult.innerText = "No hay archivos con ese nombre";
      return;
    }
    searcResult.innerHTML = response
      .reverse()
      .map(
        (file) =>
          `<div class='link-container'><a href="#" data-url="http://uploader-app-service-tpdnlyeuqa-uc.a.run.app/${
            file.file_id
          }?data=${data}">Link al Archivo: ${fileName}</a>
          <p>${new Date(file.uploaded_date).toLocaleString("es-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          })}</p></div>`,
      )
      .join("<br/>");
  } catch (error) {
    console.error(error);
  }
});

restartBtn.addEventListener("click", async () => {
  try {
    await window.electronAPI.restartSwitch();
    const folderPath = await window.electronAPI.getFolderPath();
    pathText.innerText = folderPath;
  } catch (error) {
    console.error(error);
  }
});

selectFolderBtn.addEventListener("click", async () => {
  try {
    const folderPath = await window.electronAPI.selectFolder();
    if (!folderPath || folderPath === "") {
      return;
    }
    pathText.innerText = folderPath;
    await window.electronAPI.restartSwitch();
  } catch (error) {
    console.error(error);
  }
});
