/**
 * Smoke tests for hourly rental quote + booking availability (no Stripe).
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const bookingsPath = path.join(__dirname, "..", "data", "rental-bookings.json");
if (fs.existsSync(bookingsPath)) {
  fs.unlinkSync(bookingsPath);
}

const { getRentalQuote, MIN_HOURS, listRentalPieces } = require("../lib/rental-catalog");
const {
  createPendingBooking,
  isSlotAvailable,
  listUnavailableWindows,
  removeBookingById,
} = require("../lib/rental-bookings");

const pieces = listRentalPieces();
assert.ok(pieces.length >= 6, "catalog should list rentable pieces");

const tooShort = getRentalQuote({ pieceId: "rugExodus", hours: 1 });
assert.strictEqual(tooShort, null, "1 hour should fail (2 hr minimum)");

const quote = getRentalQuote({ pieceId: "rugExodus", hours: 2 });
assert.ok(quote, "2 hour quote should succeed");
assert.strictEqual(quote.total, 350);
assert.strictEqual(quote.minHours, MIN_HOURS);

const half = getRentalQuote({ pieceId: "rugExodus", hours: 2.5 });
assert.ok(half);
assert.strictEqual(half.total, 437.5);

const day = new Date();
day.setDate(day.getDate() + 7);
const dateStr = day.toISOString().slice(0, 10);
const start = new Date(`${dateStr}T14:00:00`);
const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

assert.ok(
  isSlotAvailable({
    pieceId: "rugExodus",
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  })
);

const booking = createPendingBooking({
  id: "test-booking-1",
  pieceId: "rugExodus",
  pieceTitle: "Exodus",
  startISO: start.toISOString(),
  endISO: end.toISOString(),
  hours: 2,
  total: 350,
  customerName: "Test Client",
  customerEmail: "test@example.com",
});

assert.strictEqual(booking.status, "pending");

const conflict = isSlotAvailable({
  pieceId: "rugExodus",
  startISO: start.toISOString(),
  endISO: end.toISOString(),
});
assert.strictEqual(conflict, false, "overlapping slot should be blocked");

const windows = listUnavailableWindows("rugExodus", dateStr);
assert.ok(windows.length >= 1, "unavailable windows should include pending booking");

removeBookingById("test-booking-1");
assert.ok(
  isSlotAvailable({
    pieceId: "rugExodus",
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }),
  "slot should free after removal"
);

if (fs.existsSync(bookingsPath)) {
  fs.unlinkSync(bookingsPath);
}

console.log("✓ rental catalog, 2hr minimum, and availability checks passed");
