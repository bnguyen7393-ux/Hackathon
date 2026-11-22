
document.addEventListener("DOMContentLoaded", () => {

    // ==============================
    // 1. GET HTML ELEMENTS
    // ==============================

    const titleInput = document.getElementById("title");
    const dateInput = document.getElementById("date");
    const messageInput = document.getElementById("text");
    const emailInput = document.getElementById("email");

    const fileInput = document.getElementById("file");
    const dropZone = document.getElementById("drop");
    const thumbs = document.getElementById("thumbs");

    const sealButton = document.getElementById("seal");
    const errorMessage = document.getElementById("err");
    const confirmation = document.getElementById("confirm");

    const cards = document.getElementById("cards");
    const themeButton = document.getElementById("theme");
    const capsuleAnimation = document.getElementById("capsule");

    // ==============================
    // 2. LOAD SAVED CAPSULES
    // ==============================

    const STORAGE_KEY = "timeCapsules";

    let capsules = [];

    try {
        capsules = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        if (!Array.isArray(capsules)) capsules = [];
    } catch {
        capsules = [];
    }

    let selectedPhotos = [];

    function saveCapsules() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(capsules));
    }

    // ==============================
    // 3. DATE SETTINGS
    // ==============================

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function parseDate(value) {
        return new Date(value + "T00:00:00");
    }

    function isValidFutureDate(value) {
        const date = parseDate(value);

        return (
            value &&
            !Number.isNaN(date.getTime()) &&
            formatDate(date) === value &&
            date.getTime() > Date.now()
        );
    }

    dateInput.min = formatDate(new Date(Date.now() + 86400000));

    // Quick date buttons
    document.querySelectorAll("[data-add]").forEach(button => {

        button.addEventListener("click", () => {

            const days = Number(button.dataset.add);

            const futureDate = new Date();
            futureDate.setHours(0, 0, 0, 0);
            futureDate.setDate(futureDate.getDate() + days);

            dateInput.value = formatDate(futureDate);
        });
    });

    // ==============================
    // 4. PHOTO UPLOAD
    // ==============================

    dropZone.addEventListener("click", () => {
        fileInput.click();
    });

    dropZone.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInput.click();
        }
    });

    dropZone.addEventListener("dragover", event => {
        event.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", event => {
        event.preventDefault();
        dropZone.classList.remove("dragover");

        handlePhotos(event.dataTransfer.files);
    });

    fileInput.addEventListener("change", () => {
        handlePhotos(fileInput.files);
    });

    function handlePhotos(files) {

        const images = Array.from(files).filter(file =>
            file.type.startsWith("image/")
        );

        const remaining = 6 - selectedPhotos.length;

        if (images.length > remaining) {
            showError("You can upload a maximum of 6 photos.");
        }

        images.slice(0, remaining).forEach(file => {

            if (file.size > 2 * 1024 * 1024) {
                showError("Each photo must be smaller than 2 MB.");
                return;
            }

            const reader = new FileReader();

            reader.onload = () => {
                selectedPhotos.push(reader.result);
                displayThumbnails();
            };

            reader.readAsDataURL(file);
        });
    }

    function displayThumbnails() {

        thumbs.replaceChildren();

        selectedPhotos.forEach((photo, index) => {

            const container = document.createElement("div");
            container.className = "thumb";

            const image = document.createElement("img");
            image.src = photo;
            image.alt = "Selected photo";

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.textContent = "×";
            removeButton.setAttribute("aria-label", "Remove photo");

            removeButton.addEventListener("click", () => {
                selectedPhotos.splice(index, 1);
                displayThumbnails();
            });

            container.append(image, removeButton);
            thumbs.appendChild(container);
        });
    }

    // ==============================
    // 5. VALIDATION
    // ==============================

    function showError(message) {
        errorMessage.textContent = message;
    }

    function clearError() {
        errorMessage.textContent = "";
    }

    // ==============================
    // 6. CREATE TIME CAPSULE
    // ==============================

    sealButton.addEventListener("click", () => {

        clearError();
        confirmation.hidden = true;

        const title = titleInput.value.trim();
        const message = messageInput.value.trim();
        const unlockDate = dateInput.value;
        const email = emailInput.value.trim();

        if (!title) {
            showError("Please enter a capsule title.");
            return;
        }

        if (!message && selectedPhotos.length === 0) {
            showError("Please write a message or upload a photo.");
            return;
        }

        if (!isValidFutureDate(unlockDate)) {
            showError("Please select a valid future date.");
            return;
        }

        if (!email || !emailInput.checkValidity()) {
            showError("Please enter a valid email address.");
            return;
        }

        const newCapsule = {
            id: crypto.randomUUID(),
            title: title,
            message: message,
            unlockDate: unlockDate,
            email: email,
            photos: [...selectedPhotos],
            createdAt: new Date().toISOString()
        };

        capsules.push(newCapsule);

        try {
            saveCapsules();
        } catch {
            capsules.pop();
            showError(
                "Browser storage is full. Try fewer or smaller photos."
            );
            return;
        }

        // Play capsule animation
        capsuleAnimation.classList.add("sealed");

        setTimeout(() => {
            capsuleAnimation.classList.remove("sealed");
        }, 1200);

        // Confirmation
        confirmation.hidden = false;
        confirmation.textContent =
            "Your time capsule has been sealed! Opens on " +
            unlockDate + ". Saved in this browser.";

        // Clear form
        titleInput.value = "";
        messageInput.value = "";
        dateInput.value = "";
        emailInput.value = "";
        fileInput.value = "";

        selectedPhotos = [];
        displayThumbnails();

        displayCapsules();
    });

    // ==============================
    // 7. DISPLAY TIME CAPSULES
    // ==============================

    function displayCapsules() {

        cards.replaceChildren();

        if (capsules.length === 0) {

            const emptyMessage = document.createElement("p");
            emptyMessage.textContent =
                "No time capsules yet. Create your first one!";

            cards.appendChild(emptyMessage);
            return;
        }

        capsules.forEach(capsule => {

            const card = document.createElement("div");
            card.className = "capsule-card";

            const title = document.createElement("h3");
            title.textContent = capsule.title;

            const unlockTime = parseDate(capsule.unlockDate).getTime();
            const locked = Date.now() < unlockTime;

            const status = document.createElement("p");

            card.appendChild(title);

            if (locked) {

                status.textContent = "🔒 Locked";
                card.appendChild(status);

                const date = document.createElement("p");
                date.textContent =
                    "Opens on: " + capsule.unlockDate;

                card.appendChild(date);

                const daysLeft = Math.ceil(
                    (unlockTime - Date.now()) / 86400000
                );

                const countdown = document.createElement("p");
                countdown.textContent =
                    daysLeft + " days remaining";

                card.appendChild(countdown);

            } else {

                status.textContent = "🔓 Unlocked!";
                card.appendChild(status);

                const message = document.createElement("p");
                message.textContent = capsule.message;

                card.appendChild(message);

                if (Array.isArray(capsule.photos)) {

                    capsule.photos.forEach(photo => {

                        const image = document.createElement("img");
                        image.src = photo;
                        image.alt = "Time capsule memory";
                        image.style.maxWidth = "150px";

                        card.appendChild(image);
                    });
                }
            }

            // Delete button
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", () => {

                if (confirm("Delete this time capsule?")) {

                    capsules = capsules.filter(
                        item => item.id !== capsule.id
                    );

                    saveCapsules();
                    displayCapsules();
                }
            });

            card.appendChild(deleteButton);
            cards.appendChild(card);
        });
    }

    // ==============================
    // 8. DARK MODE
    // ==============================

    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark");
    }

    themeButton.addEventListener("click", () => {

        document.body.classList.toggle("dark");

        const darkMode = document.body.classList.contains("dark");

        localStorage.setItem(
            "theme",
            darkMode ? "dark" : "light"
        );
    });

    // ==============================
    // 9. AUTOMATIC UNLOCK CHECK
    // ==============================

    displayCapsules();

    setInterval(() => {
        displayCapsules();
    }, 60000);

});
