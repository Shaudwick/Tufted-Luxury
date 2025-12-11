const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const app = express();

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
    
    // Create line items from cart
    const lineItems = cartItems && cartItems.length > 0
      ? cartItems.map(item => ({
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${item.collection.charAt(0).toUpperCase() + item.collection.slice(1)} Collection`,
              description: `Quantity: ${item.quantity}`,
            },
            unit_amount: Math.round((item.price * item.quantity) * 100), // Convert to cents
          },
          quantity: 1,
        }))
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/Checkout.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/Checkout.html?canceled=true`,
      metadata: {
        ...metadata,
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

// Webhook endpoint for Stripe events (recommended for production)
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

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view your site`);
});


