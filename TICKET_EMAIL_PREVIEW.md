# Ticket Confirmation Email Preview

This document shows exactly what customers receive when they purchase a ticket.

## Email Subject Line

```
Your Arts After Dark Ticket Confirmation
```

## Email Content

### Header Image
- If the file `assets/arts-after-dark-header.jpg` exists, it will be displayed at the top
- Image is centered, max-width 600px, rounded corners

### Main Heading
```
Arts After Dark — Your Reservation Is Confirmed
```

### Greeting
```
Hello [Customer Name],

Thank you for securing your place at Arts After Dark, hosted by 
Black Lobby Collective. Prepare for an evening of elegance, connection,
and immersive artistic storytelling.
```

### 📍 Event Details (Highlighted Box)
```
📅 Date & Time:
January 10th, 2025 • 6:00 PM - 10:00 PM

📍 Location:
1551 S Commerce St
Las Vegas, NV 89121
```

### 👗 Dress Code
```
Dress Code — Black & White Only

A monochrome palette sets the tone for luxury. Guests are invited to arrive in timeless black,
white, or a refined combination of both. Your presence becomes part of the visual art of the night.
```

### ✨ What to Expect
```
What to Expect

You are stepping into a curated environment designed for creativity, conversation, and high-frequency energy:
• A gallery of luxury tufted masterpieces
• Networking with artists, collectors, and creatives
• Artist-led storytelling and live atmosphere
```

---

## Ticket Type 1: General Ticket ($12)

### Ticket Section
```
🎟 Your Ticket

Networking & Art Exhibition Ticket ($12)
• Access to the networking lounge
• Full access to the Art Exhibition
Order ID: [Stripe Session ID]
```

---

## Ticket Type 2: VIP Ticket ($18)

### Ticket Section
```
🍷 Your VIP Ticket

Charcuterie & Wine Room Ticket ($18)
• Networking & Art Exhibition access
• Entry to the Charcuterie & Wine Room
• Premium wine selections and curated bites
Order ID: [Stripe Session ID]
```

---

## Footer

```
For any questions about parking, accessibility, or upgrades, contact us at
contact@blacklobby.co.

We look forward to hosting you for an unforgettable evening.
— Black Lobby Collective
```

---

## Email Details

- **From:** Black Lobby Collective <no-reply@blacklobby.co>
- **Format:** HTML email with styling
- **Font:** Playfair Display (serif)
- **Colors:** Professional black text on white background, blue accents for event details

## What Customers See

1. **Header image** (if available) - Brand artwork
2. **Confirmation message** - Personal greeting
3. **Event details box** - Highlighted date, time, and location
4. **Dress code** - Clear instructions
5. **What to expect** - Event highlights
6. **Ticket details** - Type, price, access included, Order ID
7. **Contact information** - Support email
8. **Brand signature** - Professional closing

## Testing

To send a test email, run:
```bash
node test-email.js
```

This will send sample emails for both ticket types to the address you configure via `TEST_EMAIL_RECIPIENT` or `SMTP_USER` in `.env`.

## Notes

- The email is sent automatically 1 minute after payment completion
- Order ID is the Stripe session ID
- Image attachment is optional (email sends even if image is missing)
- Email uses HTML styling for professional appearance
- All event details are clearly displayed in a highlighted box

