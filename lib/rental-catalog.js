/**
 * Hourly art rental catalog — Black Lobby Collective
 * Event rentals: 2-hour minimum, up to 2 pieces, prepaid via Stripe Checkout.
 */

const MIN_HOURS = 2;
const MAX_HOURS = 6;
const MAX_PIECES = 2;
const BUFFER_MINUTES = 60; // turnaround between bookings
const BUSINESS_HOURS = { start: 8, end: 22 }; // local event window start times

const INDIVIDUAL_GODS_IDS = [
  "rugExodus",
  "rugChronicles",
  "rugPsalms",
  "rugBookOfRuth",
];

const RENTAL_PIECES = {
  rugExodus: {
    id: "rugExodus",
    title: "Exodus",
    collection: "Gods Collection",
    hourlyRate: 175,
    image: "Website-Images/Gods/Exodus.jpg",
    description: "Warm pinks, oranges, and deep black — a profile that anchors a room with presence.",
  },
  rugChronicles: {
    id: "rugChronicles",
    title: "Chronicles",
    collection: "Gods Collection",
    hourlyRate: 175,
    image: "Website-Images/Gods/Chronicles.jpg",
    description: "Red, teal, black, and white in carved concentric geometry — bold symmetry for landmark spaces.",
  },
  rugPsalms: {
    id: "rugPsalms",
    title: "Psalms",
    collection: "Gods Collection",
    hourlyRate: 175,
    image: "Website-Images/Gods/Psalms.jpg",
    description: "Layered concentric form in red, teal, yellow, black, and white — sacred geometry for the room.",
  },
  rugBookOfRuth: {
    id: "rugBookOfRuth",
    title: "The Book of Ruth",
    collection: "Gods Collection",
    hourlyRate: 175,
    image: "Website-Images/Gods/BookOfRuth.jpg",
    description: "Purple, gold, and grey — stature and restraint to close an evening with intention.",
  },
  godsCollectionFull: {
    id: "godsCollectionFull",
    title: "Gods Collection — Full Set",
    collection: "Gods Collection",
    hourlyRate: 550,
    image: "Website-Images/Gods/Chronicles.jpg",
    description: "All four Gods Collection works for a full gallery presence at your event.",
  },
};

function listRentalPieces() {
  return Object.values(RENTAL_PIECES).map((piece) => ({
    id: piece.id,
    title: piece.title,
    collection: piece.collection,
    hourlyRate: piece.hourlyRate,
    minHours: MIN_HOURS,
    maxHours: MAX_HOURS,
    maxPieces: MAX_PIECES,
    image: piece.image,
    description: piece.description,
  }));
}

function getRentalPiece(pieceId) {
  return RENTAL_PIECES[pieceId] || null;
}

function normalizePieceIds(input) {
  const raw = Array.isArray(input)
    ? input
    : typeof input === "string" && input
      ? [input]
      : [];

  const unique = [];
  for (const id of raw) {
    if (typeof id !== "string" || !id) continue;
    if (!RENTAL_PIECES[id]) continue;
    if (!unique.includes(id)) unique.push(id);
  }
  return unique;
}

/**
 * Pieces that cannot be booked at the same time as the given piece.
 * Full set conflicts with every individual work, and vice versa.
 */
function getConflictingPieceIds(pieceId) {
  if (!RENTAL_PIECES[pieceId]) return [];
  if (pieceId === "godsCollectionFull") {
    return ["godsCollectionFull", ...INDIVIDUAL_GODS_IDS];
  }
  if (INDIVIDUAL_GODS_IDS.includes(pieceId)) {
    return [pieceId, "godsCollectionFull"];
  }
  return [pieceId];
}

function validatePieceSelection(pieceIds) {
  const ids = normalizePieceIds(pieceIds);
  if (!ids.length) {
    return { ok: false, error: "Choose at least one artwork" };
  }
  if (ids.length > MAX_PIECES) {
    return { ok: false, error: `You can select up to ${MAX_PIECES} pieces` };
  }
  if (ids.includes("godsCollectionFull") && ids.length > 1) {
    return {
      ok: false,
      error: "The full Gods Collection already includes all four works — select it alone",
    };
  }
  return { ok: true, pieceIds: ids };
}

function getRentalQuote({ pieceId, pieceIds, hours }) {
  const selection = validatePieceSelection(pieceIds || pieceId);
  if (!selection.ok) return null;

  const hoursNum = Number(hours);
  if (!Number.isFinite(hoursNum) || hoursNum < MIN_HOURS || hoursNum > MAX_HOURS) {
    return null;
  }

  // Allow half-hour increments after the minimum
  if (Math.round(hoursNum * 2) !== hoursNum * 2) {
    return null;
  }

  const pieces = selection.pieceIds.map((id) => RENTAL_PIECES[id]);
  const hourlyRate = pieces.reduce((sum, piece) => sum + piece.hourlyRate, 0);
  const total = Math.round(hourlyRate * hoursNum * 100) / 100;
  const titles = pieces.map((p) => p.title);
  const pieceTitle = titles.join(" + ");

  return {
    pieces,
    pieceIds: selection.pieceIds,
    pieceTitle,
    hours: hoursNum,
    hourlyRate,
    minHours: MIN_HOURS,
    maxHours: MAX_HOURS,
    maxPieces: MAX_PIECES,
    total,
    // Backward-compatible single-piece fields
    piece: pieces[0],
    pieceId: selection.pieceIds[0],
  };
}

module.exports = {
  MIN_HOURS,
  MAX_HOURS,
  MAX_PIECES,
  BUFFER_MINUTES,
  BUSINESS_HOURS,
  INDIVIDUAL_GODS_IDS,
  RENTAL_PIECES,
  listRentalPieces,
  getRentalPiece,
  normalizePieceIds,
  getConflictingPieceIds,
  validatePieceSelection,
  getRentalQuote,
};
