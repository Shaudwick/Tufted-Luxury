// server.js
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const path = require("path");
const fs = require("fs");

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

    // Determine ticket tier from metadata only
    // Note: amount is a deposit (30% of total), so don't infer tier from amount
    // Ticket tier should be explicitly set in metadata by the client for ticket purchases
    const ticketTier = metadata?.ticketTier || null;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/Checkout.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/Checkout.html?canceled=true`,
      metadata: {
        ...metadata,
        ...(ticketTier && { ticketTier: ticketTier }), // Only add ticketTier if provided
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
      const amountTotal = session.amount_total || 0; // in cents
      const orderId = session.id;

      // Log all webhook events for debugging
      console.log("📦 Webhook received - checkout.session.completed");
      console.log("   Session ID:", orderId);
      console.log("   Amount (cents):", amountTotal);
      console.log("   Amount (dollars):", amountTotal / 100);
      console.log("   Email:", email || "NO EMAIL");
      console.log("   Name:", name);
      console.log("   Metadata:", JSON.stringify(session.metadata || {}));

      // Respond to Stripe quickly
      res.json({ received: true });

      // Check if email is missing
      if (!email) {
        console.error("❌ No email address found in payment - cannot send confirmation");
        return;
      }

      // Get ticket tier from metadata (only set for ticket purchases, not rug deposits)
      // If not in metadata, try to infer from payment amount for direct Stripe payment links
      let ticketTier = session.metadata?.ticketTier || null;

      // Check if this is an artist submission payment (by amount: $35, $50, or $75)
      // Allow small tolerance for potential fees (check within $1 range)
      const isArtistSubmission = 
        (amountTotal >= 3400 && amountTotal <= 3600) || // $35 ± $1
        (amountTotal >= 4900 && amountTotal <= 5100) || // $50 ± $1
        (amountTotal >= 7400 && amountTotal <= 7600);   // $75 ± $1

      // Check if this is a ticket purchase by amount ($12 = 1200 cents, $18 = 1800 cents)
      // Allow small tolerance for potential fees (check within $1 range)
      if (!ticketTier && !isArtistSubmission) {
        if (amountTotal >= 1100 && amountTotal <= 1300) {
          ticketTier = "networking"; // $12 General ticket
          console.log("   Detected: $12 General Ticket");
        } else if (amountTotal >= 1700 && amountTotal <= 1900) {
          ticketTier = "charcuterie"; // $18 Refreshments Lounge ticket
          console.log("   Detected: $18 Refreshments Lounge Ticket");
        }
      }

      // Phone can come from Stripe customer details or your own metadata
      const phone =
        session.customer_details?.phone || session.metadata?.phoneNumber || null;

      // Handle artist submission payments
      if (isArtistSubmission) {
        const submissionAmount = amountTotal / 100; // Convert cents to dollars
        console.log("📧 Scheduling artist submission email to:", email, "Amount: $", submissionAmount);
        setTimeout(async () => {
          try {
            await sendArtistSubmissionEmail({ to: email, name, amount: submissionAmount, orderId });
            console.log("✅ Artist submission confirmation email sent to", email);
          } catch (err) {
            console.error("❌ Error sending artist submission email:", err);
            console.error("   Error details:", err.message);
            if (err.response) {
              console.error("   SMTP Response:", err.response);
            }
          }
        }, 60 * 1000);
        return; // Don't process as ticket purchase
      }

      // Send ticket confirmation emails/SMS if this is a ticket purchase
      if (ticketTier) {
        console.log("🎟 Scheduling ticket confirmation email to:", email, "Tier:", ticketTier);
        // Delay 1 minute, then send email + optional SMS
        setTimeout(async () => {
          try {
            await sendTicketEmail({ to: email, name, ticketTier, orderId });
            console.log("✅ Ticket confirmation email sent to", email, "for", ticketTier, "tier");

            if (phone) {
              await sendTicketSms({ to: phone, ticketTier });
            }
          } catch (err) {
            console.error("❌ Error sending ticket notifications:", err);
            console.error("   Error details:", err.message);
            if (err.response) {
              console.error("   SMTP Response:", err.response);
            }
          }
        }, 60 * 1000);
        return;
      }

      // If we get here, it's not a ticket or artist submission
      console.log("ℹ️ Payment completed but not a ticket purchase or artist submission");
      console.log("   Amount:", amountTotal, "cents ($", amountTotal / 100, ")");
      console.log("   This might be a rug deposit or other purchase - skipping notifications");

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

// Verify email configuration on startup
if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn("⚠️ WARNING: SMTP configuration is incomplete. Email notifications may not work.");
  console.warn("   Required: SMTP_HOST, SMTP_USER, SMTP_PASS");
} else {
  console.log("✅ Email configuration loaded");
  console.log("   SMTP Host:", process.env.SMTP_HOST);
  console.log("   SMTP User:", process.env.SMTP_USER);
}

function buildEmailHtml({ name, ticketTier, orderId }) {
  const baseIntro = `
    <p>Hello <strong>${name}</strong>,</p>

    <p>
      Thank you for securing your place at <strong>Arts After Dark</strong>, hosted by 
      <strong>Black Lobby Collective</strong>. Prepare for an evening of elegance, connection,
      and immersive artistic storytelling.
    </p>

    <h2>📍 Event Details</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #0284c7; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-size: 1.1em;">
        <strong>📅 Date & Time:</strong><br/>
        <span style="font-size: 1.2em; color: #0284c7;">January 10th, 2025 • 6:00 PM - 10:00 PM</span>
      </p>
      <p style="margin: 10px 0 0 0; font-size: 1.1em;">
        <strong>📍 Location:</strong><br/>
        <span style="font-size: 1.1em;">1551 S Commerce St<br/>Las Vegas, NV 89121</span>
      </p>
    </div>

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
    attachments: [],
  };

  // Only attach image if file exists (optional attachment)
  const imagePath = path.join(__dirname, "assets", "arts-after-dark-header.jpg");
  if (fs.existsSync(imagePath)) {
    mailOptions.attachments.push({
      filename: "arts-after-dark-header.jpg",
      path: imagePath,
      cid: "rugheader", // must match the img src in buildEmailHtml
    });
  } else {
    console.warn("⚠️ Email header image not found at:", imagePath, "- sending email without image attachment");
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Ticket email sent to", to);
    console.log("   Message ID:", info.messageId);
  } catch (err) {
    console.error("❌ Error sending ticket email:", err);
    console.error("   Error code:", err.code);
    console.error("   Error message:", err.message);
    if (err.response) {
      console.error("   SMTP Response:", err.response);
    }
    // Re-throw so caller can log it too
    throw err;
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

// ---------- ARTIST SUBMISSION EMAIL ----------

function buildArtistSubmissionEmailHtml({ name, amount, orderId }) {
  return `
    <div style="font-family: 'Playfair Display', serif; color: #111; background: #ffffff; padding: 20px;">
      <h1 style="text-align: center; font-weight: 700; letter-spacing: 1px; margin-bottom: 24px;">
        Artist Submission Fee — Payment Confirmed
      </h1>
      
      <p>Hello <strong>${name}</strong>,</p>

      <p>
        Thank you for submitting your artist application to <strong>Arts After Dark</strong>, 
        hosted by <strong>Black Lobby Collective</strong>. Your submission fee payment has been 
        successfully processed.
      </p>

      <h2>📋 Payment Details</h2>
      <p>
        <strong>Submission Fee Paid:</strong> $${amount.toFixed(2)}<br/>
        <strong>Order ID:</strong> ${orderId}<br/>
        <strong>Payment Status:</strong> Confirmed
      </p>

      <h2>✨ What's Next?</h2>
      <p>
        Our team will review your submission and reach out to you shortly with next steps. 
        Please ensure you have also completed the artist information form if you haven't already.
      </p>

      <p style="margin-top: 32px;">
        For any questions about your submission or the event, please contact us at
        <a href="mailto:contact@blacklobby.co">contact@blacklobby.co</a>.
      </p>
      
      <p>
        We look forward to the possibility of featuring your work.<br/>
        <strong>— Black Lobby Collective</strong>
      </p>
    </div>
  `;
}

async function sendArtistSubmissionEmail({ to, name, amount, orderId }) {
  const html = buildArtistSubmissionEmailHtml({ name, amount, orderId });

  const mailOptions = {
    from: '"Black Lobby Collective" <no-reply@blacklobby.co>',
    to,
    subject: "Artist Submission Fee — Payment Confirmed",
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Artist submission email sent to", to);
    console.log("   Message ID:", info.messageId);
  } catch (err) {
    console.error("❌ Error sending artist submission email:", err);
    console.error("   Error code:", err.code);
    console.error("   Error message:", err.message);
    if (err.response) {
      console.error("   SMTP Response:", err.response);
    }
    // Re-throw so caller can log it too
    throw err;
  }
}

// ---------- TEST EMAIL ENDPOINT ----------

// Test endpoint to send sample ticket emails
app.get('/test-email', async (req, res) => {
  const testEmail = req.query.email || 'shaud150@gmail.com';
  const ticketType = req.query.type || 'both'; // 'networking', 'charcuterie', or 'both'
  
  try {
    const results = [];
    
    if (ticketType === 'both' || ticketType === 'networking') {
      const orderId = `test_${Date.now()}_general`;
      await sendTicketEmail({ 
        to: testEmail, 
        name: 'Test Customer', 
        ticketTier: 'networking', 
        orderId 
      });
      results.push('✅ General Ticket ($12) email sent');
    }
    
    if (ticketType === 'both' || ticketType === 'charcuterie') {
      // Wait a moment between emails
      await new Promise(resolve => setTimeout(resolve, 1000));
      const orderId = `test_${Date.now()}_vip`;
      await sendTicketEmail({ 
        to: testEmail, 
        name: 'Test Customer', 
        ticketTier: 'charcuterie', 
        orderId 
      });
      results.push('✅ VIP Ticket ($18) email sent');
    }
    
    res.json({
      success: true,
      message: 'Test emails sent successfully',
      sentTo: testEmail,
      results: results
    });
  } catch (err) {
    console.error('❌ Error sending test emails:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      details: err.code || 'Unknown error'
    });
  }
});

// ---------- START SERVER ----------

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view your site`);
  console.log(`Stripe webhook endpoint: /api/stripe/webhook`);
  console.log(`Test email endpoint: http://localhost:${PORT}/test-email?email=shaud150@gmail.com`);
});

