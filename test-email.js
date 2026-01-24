// Test script to send sample ticket emails
require("dotenv").config();

const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

// Create transporter (same as server.js)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email template function (copied from server.js)
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

async function sendTestEmail(ticketTier, name = "Test Customer") {
  const orderId = `test_${Date.now()}`;
  const html = buildEmailHtml({ name, ticketTier, orderId });

  const ticketName = ticketTier === "charcuterie" 
    ? "VIP Charcuterie & Wine Room Ticket ($18)" 
    : "General Networking & Art Exhibition Ticket ($12)";

  const mailOptions = {
    from: '"Black Lobby Collective" <no-reply@blacklobby.co>',
    to: "shaud150@gmail.com",
    subject: `[TEST] Your Arts After Dark Ticket Confirmation - ${ticketName}`,
    html,
    attachments: [],
  };

  // Only attach image if file exists (optional attachment)
  const imagePath = path.join(__dirname, "assets", "arts-after-dark-header.jpg");
  if (fs.existsSync(imagePath)) {
    mailOptions.attachments.push({
      filename: "arts-after-dark-header.jpg",
      path: imagePath,
      cid: "rugheader",
    });
    console.log("✅ Image attachment found and will be included");
  } else {
    console.warn("⚠️ Image not found at:", imagePath);
    console.warn("   Email will be sent without image attachment");
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`\n✅ Test email sent successfully!`);
    console.log(`   Ticket Type: ${ticketName}`);
    console.log(`   To: shaud150@gmail.com`);
    console.log(`   Message ID: ${info.messageId}\n`);
  } catch (err) {
    console.error("\n❌ Error sending test email:");
    console.error("   Error:", err.message);
    if (err.code) console.error("   Code:", err.code);
    if (err.response) console.error("   SMTP Response:", err.response);
    process.exit(1);
  }
}

// Main execution
async function main() {
  console.log("=".repeat(60));
  console.log("Sending Test Ticket Emails");
  console.log("=".repeat(60));

  // Check SMTP configuration
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("\n❌ ERROR: SMTP configuration missing!");
    console.error("   Required environment variables:");
    console.error("   - SMTP_HOST");
    console.error("   - SMTP_USER");
    console.error("   - SMTP_PASS");
    console.error("\n   Make sure your .env file is configured.\n");
    process.exit(1);
  }

  console.log("\n📧 Sending test emails to: shaud150@gmail.com\n");

  // Send General Ticket ($12) email
  console.log("1️⃣  Sending General Ticket ($12) test email...");
  await sendTestEmail("networking", "Test Customer");

  // Wait a moment between emails
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Send VIP Ticket ($18) email
  console.log("2️⃣  Sending VIP Ticket ($18) test email...");
  await sendTestEmail("charcuterie", "Test Customer");

  console.log("\n" + "=".repeat(60));
  console.log("✅ All test emails sent successfully!");
  console.log("=".repeat(60));
  console.log("\nCheck your inbox: shaud150@gmail.com\n");
}

// Run the test
main().catch(err => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});

