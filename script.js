document.addEventListener("DOMContentLoaded", () => {
  const titleInput = document.getElementById("title");
  const dateInput = document.getElementById("date");
  const messageInput = document.getElementById("text");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const fileInput = document.getElementById("file");
  const dropZone = document.getElementById("drop");
  const thumbs = document.getElementById("thumbs");
  const sealButton = document.getElementById("seal");
  const errorMessage = document.getElementById("err");
  const confirmation = document.getElementById("confirm");
  const cards = document.getElementById("cards");
  const themeButton = document.getElementById("theme");
  const capsuleAnimation = document.getElementById("capsule");
  const storageKey = "timeCapsules";
  const themeKey = "theme";
  const maxPhotos = 6;
  const maxPhotoBytes = 2 * 1024 * 1024;
  let selectedPhotos = [];
  let pendingPhotoCount = 0;
  let capsules = [];

  function showError(message) {
    errorMessage.textContent = message;
  }

  function clearError() {
    errorMessage.textContent = "";
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return formatDate(date) === value ? date : null;
  }

  function getToday() {
    return formatDate(new Date());
  }

  function newId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function readCapsules() {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        throw new Error("Saved capsules are not in the expected format.");
      }

      return parsed.filter(capsule =>
        capsule &&
        typeof capsule.id === "string" &&
        typeof capsule.title === "string" &&
        typeof capsule.message === "string" &&
        typeof capsule.unlockDate === "string" &&
        parseDate(capsule.unlockDate) &&
        typeof capsule.email === "string"
      ).map(capsule => ({
        ...capsule,
        phone: typeof capsule.phone === "string" ? capsule.phone : "",
        photos: Array.isArray(capsule.photos)
          ? capsule.photos.filter(photo => typeof photo === "string" && photo.startsWith("data:image/"))
          : []
      }));
    } catch (error) {
      showError(`Could not load saved capsules: ${error.message}`);
      return [];
    }
  }

  function saveCapsules() {
    localStorage.setItem(storageKey, JSON.stringify(capsules));
  }

  function isValidFutureDate(value) {
    const date = parseDate(value);
    return date !== null && value > getToday();
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  dateInput.min = formatDate(addDays(new Date(), 1));

  document.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => {
      const days = Number(button.dataset.add);
      if (Number.isFinite(days) && days > 0) {
        dateInput.value = formatDate(addDays(new Date(), days));
      }
    });
  });

  function displayThumbnails() {
    thumbs.replaceChildren();

    selectedPhotos.forEach((photo, index) => {
      const container = document.createElement("div");
      container.className = "thumb";

      const image = document.createElement("img");
      image.src = photo;
      image.alt = `Selected photo ${index + 1}`;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "×";
      removeButton.setAttribute("aria-label", `Remove photo ${index + 1}`);
      removeButton.addEventListener("click", () => {
        selectedPhotos.splice(index, 1);
        displayThumbnails();
      });

      container.append(image, removeButton);
      thumbs.appendChild(container);
    });
  }

  function readPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error(`Could not read ${file.name}.`));
      });
      reader.addEventListener("error", () => reject(new Error(`Could not read ${file.name}.`)));
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotos(files) {
    clearError();
    const images = Array.from(files).filter(file => file.type.startsWith("image/"));
    const remaining = maxPhotos - selectedPhotos.length - pendingPhotoCount;
    const accepted = images.slice(0, remaining);

    if (images.length > remaining) {
      showError(`You can add up to ${maxPhotos} photos.`);
    }

    const validFiles = accepted.filter(file => {
      if (file.size > maxPhotoBytes) {
        showError("Each photo must be smaller than 2 MB.");
        return false;
      }
      return true;
    });

    pendingPhotoCount += validFiles.length;
    try {
      const photos = await Promise.all(validFiles.map(readPhoto));
      selectedPhotos.push(...photos);
      displayThumbnails();
    } catch (error) {
      showError(error.message);
    } finally {
      pendingPhotoCount -= validFiles.length;
    }
  }

  dropZone.addEventListener("click", () => fileInput.click());
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
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
  dropZone.addEventListener("drop", event => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    handlePhotos(event.dataTransfer.files);
  });
  fileInput.addEventListener("change", () => {
    handlePhotos(fileInput.files);
    fileInput.value = "";
  });

  function makeLink(label, href) {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    return link;
  }

  function emailDraft(capsule) {
    const subject = `Time capsule: ${capsule.title}`;
    const body = `A note to your future self is sealed and will open on ${capsule.unlockDate}.`;
    return `mailto:${encodeURIComponent(capsule.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function smsDraft(capsule, openingDay) {
    const body = openingDay
      ? `Your time capsule "${capsule.title}" is ready to open today.`
      : `I sealed a time capsule titled "${capsule.title}". It opens on ${capsule.unlockDate}.`;
    return `sms:${encodeURIComponent(capsule.phone)}?body=${encodeURIComponent(body)}`;
  }

  function icsEscape(value) {
    return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  }

  function calendarDraft(capsule) {
    const start = capsule.unlockDate.replace(/-/g, "");
    const end = formatDate(addDays(parseDate(capsule.unlockDate), 1)).replace(/-/g, "");
    const content = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Time Capsule//EN",
      "BEGIN:VEVENT",
      `UID:${icsEscape(capsule.id)}@time-capsule.local`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${icsEscape(`Open your time capsule: ${capsule.title}`)}`,
      `DESCRIPTION:${icsEscape("Your time capsule is ready to open.")}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    const link = makeLink("Download opening-day calendar invite", "#");
    link.addEventListener("click", event => {
      event.preventDefault();
      const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const download = document.createElement("a");
      download.href = url;
      download.download = "time-capsule-opening.ics";
      document.body.appendChild(download);
      download.click();
      download.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    return link;
  }

  function makeActionArea(capsule, confirmationActions) {
    const actions = document.createElement("div");
    actions.append(calendarDraft(capsule));

    if (capsule.phone) {
      const smsParagraph = document.createElement("p");
      const label = confirmationActions
        ? "Open confirmation text draft"
        : "Open opening-day text draft";
      smsParagraph.append(makeLink(label, smsDraft(capsule, !confirmationActions)));
      actions.append(smsParagraph);
    }

    if (confirmationActions) {
      const emailParagraph = document.createElement("p");
      emailParagraph.append(makeLink("Open confirmation email draft", emailDraft(capsule)));
      actions.append(emailParagraph);
    }

    return actions;
  }

  function renderCapsules() {
    cards.replaceChildren();

    capsules.forEach(capsule => {
      const card = document.createElement("article");
      const locked = capsule.unlockDate > getToday();
      card.className = locked ? "" : "ready";

      const heading = document.createElement("h3");
      heading.textContent = capsule.title;
      card.append(heading);

      const date = document.createElement("p");
      date.textContent = `Opens on: ${capsule.unlockDate}`;
      card.append(date);

      if (locked) {
        const remaining = document.createElement("p");
        const todayUtc = Date.parse(`${getToday()}T00:00:00Z`);
        const openingUtc = Date.parse(`${capsule.unlockDate}T00:00:00Z`);
        const days = Math.ceil((openingUtc - todayUtc) / 86400000);
        remaining.textContent = `${days} ${days === 1 ? "day" : "days"} remaining`;
        card.append(remaining);
      } else {
        const message = document.createElement("p");
        message.className = "msg";
        message.textContent = capsule.message;
        if (capsule.message) card.append(message);

        capsule.photos.forEach((photo, index) => {
          const image = document.createElement("img");
          image.src = photo;
          image.alt = `Capsule photo ${index + 1}`;
          card.append(image);
        });
      }

      card.append(makeActionArea(capsule, false));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "ghost";
      deleteButton.textContent = "Delete capsule";
      deleteButton.addEventListener("click", () => {
        if (!window.confirm(`Delete "${capsule.title}"?`)) return;
        const previous = capsules;
        capsules = capsules.filter(item => item.id !== capsule.id);
        try {
          saveCapsules();
          renderCapsules();
        } catch (error) {
          capsules = previous;
          showError(`Could not delete the capsule: ${error.message}`);
        }
      });
      card.append(deleteButton);
      cards.append(card);
    });
  }

  function addConfirmation(capsule) {
    confirmation.replaceChildren();
    const message = document.createElement("p");
    message.textContent = `Your time capsule has been sealed! It opens on ${capsule.unlockDate} and is saved in this browser.`;
    confirmation.append(message, makeActionArea(capsule, true));
    confirmation.hidden = false;
  }

  sealButton.addEventListener("click", () => {
    clearError();
    confirmation.hidden = true;

    const title = titleInput.value.trim();
    const message = messageInput.value.trim();
    const unlockDate = dateInput.value;
    const email = emailInput.value.trim();

    if (!title) return showError("Please enter a capsule title.");
    if (!message && selectedPhotos.length === 0) {
      return showError("Please write a message or upload a photo.");
    }
    if (!isValidFutureDate(unlockDate)) {
      return showError("Please select a date after today.");
    }
    if (!email || !emailInput.checkValidity()) {
      return showError("Please enter a valid email address.");
    }
    if (phoneInput.value.trim() && !phoneInput.checkValidity()) {
      return showError("Please enter a valid phone number or leave it blank.");
    }

    const capsule = {
      id: newId(),
      title,
      message,
      unlockDate,
      email,
      phone: phoneInput.value.trim(),
      photos: [...selectedPhotos],
      createdAt: new Date().toISOString()
    };

    capsules.push(capsule);
    try {
      saveCapsules();
    } catch (error) {
      capsules.pop();
      showError(`Could not save your capsule. Browser storage may be full: ${error.message}`);
      return;
    }

    capsuleAnimation.classList.add("sealed");
    window.setTimeout(() => capsuleAnimation.classList.remove("sealed"), 1200);
    addConfirmation(capsule);

    titleInput.value = "";
    messageInput.value = "";
    dateInput.value = "";
    emailInput.value = "";
    phoneInput.value = "";
    fileInput.value = "";
    selectedPhotos = [];
    displayThumbnails();
    renderCapsules();
  });

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeButton.setAttribute("aria-pressed", String(theme === "dark"));
  }

  try {
    const savedTheme = localStorage.getItem(themeKey);
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }
  } catch (error) {
    showError(`Could not load your saved theme: ${error.message}`);
  }

  themeButton.addEventListener("click", () => {
    const currentTheme = document.documentElement.dataset.theme ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem(themeKey, nextTheme);
    } catch (error) {
      showError(`Theme changed, but could not save your preference: ${error.message}`);
    }
  });

  capsules = readCapsules();
  renderCapsules();

  window.setInterval(renderCapsules, 60000);
});
