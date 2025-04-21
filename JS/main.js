let useOtanSymbols = false;

const supportGrid = Array.from({ length: 2 }, () => Array(5).fill(null));
const combatGrid = Array.from({ length: 5 }, () => Array(5).fill(null));

window.addEventListener('DOMContentLoaded', () => {
    updateGridDisplay(supportGrid, "Spos-");
    updateGridDisplay(combatGrid, "Cpos-");
});

function updateGridDisplay(grid, prefix) {
    const totalCols = grid.length;
    const totalRows = grid[0].length;

    for (let col = 0; col < totalCols; col++) {
        let firstEmptyPlaced = false;

        for (let row = 0; row < totalRows; row++) {
            const className = `${prefix}${col + 1}-${row + 1}`;
            const cell = document.querySelector(`.${className}`);
            if (!cell) continue;

            cell.innerHTML = "";

            const fiche = grid[col][row];

            if (fiche) {
                const unitImg = document.createElement("img");
                const imagePath = useOtanSymbols && fiche.imageOtan ? fiche.imageOtan : fiche.image;
                unitImg.src = `images/${imagePath}.png`;
                unitImg.alt = fiche.Nom;
                unitImg.classList.add("unit-img");
                unitImg.style.cursor = "pointer";
                unitImg.addEventListener("click", () => showUnitModal(cell, fiche, grid, prefix, col, row));
                cell.appendChild(unitImg);
            } else if (!firstEmptyPlaced) {
                // Uniquement la première case vide de la colonne
                const addBtn = document.createElement("img");
                addBtn.src = "/images/btn-ajouter.png";
                addBtn.classList.add("unit-img");
                addBtn.style.cursor = "pointer";
                addBtn.addEventListener("click", () => openUnitPicker(cell, grid, prefix, col, row));
                cell.appendChild(addBtn);
                firstEmptyPlaced = true;
            } // sinon, on laisse la case vide
        }
    }
}


function openUnitPicker(cell, grid, prefix, col, row) {
    const modal = document.getElementById("modal");
    const content = document.getElementById("modal-content");

    const isCombat = prefix === "Cpos-";
    const type = isCombat ? "Combat" : "Support";
    const jsonPath = `Division/${type}/lstType.json`;

    fetch(jsonPath)
        .then(res => res.json())
        .then(data => {
            content.innerHTML = `<h2>Choisissez une unité (${type})</h2>`;
            const ul = document.createElement("ul");

            data.ListeRep.forEach(nomDossier => {
                const li = document.createElement("li");
                li.textContent = nomDossier;
                li.style.cursor = "pointer";

                const subDiv = document.createElement("div");
                subDiv.classList.add("submenu");

                li.addEventListener("click", () => {
                    if (subDiv.innerHTML !== "") {
                        subDiv.innerHTML = "";
                        return;
                    }

                    const batPath = `Division/${type}/${nomDossier}/lstBat.json`;

                    fetch(batPath)
                        .then(r => r.json())
                        .then(batData => {
                            subDiv.innerHTML = "";
                            batData.lstFile.forEach(fichier => {
                                const fichePath = `Division/${type}/${nomDossier}/${fichier}.json`;
                                fetch(fichePath)
                                    .then(r => r.json())
                                    .then(fiche => {
                                        fiche.path = `${nomDossier}/${fichier}`;
                                        const bloc = document.createElement("div");
                                        bloc.classList.add("unit-card");

                                        const imagePath = useOtanSymbols && fiche.imageOtan ? fiche.imageOtan : fiche.image;
                                        srcImage = `images/${imagePath}.png`;

                                        bloc.innerHTML = `
                                            <h3>${fiche.Nom}</h3>
                                            <p>${fiche.Description}</p>
                                            <p><strong>Effectif :</strong> ${fiche.Effectif}</p>
                                            <p><strong>Équipements :</strong></p>
                                            <ul>
                                                ${Object.entries(fiche.Equipements).map(([k, v]) => `<li>${k} : ${v}</li>`).join("")}
                                            </ul>
                                            <img src="${srcImage}" alt="${fiche.Nom}" class="unit-img">
                                        `;

                                        const ajouterBtn = document.createElement("button");
                                        ajouterBtn.textContent = "Ajouter";
                                        ajouterBtn.classList.add("ajouter-btn");

                                        ajouterBtn.addEventListener("click", () => {
                                            // Ajoute dans la grille et met à jour l'affichage
                                            grid[col][row] = fiche;
                                            updateGridDisplay(grid, prefix);
                                            modal.style.display = "none";
                                        });

                                        bloc.appendChild(ajouterBtn);
                                        subDiv.appendChild(bloc);
                                    });
                            });
                        });
                });

                ul.appendChild(li);
                ul.appendChild(subDiv);
            });

            content.appendChild(ul);
            modal.style.display = "flex";
        })
        .catch(err => {
            content.innerHTML = `<p>Erreur : ${err.message}</p>`;
            modal.style.display = "flex";
        });
}

