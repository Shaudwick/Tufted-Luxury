#!/usr/bin/env node
"use strict";

/**
 * Verifies `.env` exists and critical variables are set for this app.
 * Run from project root: npm run check-env
 */

const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const envPath = path.join(rootDir, ".env");

function blank(v) {
  return v == null || String(v).trim() === "";
}

require("dotenv").config({ path: envPath });

const errors = [];
const warnings = [];

if (!fs.existsSync(envPath)) {
  console.error(
    "✖ No .env file — run: cp .env.example .env\n  Then add your secrets (never commit .env).\n",
  );
  process.exit(1);
}

const envRaw = fs.readFileSync(envPath, "utf8");
if (!envRaw.replace(/#[^\n]*/g, "").replace(/\s/g, "")) {
  warnings.push(".env exists but has no variable assignments yet.");
}

/** Needed for Stripe Checkout / gods-collection API */
const sk = process.env.STRIPE_SECRET_KEY;
if (blank(sk)) {
  errors.push(`Missing STRIPE_SECRET_KEY (Stripe payments will not work).`);
  const line = envRaw.split(/\r?\n/).find((l) => /^\s*STRIPE_SECRET_KEY\s*=/.test(l));
  if (line && /\=\s*$/.test(line.trim())) {
    errors.push(`  Hint: STRIPE_SECRET_KEY has no value after "=" — paste your key and save the file.`);
  }
} else if (/^pk_(live|test)_/.test(String(sk).trim())) {
  errors.push(
    `STRIPE_SECRET_KEY is a publishable key (pk_) — use the Secret key instead (starts with sk_test_ or sk_live_) from Stripe → Developers → API keys.`,
  );
}

/** Needed for transactional email (ticket receipts, SMTP) */
for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]) {
  if (blank(process.env[key])) {
    warnings.push(`Missing ${key} — outbound email will not work.`);
  }
}

/** Webhooks: mandatory in production, optional locally */
if (blank(process.env.STRIPE_WEBHOOK_SECRET)) {
  if (process.env.NODE_ENV === "production") {
    errors.push(
      "Missing STRIPE_WEBHOOK_SECRET — required in production for Stripe webhooks.",
    );
  } else {
    warnings.push(
      "STRIPE_WEBHOOK_SECRET not set — OK for local dev; required for production webhooks.",
    );
  }
}

/** Twilio: all or nothing */
const twilioBits = ["TWILIO_SID", "TWILIO_AUTH", "TWILIO_PHONE"];
const twilioAny = twilioBits.some((k) => !blank(process.env[k]));
const twilioAll = twilioBits.every((k) => !blank(process.env[k]));
if (twilioAny && !twilioAll) {
  warnings.push(
    "Twilio partly configured — set TWILIO_SID, TWILIO_AUTH, and TWILIO_PHONE together, or leave all unset.",
  );
}

warnings.forEach((w) => console.warn("⚠", w));
errors.forEach((e) => console.error("✖", e));

if (errors.length) {
  console.error(`\ncheck-env: ${errors.length} error(s), ${warnings.length} warning(s).\n`);
  process.exit(1);
}

console.log(
  warnings.length
    ? `✓ check-env passed with ${warnings.length} warning(s) — fix before production if needed.\n`
    : "✓ check-env passed — required variables look good.\n",
);
process.exit(0);
