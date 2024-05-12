const restartBtn = document.getElementById("btn-restart");
const statustext = document.getElementById("status");
const searchInput = document.getElementById("search");
const searchBtn = document.getElementById("btn-search");
const searcResult = document.getElementById("search-result");
const selectFolderBtn = document.getElementById("btn-div");
const pathText = document.getElementById("tag-path");

let appStatus = null;

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
        setTimeout(async () => {
          if (appStatus === "ON") {
            await window.electronAPI.restartSwitch();
          }
        }, 1 * 60 * 1000); // 5 minutes
      }
    });

    // Start watcher
    await window.electronAPI.startWatcher();

    // Get folder path
    const folderPath = await window.electronAPI.getFolderPath();
    pathText.innerText = folderPath;

    // Check status every hour and restart watcher if status is "OFF"
    setInterval(async () => {
      if (appStatus === "OFF") {
        await window.electronAPI.restartSwitch();
      }
    }, 20 * 60 * 1000); // 30 minutes

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
          })}</p></div>`
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
