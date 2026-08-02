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
    const result = await createRentalCheckoutSession(req.body, origin);
    return res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({
      error: error.message || "Failed to create rental checkout session",
    });
  }
};
