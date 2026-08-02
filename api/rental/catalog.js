const { getCatalogPayload } = require("../../lib/rental-checkout");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    return res.status(200).json(getCatalogPayload());
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || "Failed to load rental catalog",
    });
  }
};