function showUnitModal(cell, fiche, grid, prefix, col, row) {
    const modal = document.getElementById("modal");
    const content = document.getElementById("modal-content");

    content.innerHTML = `
        <h2>${fiche.Nom}</h2>
        <p>${fiche.Description}</p>
        <p><strong>Effectif :</strong> ${fiche.Effectif}</p>
        <p><strong>Équipements :</strong></p>
        <ul>
            ${Object.entries(fiche.Equipements).map(([k, v]) => `<li>${k} : ${v}</li>`).join("")}
        </ul>
    `;

    const retirerBtn = document.createElement("button");
    retirerBtn.textContent = "Retirer";
    retirerBtn.style.marginTop = "10px";

    retirerBtn.addEventListener("click", () => {
        const rows = grid[0].length;
        for (let r = row; r < rows - 1; r++) {
            grid[col][r] = grid[col][r + 1];
        }
        grid[col][rows - 1] = null;
        updateGridDisplay(grid, prefix);
        modal.style.display = "none";
    });

    content.appendChild(retirerBtn);
    modal.style.display = "flex";
}

// Convertit les grilles en base64 pour l'export
function generateExportUrl() {
    const baseUrl = window.location.origin + window.location.pathname;

    function extractPaths(grid, type) {
        return grid.map(col =>
            col.map(cell => {
                if (!cell) return null;
                return `${type}/${cell.path}`; // Stocke le chemin relatif
            })
        );
    }

    const data = {
        support: extractPaths(supportGrid, 'Support'),
        combat: extractPaths(combatGrid, 'Combat'),
    };

    const compact = btoa(JSON.stringify(data));
    return `${baseUrl}?data=${compact}`;
}

// Copie dans le presse-papiers
function copyToClipboard() {
    const url = generateExportUrl();
    const input = document.getElementById("export-url");
    input.value = url;
    input.select();
    document.execCommand("copy");
    alert("URL copiée !");
}
// Lecture de l'URL et remplissage des grilles
function importData() {
    const input = document.getElementById("import-url").value;
    const url = new URL(input);
    const dataParam = url.searchParams.get("data");

    if (!dataParam) {
        alert("Aucune donnée à importer.");
        return;
    }

    try {
        const decoded = JSON.parse(atob(dataParam));
        loadGridFromPaths(decoded);
        document.getElementById("import-modal").style.display = "none";
    } catch (err) {
        alert("Erreur lors de l'import : " + err.message);
    }
}

// Applique les données sur les grilles
function loadGridFromPaths({ support, combat }) {
    const loadFiche = (type, path) => {
        return fetch(`Division/${type}/${path}.json`)
            .then(r => r.json())
            .then(fiche => {
                fiche.path = path; // Recrée le champ path
                return fiche;
            });
    };

    const loadAll = (gridPaths, type) => {
        const grid = [];
        const colPromises = gridPaths.map(col =>
            Promise.all(col.map(cell => {
                if (!cell) return null;
                const relative = cell.replace(`${type}/`, "");
                return loadFiche(type, relative);
            }))
        );
        return Promise.all(colPromises);
    };

    Promise.all([
        loadAll(support, "Support").then(g => {
            supportGrid.length = 0;
            supportGrid.push(...g);
            updateGridDisplay(supportGrid, "Spos-");
        }),
        loadAll(combat, "Combat").then(g => {
            combatGrid.length = 0;
            combatGrid.push(...g);
            updateGridDisplay(combatGrid, "Cpos-");
        }),
    ]);
}


