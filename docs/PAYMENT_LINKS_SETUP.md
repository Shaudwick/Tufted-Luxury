# Stripe Payment Links (simple checkout)

You only edit **one file**: `js/payment-links.js`.

## Steps

1. Open [Stripe Dashboard](https://dashboard.stripe.com) and turn **Test mode off** when you’re ready for real sales (toggle top right).
2. Go to **Product catalog** (or **Payment links**) and create a **Payment link** for each item (correct price).
3. Click **Copy link** — each URL looks like `https://buy.stripe.com/…`
4. Paste each URL next to its key in `window.BLACK_LOBBY_PAYMENT_LINKS` (`godsCollectionFull`, `rugChronicles`, …).
5. Save, deploy. No `.env`, no publishable keys, and no Stripe buy buttons in HTML.

## Keys in `payment-links.js`

| Key | Used for |
|-----|----------|
| `godsCollectionFull` | Gods Collection — full set ($10,000) |
| `rugChronicles` | Single piece |
| `rugExodus` | Single piece |
| `rugPsalms` | Single piece |
| `rugQueenVashti` | Single piece |
| `sunCard` | Sun Card — framed tufted collection |
| `magician` | The Magician — framed tufted collection |
| `framedDeposit11x14` | Custom framed piece — 11 × 14 deposit ($75) |
| `framedDeposit16x20` | Custom framed piece — 16 × 20 deposit ($100) |
| `framedDeposit20x30` | Custom framed piece — 20 × 30 deposit ($150) |
| `framedDeposit24x36` | Custom framed piece — 24 × 36 deposit ($175) |

Blank URLs open **email** so customers can reach you until the link exists.

Optional: Email still works alongside Payment Links (`Contact@blacklobby.co`).
