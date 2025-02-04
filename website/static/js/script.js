let isAnalysing = false;
let progress = 0;

const DOM = {
    analyseButton: document.getElementById("analyse-button"),
    dropArea: document.getElementById('drop-area'),
    fileInput: document.getElementById('file-input'),
    results: document.getElementById("results"),
    notification: {
        container: document.getElementById("notification"),
        text: document.getElementById("notification-text")
    }
};

document.getElementById("analyse-button").addEventListener("click", async () => {
    const analyseButton = DOM.analyseButton;
    const resultSection = document.getElementById('results-section');
    const progressDiv = document.getElementById('progress');
    const resultsDiv = document.getElementById('results');
    resultSection.style.display = 'block';
    progressDiv.style.display = 'block';
    resultsDiv.style.display = 'none';
    progress = 0;

    if (isAnalysing) {
        return;
    }
    isAnalysing = true;

    analyseButton.disabled = true;
    analyseButton.textContent = "Analyse en cours...";

    const intervalId = setInterval(async () => {
        await updateProgressBar();
    }, 5000);

    try {
        const response = await fetch('/files/list');
        const files = await response.json();

        if (files.length === 0) {
            showNotification('error', 'Aucun fichier à analyser.');
            analyseButton.disabled = false;
            analyseButton.textContent = "Analyser";
            resultSection.style.display = 'none';
            isAnalysing = false;
            return;
        }

        const serverResponse = await fetch('/analyse', {
            method: 'POST',
        });

        if (!serverResponse.ok) {
            const result = await serverResponse.json();
            if (result.error === 'Aucun serveur disponible') {
                showNotification('error', 'Aucun serveur disponible pour lancer l\'analyse.');
            } else {
                throw new Error(result.error || 'Erreur lors de l\'analyse');
            }
            analyseButton.disabled = false;
            analyseButton.textContent = "Analyser";
            resultSection.style.display = 'none';
            isAnalysing = false;
            return;
        }

        const checkStatusInterval = setInterval(async () => {
            const statusResponse = await fetch('/status');
            const statusResult = await statusResponse.json();

            if (statusResult.status === 'completed') {
                clearInterval(checkStatusInterval);

                const resultResponse = await fetch('/results');
                if (!resultResponse.ok) {
                    throw new Error('Erreur lors de la récupération des résultats');
                }

                const result = await resultResponse.json();
                displayResult(result);

                clearInterval(intervalId);
                analyseButton.disabled = false;
                analyseButton.textContent = "Analyser";
                isAnalysing = false;
                progressDiv.style.display = 'none'; // Masquer la section de progression
            }
        }, 5000);

    } catch (error) {
        console.error("Erreur pendant l'analyse :", error);
        showNotification("error", error.message);
        analyseButton.disabled = false;
        analyseButton.textContent = "Analyser";
        resultSection.style.display = 'none';
        isAnalysing = false;
    }
});

function displayRevisionCards(cardsText) {
    const resultsElement = DOM.results;
    resultsElement.innerHTML = "";

    const converter = new showdown.Converter();
    const cards = cardsText.split('---').map(card => card.trim());
    cards.forEach(card => {
        const cardElement = document.createElement("div");
        cardElement.classList.add("card");
        cardElement.innerHTML = converter.makeHtml(card);

        const copyButton = document.createElement("button");
        const copyIcon = document.createElement("i");
        copyIcon.classList.add("fa", "fa-copy");
        copyButton.appendChild(copyIcon);
        copyButton.classList.add("copy-btn");
        copyButton.addEventListener("click", () => copyToClipboard(card, copyButton));

        cardElement.appendChild(copyButton);
        resultsElement.appendChild(cardElement);
    });

    if (window.MathJax) {
        MathJax.typesetPromise().then(() => {
            resultsElement.style.display = "block";
        });
    } else {
        resultsElement.style.display = "block";
    }
}

async function loadFileList() {
    try {
        const response = await fetch('/files/list');
        if (!response.ok) throw new Error('Erreur lors du chargement des fichiers');
        
        const files = await response.json();

        const fileListContainer = document.getElementById("file-list");
        fileListContainer.innerHTML = "";

        if (files.length > 0) {
            files.forEach(file => {
                const listItem = document.createElement("div");
                listItem.textContent = file;
                listItem.classList.add('file');

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Supprimer';
                deleteButton.classList.add('delete-btn');
                deleteButton.addEventListener('click', () => deleteFile(file));

                listItem.appendChild(deleteButton);
                fileListContainer.appendChild(listItem);
            });
        } else {
            fileListContainer.textContent = "Aucun fichier disponible.";
        }
    } catch (error) {
        console.error(error);
        showNotification('error', 'Erreur lors du chargement des fichiers.');
    }
}

