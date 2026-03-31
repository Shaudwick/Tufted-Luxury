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

// Initialize Twilio only if credentials are provided
const twilioClient = (process.env.TWILIO_SID && process.env.TWILIO_AUTH)
  ? twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH)
  : null;

// ========== SECURITY MIDDLEWARE ==========

// Security Headers
app.use((req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Force HTTPS (uncomment in production with HTTPS)
  // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://js.stripe.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.stripe.com https://checkout.stripe.com;"
  );
  next();
});

// Rate Limiting (basic implementation)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // max requests per window

app.use((req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimitMap.has(clientIp)) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const limit = rateLimitMap.get(clientIp);
  
  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  if (limit.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests, please try again later' });
  }
  
  limit.count++;
  next();
});

// CORS headers (restrict in production - set ALLOWED_ORIGINS in .env)
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.static(__dirname)); // Serve static files
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    const isRugFullPurchase = metadata?.purchaseType === 'rug_full_purchase';
    const rugName = metadata?.rugName || 'Gods Collection Rug';
    
    // Support one-click full purchases for collector rugs.
    // Fallback to existing deposit line-item behavior for other checkout flows.
    const lineItems = isRugFullPurchase
      ? [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${rugName} — Gods Collection`,
              description: 'Collector Piece (Full Purchase)',
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        }]
      : cartItems && cartItems.length > 0
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

      // Determine purchase type for admin notifications
      let purchaseType = "Other Purchase";
      let purchaseDetails = "";

      // Handle artist submission payments
      if (isArtistSubmission) {
        const submissionAmount = amountTotal / 100; // Convert cents to dollars
        purchaseType = "Artist Submission Fee";
        purchaseDetails = `Submission Fee: $${submissionAmount.toFixed(2)}`;
        console.log("📧 Sending artist submission email to:", email, "Amount: $", submissionAmount);
        
        // Send admin notification
        await sendAdminPurchaseNotification({
          purchaseType,
          purchaseDetails,
          customerName: name,
          customerEmail: email,
          amount: submissionAmount,
          orderId,
          phone,
        });

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
        }, 5 * 1000); // 5 second delay to ensure payment is fully processed
        return; // Don't process as ticket purchase
      }

      // Send ticket confirmation emails/SMS if this is a ticket purchase
      if (ticketTier) {
        const ticketName = ticketTier === "charcuterie" 
          ? "VIP Charcuterie & Wine Room Ticket" 
          : "General Networking & Art Exhibition Ticket";
        const ticketPrice = ticketTier === "charcuterie" ? 18 : 12;
        purchaseType = ticketName;
        purchaseDetails = `Ticket Type: ${ticketName} ($${ticketPrice})`;
        
        console.log("🎟 Sending ticket confirmation email to:", email, "Tier:", ticketTier);
        
        // Send admin notification
        await sendAdminPurchaseNotification({
          purchaseType,
          purchaseDetails,
          customerName: name,
          customerEmail: email,
          amount: ticketPrice,
          orderId,
          phone,
        });

        // Send email immediately upon purchase confirmation
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
        }, 5 * 1000); // 5 second delay to ensure payment is fully processed
        return;
      }

      // If we get here, it's not a ticket or artist submission (rug deposit or other)
      const otherAmount = amountTotal / 100;
      purchaseType = "Other Purchase / Rug Deposit";
      purchaseDetails = `Amount: $${otherAmount.toFixed(2)}`;
      
      // Send admin notification for other purchases
      await sendAdminPurchaseNotification({
        purchaseType,
        purchaseDetails,
        customerName: name,
        customerEmail: email,
        amount: otherAmount,
        orderId,
        phone,
      });

      console.log("ℹ️ Payment completed but not a ticket purchase or artist submission");
      console.log("   Amount:", amountTotal, "cents ($", amountTotal / 100, ")");
      console.log("   This might be a rug deposit or other purchase");

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
    <div style="margin: 40px 0;">
      <p style="font-size: 18px; line-height: 1.8; color: #2c2c2c; margin-bottom: 24px;">
        Dear <strong style="color: #1a1a1a;">${name}</strong>,
      </p>

      <p style="font-size: 17px; line-height: 1.9; color: #2c2c2c; margin-bottom: 32px;">
        Thank you for securing your place at <strong style="color: #1a1a1a; letter-spacing: 0.5px;">Arts After Dark</strong>, 
        hosted by <strong style="color: #1a1a1a; letter-spacing: 0.5px;">Black Lobby Collective</strong>. 
        Prepare for an evening of elegance, connection, and immersive artistic storytelling.
      </p>
    </div>

    <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%); padding: 40px; border-radius: 12px; margin: 40px 0; box-shadow: 0 8px 32px rgba(0,0,0,0.12); border: 1px solid rgba(255, 241, 201, 0.1);">
      <div style="margin-bottom: 30px; padding-bottom: 30px; border-bottom: 1px solid rgba(255, 241, 201, 0.2);">
        <div style="color: #fff1c9; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; font-family: 'Montserrat', sans-serif;">Date & Time</div>
        <div style="color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: 1px; line-height: 1.4;">January 10th, 2025</div>
        <div style="color: #fff1c9; font-size: 20px; font-weight: 400; letter-spacing: 0.5px; margin-top: 8px;">6:00 PM - 10:00 PM</div>
      </div>
      <div>
        <div style="color: #fff1c9; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; font-family: 'Montserrat', sans-serif;">Location</div>
        <div style="color: #ffffff; font-size: 20px; font-weight: 500; letter-spacing: 0.3px; line-height: 1.6;">
          1551 S Commerce St<br/>
          Las Vegas, NV 89121
        </div>
      </div>
    </div>

    <div style="margin: 50px 0 40px 0; padding: 35px; background: #fafafa; border-left: 4px solid #1a1a1a; border-radius: 4px;">
      <h2 style="font-size: 22px; font-weight: 700; color: #1a1a1a; margin: 0 0 18px 0; letter-spacing: 1px; text-transform: uppercase; font-family: 'Oswald', sans-serif;">Dress Code — Black &amp; White Only</h2>
      <p style="font-size: 17px; line-height: 1.9; color: #2c2c2c; margin: 0;">
        A monochrome palette sets the tone for luxury. Guests are invited to arrive in timeless black,
        white, or a refined combination of both. Your presence becomes part of the visual art of the night.
      </p>
    </div>

    <div style="margin: 40px 0;">
      <h2 style="font-size: 22px; font-weight: 700; color: #1a1a1a; margin: 0 0 24px 0; letter-spacing: 1px; font-family: 'Oswald', sans-serif;">What to Expect</h2>
      <p style="font-size: 17px; line-height: 1.9; color: #2c2c2c; margin-bottom: 20px;">
        You are stepping into a curated environment designed for creativity, conversation, and high-frequency energy:
      </p>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="font-size: 17px; line-height: 2.2; color: #2c2c2c; margin-bottom: 16px; padding-left: 30px; position: relative;">
          <span style="position: absolute; left: 0; color: #1a1a1a; font-weight: bold;">•</span>
          A gallery of luxury tufted masterpieces
        </li>
        <li style="font-size: 17px; line-height: 2.2; color: #2c2c2c; margin-bottom: 16px; padding-left: 30px; position: relative;">
          <span style="position: absolute; left: 0; color: #1a1a1a; font-weight: bold;">•</span>
          Networking with artists, collectors, and creatives
        </li>
        <li style="font-size: 17px; line-height: 2.2; color: #2c2c2c; margin-bottom: 16px; padding-left: 30px; position: relative;">
          <span style="position: absolute; left: 0; color: #1a1a1a; font-weight: bold;">•</span>
          Artist-led storytelling and live atmosphere
        </li>
      </ul>
    </div>
  `;

  const networkingBlock = `
    <div style="background: linear-gradient(135deg, #fff1c9 0%, #fafafa 100%); padding: 35px; border-radius: 8px; margin: 40px 0; border: 2px solid #1a1a1a; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
      <div style="text-align: center; margin-bottom: 25px;">
        <div style="font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 3px; color: #1a1a1a; margin-bottom: 12px; font-family: 'Montserrat', sans-serif;">Your Ticket</div>
        <div style="font-size: 28px; font-weight: 700; color: #1a1a1a; letter-spacing: 1px; font-family: 'Oswald', sans-serif;">Networking &amp; Art Exhibition</div>
        <div style="font-size: 20px; color: #2c2c2c; margin-top: 8px; font-weight: 500;">$12</div>
      </div>
      <div style="padding-top: 25px; border-top: 1px solid rgba(26,26,26,0.2);">
        <div style="font-size: 16px; line-height: 2; color: #2c2c2c; margin-bottom: 12px;">
          <strong style="color: #1a1a1a;">✓</strong> Access to the networking lounge
        </div>
        <div style="font-size: 16px; line-height: 2; color: #2c2c2c; margin-bottom: 20px;">
          <strong style="color: #1a1a1a;">✓</strong> Full access to the Art Exhibition
        </div>
        <div style="font-size: 13px; color: #666; font-family: 'Montserrat', sans-serif; letter-spacing: 0.5px;">
          Order ID: <strong style="color: #1a1a1a;">${orderId}</strong>
        </div>
      </div>
    </div>
  `;

  const charcuterieBlock = `
    <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%); padding: 35px; border-radius: 8px; margin: 40px 0; border: 2px solid #fff1c9; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
      <div style="text-align: center; margin-bottom: 25px;">
        <div style="font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 3px; color: #fff1c9; margin-bottom: 12px; font-family: 'Montserrat', sans-serif;">Your VIP Ticket</div>
        <div style="font-size: 28px; font-weight: 700; color: #fff1c9; letter-spacing: 1px; font-family: 'Oswald', sans-serif;">Charcuterie &amp; Wine Room</div>
        <div style="font-size: 20px; color: #ffffff; margin-top: 8px; font-weight: 500;">$18</div>
      </div>
      <div style="padding-top: 25px; border-top: 1px solid rgba(255, 241, 201, 0.3);">
        <div style="font-size: 16px; line-height: 2; color: #ffffff; margin-bottom: 12px;">
          <strong style="color: #fff1c9;">✓</strong> Networking &amp; Art Exhibition access
        </div>
        <div style="font-size: 16px; line-height: 2; color: #ffffff; margin-bottom: 12px;">
          <strong style="color: #fff1c9;">✓</strong> Entry to the Charcuterie &amp; Wine Room
        </div>
        <div style="font-size: 16px; line-height: 2; color: #ffffff; margin-bottom: 20px;">
          <strong style="color: #fff1c9;">✓</strong> Premium wine selections and curated bites
        </div>
        <div style="font-size: 13px; color: #fff1c9; font-family: 'Montserrat', sans-serif; letter-spacing: 0.5px; opacity: 0.9;">
          Order ID: <strong style="color: #ffffff;">${orderId}</strong>
        </div>
      </div>
    </div>
  `;

  const footer = `
    <div style="margin-top: 60px; padding-top: 40px; border-top: 1px solid #e0e0e0;">
      <p style="font-size: 16px; line-height: 1.8; color: #666; margin-bottom: 30px;">
        For any questions about parking, accessibility, or upgrades, please contact us at
        <a href="mailto:contact@blacklobby.co" style="color: #1a1a1a; text-decoration: none; border-bottom: 1px solid #1a1a1a; font-weight: 500;">contact@blacklobby.co</a>.
      </p>
      <p style="font-size: 18px; line-height: 1.9; color: #2c2c2c; margin: 0; font-style: italic;">
        We look forward to hosting you for an unforgettable evening.
      </p>
      <p style="font-size: 20px; font-weight: 700; color: #1a1a1a; margin-top: 24px; letter-spacing: 1px; font-family: 'Oswald', sans-serif;">
        — Black Lobby Collective
      </p>
    </div>
  `;

  const ticketBlock =
    ticketTier === "charcuterie" ? charcuterieBlock : networkingBlock;

  // Full HTML wrapper with luxurious styling
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Playfair Display', 'Georgia', serif;">
      <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; padding: 0;">
        <!-- Header Image -->
        <div style="text-align: center; padding: 50px 40px 40px 40px; background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);">
          <img 
            src="cid:rugheader" 
            alt="Arts After Dark"
            style="width: 100%; max-width: 600px; border-radius: 12px; display: block; margin: 0 auto; box-shadow: 0 12px 40px rgba(0,0,0,0.15); border: 2px solid #1a1a1a;"
          />
        </div>

        <!-- Main Content -->
        <div style="padding: 50px 40px 60px 40px; background-color: #ffffff;">
          <!-- Title -->
          <h1 style="text-align: center; font-size: 36px; font-weight: 700; color: #1a1a1a; margin: 0 0 50px 0; letter-spacing: 2px; line-height: 1.3; font-family: 'Oswald', sans-serif; text-transform: uppercase;">
            Arts After Dark
          </h1>
          <div style="text-align: center; font-size: 18px; color: #666; margin-bottom: 50px; letter-spacing: 3px; font-weight: 400; font-family: 'Montserrat', sans-serif;">
            YOUR RESERVATION IS CONFIRMED
          </div>

          ${baseIntro}
          ${ticketBlock}
          ${footer}
        </div>

        <!-- Footer Bar -->
        <div style="background-color: #1a1a1a; padding: 30px 40px; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #999; letter-spacing: 0.5px; font-family: 'Montserrat', sans-serif;">
            &copy; 2025 Black Lobby Collective. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
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
  if (!twilioClient || !process.env.TWILIO_PHONE) {
    console.log("⚠️ Twilio not configured - skipping SMS");
    return;
  }
  
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

// ---------- ADMIN PURCHASE NOTIFICATION ----------

function buildAdminNotificationHtml({ purchaseType, purchaseDetails, customerName, customerEmail, amount, orderId, phone }) {
  const purchaseDate = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Montserrat', 'Arial', sans-serif;">
      <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; padding: 0;">
        <!-- Header -->
        <div style="background-color: #1a1a1a; padding: 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #fff1c9; letter-spacing: 2px; text-transform: uppercase; font-family: 'Oswald', sans-serif;">
            New Purchase Notification
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #999; letter-spacing: 1px;">
            Black Lobby Collective
          </p>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px;">
          <!-- Purchase Type Badge -->
          <div style="background: linear-gradient(135deg, #fff1c9 0%, #fafafa 100%); padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 2px solid #1a1a1a; text-align: center;">
            <div style="font-size: 22px; font-weight: 700; color: #1a1a1a; letter-spacing: 1px; font-family: 'Oswald', sans-serif;">
              ${purchaseType}
            </div>
            <div style="font-size: 32px; font-weight: 700; color: #1a1a1a; margin-top: 10px;">
              $${amount.toFixed(2)}
            </div>
          </div>

          <!-- Purchase Details -->
          <div style="background-color: #fafafa; padding: 30px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #1a1a1a;">
            <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 1px; font-family: 'Oswald', sans-serif;">
              Purchase Details
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: 600; color: #2c2c2c; width: 140px;">Order ID:</td>
                <td style="padding: 10px 0; color: #1a1a1a; font-family: 'Courier New', monospace; font-size: 14px;">${orderId}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: 600; color: #2c2c2c;">Date & Time:</td>
                <td style="padding: 10px 0; color: #1a1a1a;">${purchaseDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: 600; color: #2c2c2c;">Amount:</td>
                <td style="padding: 10px 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">$${amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: 600; color: #2c2c2c;">Type:</td>
                <td style="padding: 10px 0; color: #1a1a1a;">${purchaseDetails}</td>
              </tr>
            </table>
          </div>

          <!-- Customer Information -->
          <div style="background-color: #fafafa; padding: 30px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #fff1c9;">
            <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 1px; font-family: 'Oswald', sans-serif;">
              Customer Information
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; font-weight: 600; color: #2c2c2c; width: 140px;">Name:</td>
                <td style="padding: 10px 0; color: #1a1a1a;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: 600; color: #2c2c2c;">Email:</td>
                <td style="padding: 10px 0;">
                  <a href="mailto:${customerEmail}" style="color: #1a1a1a; text-decoration: none; border-bottom: 1px solid #1a1a1a;">${customerEmail}</a>
                </td>
              </tr>
              ${phone ? `
              <tr>
                <td style="padding: 10px 0; font-weight: 600; color: #2c2c2c;">Phone:</td>
                <td style="padding: 10px 0;">
                  <a href="tel:${phone}" style="color: #1a1a1a; text-decoration: none; border-bottom: 1px solid #1a1a1a;">${phone}</a>
                </td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- Action Links -->
          <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">
              View payment details in Stripe Dashboard
            </p>
            <a href="https://dashboard.stripe.com/payments/${orderId}" 
               style="display: inline-block; background-color: #1a1a1a; color: #fff1c9; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: 600; letter-spacing: 1px; font-size: 14px; text-transform: uppercase;">
              View in Stripe
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #1a1a1a; padding: 30px; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #999; letter-spacing: 0.5px;">
            &copy; 2025 Black Lobby Collective. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendAdminPurchaseNotification({ purchaseType, purchaseDetails, customerName, customerEmail, amount, orderId, phone }) {
  const adminEmail = "contact@blacklobby.co";
  const html = buildAdminNotificationHtml({
    purchaseType,
    purchaseDetails,
    customerName,
    customerEmail,
    amount,
    orderId,
    phone,
  });

  const mailOptions = {
    from: '"Black Lobby System" <no-reply@blacklobby.co>',
    to: adminEmail,
    subject: `🎟 New Purchase: ${purchaseType} - $${amount.toFixed(2)}`,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("📧 Admin purchase notification sent to", adminEmail);
    console.log("   Purchase:", purchaseType, "-", "$" + amount.toFixed(2));
    console.log("   Customer:", customerName, `(${customerEmail})`);
  } catch (err) {
    console.error("❌ Error sending admin notification:", err);
    console.error("   Error details:", err.message);
    // Don't throw - we don't want to fail the webhook if admin email fails
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

// ---------- BLOG API ENDPOINTS ----------

const BLOG_POSTS_FILE = path.join(__dirname, 'blog-posts.json');

// Helper function to read blog posts
function readBlogPosts() {
  try {
    const data = fs.readFileSync(BLOG_POSTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading blog posts:', err);
    return [];
  }
}

// Helper function to write blog posts
function writeBlogPosts(posts) {
  try {
    fs.writeFileSync(BLOG_POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing blog posts:', err);
    return false;
  }
}

// Simple authentication middleware for blog admin
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  const adminPassword = process.env.BLOG_ADMIN_PASSWORD || 'admin123'; // Default for development
  
  // Simple token comparison (in production, use proper JWT or session tokens)
  if (token !== adminPassword) {
    return res.status(401).json({ error: 'Invalid authentication' });
  }
  
  next();
}

// GET all published blog posts
app.get('/api/blog/posts', (req, res) => {
  try {
    const posts = readBlogPosts();
    const published = posts.filter(post => post.published !== false);
    // Sort by date (newest first)
    published.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(published);
  } catch (err) {
    console.error('Error fetching blog posts:', err);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// GET single blog post by slug
app.get('/api/blog/post/:slug', (req, res) => {
  try {
    const posts = readBlogPosts();
    const post = posts.find(p => p.slug === req.params.slug && p.published !== false);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(post);
  } catch (err) {
    console.error('Error fetching blog post:', err);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

// POST create new blog post (requires auth)
app.post('/api/blog/post', requireAuth, (req, res) => {
  try {
    const posts = readBlogPosts();
    const newPost = {
      id: req.body.id || `post-${Date.now()}`,
      title: req.body.title,
      category: req.body.category,
      categoryLabel: req.body.categoryLabel,
      excerpt: req.body.excerpt,
      image: req.body.image,
      alt: req.body.alt || req.body.title,
      date: req.body.date || new Date().toISOString().split('T')[0],
      readTime: req.body.readTime || '5',
      slug: req.body.slug || req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      published: req.body.published !== undefined ? req.body.published : true,
      content: req.body.content || ''
    };
    
    posts.push(newPost);
    
    if (writeBlogPosts(posts)) {
      res.json({ success: true, post: newPost });
    } else {
      res.status(500).json({ error: 'Failed to save blog post' });
    }
  } catch (err) {
    console.error('Error creating blog post:', err);
    res.status(500).json({ error: 'Failed to create blog post' });
  }
});

// PUT update blog post (requires auth)
app.put('/api/blog/post/:id', requireAuth, (req, res) => {
  try {
    const posts = readBlogPosts();
    const index = posts.findIndex(p => p.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Update post with new data
    posts[index] = {
      ...posts[index],
      ...req.body,
      id: req.params.id // Don't allow changing the ID
    };
    
    if (writeBlogPosts(posts)) {
      res.json({ success: true, post: posts[index] });
    } else {
      res.status(500).json({ error: 'Failed to update blog post' });
    }
  } catch (err) {
    console.error('Error updating blog post:', err);
    res.status(500).json({ error: 'Failed to update blog post' });
  }
});

// DELETE blog post (requires auth)
app.delete('/api/blog/post/:id', requireAuth, (req, res) => {
  try {
    const posts = readBlogPosts();
    const filtered = posts.filter(p => p.id !== req.params.id);
    
    if (filtered.length === posts.length) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (writeBlogPosts(filtered)) {
      res.json({ success: true, message: 'Post deleted' });
    } else {
      res.status(500).json({ error: 'Failed to delete blog post' });
    }
  } catch (err) {
    console.error('Error deleting blog post:', err);
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

// GET all blog posts (including unpublished) for admin
app.get('/api/blog/admin/posts', requireAuth, (req, res) => {
  try {
    const posts = readBlogPosts();
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(posts);
  } catch (err) {
    console.error('Error fetching admin blog posts:', err);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// ---------- START SERVER ----------

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view your site`);
  console.log(`Stripe webhook endpoint: /api/stripe/webhook`);
  console.log(`Test email endpoint: http://localhost:${PORT}/test-email?email=shaud150@gmail.com`);
  console.log(`Blog API endpoint: http://localhost:${PORT}/api/blog/posts`);
  console.log(`Blog admin panel: http://localhost:${PORT}/blog-admin.html`);
});

