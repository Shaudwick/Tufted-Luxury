/**
 * Lightweight JSON booking store for hourly art rentals.
 * Tracks pending + confirmed windows so pieces aren't double-booked.
 * Supports up to 2 pieces per booking, with full-set conflict rules.
 *
 * On Vercel/serverless the app filesystem is read-only, so we persist under /tmp.
 * If the store is unavailable, reads return empty and writes are skipped so
 * Stripe checkout can still complete.
 */

const fs = require("fs");
const path = require("path");
const {
  BUFFER_MINUTES,
  getRentalPiece,
  normalizePieceIds,
  getConflictingPieceIds,
} = require("./rental-catalog");

const DATA_DIR = path.join(__dirname, "..", "data");
const LOCAL_BOOKINGS_FILE = path.join(DATA_DIR, "rental-bookings.json");
const PENDING_HOLD_MS = 30 * 60 * 1000; // abandon unpaid holds after 30 minutes

function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.FUNCTION_NAME
  );
}

function getBookingsFile() {
  if (isServerlessRuntime()) {
    return path.join("/tmp", "rental-bookings.json");
  }
  return LOCAL_BOOKINGS_FILE;
}

function ensureStore() {
  const file = getBookingsFile();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ bookings: [] }, null, 2));
  }
  return file;
}

function readStore() {
  try {
    const file = ensureStore();
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.bookings)) {
      return { bookings: [] };
    }
    return parsed;
  } catch (err) {
    console.warn("Rental booking store read failed:", err.message);
    return { bookings: [] };
  }
}

function writeStore(store) {
  try {
    const file = ensureStore();
    fs.writeFileSync(file, JSON.stringify(store, null, 2));
    return true;
  } catch (err) {
    console.warn("Rental booking store write failed:", err.message);
    return false;
  }
}

function toDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function isActiveBooking(booking, now = Date.now()) {
  if (booking.status === "confirmed") return true;
  if (booking.status === "pending") {
    const created = new Date(booking.createdAt).getTime();
    return now - created < PENDING_HOLD_MS;
  }
  return false;
}

function purgeStalePending(store, now = Date.now()) {
  const before = store.bookings.length;
  store.bookings = store.bookings.filter((b) => {
    if (b.status !== "pending") return true;
    const created = new Date(b.createdAt).getTime();
    return now - created < PENDING_HOLD_MS;
  });
  return store.bookings.length !== before;
}

function bookingPieceIds(booking) {
  if (Array.isArray(booking.pieceIds) && booking.pieceIds.length) {
    return normalizePieceIds(booking.pieceIds);
  }
  return normalizePieceIds(booking.pieceId);
}

function bookingTouchesPiece(booking, pieceId) {
  const booked = bookingPieceIds(booking);
  const conflicts = getConflictingPieceIds(pieceId);
  return booked.some((id) => conflicts.includes(id));
}

function getActiveBookingsForPiece(pieceId, store = readStore(), now = Date.now()) {
  return store.bookings.filter(
    (b) => isActiveBooking(b, now) && bookingTouchesPiece(b, pieceId)
  );
}

function isSlotAvailable({ pieceId, pieceIds, startISO, endISO }, store = readStore()) {
  const ids = normalizePieceIds(pieceIds || pieceId);
  if (!ids.length) return false;
  if (ids.some((id) => !getRentalPiece(id))) return false;

  const start = toDate(startISO);
  const end = toDate(endISO);
  if (!start || !end || end <= start) return false;

  const bufferMs = BUFFER_MINUTES * 60 * 1000;
  const paddedStart = new Date(start.getTime() - bufferMs);
  const paddedEnd = new Date(end.getTime() + bufferMs);

  return ids.every((id) => {
    const active = getActiveBookingsForPiece(id, store);
    return !active.some((b) => {
      const bStart = toDate(b.startISO);
      const bEnd = toDate(b.endISO);
      if (!bStart || !bEnd) return false;
      return rangesOverlap(paddedStart, paddedEnd, bStart, bEnd);
    });
  });
}

