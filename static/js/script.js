let isAnalysing = false;

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
    const analyseButton = document.getElementById("analyse-button");
    const resultSection = document.getElementById('results-section');
    const progressDiv = document.getElementById('progress');
    const resultsDiv = document.getElementById('results');
    resultSection.style.display = 'block';
    progressDiv.style.display = 'block';
    resultsDiv.style.display = 'none';
    progress = 0;

    // Empêcher le lancement de plusieurs analyses en même temps
    if (isAnalysing) {
        return;
    }
    isAnalysing = true;

    // Désactiver le bouton dès le clic
    analyseButton.disabled = true;
    analyseButton.textContent = "Analyse en cours...";

    const intervalId = setInterval(async () => {
        await updateProgressBar();
    }, 1000);

    try {
        // Vérifier si des fichiers sont présents avant de lancer l'analyse
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

        // Effectuer l'appel à l'API Flask
        const analyseResponse = await fetch('/analyse', {
            method: 'POST',
        });

        if (analyseResponse.ok) {
            // Attendre les résultats de l'analyse
            const resultResponse = await fetch('/results');
            const result = await resultResponse.json();
            displayResult(result.revision_cards);

            // Arrêter l'intervalle une fois les résultats reçus
            clearInterval(intervalId);
            analyseButton.disabled = false;
            analyseButton.textContent = "Analyser";
            isAnalysing = false;
        } else {
            const result = await analyseResponse.json();
            showNotification("error", result.error);
            analyseButton.disabled = false;
            analyseButton.textContent = "Analyser";
            resultSection.style.display = 'none';
            isAnalysing = false;

        }
    } catch (error) {
        console.error("Erreur pendant l'analyse :", error);
        showNotification("error", "Une erreur est survenue pendant l'analyse.");
        analyseButton.disabled = false;
        analyseButton.textContent = "Analyser";
        resultSection.style.display = 'none';
        isAnalysing = false;
    } finally {
        // Réactiver le bouton une fois l'analyse terminée
        analyseButton.disabled = false;
        analyseButton.textContent = "Analyser";
        progressDiv.style.display = 'none';
        resultsDiv.style.display = 'block';
        isAnalysing = false;
    }
});

// Fonction pour afficher les cartes de révision
function displayRevisionCards(cardsText) {
    const resultsElement = DOM.results;
    resultsElement.innerHTML = ""; // Clear previous results

    const converter = new showdown.Converter(); // Utiliser Showdown pour convertir le Markdown en HTML
    const cards = cardsText.split('---').map(card => card.trim());
    cards.forEach(card => {
        const cardElement = document.createElement("div");
        cardElement.classList.add("card");
        cardElement.innerHTML = converter.makeHtml(card); // Utiliser Showdown pour convertir le Markdown en HTML

        // Ajouter un bouton "Copier"
        const copyButton = document.createElement("button");
        const copyIcon = document.createElement("i");
        copyIcon.classList.add("fa", "fa-copy");
        copyButton.appendChild(copyIcon);
        copyButton.classList.add("copy-btn");
        copyButton.addEventListener("click", () => copyToClipboard(card, copyButton));

        cardElement.appendChild(copyButton);
        resultsElement.appendChild(cardElement);
    });

    // Re-render MathJax for mathematical formulas
    if (window.MathJax) {
        MathJax.typesetPromise().then(() => {
            resultsElement.style.display = "block"; // Afficher le conteneur des résultats une fois les cartes prêtes
        });
    } else {
        resultsElement.style.display = "block"; // Afficher le conteneur des résultats une fois les cartes prêtes
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

                // Ajouter un bouton de suppression
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
        const fileListContainer = document.getElementById("file-list");
        fileListContainer.textContent = "Erreur lors du chargement des fichiers.";
    }
}

