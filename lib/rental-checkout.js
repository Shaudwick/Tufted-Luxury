const Stripe = require("stripe");
const crypto = require("crypto");
const {
  MIN_HOURS,
  MAX_HOURS,
  BUSINESS_HOURS,
  getRentalQuote,
  listRentalPieces,
} = require("./rental-catalog");
const {
  isSlotAvailable,
  createPendingBooking,
  attachStripeSession,
  listUnavailableWindows,
  removeBookingById,
} = require("./rental-bookings");

function parseLocalDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  if (!/^\d{2}:\d{2}$/.test(timeStr)) return null;

  const [hour, minute] = timeStr.split(":").map(Number);
  if (hour < BUSINESS_HOURS.start || hour > BUSINESS_HOURS.end) return null;
  if (minute !== 0 && minute !== 30) return null;

  const start = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(start.getTime())) return null;
  return start;
}

function formatDisplayRange(start, end) {
  const optsDate = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const optsTime = { hour: "numeric", minute: "2-digit" };
  return `${start.toLocaleDateString("en-US", optsDate)} · ${start.toLocaleTimeString(
    "en-US",
    optsTime
  )} – ${end.toLocaleTimeString("en-US", optsTime)}`;
}

function getCatalogPayload() {
  return {
    minHours: MIN_HOURS,
    maxHours: MAX_HOURS,
    businessHours: BUSINESS_HOURS,
    pieces: listRentalPieces(),
  };
}

function getAvailabilityPayload(pieceId, date) {
  if (!pieceId || !date) {
    const error = new Error("pieceId and date are required");
    error.statusCode = 400;
    throw error;
  }

  return {
    pieceId,
    date,
    unavailable: listUnavailableWindows(pieceId, date),
    minHours: MIN_HOURS,
    maxHours: MAX_HOURS,
    businessHours: BUSINESS_HOURS,
  };
}

async function createRentalCheckoutSession(body, origin) {
  const {
    name,
    email,
    phone,
    pieceId,
    date,
    startTime,
    hours,
    eventName,
    venue,
    notes,
  } = body || {};

  if (!name || !email || !pieceId || !date || !startTime || hours == null) {
    const error = new Error(
      "Name, email, artwork, date, start time, and duration are required"
    );
    error.statusCode = 400;
    throw error;
  }

  const quote = getRentalQuote({ pieceId, hours });
  if (!quote) {
    const error = new Error(
      `Choose a duration between ${MIN_HOURS} and ${MAX_HOURS} hours (half-hour steps allowed)`
    );
    error.statusCode = 400;
    throw error;
  }

  const start = parseLocalDateTime(date, startTime);
  if (!start) {
    const error = new Error(
      `Choose a start time between ${BUSINESS_HOURS.start}:00 and ${BUSINESS_HOURS.end}:00 (on the hour or half-hour)`
    );
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  if (start.getTime() < now.getTime() + 2 * 60 * 60 * 1000) {
    const error = new Error(
      "Please schedule at least 2 hours from now so we can prepare delivery and setup."
    );
    error.statusCode = 400;
    throw error;
  }

  const end = new Date(start.getTime() + quote.hours * 60 * 60 * 1000);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  if (!isSlotAvailable({ pieceId, startISO, endISO })) {
    const error = new Error(
      "That time window is no longer available. Please choose another slot."
    );
    error.statusCode = 409;
    throw error;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error("Payment system is not configured");
    error.statusCode = 500;
    throw error;
  }

  const bookingId = crypto.randomUUID();
  const displayRange = formatDisplayRange(start, end);

  createPendingBooking({
    id: bookingId,
    pieceId,
    pieceTitle: quote.piece.title,
    startISO,
    endISO,
    hours: quote.hours,
    total: quote.total,
    customerName: String(name).slice(0, 200),
    customerEmail: String(email).slice(0, 200),
    phone: phone ? String(phone).slice(0, 100) : "",
    eventName: eventName ? String(eventName).slice(0, 200) : "",
    venue: venue ? String(venue).slice(0, 300) : "",
    notes: notes ? String(notes).slice(0, 500) : "",
  });

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const productName = `Art Rental — ${quote.piece.title} (${quote.hours} hr)`;
  const description = [
    `${quote.hours} hours @ $${quote.hourlyRate}/hr`,
    displayRange,
    `${MIN_HOURS}-hour minimum`,
    eventName ? `Event: ${String(eventName).slice(0, 80)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
              description,
            },
            unit_amount: Math.round(quote.total * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/rent.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/rent.html?canceled=true`,
      customer_email: email,
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      metadata: {
        productType: "hourly-rental",
        bookingId,
        pieceId,
        pieceTitle: quote.piece.title,
        hours: String(quote.hours),
        hourlyRate: String(quote.hourlyRate),
        total: String(quote.total),
        startISO,
        endISO,
        displayRange,
        customerName: String(name).slice(0, 500),
        customerEmail: String(email).slice(0, 500),
        phone: phone ? String(phone).slice(0, 100) : "",
        eventName: eventName ? String(eventName).slice(0, 200) : "",
        venue: venue ? String(venue).slice(0, 300) : "",
        notes: notes ? String(notes).slice(0, 500) : "",
        minHours: String(MIN_HOURS),
        timestamp: new Date().toISOString(),
      },
    });

    attachStripeSession(bookingId, session.id);

    return {
      sessionId: session.id,
      url: session.url,
      bookingId,
      quote: {
        pieceTitle: quote.piece.title,
        hours: quote.hours,
        hourlyRate: quote.hourlyRate,
        total: quote.total,
        displayRange,
      },
    };
  } catch (err) {
    removeBookingById(bookingId);
    throw err;
  }
}

module.exports = {
  getCatalogPayload,
  getAvailabilityPayload,
  createRentalCheckoutSession,
  formatDisplayRange,
};
