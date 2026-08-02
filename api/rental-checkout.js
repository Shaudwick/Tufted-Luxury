const { createRentalCheckoutSession } = require("../lib/rental-checkout");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const origin = req.headers.origin || `${protocol}://${host}`;
    const body = req.body || {};
    const result = await createRentalCheckoutSession(body, origin);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Rental checkout error:", error);
    const status = error.statusCode || 500;
    const message =
      error.message || "Failed to create rental checkout session";
    // Surface a clearer Stripe/env hint on Vercel
    const friendly =
      /STRIPE|secret key|not configured/i.test(message)
        ? "Payment system is not configured. Add STRIPE_SECRET_KEY in Vercel environment variables, then redeploy."
        : message;
    return res.status(status).json({ error: friendly });
  }
};
