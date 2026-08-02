(function () {
  const FALLBACK_CATALOG = {
    minHours: 2,
    maxHours: 6,
    maxPieces: 2,
    businessHours: { start: 8, end: 22 },
    pieces: [
      {
        id: "rugExodus",
        title: "Exodus",
        collection: "Gods Collection",
        hourlyRate: 175,
        image: "Website-Images/Gods/Exodus.jpg",
        description:
          "Warm pinks, oranges, and deep black — a profile that anchors a room with presence.",
      },
      {
        id: "rugChronicles",
        title: "Chronicles",
        collection: "Gods Collection",
        hourlyRate: 175,
        image: "Website-Images/Gods/Chronicles.jpg",
        description:
          "Red, teal, black, and white in carved concentric geometry — bold symmetry for landmark spaces.",
      },
      {
        id: "rugPsalms",
        title: "Psalms",
        collection: "Gods Collection",
        hourlyRate: 175,
        image: "Website-Images/Gods/Psalms.jpg",
        description:
          "Layered concentric form in red, teal, yellow, black, and white — sacred geometry for the room.",
      },
      {
        id: "rugBookOfRuth",
        title: "The Book of Ruth",
        collection: "Gods Collection",
        hourlyRate: 175,
        image: "Website-Images/Gods/BookOfRuth.jpg",
        description:
          "Purple, gold, and grey — stature and restraint to close an evening with intention.",
      },
      {
        id: "godsCollectionFull",
        title: "Gods Collection — Full Set",
        collection: "Gods Collection",
        hourlyRate: 550,
        image: "Website-Images/Gods/Chronicles.jpg",
        description:
          "All four Gods Collection works for a full gallery presence at your event.",
      },
    ],
  };

  const form = document.getElementById("rentalForm");
  if (!form) return;

  const selectedListEl = document.getElementById("selectedPieces");
  const hoursSelect = document.getElementById("hours");
  const dateInput = document.getElementById("date");
  const startTimeSelect = document.getElementById("startTime");
  const priceSummaryEl = document.getElementById("priceSummary");
  const availabilityEl = document.getElementById("availabilityNote");
  const noticeEl = document.getElementById("checkoutNotice");
  const submitButton = document.getElementById("submitButton");
  const pieceGridEl = document.getElementById("rentalPieceGrid");

  let catalog = FALLBACK_CATALOG;
  let selectedIds = [];

  function maxPieces() {
    return catalog.maxPieces || 2;
  }

  function money(amount) {
    return "$" + Number(amount).toLocaleString("en-US");
  }

  function getSelectedPieces() {
    return selectedIds
      .map((id) => catalog.pieces.find((p) => p.id === id))
      .filter(Boolean);
  }

  function buildHourOptions() {
    const min = catalog.minHours || 2;
    const max = catalog.maxHours || 6;
    const previous = hoursSelect.value;
    hoursSelect.innerHTML = "";

    for (let h = min; h <= max; h += 0.5) {
      const option = document.createElement("option");
      option.value = String(h);
      option.textContent =
        h === min ? h + " hours (minimum)" : h + " hours";
      hoursSelect.appendChild(option);
    }

    if (previous && Number(previous) >= min && Number(previous) <= max) {
      hoursSelect.value = previous;
    } else {
      hoursSelect.value = String(min);
    }
  }

  function buildTimeOptions() {
    const start = (catalog.businessHours && catalog.businessHours.start) || 8;
    const end = (catalog.businessHours && catalog.businessHours.end) || 22;
    const previous = startTimeSelect.value;
    startTimeSelect.innerHTML = '<option value="">Choose a start time</option>';

    for (let hour = start; hour <= end; hour++) {
      for (const minute of [0, 30]) {
        if (hour === end && minute > 0) continue;
        const value =
          String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
        const label = new Date("1970-01-01T" + value + ":00").toLocaleTimeString(
          "en-US",
          { hour: "numeric", minute: "2-digit" }
        );
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        startTimeSelect.appendChild(option);
      }
    }

    if (previous) startTimeSelect.value = previous;
  }

  function togglePiece(pieceId) {
    const idx = selectedIds.indexOf(pieceId);
    if (idx >= 0) {
      selectedIds.splice(idx, 1);
      syncSelectionUi();
      updateSummary();
      refreshAvailability();
      return;
    }

    if (pieceId === "godsCollectionFull") {
      if (selectedIds.length && selectedIds[0] !== "godsCollectionFull") {
        alert(
          "The full Gods Collection already includes all four works. Clear your other selection first, or keep individual pieces only."
        );
        return;
      }
      selectedIds = ["godsCollectionFull"];
      syncSelectionUi();
      updateSummary();
      refreshAvailability();
      return;
    }

    if (selectedIds.includes("godsCollectionFull")) {
      alert(
        "The full Gods Collection is already selected. Deselect it to choose individual works (up to " +
          maxPieces() +
          ")."
      );
      return;
    }

    if (selectedIds.length >= maxPieces()) {
      alert("You can select up to " + maxPieces() + " pieces.");
      return;
    }

    selectedIds.push(pieceId);
    syncSelectionUi();
    updateSummary();
    refreshAvailability();
  }

  function renderSelectedList() {
    if (!selectedListEl) return;
    const pieces = getSelectedPieces();
    if (!pieces.length) {
      selectedListEl.textContent = "None selected yet — tap up to " + maxPieces() + " works above.";
      return;
    }
    selectedListEl.innerHTML = pieces
      .map(
        (piece) =>
          "<strong>" +
          piece.title +
          "</strong> · " +
          money(piece.hourlyRate) +
          "/hr"
      )
      .join("<br>");
  }

  function renderPieceCards() {
    if (!pieceGridEl) return;
    pieceGridEl.innerHTML = catalog.pieces
      .map(
        (piece) =>
          '<button type="button" class="rental-piece-card" data-piece-id="' +
          piece.id +
          '" aria-pressed="false">' +
          '<img src="' +
          piece.image +
          '" alt="' +
          piece.title +
          '" loading="lazy" width="400" height="500" />' +
          '<span class="rental-piece-card__meta">' +
          '<span class="rental-piece-card__collection">' +
          piece.collection +
          "</span>" +
          "<strong>" +
          piece.title +
          "</strong>" +
          "<em>" +
          money(piece.hourlyRate) +
          "/hr · 2 hr min</em>" +
          "</span>" +
          "</button>"
      )
      .join("");

    pieceGridEl.querySelectorAll(".rental-piece-card").forEach((card) => {
      card.addEventListener("click", function () {
        togglePiece(card.getAttribute("data-piece-id"));
      });
    });
  }

  function syncSelectionUi() {
    if (pieceGridEl) {
      pieceGridEl.querySelectorAll(".rental-piece-card").forEach((card) => {
        const selected = selectedIds.includes(
          card.getAttribute("data-piece-id")
        );
        card.setAttribute("aria-pressed", selected ? "true" : "false");
        card.classList.toggle("is-selected", selected);
      });
    }
    renderSelectedList();
  }

  function updateSummary() {
    const pieces = getSelectedPieces();
    const hours = Number(hoursSelect.value);
    const startTime = startTimeSelect.value;
    const date = dateInput.value;

    if (!pieces.length || !hours) {
      priceSummaryEl.textContent =
        "Select up to " +
        maxPieces() +
        " artworks and a duration (2-hour minimum) to see your total.";
      submitButton.textContent = "Schedule & pay";
      return;
    }

    const hourlyRate = pieces.reduce((sum, p) => sum + p.hourlyRate, 0);
    const total = hourlyRate * hours;
    const titles = pieces.map((p) => p.title).join(" + ");
    let scheduleLine = "";
    if (date && startTime) {
      const start = new Date(date + "T" + startTime + ":00");
      const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
      scheduleLine =
        "<br>" +
        start.toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }) +
        " – " +
        end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }

    priceSummaryEl.innerHTML =
      "<strong>" +
      titles +
      "</strong> · " +
      pieces.length +
      (pieces.length === 1 ? " piece" : " pieces") +
      " · " +
      hours +
      " hours @ " +
      money(hourlyRate) +
      "/hr combined" +
      scheduleLine +
      "<br><strong>Total due today: " +
      money(total) +
      "</strong>";

    submitButton.textContent = "Pay " + money(total) + " & reserve";
  }

  async function refreshAvailability() {
    const date = dateInput.value;
    if (!availabilityEl) return;

    if (!selectedIds.length || !date) {
      availabilityEl.textContent =
        "Choose up to " + maxPieces() + " pieces and a date to check open windows.";
      return;
    }

    availabilityEl.textContent = "Checking availability…";

    try {
      const res = await fetch(
        "/api/rental/availability?pieceIds=" +
          encodeURIComponent(selectedIds.join(",")) +
          "&date=" +
          encodeURIComponent(date)
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not check availability");

      if (!data.unavailable || !data.unavailable.length) {
        availabilityEl.textContent =
          "Open for booking that day — up to " +
          maxPieces() +
          " pieces, 2-hour minimum.";
        return;
      }

      const windows = data.unavailable
        .map(function (slot) {
          const start = new Date(slot.startISO);
          const end = new Date(slot.endISO);
          return (
            start.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }) +
            "–" +
            end.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })
          );
        })
        .join(", ");

      availabilityEl.textContent =
        "Already reserved for a selected piece: " +
        windows +
        ". Pick another start time.";
    } catch (err) {
      availabilityEl.textContent =
        err.message || "Availability check unavailable — you can still book.";
    }
  }

  function showCheckoutNotice() {
    if (!noticeEl) return;
    const params = new URLSearchParams(window.location.search);

    if (params.get("success") === "true") {
      noticeEl.hidden = false;
      noticeEl.className =
        "framed-pieces__notice framed-pieces__notice--success rental-notice";
      noticeEl.innerHTML =
        "<strong>You're reserved.</strong> Payment confirmed — check your email for the rental details. We'll follow up on delivery and setup.";
      return;
    }

    if (params.get("canceled") === "true") {
      noticeEl.hidden = false;
      noticeEl.className =
        "framed-pieces__notice framed-pieces__notice--cancel rental-notice";
      noticeEl.innerHTML =
        "<strong>Checkout canceled.</strong> Your time slot was not charged. Adjust the schedule below whenever you're ready.";
    }
  }

  function setMinDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().slice(0, 10);
  }

  function seedFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("piece");
    if (fromUrl && catalog.pieces.some((p) => p.id === fromUrl)) {
      selectedIds = [fromUrl];
    }
  }

  async function loadCatalog() {
    try {
      const res = await fetch("/api/rental/catalog");
      if (res.ok) {
        catalog = await res.json();
      }
    } catch (_) {
      /* use fallback */
    }

    buildHourOptions();
    buildTimeOptions();
    seedFromUrl();
    renderPieceCards();
    syncSelectionUi();
    updateSummary();
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      pieceIds: selectedIds.slice(),
      date: dateInput.value,
      startTime: startTimeSelect.value,
      hours: Number(hoursSelect.value),
      eventName: form.eventName.value.trim(),
      venue: form.venue.value.trim(),
      notes: form.notes.value.trim(),
    };

    if (!payload.pieceIds.length || !payload.date || !payload.startTime) {
      alert("Please choose up to " + maxPieces() + " artworks, a date, and a start time.");
      return;
    }

    if (payload.pieceIds.length > maxPieces()) {
      alert("You can select up to " + maxPieces() + " pieces.");
      return;
    }

    if (payload.hours < (catalog.minHours || 2)) {
      alert("Rentals require a " + (catalog.minHours || 2) + "-hour minimum.");
      return;
    }

    submitButton.disabled = true;
    const originalLabel = submitButton.textContent;
    submitButton.textContent = "Opening secure checkout…";

    try {
      const res = await fetch("/api/rental-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout");
      }
      window.location.href = data.url;
    } catch (err) {
      const message = err.message || "Something went wrong. Please try again.";
      alert(message);
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
      console.error("Rental checkout failed:", err);
    }
  });

  hoursSelect.addEventListener("change", updateSummary);
  dateInput.addEventListener("change", function () {
    updateSummary();
    refreshAvailability();
  });
  startTimeSelect.addEventListener("change", updateSummary);

  setMinDate();
  showCheckoutNotice();
  loadCatalog();
})();