function listUnavailableWindows(pieceId, dateISO) {
  if (!getRentalPiece(pieceId) || !dateISO) return [];

  const dayStart = new Date(`${dateISO}T00:00:00`);
  const dayEnd = new Date(`${dateISO}T23:59:59.999`);
  if (Number.isNaN(dayStart.getTime())) return [];

  const store = readStore();
  if (purgeStalePending(store)) {
    writeStore(store);
  }

  return getActiveBookingsForPiece(pieceId, store)
    .filter((b) => {
      const start = toDate(b.startISO);
      const end = toDate(b.endISO);
      if (!start || !end) return false;
      return rangesOverlap(dayStart, dayEnd, start, end);
    })
    .map((b) => ({
      startISO: b.startISO,
      endISO: b.endISO,
      status: b.status,
      pieceIds: bookingPieceIds(b),
      pieceTitle: b.pieceTitle,
    }))
    .sort((a, b) => a.startISO.localeCompare(b.startISO));
}

function createPendingBooking(booking) {
  const store = readStore();
  purgeStalePending(store);

  const pieceIds = normalizePieceIds(booking.pieceIds || booking.pieceId);
  if (!pieceIds.length) {
    const error = new Error("Choose at least one artwork");
    error.statusCode = 400;
    throw error;
  }

  if (
    !isSlotAvailable(
      {
        pieceIds,
        startISO: booking.startISO,
        endISO: booking.endISO,
      },
      store
    )
  ) {
    const error = new Error(
      "That time window is no longer available. Please choose another slot."
    );
    error.statusCode = 409;
    throw error;
  }

  const record = {
    id: booking.id,
    pieceId: pieceIds[0],
    pieceIds,
    pieceTitle: booking.pieceTitle,
    startISO: booking.startISO,
    endISO: booking.endISO,
    hours: booking.hours,
    total: booking.total,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    phone: booking.phone || "",
    eventName: booking.eventName || "",
    venue: booking.venue || "",
    notes: booking.notes || "",
    status: "pending",
    stripeSessionId: booking.stripeSessionId || "",
    createdAt: new Date().toISOString(),
    confirmedAt: null,
  };

  store.bookings.push(record);
  const saved = writeStore(store);
  if (!saved) {
    console.warn(
      "Rental hold could not be persisted; continuing with Stripe checkout only."
    );
  }
  return record;
}

function attachStripeSession(bookingId, stripeSessionId) {
  const store = readStore();
  const booking = store.bookings.find((b) => b.id === bookingId);
  if (!booking) return null;
  booking.stripeSessionId = stripeSessionId;
  writeStore(store);
  return booking;
}

function confirmBookingBySession(stripeSessionId) {
  const store = readStore();
  let booking = store.bookings.find((b) => b.stripeSessionId === stripeSessionId);
  if (!booking) return null;
  booking.status = "confirmed";
  booking.confirmedAt = new Date().toISOString();
  writeStore(store);
  return booking;
}

function cancelBookingBySession(stripeSessionId) {
  const store = readStore();
  const idx = store.bookings.findIndex(
    (b) => b.stripeSessionId === stripeSessionId && b.status === "pending"
  );
  if (idx === -1) return null;
  const [removed] = store.bookings.splice(idx, 1);
  writeStore(store);
  return removed;
}

function removeBookingById(bookingId) {
  const store = readStore();
  const idx = store.bookings.findIndex((b) => b.id === bookingId);
  if (idx === -1) return null;
  const [removed] = store.bookings.splice(idx, 1);
  writeStore(store);
  return removed;
}

module.exports = {
  PENDING_HOLD_MS,
  listUnavailableWindows,
  isSlotAvailable,
  createPendingBooking,
  attachStripeSession,
  confirmBookingBySession,
  cancelBookingBySession,
  removeBookingById,
  readStore,
  getBookingsFile,
};
