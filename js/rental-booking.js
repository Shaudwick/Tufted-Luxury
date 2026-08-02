(function () {
  const FALLBACK_CATALOG = {
    minHours: 2,
    maxHours: 12,
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

  const pieceSelect = document.getElementById("pieceId");
  const hoursSelect = document.getElementById("hours");
  const dateInput = document.getElementById("date");
  const startTimeSelect = document.getElementById("startTime");
  const priceSummaryEl = document.getElementById("priceSummary");
  const availabilityEl = document.getElementById("availabilityNote");
  const noticeEl = document.getElementById("checkoutNotice");
  const submitButton = document.getElementById("submitButton");
  const pieceGridEl = document.getElementById("rentalPieceGrid");

  let catalog = FALLBACK_CATALOG;

  function money(amount) {
    return "$" + Number(amount).toLocaleString("en-US");
  }

  function getSelectedPiece() {
    return catalog.pieces.find((p) => p.id === pieceSelect.value) || null;
  }

  function buildHourOptions() {
    const min = catalog.minHours || 2;
    const max = catalog.maxHours || 12;
    const previous = hoursSelect.value;
    hoursSelect.innerHTML = "";

    for (let h = min; h <= max; h += 0.5) {
      const option = document.createElement("option");
      option.value = String(h);
      option.textContent =
        h === min
          ? h + " hours (minimum)"
          : h % 1 === 0
            ? h + " hours"
            : h + " hours";
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

  function populatePieceSelect(preferredId) {
    pieceSelect.innerHTML = '<option value="">Choose an artwork</option>';
    catalog.pieces.forEach((piece) => {
      const option = document.createElement("option");
      option.value = piece.id;
      option.textContent =
        piece.title + " — " + money(piece.hourlyRate) + "/hr";
      pieceSelect.appendChild(option);
    });

    const params = new URLSearchParams(window.location.search);
    const fromUrl = preferredId || params.get("piece");
    if (fromUrl && catalog.pieces.some((p) => p.id === fromUrl)) {
      pieceSelect.value = fromUrl;
    }
  }

  function renderPieceCards() {
    if (!pieceGridEl) return;
    pieceGridEl.innerHTML = catalog.pieces
      .map(
        (piece) =>
          '<button type="button" class="rental-piece-card" data-piece-id="' +
          piece.id +
          '" aria-pressed="' +
          (pieceSelect.value === piece.id ? "true" : "false") +
          '">' +
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
        pieceSelect.value = card.getAttribute("data-piece-id");
        syncPieceSelection();
        updateSummary();
        refreshAvailability();
      });
    });
  }

  function syncPieceSelection() {
    if (!pieceGridEl) return;
    pieceGridEl.querySelectorAll(".rental-piece-card").forEach((card) => {
      const selected = card.getAttribute("data-piece-id") === pieceSelect.value;
      card.setAttribute("aria-pressed", selected ? "true" : "false");
      card.classList.toggle("is-selected", selected);
    });
  }

  function updateSummary() {
    const piece = getSelectedPiece();
    const hours = Number(hoursSelect.value);
    const startTime = startTimeSelect.value;
    const date = dateInput.value;

    if (!piece || !hours) {
      priceSummaryEl.textContent =
        "Select an artwork and duration (2-hour minimum) to see your total.";
      submitButton.textContent = "Schedule & pay";
      return;
    }

    const total = piece.hourlyRate * hours;
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
      piece.title +
      "</strong> · " +
      hours +
      " hours @ " +
      money(piece.hourlyRate) +
      "/hr" +
      scheduleLine +
      "<br><strong>Total due today: " +
      money(total) +
      "</strong>";

    submitButton.textContent = "Pay " + money(total) + " & reserve";
  }

  async function refreshAvailability() {
    const pieceId = pieceSelect.value;
    const date = dateInput.value;
    if (!availabilityEl) return;

    if (!pieceId || !date) {
      availabilityEl.textContent =
        "Choose a piece and date to check open windows.";
      return;
    }

    availabilityEl.textContent = "Checking availability…";

    try {
      const res = await fetch(
        "/api/rental/availability?pieceId=" +
          encodeURIComponent(pieceId) +
          "&date=" +
          encodeURIComponent(date)
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not check availability");

      if (!data.unavailable || !data.unavailable.length) {
        availabilityEl.textContent =
          "Open for booking that day — 2-hour minimum, hassle-free checkout.";
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
        "Already reserved: " + windows + ". Pick another start time.";
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
    populatePieceSelect();
    renderPieceCards();
    syncPieceSelection();
    updateSummary();
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      pieceId: pieceSelect.value,
      date: dateInput.value,
      startTime: startTimeSelect.value,
      hours: Number(hoursSelect.value),
      eventName: form.eventName.value.trim(),
      venue: form.venue.value.trim(),
      notes: form.notes.value.trim(),
    };

    if (!payload.pieceId || !payload.date || !payload.startTime) {
      alert("Please choose an artwork, date, and start time.");
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
      alert(err.message || "Something went wrong. Please try again.");
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  });

  pieceSelect.addEventListener("change", function () {
    syncPieceSelection();
    updateSummary();
    refreshAvailability();
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
