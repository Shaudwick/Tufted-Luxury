const Stripe = require("stripe");

const FRAMED_PIECE_PRICING = {
  "11x14": { label: "11 × 14", deposit: 75, starting: 225, detailed: 325 },
  "16x20": { label: "16 × 20", deposit: 100, starting: 300, detailed: 450 },
  "20x30": { label: "20 × 30", deposit: 150, starting: 400, detailed: 575 },
  "24x36": { label: "24 × 36", deposit: 175, starting: 500, detailed: 750 },
};

function getFramedPieceQuote({ frameSize, designType, paymentMode }) {
  const tier = FRAMED_PIECE_PRICING[frameSize];
  if (!tier) return null;
  if (!["starting", "detailed"].includes(designType)) return null;
  if (!["deposit", "full"].includes(paymentMode)) return null;

  const fullPrice = designType === "detailed" ? tier.detailed : tier.starting;
  const deposit = tier.deposit;
  const checkoutAmount = paymentMode === "full" ? fullPrice : deposit;
  const remainingBalance = paymentMode === "full" ? 0 : fullPrice - deposit;

  return {
    tier,
    fullPrice,
    deposit,
    checkoutAmount,
    remainingBalance,
    designLabel: designType === "detailed" ? "Detailed design" : "Starting design",
    paymentLabel: paymentMode === "full" ? "Paid in full" : "Deposit",
  };
}

async function createCustomFramedCheckoutSession(body, origin) {
  const {
    name,
    email,
    phone,
    frameSize,
    designType,
    paymentMode,
    concept,
    colors,
    space,
    deadline,
    delivery,
    referenceUrl,
  } = body || {};

  if (!name || !email || !frameSize || !designType || !paymentMode || !concept) {
    const error = new Error("Missing required fields");
    error.statusCode = 400;
    throw error;
  }

  const quote = getFramedPieceQuote({ frameSize, designType, paymentMode });
  if (!quote) {
    const error = new Error("Invalid frame size, design type, or payment option");
    error.statusCode = 400;
    throw error;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error("Payment system is not configured");
    error.statusCode = 500;
    throw error;
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const productName =
    paymentMode === "full"
      ? `Custom Framed Piece — ${quote.tier.label} (${quote.designLabel})`
      : `Custom Framed Piece Deposit — ${quote.tier.label} (${quote.designLabel})`;

  const descriptionParts = [
    `Frame: ${quote.tier.label}`,
    `Design: ${quote.designLabel}`,
    `Payment: ${quote.paymentLabel}`,
    `Full price: $${quote.fullPrice}`,
  ];

  if (paymentMode === "deposit") {
    descriptionParts.push(`Remaining balance: $${quote.remainingBalance}`);
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: productName,
            description: descriptionParts.join(" · "),
          },
          unit_amount: Math.round(quote.checkoutAmount * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${origin}/custom-framed-pieces.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/custom-framed-pieces.html?canceled=true`,
    customer_email: email,
    billing_address_collection: "required",
    shipping_address_collection: {
      allowed_countries: ["US"],
    },
    metadata: {
      productType: "custom-framed",
      customerName: String(name).slice(0, 500),
      customerEmail: String(email).slice(0, 500),
      phone: phone ? String(phone).slice(0, 100) : "",
      frameSize,
      frameLabel: quote.tier.label,
      designType,
      designLabel: quote.designLabel,
      paymentMode,
      fullPrice: String(quote.fullPrice),
      depositAmount: String(quote.deposit),
      remainingBalance: String(quote.remainingBalance),
      concept: String(concept).slice(0, 500),
      colors: colors ? String(colors).slice(0, 500) : "",
      space: space ? String(space).slice(0, 500) : "",
      deadline: deadline ? String(deadline).slice(0, 100) : "",
      delivery: delivery ? String(delivery).slice(0, 100) : "",
      referenceUrl: referenceUrl ? String(referenceUrl).slice(0, 500) : "",
      timestamp: new Date().toISOString(),
    },
  });

  return { sessionId: session.id, url: session.url };
}

module.exports = {
  FRAMED_PIECE_PRICING,
  getFramedPieceQuote,
  createCustomFramedCheckoutSession,
};
