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

const {
  getRentalQuote,
  MIN_HOURS,
  MAX_HOURS,
  MAX_PIECES,
  listRentalPieces,
  validatePieceSelection,
} = require("../lib/rental-catalog");
const {
  createPendingBooking,
  isSlotAvailable,
  listUnavailableWindows,
  removeBookingById,
} = require("../lib/rental-bookings");

const pieces = listRentalPieces();
assert.ok(pieces.length >= 5, "catalog should list Gods Collection rentals");
assert.ok(
  !pieces.some((p) => p.id === "sunCard" || p.id === "magician"),
  "card pieces should not be rentable"
);
assert.strictEqual(MAX_PIECES, 2);

assert.strictEqual(validatePieceSelection([]).ok, false);
assert.strictEqual(
  validatePieceSelection(["rugExodus", "rugChronicles", "rugPsalms"]).ok,
  false,
  "more than 2 pieces should fail"
);
assert.strictEqual(
  validatePieceSelection(["godsCollectionFull", "rugExodus"]).ok,
  false,
  "full set cannot mix with individuals"
);
assert.ok(validatePieceSelection(["rugExodus", "rugChronicles"]).ok);

const tooShort = getRentalQuote({ pieceId: "rugExodus", hours: 1 });
assert.strictEqual(tooShort, null, "1 hour should fail (2 hr minimum)");

const quote = getRentalQuote({ pieceId: "rugExodus", hours: 2 });
assert.ok(quote, "2 hour quote should succeed");
assert.strictEqual(quote.total, 350);
assert.strictEqual(quote.minHours, MIN_HOURS);

const duo = getRentalQuote({
  pieceIds: ["rugExodus", "rugChronicles"],
  hours: 2,
});
assert.ok(duo);
assert.strictEqual(duo.hourlyRate, 350);
assert.strictEqual(duo.total, 700);
assert.strictEqual(duo.pieceTitle, "Exodus + Chronicles");

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
    pieceIds: ["rugExodus", "rugChronicles"],
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  })
);

const booking = createPendingBooking({
  id: "test-booking-1",
  pieceIds: ["rugExodus", "rugChronicles"],
  pieceTitle: "Exodus + Chronicles",
  startISO: start.toISOString(),
  endISO: end.toISOString(),
  hours: 2,
  total: 700,
  customerName: "Test Client",
  customerEmail: "test@example.com",
});

assert.strictEqual(booking.status, "pending");
assert.deepStrictEqual(booking.pieceIds, ["rugExodus", "rugChronicles"]);

assert.strictEqual(
  isSlotAvailable({
    pieceId: "rugExodus",
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }),
  false,
  "Exodus overlap should be blocked"
);

assert.strictEqual(
  isSlotAvailable({
    pieceId: "godsCollectionFull",
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }),
  false,
  "full set should conflict with booked individual pieces"
);

assert.ok(
  isSlotAvailable({
    pieceId: "rugPsalms",
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }),
  "unrelated third piece should still be available"
);

const windows = listUnavailableWindows("rugExodus", dateStr);
assert.ok(windows.length >= 1, "unavailable windows should include pending booking");

removeBookingById("test-booking-1");
assert.ok(
  isSlotAvailable({
    pieceIds: ["rugExodus", "rugChronicles"],
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }),
  "slot should free after removal"
);

if (fs.existsSync(bookingsPath)) {
  fs.unlinkSync(bookingsPath);
}

console.log("✓ rental multi-piece (max 2), 2hr minimum, and availability checks passed");
