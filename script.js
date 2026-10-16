
document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // 1. ELEMENTOS DEL HTML
    // =====================================

    const openAlbum = document.getElementById("openAlbum");
    const albumContent = document.getElementById("albumContent");

    const btsGrid = document.getElementById("btsGrid");
    const vGrid = document.getElementById("vGrid");

    const btsCounter = document.getElementById("btsCounter");
    const vCounter = document.getElementById("vCounter");

    const modal = document.getElementById("stickerModal");
    const modalImage = document.getElementById("modalImage");
    const modalTitle = document.getElementById("modalTitle");

    const modalDescription = document.getElementById(
        "modalDescription"
    );

    const closeModal = document.getElementById("closeModal");

    const uploadPhoto = document.getElementById("uploadPhoto");
    const removePhoto = document.getElementById("removePhoto");
    const uploadStatus = document.getElementById("uploadStatus");

    const envelope = document.getElementById("envelope");
    const secretLetter = document.getElementById("secretLetter");
    const restart = document.getElementById("restart");

    // =====================================
    // 2. INTEGRANTES DE BTS
    // =====================================

    const members = [
        "RM",
        "Jin",
        "SUGA",
        "j-hope",
        "Jimin",
        "V",
        "Jungkook"
    ];

    // =====================================
    // 3. FIGURITAS BTS
    // =====================================

    const btsStickers = Array.from(
        { length: 20 },
        (_, index) => {

            const member = members[index % members.length];

            return {
                id: `bts-${index + 1}`,
                number: String(index + 1).padStart(2, "0"),
                name: member,
                image: `img/bts${index + 1}.jpg`,
                emoji: "💜",
                description:
                    `Una figurita especial de ${member} ` +
                    "para tu colección BTS."
            };
        }
    );

    // =====================================
    // 4. PHOTOCARDS ESPECIALES DE V
    // =====================================

    const vStickers = Array.from(
        { length: 8 },
        (_, index) => {

            return {
                id: `v-${index + 1}`,
                number: `V${String(index + 1).padStart(2, "0")}`,
                name: "Kim Taehyung",
                image: `img/v${index + 1}.jpg`,
                emoji: "🐻",
                description:
                    "Una photocard especial de Taehyung. " +
                    "I Purple You 💜"
            };
        }
    );

    // =====================================
    // 5. VARIABLES DE PERSONALIZACIÓN
    // =====================================

    const customPhotos = new Map();

    let currentSticker = null;
    let lastFocusedElement = null;

    // =====================================
    // 6. BASE DE DATOS INDEXEDDB
    // =====================================

    const databasePromise = new Promise((resolve, reject) => {

        if (!window.indexedDB) {
            reject(
                new Error("IndexedDB no está disponible.")
            );
            return;
        }

        const request = indexedDB.open("BTSPhotoAlbum", 1);

        request.onupgradeneeded = () => {

            const db = request.result;

            if (!db.objectStoreNames.contains("photos")) {
                db.createObjectStore("photos");
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });

    // =====================================
    // 7. CARGAR FOTOGRAFÍAS GUARDADAS
    // =====================================

    async function loadCustomPhotos() {

        const db = await databasePromise;

        return new Promise((resolve, reject) => {

            const transaction = db.transaction(
                "photos",
                "readonly"
            );

            const store = transaction.objectStore("photos");

            const request = store.openCursor();

            request.onsuccess = () => {

                const cursor = request.result;

                if (cursor) {

                    const imageUrl = URL.createObjectURL(
                        cursor.value
                    );

                    customPhotos.set(
                        cursor.key,
                        imageUrl
                    );

                    cursor.continue();

                } else {
                    resolve();
                }
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // =====================================
    // 8. GUARDAR NUEVA FOTOGRAFÍA
    // =====================================

    async function saveCustomPhoto(id, file) {

        const db = await databasePromise;

        return new Promise((resolve, reject) => {

            const transaction = db.transaction(
                "photos",
                "readwrite"
            );

            transaction.objectStore("photos").put(
                file,
                id
            );

            transaction.oncomplete = () => {
                resolve();
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };

            transaction.onabort = () => {
                reject(transaction.error);
            };
        });
    }

    // =====================================
    // 9. ELIMINAR FOTO PERSONALIZADA
    // =====================================

    async function deleteCustomPhoto(id) {

        const db = await databasePromise;

        return new Promise((resolve, reject) => {

            const transaction = db.transaction(
                "photos",
                "readwrite"
            );

            transaction.objectStore("photos").delete(id);

            transaction.oncomplete = () => {
                resolve();
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };

            transaction.onabort = () => {
                reject(transaction.error);
            };
        });
    }

    // =====================================
    // 10. ACTUALIZAR CONTADORES
    // =====================================

    function updateCounters() {

        const btsCount = btsStickers.filter(
            sticker => customPhotos.has(sticker.id)
        ).length;

        const vCount = vStickers.filter(
            sticker => customPhotos.has(sticker.id)
        ).length;

        btsCounter.textContent = `${btsCount} / 20`;

        vCounter.textContent = `${vCount} / 8`;
    }

    // =====================================
    // 11. CREAR CONTENEDOR DE FOTOGRAFÍA
    // =====================================

    function createPhoto(sticker, className) {

        const container = document.createElement("div");

        container.className = className;

        const placeholder = document.createElement("span");

        placeholder.className = "sticker-placeholder";
        placeholder.textContent = sticker.emoji;

        const image = document.createElement("img");

        image.src = customPhotos.get(sticker.id) || sticker.image;

        image.alt = `Fotografía de ${sticker.name}`;

        image.loading = "lazy";

        image.onerror = () => {
            image.remove();
        };

        image.onload = () => {
            placeholder.remove();
        };

        container.appendChild(placeholder);
        container.appendChild(image);

        return container;
    }

    // =====================================
    // 12. CREAR UNA FIGURITA
    // =====================================

    function createSticker(sticker) {

        const button = document.createElement("button");

        button.dataset.stickerId = sticker.id;
        button.type = "button";
        button.className = "sticker";

        if (customPhotos.has(sticker.id)) {
            button.classList.add("discovered");
        }

        const photo = createPhoto(
            sticker,
            "sticker-photo"
        );

        const number = document.createElement("span");

        number.className = "sticker-number";
        number.textContent = sticker.number;

        const name = document.createElement("span");

        name.className = "sticker-name";
        name.textContent = sticker.name;

        photo.appendChild(number);

        button.appendChild(photo);
        button.appendChild(name);

        button.setAttribute(
            "aria-label",
            `Ver figurita ${sticker.number} de ${sticker.name}`
        );

        button.addEventListener("click", () => {
            openSticker(sticker, button);
        });

        return button;
    }

    // =====================================
    // 13. MOSTRAR TODAS LAS FIGURITAS
    // =====================================

    function renderStickers() {

        btsGrid.replaceChildren();
        vGrid.replaceChildren();

        btsStickers.forEach(sticker => {

            btsGrid.appendChild(
                createSticker(sticker)
            );
        });

        vStickers.forEach(sticker => {

            vGrid.appendChild(
                createSticker(sticker)
            );
        });

        updateCounters();
    }

    // =====================================
    // 14. ABRIR FIGURITA
    // =====================================

    function openSticker(sticker, button) {

        currentSticker = sticker;
        lastFocusedElement = button;

        modalImage.replaceChildren(
            createPhoto(sticker, "modal-photo")
        );

        modalTitle.textContent = sticker.name;

        modalDescription.textContent = sticker.description;

        removePhoto.hidden = !customPhotos.has(sticker.id);

        uploadStatus.textContent = "";

        modal.hidden = false;

        document.body.classList.add("modal-open");

        closeModal.focus();
    }

    // =====================================
    // 15. CERRAR FIGURITA
    // =====================================

    function closeSticker() {

        modal.hidden = true;

        document.body.classList.remove("modal-open");

        currentSticker = null;

        if (lastFocusedElement) {

            // El renderizado puede reemplazar los botones.
            // Volvemos a buscar la figurita si es necesario.

            const focusedId = lastFocusedElement.dataset.stickerId;

            const replacement = focusedId
                ? Array.from(
                    document.querySelectorAll(".sticker")
                ).find(
                    element => element.dataset.stickerId === focusedId
                )
                : null;

            (replacement || lastFocusedElement).focus();
        }
    }

    closeModal.addEventListener(
        "click",
        closeSticker
    );

    modal.addEventListener("click", event => {

        if (event.target === modal) {
            closeSticker();
        }
    });

    document.addEventListener("keydown", event => {

        if (
            event.key === "Escape" &&
            !modal.hidden
        ) {
            closeSticker();
        }
    });

    // =====================================
    // 16. SUBIR FOTOGRAFÍA DESDE EL CELULAR
    // =====================================

    uploadPhoto.addEventListener(
        "change",
        async event => {

            const file = event.target.files[0];

            const sticker = currentSticker;

            if (!file || !sticker) {
                return;
            }

            // VALIDAR TIPO DE ARCHIVO

            if (!file.type.startsWith("image/")) {

                uploadStatus.textContent =
                    "Selecciona un archivo de imagen válido.";

                uploadPhoto.value = "";

                return;
            }

            // VALIDAR TAMAÑO MÁXIMO: 10 MB

            const maxSize = 10 * 1024 * 1024;

            if (file.size > maxSize) {

                uploadStatus.textContent =
                    "La fotografía debe pesar menos de 10 MB.";

                uploadPhoto.value = "";

                return;
            }

            uploadStatus.textContent =
                "Guardando fotografía...";

            try {

                // GUARDAR EN INDEXEDDB

                await saveCustomPhoto(
                    sticker.id,
                    file
                );

                // LIBERAR LA IMAGEN ANTERIOR

                const oldUrl = customPhotos.get(sticker.id);

                if (oldUrl) {
                    URL.revokeObjectURL(oldUrl);
                }

                // CREAR NUEVA URL LOCAL

                const newUrl = URL.createObjectURL(file);

                customPhotos.set(
                    sticker.id,
                    newUrl
                );

                // ACTUALIZAR FIGURITAS

                renderStickers();

                // ACTUALIZAR VISOR SI SIGUE ABIERTO

                if (
                    currentSticker?.id === sticker.id &&
                    !modal.hidden
                ) {

                    modalImage.replaceChildren(
                        createPhoto(sticker, "modal-photo")
                    );

                    removePhoto.hidden = false;

                    uploadStatus.textContent =
                        "💜 Fotografía guardada correctamente.";
                }

            } catch (error) {

                console.error(error);

                uploadStatus.textContent =
                    "No se pudo guardar la fotografía. " +
                    "Comprueba el almacenamiento del navegador.";
            }

            uploadPhoto.value = "";
        }
    );

    // =====================================
    // 17. RESTAURAR FIGURITA ORIGINAL
    // =====================================

    removePhoto.addEventListener(
        "click",
        async () => {

            if (!currentSticker) {
                return;
            }

            const sticker = currentSticker;

            uploadStatus.textContent =
                "Restaurando figurita...";

            try {

                await deleteCustomPhoto(sticker.id);

                const oldUrl = customPhotos.get(sticker.id);

                if (oldUrl) {
                    URL.revokeObjectURL(oldUrl);
                }

                customPhotos.delete(sticker.id);

                renderStickers();

                modalImage.replaceChildren(
                    createPhoto(sticker, "modal-photo")
                );

                removePhoto.hidden = true;

                uploadStatus.textContent =
                    "Figurita restaurada correctamente.";

            } catch (error) {

                console.error(error);

                uploadStatus.textContent =
                    "No se pudo restaurar la figurita.";
            }
        }
    );

    // =====================================
    // 18. ABRIR EL ÁLBUM
    // =====================================

    openAlbum.addEventListener("click", () => {

        albumContent.hidden = false;

        document.getElementById(
            "coleccion"
        ).scrollIntoView({
            behavior: "smooth"
        });
    });

    // =====================================
    // 19. ABRIR LA CARTA SECRETA
    // =====================================

    envelope.addEventListener("click", () => {

        const wasOpen = !secretLetter.hidden;

        secretLetter.hidden = wasOpen;

        envelope.setAttribute(
            "aria-expanded",
            String(!wasOpen)
        );

        if (!wasOpen) {

            secretLetter.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    });

    // =====================================
    // 20. VOLVER A LA PORTADA
    // =====================================

    restart.addEventListener("click", event => {

        event.preventDefault();

        albumContent.hidden = true;

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    // =====================================
    // 21. INICIAR PROYECTO
    // =====================================

    async function initializeAlbum() {

        try {

            await loadCustomPhotos();

        } catch (error) {

            console.warn(
                "No se pudieron recuperar las fotografías:",
                error
            );
        }

        renderStickers();
    }

    initializeAlbum();

});
