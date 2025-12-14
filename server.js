// server.js
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const path = require("path");

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files
app.use(express.urlencoded({ extended: true }));

// CORS headers (adjust for production)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create Stripe Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  const { amount, cartItems, metadata, customerEmail } = req.body;

  // Validate input
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    
    // Always use the deposit amount (30% of total, calculated on client side)
    // Create a single line item for the deposit, with cart items listed in description
    const lineItems = cartItems && cartItems.length > 0
      ? [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Order Deposit (30%)',
              description: cartItems.map(item => 
                `${item.collection.charAt(0).toUpperCase() + item.collection.slice(1)} Collection (Qty: ${item.quantity})`
              ).join(', '),
            },
            unit_amount: Math.round(amount * 100), // Use deposit amount, not full price
          },
          quantity: 1,
        }]
      : [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Black Lobby Deposit',
              description: 'Order Deposit Payment',
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        }];

    // Determine ticket tier based on amount or metadata
    // $12 = networking, $18 = charcuterie/refreshments lounge
    let ticketTier = metadata?.ticketTier;
    if (!ticketTier) {
      if (amount === 12) {
        ticketTier = "networking";
      } else if (amount === 18) {
        ticketTier = "charcuterie";
      } else {
        ticketTier = "networking"; // default
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/Checkout.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/Checkout.html?canceled=true`,
      metadata: {
        ...metadata,
        ticketTier: ticketTier, // Add ticketTier to metadata
        timestamp: new Date().toISOString(),
      },
      customer_email: customerEmail || undefined,
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create checkout session' 
    });
  }
});

// Verify payment session (optional - for confirmation page)
app.get('/verify-session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    res.json({
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
      amount_total: session.amount_total / 100, // Convert from cents
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// IMPORTANT: Stripe webhooks need the raw body, not JSON-parsed
// This endpoint handles both the old /webhook and new /api/stripe/webhook
app.post(
  "/api/stripe/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        endpointSecret
      );
    } catch (err) {
      console.error("⚠️ Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle successful checkout
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const email = session.customer_details?.email;
      const name = session.customer_details?.name || "Guest";

      // You decide where to store these in Stripe Checkout:
      // e.g. metadata.ticketTier = "networking" or "charcuterie"
      const ticketTier = session.metadata?.ticketTier || "networking";

      // Phone can come from Stripe customer details or your own metadata
      const phone =
        session.customer_details?.phone || session.metadata?.phoneNumber || null;

      const orderId = session.id;

      // Respond to Stripe quickly
      res.json({ received: true });

      // Delay 1 minute, then send email + optional SMS
      setTimeout(async () => {
        try {
          if (email) {
            await sendTicketEmail({ to: email, name, ticketTier, orderId });
          }

          if (phone) {
            await sendTicketSms({ to: phone, ticketTier });
          }
        } catch (err) {
          console.error("❌ Error sending notifications:", err);
        }
      }, 60 * 1000);
    } else {
      // For other events, just acknowledge
      res.json({ received: true });
    }
  }
);

// Legacy webhook endpoint (for backwards compatibility)
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Payment successful for session:', session.id);
      // Here you can update your database, send confirmation emails, etc.
      break;
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent succeeded:', paymentIntent.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// ---------- EMAIL SENDING ----------

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false, // true if you're using port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function buildEmailHtml({ name, ticketTier, orderId }) {
  const baseIntro = `
    <p>Hello <strong>${name}</strong>,</p>

    <p>
      Thank you for securing your place at <strong>Arts After Dark</strong>, hosted by 
      <strong>Black Lobby Collective</strong>. Prepare for an evening of elegance, connection,
      and immersive artistic storytelling.
    </p>

    <h2>📍 Event Location</h2>
    <p>
      <strong>Arts After Dark</strong><br/>
      1551 S Commerce St<br/>
      Las Vegas, NV<br/>
      Doors open at <strong>5:00 PM</strong>.
    </p>

    <h2>👗 Dress Code — Black &amp; White Only</h2>
    <p>
      A monochrome palette sets the tone for luxury. Guests are invited to arrive in timeless black,
      white, or a refined combination of both. Your presence becomes part of the visual art of the night.
    </p>

    <h2>✨ What to Expect</h2>
    <p>
      You are stepping into a curated environment designed for creativity, conversation, and high-frequency energy:
    </p>
    <ul>
      <li>A gallery of luxury tufted masterpieces</li>
      <li>Networking with artists, collectors, and creatives</li>
      <li>Artist-led storytelling and live atmosphere</li>
    </ul>
  `;

  const networkingBlock = `
    <h2>🎟 Your Ticket</h2>
    <p>
      <strong>Networking &amp; Art Exhibition Ticket ($12)</strong><br/>
      • Access to the networking lounge<br/>
      • Full access to the Art Exhibition<br/>
      Order ID: <strong>${orderId}</strong>
    </p>
  `;

  const charcuterieBlock = `
    <h2>🍷 Your VIP Ticket</h2>
    <p>
      <strong>Charcuterie &amp; Wine Room Ticket ($18)</strong><br/>
      • Networking &amp; Art Exhibition access<br/>
      • Entry to the Charcuterie &amp; Wine Room<br/>
      • Premium wine selections and curated bites<br/>
      Order ID: <strong>${orderId}</strong>
    </p>
  `;

  const footer = `
    <p style="margin-top: 32px;">
      For any questions about parking, accessibility, or upgrades, contact us at
      <a href="mailto:contact@blacklobby.co">contact@blacklobby.co</a>.
    </p>
    <p>
      We look forward to hosting you for an unforgettable evening.<br/>
      <strong>— Black Lobby Collective</strong>
    </p>
  `;

  const ticketBlock =
    ticketTier === "charcuterie" ? charcuterieBlock : networkingBlock;

  // Full HTML wrapper with hero image
  return `
    <div style="font-family: 'Playfair Display', serif; color: #111; background: #ffffff; padding: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img 
          src="cid:rugheader" 
          alt="Black Lobby Artwork"
          style="width: 100%; max-width: 600px; border-radius: 16px; display: block; margin: 0 auto;"
        />
      </div>
      <h1 style="text-align: center; font-weight: 700; letter-spacing: 1px; margin-bottom: 24px;">
        Arts After Dark — Your Reservation Is Confirmed
      </h1>
      ${baseIntro}
      ${ticketBlock}
      ${footer}
    </div>
  `;
}

async function sendTicketEmail({ to, name, ticketTier, orderId }) {
  const html = buildEmailHtml({ name, ticketTier, orderId });

  const mailOptions = {
    from: '"Black Lobby Collective" <no-reply@blacklobby.co>',
    to,
    subject: "Your Arts After Dark Ticket Confirmation",
    html,
    attachments: [
      {
        filename: "arts-after-dark-header.jpg",
        path: path.join(__dirname, "assets", "arts-after-dark-header.jpg"),
        cid: "rugheader", // must match the img src in buildEmailHtml
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Ticket email sent to", to);
  } catch (err) {
    console.error("❌ Error sending email:", err);
    // Don't throw - we don't want to fail the webhook if email fails
  }
}

// ---------- SMS SENDING ----------

function buildSmsMessage(ticketTier) {
  if (ticketTier === "charcuterie") {
    return (
      "Your VIP ticket for Arts After Dark is confirmed. " +
      "Dress code: Black & White only. " +
      "Location: 1551 S Commerce St, Las Vegas. " +
      "Access: Exhibition + Networking Lounge + Charcuterie & Wine Room. " +
      "Doors open at 5 PM. — Black Lobby Collective"
    );
  }

  // Default: networking ticket
  return (
    "Your Arts After Dark ticket is confirmed. " +
    "Dress code: Black & White only. " +
    "Location: 1551 S Commerce St, Las Vegas. " +
    "Access: Networking Lounge + Luxury Art Exhibition. " +
    "Doors open at 5 PM. — Black Lobby Collective"
  );
}

async function sendTicketSms({ to, ticketTier }) {
  try {
    const body = buildSmsMessage(ticketTier);
    await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE,
      to,
    });
    console.log("✅ Ticket SMS sent to", to);
  } catch (err) {
    console.error("❌ Error sending SMS:", err);
    // Don't throw - we don't want to fail the webhook if SMS fails
  }
}

// ---------- START SERVER ----------

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view your site`);
  console.log(`Stripe webhook endpoint: /api/stripe/webhook`);
});
