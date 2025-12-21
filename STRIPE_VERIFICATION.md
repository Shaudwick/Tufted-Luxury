# Stripe Verification Setup

You've been provided a Stripe verification string. This guide explains how to use it depending on your use case.

## Verification String Received

```
stripe-verification=fef28c60997139d3c39486dce17f247c7b4cca15abb1df1e845c533ccbdb49f5
```

## Option 1: DNS Domain Verification (Most Likely)

If Stripe asked you to add this to your DNS records, this is for **domain verification**. This verifies that you own the domain `blacklobby.co` and allows you to use custom branding or domain features.

### How to Add DNS Record

1. **Log into your domain registrar/DNS provider** (where you manage DNS for `blacklobby.co`)

2. **Add a TXT record:**
   ```
   Type: TXT
   Host/Name: @ (or blacklobby.co, or leave blank depending on provider)
   Value: stripe-verification=fef28c60997139d3c39486dce17f247c7b4cca15abb1df1e845c533ccbdb49f5
   TTL: 3600 (or default)
   ```

3. **Wait 24-48 hours** for DNS propagation

4. **Verify in Stripe Dashboard:**
   - Go to Stripe Dashboard → Settings → Branding
   - Check domain verification status

### Testing DNS Record

After adding, verify it's working:

```bash
# Check if record exists
nslookup -type=TXT blacklobby.co | grep stripe-verification

# Or use online tool
# Visit: https://mxtoolbox.com/TXTLookup.aspx
# Enter: blacklobby.co
```

## Option 2: Webhook Signing Secret

If this is actually a **webhook signing secret** (though unlikely given the format), you would add it to your `.env` file:

### Add to .env File

```
STRIPE_WEBHOOK_SECRET=whsec_fef28c60997139d3c39486dce17f247c7b4cca15abb1df1e845c533ccbdb49f5
```

**Note:** Webhook secrets typically start with `whsec_`. If your string doesn't have that prefix, it's more likely a domain verification record.

## Current Webhook Configuration

Your server is already configured to use the webhook secret from environment variables:

```javascript
// In server.js
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
```

Make sure your `.env` file has:
```
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_WEBHOOK_SECRET
```

## Getting Your Webhook Secret

If you need to set up or get your webhook signing secret:

1. Go to Stripe Dashboard
2. Developers → Webhooks
3. Click on your webhook endpoint (or create one)
4. Click "Reveal" next to "Signing secret"
5. Copy the secret (starts with `whsec_`)
6. Add it to your `.env` file

### Webhook Endpoint URL

Your webhook endpoint should be:
```
https://yourdomain.com/api/stripe/webhook
```

Make sure this URL is:
- Publicly accessible
- Configured in Stripe Dashboard → Webhooks
- Using HTTPS (required for production)

## Verification Checklist

- [ ] Determine if this is DNS verification or webhook secret
- [ ] If DNS: Add TXT record to your DNS provider
- [ ] If webhook: Add to `.env` file (and ensure it starts with `whsec_`)
- [ ] Wait for DNS propagation (if DNS record)
- [ ] Verify in Stripe Dashboard
- [ ] Test webhook endpoint if applicable

## Common Issues

### "Verification failed"
- Wait 24-48 hours for DNS propagation
- Check that the TXT record name is correct (@ or domain name)
- Ensure the entire value is copied correctly (no extra spaces)

### "Webhook signature verification failed"
- Verify `STRIPE_WEBHOOK_SECRET` is set in `.env`
- Ensure the secret starts with `whsec_`
- Check that the webhook URL in Stripe matches your server
- Verify your server is using the raw request body (already configured in your code)

## Next Steps

1. **Add the DNS record** (if domain verification)
2. **Wait for propagation**
3. **Verify in Stripe Dashboard**
4. **Test your webhook** by making a test purchase
5. **Check server logs** to confirm webhooks are being received

---

**Security Note:** Never commit your `.env` file or webhook secrets to GitHub. They should remain private.

