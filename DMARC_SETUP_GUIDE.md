# DMARC Setup Guide for blacklobby.co

This guide will help you set up DMARC (Domain-based Message Authentication, Reporting & Conformance) to protect your domain from email impersonation and phishing attacks.

## What is DMARC?

DMARC is a security protocol that uses SPF and DKIM to verify email authenticity. It tells receiving mail servers how to handle emails that fail authentication checks.

## Prerequisites

1. Access to your domain's DNS management (wherever `blacklobby.co` is hosted)
2. Knowledge of your email service provider (SMTP server - check your `.env` file)

## Step 1: Set Up SPF Record

SPF (Sender Policy Framework) lists which servers are authorized to send email for your domain.

### SPF Record Configuration

Add this TXT record to your DNS:

```
Type: TXT
Name: @ (or blacklobby.co)
Value: v=spf1 include:_spf.google.com include:mailgun.org include:spf.mailjet.com ~all
TTL: 3600 (or default)
```

**Important:** Replace the `include:` values based on your actual email provider:

- **Gmail/Google Workspace:** `include:_spf.google.com`
- **Mailgun:** `include:mailgun.org`
- **Mailjet:** `include:spf.mailjet.com`
- **SendGrid:** `include:sendgrid.net`
- **Amazon SES:** `include:amazonses.com`
- **Custom SMTP:** Add `ip4:YOUR_SERVER_IP` or `mx` for mail servers

**To find your email provider:**
1. Check your `.env` file for `SMTP_HOST`
2. Common providers:
   - `smtp.gmail.com` → Google Workspace/Gmail
   - `smtp.mailgun.org` → Mailgun
   - `smtp.mailjet.com` → Mailjet
   - `email-smtp.region.amazonaws.com` → Amazon SES

### SPF Record Explanation

- `v=spf1` - SPF version
- `include:provider.com` - Include provider's authorized servers
- `~all` - Soft fail (start with this), later change to `-all` (hard fail)

## Step 2: Set Up DKIM

DKIM (DomainKeys Identified Mail) cryptographically signs your emails to prove authenticity.

### Getting DKIM Keys

**For Google Workspace:**
1. Go to Google Admin Console
2. Apps → Google Workspace → Gmail
3. Authenticate email → Show all settings → Authenticate email
4. Generate new record → Copy the selector and public key

**For Mailgun:**
1. Log into Mailgun dashboard
2. Sending → Domain settings → DKIM signing keys
3. Copy the selector and public key

**For Other Providers:**
Check your email provider's documentation for DKIM setup.

### DKIM Record Configuration

Add this TXT record to your DNS:

```
Type: TXT
Name: [selector]._domainkey (e.g., google._domainkey or mailgun._domainkey)
Value: v=DKIM1; k=rsa; p=[YOUR_PUBLIC_KEY_HERE]
TTL: 3600
```

**Example for Google:**
```
Name: google._domainkey
Value: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...
```

## Step 3: Set Up DMARC Policy

DMARC tells receiving servers what to do with emails that fail SPF/DKIM checks.

### Phase 1: Monitoring Mode (Recommended Start)

Start with monitoring mode to see what emails are being sent from your domain:

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc-reports@blacklobby.co; ruf=mailto:dmarc-reports@blacklobby.co; fo=1; pct=100
TTL: 3600
```

**Explanation:**
- `v=DMARC1` - DMARC version
- `p=none` - Policy: do nothing (monitoring only)
- `rua=mailto:...` - Aggregate reports email
- `ruf=mailto:...` - Forensic reports email (optional)
- `fo=1` - Generate reports for all failures
- `pct=100` - Apply to 100% of emails

### Phase 2: Quarantine Mode (After 1-2 weeks)

Once you've reviewed reports and confirmed legitimate emails pass:

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@blacklobby.co; ruf=mailto:dmarc-reports@blacklobby.co; sp=quarantine; pct=100
TTL: 3600
```

### Phase 3: Reject Mode (Final, Most Secure)

