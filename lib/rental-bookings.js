/**
 * Lightweight JSON booking store for hourly art rentals.
 * Tracks pending + confirmed windows so pieces aren't double-booked.
 */

const fs = require("fs");
const path = require("path");
const { BUFFER_MINUTES, getRentalPiece } = require("./rental-catalog");

const DATA_DIR = path.join(__dirname, "..", "data");
const BOOKINGS_FILE = path.join(DATA_DIR, "rental-bookings.json");
const PENDING_HOLD_MS = 30 * 60 * 1000; // abandon unpaid holds after 30 minutes

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BOOKINGS_FILE)) {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify({ bookings: [] }, null, 2));
  }
}

function readStore() {
  ensureStore();
  try {
    const raw = fs.readFileSync(BOOKINGS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.bookings)) {
      return { bookings: [] };
    }
    return parsed;
  } catch {
    return { bookings: [] };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(store, null, 2));
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

function getActiveBookingsForPiece(pieceId, store = readStore(), now = Date.now()) {
  return store.bookings.filter(
    (b) => b.pieceId === pieceId && isActiveBooking(b, now)
  );
}

function isSlotAvailable({ pieceId, startISO, endISO }, store = readStore()) {
  if (!getRentalPiece(pieceId)) return false;

  const start = toDate(startISO);
  const end = toDate(endISO);
  if (!start || !end || end <= start) return false;

  const bufferMs = BUFFER_MINUTES * 60 * 1000;
  const paddedStart = new Date(start.getTime() - bufferMs);
  const paddedEnd = new Date(end.getTime() + bufferMs);

  const active = getActiveBookingsForPiece(pieceId, store);
  return !active.some((b) => {
    const bStart = toDate(b.startISO);
    const bEnd = toDate(b.endISO);
    if (!bStart || !bEnd) return false;
    return rangesOverlap(paddedStart, paddedEnd, bStart, bEnd);
  });
}

function listUnavailableWindows(pieceId, dateISO) {
  if (!getRentalPiece(pieceId) || !dateISO) return [];

  const dayStart = new Date(`${dateISO}T00:00:00`);
  const dayEnd = new Date(`${dateISO}T23:59:59.999`);
  if (Number.isNaN(dayStart.getTime())) return [];

  const store = readStore();
  purgeStalePending(store);
  writeStore(store);

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
    }))
    .sort((a, b) => a.startISO.localeCompare(b.startISO));
}

function createPendingBooking(booking) {
  const store = readStore();
  purgeStalePending(store);

  if (
    !isSlotAvailable(
      {
        pieceId: booking.pieceId,
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
    pieceId: booking.pieceId,
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
  writeStore(store);
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
  const booking = store.bookings.find((b) => b.stripeSessionId === stripeSessionId);
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
};