function displayResult(result) {
    const resultsElement = document.getElementById("results");
    if (!resultsElement) {
        console.error("Element 'results' non trouvé.");
        return;
    }
    resultsElement.innerHTML = ""; // Clear previous results

    const converter = new showdown.Converter(); // Utiliser Showdown pour convertir le Markdown en HTML

    // Créer une seule carte
    const cardElement = document.createElement("div");
    cardElement.classList.add("card");

    // Convertir le Markdown entier et l'ajouter à la carte
    cardElement.innerHTML = converter.makeHtml(result); // Convertir le Markdown en HTML

    // Ajouter la carte au conteneur des résultats
    resultsElement.appendChild(cardElement);

    // Créer un conteneur pour les boutons
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "center";
    buttonContainer.style.gap = "10px"; // Espace entre les boutons

    // Créer et ajouter le bouton "Copier"
    const copyBtn = document.createElement("button");
    copyBtn.id = "copy-btn";
    copyBtn.classList.add("copy-btn");
    copyBtn.innerHTML = 'Copier <i class="fa fa-copy"></i>';
    copyBtn.addEventListener("click", () => copyToClipboard(result, copyBtn));
    buttonContainer.appendChild(copyBtn);

    // Créer et ajouter le bouton "Fermer"
    const closeBtn = document.createElement("button");
    closeBtn.id = "close-btn";
    closeBtn.classList.add("close-btn"); // Utiliser la même classe que le bouton "Copier"
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = 'Fermer <span aria-hidden="true">&times;</span>';
    closeBtn.addEventListener("click", closePopup);
    buttonContainer.appendChild(closeBtn);

    // Ajouter le conteneur des boutons aux résultats
    resultsElement.appendChild(buttonContainer);

    resultsElement.style.display = "block";

    // Actualiser la liste des fichiers après la réception des résultats
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
        const response = await fetch('/analyse/progress');
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération de la progression');
        }
        const data = await response.json();
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        if (data.progress !== undefined) {
            progressBar.style.width = `${data.progress}%`;
            progressText.textContent = `${data.progress}%`;
            console.log(data.progress);
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const fileListContainer = document.getElementById("file-list");
    const analyseButton = document.getElementById("analyse-button");

    async function loadFileList() {
        try {
            const response = await fetch('/files/list');
            if (!response.ok) throw new Error('Erreur lors du chargement des fichiers');
            
            const files = await response.json();

            fileListContainer.innerHTML = "";

            if (files.length > 0) {
                files.forEach(file => {
                    const listItem = document.createElement("div");
                    listItem.textContent = file;
                    listItem.classList.add('file');

                    // Ajouter un bouton de suppression
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
            fileListContainer.textContent = "Erreur lors du chargement des fichiers.";
        }
    }

    // Supprimer un fichier
    async function deleteFile(fileName) {
        try {
            const response = await fetch('/files/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: fileName })
            });

            if (!response.ok) throw new Error('Erreur lors de la suppression du fichier');
            await loadFileList(); // Recharger la liste après suppression
        } catch (error) {
            console.error(error);
            showNotification('error', 'Erreur lors de la suppression du fichier.');
        }
    }

    // Supprimer tous les fichiers
    async function deleteAllFiles() {
        try {
            const response = await fetch('/files/delete_all', {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Erreur lors de la suppression des fichiers');
            await loadFileList(); // Recharger la liste après suppression
        } catch (error) {
            console.error(error);
            showNotification('error', 'Erreur lors de la suppression des fichiers.');
        }
    }

    // Gérer l'upload de fichiers
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

            if (!response.ok) throw new Error('Erreur lors de l\'upload');

            await loadFileList(); // Recharger la liste après upload
        } catch (error) {
            console.error(error);
            showNotification('error', 'Erreur lors de l\'upload des fichiers.');
        }
    }

    // Gestion du drag and drop
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');

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
        await uploadFiles(files); // Mettre à jour la liste après l'upload
    });

    fileInput.addEventListener('change', async () => {
        const files = fileInput.files;
        await uploadFiles(files); // Mettre à jour la liste après l'upload
    });

    // Fonction pour afficher une notification
    function showNotification(type, message) {
        const notification = document.getElementById("notification");
        const notificationText = document.getElementById("notification-text");
        
        notification.classList.add(type);
        notificationText.textContent = message;

        notification.classList.add("show");
        
        setTimeout(() => {
            notification.classList.remove("show");
        }, 3000); // La notification disparaît après 3 secondes
    }

    // Initialiser la liste des fichiers à l'ouverture de la page
    loadFileList();
});

// Fonction pour uploader les fichiers
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

        if (!response.ok) throw new Error('Erreur lors de l\'upload');
    } catch (error) {
        console.error(error);
        showNotification('error', 'Erreur lors de l\'upload des fichiers.');
    }
}

// Fonction pour afficher la notification
function showNotification(type, message) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');

    // Réinitialiser le texte et les classes de notification
    notificationText.textContent = message;
    notification.className = 'notification ' + type;

    // Afficher la notification
    notification.classList.add('show');

    // Masquer la notification après 3 secondes
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000); // Disparait après 3 secondes
}

function closePopup() {
    const resultSection = document.getElementById('results-section');
    const resultsElement = document.getElementById('results');
    resultsElement.innerHTML = ""; // Vider le contenu des résultats
    loadFileList(); // Recharger la liste des fichiers
    resultSection.style.display = 'none';
}