After confirming everything works:

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=reject; rua=mailto:dmarc-reports@blacklobby.co; sp=reject; pct=100
TTL: 3600
```

**Policy Levels:**
- `p=none` - Monitor only, don't block anything
- `p=quarantine` - Send failing emails to spam folder
- `p=reject` - Reject failing emails entirely (most secure)

## Step 4: Verify Your Setup

### Testing Tools

1. **MXToolbox DMARC Check:**
   - Visit: https://mxtoolbox.com/dmarc.aspx
   - Enter: `blacklobby.co`
   - Verify all records are correct

2. **Google Admin Toolbox:**
   - Visit: https://toolbox.googleapps.com/apps/checkmx/check
   - Enter: `blacklobby.co`
   - Check SPF, DKIM, and DMARC

3. **DMARC Analyzer:**
   - Visit: https://www.dmarcanalyzer.com/
   - Enter your domain to get detailed reports

### Manual DNS Check

Run these commands in your terminal:

```bash
# Check SPF
dig TXT blacklobby.co +short | grep spf

# Check DMARC
dig TXT _dmarc.blacklobby.co +short | grep DMARC

# Check DKIM (replace 'selector' with your actual selector)
dig TXT selector._domainkey.blacklobby.co +short | grep DKIM
```

## Step 5: Monitor DMARC Reports

### Setting Up Report Collection

1. Create an email address for reports: `dmarc-reports@blacklobby.co`
2. Or use a service like:
   - [Postmark DMARC Digest](https://dmarc.postmarkapp.com/)
   - [Dmarcian](https://dmarcian.com/)
   - [Valimail](https://www.valimail.com/)

### Understanding Reports

DMARC reports will show:
- Which IPs are sending email from your domain
- SPF and DKIM authentication results
- Email volume statistics
- Potential spoofing attempts

## Quick Start Checklist

- [ ] Identify your email provider (check SMTP_HOST in .env)
- [ ] Add SPF record to DNS
- [ ] Set up DKIM with your email provider
- [ ] Add DKIM record to DNS
- [ ] Add DMARC record in monitoring mode (`p=none`)
- [ ] Verify all records with testing tools
- [ ] Monitor reports for 1-2 weeks
- [ ] Switch to quarantine mode (`p=quarantine`)
- [ ] Monitor for another week
- [ ] Switch to reject mode (`p=reject`) for maximum security

## Common Issues & Solutions

### "SPF: softfail" or "SPF: fail"
- Ensure your SMTP server IP is included in SPF record
- Check your email provider's documentation for correct include value

### "DKIM: invalid"
- Verify DKIM selector name matches DNS record name
- Ensure public key is correctly formatted (remove line breaks)
- Wait 24-48 hours for DNS propagation

### "DMARC: fail"
- Both SPF and DKIM must align with your domain
- Check that `From:` address matches your domain
- Ensure alignment is set correctly (`adkim=r` for relaxed, `adkim=s` for strict)

## Additional Security Recommendations

1. **BIMI (Brand Indicators for Message Identification):**
   - Add brand logo to authenticated emails
   - Requires DMARC policy at `p=quarantine` or `p=reject`

2. **ARC (Authenticated Received Chain):**
   - Helps with forwarded emails
   - Usually handled by email providers automatically

3. **Email Security Headers:**
   - Consider adding security headers in your email templates
   - Already handled by most modern email providers

## Support

If you need help:
1. Check your email provider's documentation
2. Use DMARC testing tools listed above
3. Review DNS records for typos
4. Wait 24-48 hours for DNS propagation

## Next Steps After Setup

Once DMARC is fully configured:
1. Update your email sending code to ensure proper authentication
2. Monitor DMARC reports regularly
3. Adjust policy as needed based on report data
4. Document your email infrastructure for future reference

---

**Note:** It's recommended to start with `p=none` (monitoring) for 1-2 weeks before moving to stricter policies to avoid legitimate emails being blocked.