function displayResult(result) {
    const resultsElement = document.getElementById("results");
    if (!resultsElement) {
        console.error("Element 'results' non trouvé.");
        return;
    }
    resultsElement.innerHTML = "";

    // Vérification de la présence et de la validité de 'revision_cards'
    if (!result || !result.revision_cards || typeof result.revision_cards !== 'string') {
        console.error("Aucune carte de révision valide dans la réponse.");
        return;
    }

    const converter = new showdown.Converter();
    const resultContent = result.revision_cards;

    const cardElement = document.createElement("div");
    cardElement.classList.add("card");
    cardElement.innerHTML = converter.makeHtml(resultContent);

    resultsElement.appendChild(cardElement);

    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "center";
    buttonContainer.style.gap = "10px";

    const copyBtn = document.createElement("button");
    copyBtn.id = "copy-btn";
    copyBtn.classList.add("copy-btn");
    copyBtn.innerHTML = 'Copier <i class="fa fa-copy"></i>';
    copyBtn.addEventListener("click", () => copyToClipboard(resultContent, copyBtn));
    buttonContainer.appendChild(copyBtn);

    const closeBtn = document.createElement("button");
    closeBtn.id = "close-btn";
    closeBtn.classList.add("close-btn");
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = 'Fermer <span aria-hidden="true">&times;</span>';
    closeBtn.addEventListener("click", closePopup);
    buttonContainer.appendChild(closeBtn);

    resultsElement.appendChild(buttonContainer);

    resultsElement.style.display = "block";

    loadFileList();
}

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        button.innerHTML = "Copied!";
        button.classList.add("copied");
        setTimeout(() => {
            button.innerHTML = "";
            const copyIcon = document.createElement("i");
            copyIcon.classList.add("fa", "fa-copy");
            button.appendChild(copyIcon);
            button.classList.remove("copied");
        }, 2000);
        showNotification("success", "Texte copié !");
    }).catch(err => {
        console.error("Erreur lors de la copie du texte :", err);
        showNotification("error", "Erreur lors de la copie du texte.");
    });
}

async function updateProgressBar() {
    try {
        const response = await fetch('/progress');
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération de la progression');
        }
        const data = await response.json();
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        if (data.progress !== undefined) {
            progressBar.style.width = `${data.progress}%`;
            progressText.textContent = `${data.progress}%`;
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const fileListContainer = document.getElementById("file-list");
    const analyseButton = DOM.analyseButton;

    loadFileList();

    const dropArea = DOM.dropArea;
    const fileInput = DOM.fileInput;

    dropArea.addEventListener('dragover', event => {
        event.preventDefault();
        dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', async event => {
        event.preventDefault();
        dropArea.classList.remove('dragover');
        const files = event.dataTransfer.files;
        await uploadFiles(files);
    });

    fileInput.addEventListener('change', async () => {
        const files = fileInput.files;
        await uploadFiles(files);
    });
});

async function uploadFiles(files) {
    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erreur lors de l\'upload');
        }

        await loadFileList();
    } catch (error) {
        console.error(error);
        showNotification('error', error.message);
    }
}

function showNotification(type, message) {
    const notification = DOM.notification.container;
    const notificationText = DOM.notification.text;

    notification.classList.remove('show');
    void notification.offsetWidth; // Reflow pour redémarrer l'animation

    notificationText.textContent = message;
    notification.className = 'notification ' + type;

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

async function deleteFile(fileName) {
    try {
        const response = await fetch('/files/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: fileName })
        });

        if (!response.ok) throw new Error('Erreur lors de la suppression du fichier');
        await loadFileList();
    } catch (error) {
        console.error(error);
        showNotification('error', 'Erreur lors de la suppression du fichier.');
    }
}

async function deleteAllFiles() {
    try {
        const response = await fetch('/files/delete_all', {
            method: 'POST'
        });

        if (!response.ok) throw new Error('Erreur lors de la suppression des fichiers');
        await loadFileList();
    } catch (error) {
        console.error(error);
        showNotification('error', 'Erreur lors de la suppression des fichiers.');
    }
}

function closePopup() {
    const resultSection = document.getElementById('results-section');
    const resultsElement = document.getElementById('results');
    resultsElement.innerHTML = "";
    loadFileList();
    resultSection.style.display = 'none';
}
