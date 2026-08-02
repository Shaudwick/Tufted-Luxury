/**
 * Hourly art rental catalog — Black Lobby Collective
 * Event rentals: 2-hour minimum, prepaid via Stripe Checkout.
 */

const MIN_HOURS = 2;
const MAX_HOURS = 12;
const BUFFER_MINUTES = 60; // turnaround between bookings
const BUSINESS_HOURS = { start: 8, end: 22 }; // local event window start times

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
    image: piece.image,
    description: piece.description,
  }));
}

function getRentalPiece(pieceId) {
  return RENTAL_PIECES[pieceId] || null;
}

function getRentalQuote({ pieceId, hours }) {
  const piece = getRentalPiece(pieceId);
  if (!piece) return null;

  const hoursNum = Number(hours);
  if (!Number.isFinite(hoursNum) || hoursNum < MIN_HOURS || hoursNum > MAX_HOURS) {
    return null;
  }

  // Allow half-hour increments after the minimum
  if (Math.round(hoursNum * 2) !== hoursNum * 2) {
    return null;
  }

  const total = Math.round(piece.hourlyRate * hoursNum * 100) / 100;

  return {
    piece,
    hours: hoursNum,
    hourlyRate: piece.hourlyRate,
    minHours: MIN_HOURS,
    maxHours: MAX_HOURS,
    total,
  };
}

module.exports = {
  MIN_HOURS,
  MAX_HOURS,
  BUFFER_MINUTES,
  BUSINESS_HOURS,
  RENTAL_PIECES,
  listRentalPieces,
  getRentalPiece,
  getRentalQuote,
};
