# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single product: the **Black Lobby Collective** static marketing/e-commerce
site (`tufted-luxury`) with a thin **Express** backend (`server.js`) for Stripe Checkout
Sessions, webhooks, and transactional email. There is no database. Node.js is the only
runtime; the package manager is **npm** (`package-lock.json`).

### Running the app
- Dev server: `npm run dev` (nodemon) or `npm start`. Serves the whole repo statically and
  the API on **http://localhost:4242** (override with `PORT`). Scripts live in `package.json`.
- `npm run check-env` validates `.env`. It **exits non-zero if `STRIPE_SECRET_KEY` is unset**,
  so a `.env` with at least a placeholder `STRIPE_SECRET_KEY` is required. `.env` is
  gitignored; copy from `.env.example`. Missing SMTP/Twilio/webhook vars are only warnings.
- The server boots fine with a placeholder `STRIPE_SECRET_KEY` (e.g. `sk_test_placeholder`).
  Static pages and browsing work fully. Only endpoints that call Stripe
  (`/create-checkout-session`, `/api/custom-framed-checkout`, `/verify-session`, webhooks)
  need a real `sk_test_`/`sk_live_` key; without it they return Stripe SDK errors.

### Purchase flows (non-obvious)
- The **primary** purchase path is **Stripe Payment Links**, not the server. Buttons with
  `data-pay="..."` are wired in `js/script.js` from URLs in `js/payment-links.js`, and
  redirect straight to `https://buy.stripe.com/...` hosted checkout — no local secret needed.
  This is the best end-to-end "hello world": load a product page (e.g.
  `/card-collection.html`), click an "Acquire" button, land on the Stripe checkout page.
  (Requires network egress to `buy.stripe.com`.)
- The **legacy/advanced** path (`Checkout.html` + `js/cart.js` → `/create-checkout-session`,
  and `lib/framed-piece-checkout.js`) POSTs a 30% deposit to the Express server and needs a
  real `STRIPE_SECRET_KEY`. The cart is stored in `localStorage`.

### Email / SMS (optional)
- Email uses Nodemailer + SMTP (`SMTP_HOST/USER/PASS`); test via `node test-email.js` or, in
  dev only, `GET /test-email?email=you@example.com`. SMS is optional via Twilio
  (`TWILIO_SID/AUTH/PHONE` — all three or none). Post-payment automation (emails/SMS) requires
  Stripe CLI webhook forwarding: `stripe listen --forward-to localhost:4242/api/stripe/webhook`.

### Notes
- There are no automated tests and no lint config in this repo; "testing" means running the
  server and exercising the site in a browser.
- `website/` is an alternate/older front-end tree (not a second backend); root HTML files are
  the canonical site.