// Ouvre la modale d'export et prépare l'URL
function openExportModal() {
    const url = generateExportUrl();
    const input = document.getElementById("export-url");
    input.value = url; // 👈 on remplit le champ ici
    document.getElementById("export-modal").style.display = "flex";
}

function openImportModal() {
    document.getElementById("import-modal").style.display = "flex";

    const container = document.getElementById("template-list");
    container.innerHTML = "<p>Chargement des divisions...</p>";

    fetch("Division/template.json")
        .then(res => res.json())
        .then(data => {
            container.innerHTML = "";
            Object.entries(data).forEach(([nom, url]) => {
                const btn = document.createElement("button");
                btn.textContent = nom;
                btn.classList.add("template-btn");
                btn.style.display = "block";
                btn.style.marginBottom = "5px";

                btn.addEventListener("click", () => {
                    // Simule un import avec cette URL
                    document.getElementById("import-url").value = url;
                    importData(); // Réutilise la logique existante
                });

                container.appendChild(btn);
            });
        })
        .catch(err => {
            container.innerHTML = `<p>Erreur de chargement : ${err.message}</p>`;
        });
}


// Chargement auto si URL avec paramètre data
window.addEventListener('DOMContentLoaded', () => {
    updateGridDisplay(supportGrid, "Spos-");
    updateGridDisplay(combatGrid, "Cpos-");

    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get("data");

    if (dataParam) {
        try {
            const decoded = JSON.parse(atob(dataParam));
            loadGridFromPaths(decoded);
        } catch (e) {
            console.error("Erreur lors de l'import automatique depuis l'URL :", e);
        }
    }
});

function loadGridData(data) {
    // Recharge les grilles depuis les données
    if (data.support && data.combat) {
        for (let col = 0; col < supportGrid.length; col++) {
            for (let row = 0; row < supportGrid[0].length; row++) {
                supportGrid[col][row] = data.support[col]?.[row] || null;
            }
        }

        for (let col = 0; col < combatGrid.length; col++) {
            for (let row = 0; row < combatGrid[0].length; row++) {
                combatGrid[col][row] = data.combat[col]?.[row] || null;
            }
        }

        updateGridDisplay(supportGrid, "Spos-");
        updateGridDisplay(combatGrid, "Cpos-");
    }
}

function afficherEquipement() {
    const total = {
        Effectif: 0,
        Equipements: {}
    };

    const additionner = (grid) => {
        grid.forEach(col => {
            col.forEach(cell => {
                if (cell) {
                    total.Effectif += cell.Effectif || 0;
                    for (const [eq, val] of Object.entries(cell.Equipements || {})) {
                        if (!total.Equipements[eq]) total.Equipements[eq] = 0;
                        total.Equipements[eq] += val;
                    }
                }
            });
        });
    };

    additionner(supportGrid);
    additionner(combatGrid);

    const contenu = document.getElementById("equipement-content");
    contenu.innerHTML = `
        <p><strong>Effectif total :</strong> ${total.Effectif}</p>
        <p><strong>Équipements requis :</strong></p>
        <ul>
            ${Object.entries(total.Equipements).map(([nom, qty]) => `<li>${nom} : ${qty}</li>`).join("")}
        </ul>
    `;

    document.getElementById("equipement-modal").style.display = "flex";
}

function toggleSymbolSet() {
    useOtanSymbols = !useOtanSymbols;

    const btn = document.getElementById("toggle-symbols-btn");
    btn.textContent = useOtanSymbols ? "Utiliser icônes standard" : "Utiliser symboles OTAN";

    updateGridDisplay(supportGrid, "Spos-");
    updateGridDisplay(combatGrid, "Cpos-");
}

function copyDiscordFormat() {
    const url = generateExportUrl();
    const nameInput = document.getElementById("discord-name").value.trim();
    const displayName = nameInput || "division";

    const discordFormatted = `[${displayName}](<${url}>)`;

    const tempInput = document.createElement("input");
    tempInput.value = discordFormatted;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);

    alert("Lien au format Discord copié !");
}