# DMARC DNS Records for blacklobby.co

## Quick Reference - Copy These Records to Your DNS

### 1. SPF Record (Start with this)

```
Type: TXT
Host/Name: @ (or blacklobby.co)
Value: v=spf1 include:_spf.google.com ~all
TTL: 3600
```

**Note:** Replace `include:_spf.google.com` based on your SMTP provider:
- **Gmail/Google Workspace:** `include:_spf.google.com`
- **Mailgun:** `include:mailgun.org`
- **SendGrid:** `include:sendgrid.net`
- **Amazon SES:** `include:amazonses.com`
- **Custom SMTP:** `ip4:YOUR_IP_ADDRESS` or `mx`

**To find your provider:**
Check your `.env` file → `SMTP_HOST` value

### 2. DMARC Record (Start with monitoring mode)

```
Type: TXT
Host/Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc-reports@blacklobby.co; pct=100
TTL: 3600
```

**Important:** Replace `dmarc-reports@blacklobby.co` with an email you can access to receive reports.

### 3. DKIM Record (Get from your email provider)

**This record is unique to your email provider. You'll need to:**

1. Log into your email provider's dashboard
2. Find DKIM settings
3. Generate or view DKIM keys
4. Add the provided record to your DNS

**Common locations:**
- **Google Workspace:** Admin Console → Apps → Gmail → Authenticate email
- **Mailgun:** Dashboard → Sending → Domain settings → DKIM
- **SendGrid:** Settings → Sender Authentication → Domain Authentication

The record will look like:
```
Type: TXT
Host/Name: [selector]._domainkey (e.g., google._domainkey)
Value: v=DMARC1; k=rsa; p=[LONG_PUBLIC_KEY]
TTL: 3600
```

---

## Implementation Steps

1. **Check your SMTP provider** (look at `.env` file)
2. **Update SPF record** with correct provider
3. **Add DMARC record** in monitoring mode
4. **Set up DKIM** with your email provider
5. **Wait 24-48 hours** for DNS propagation
6. **Test using:** https://mxtoolbox.com/dmarc.aspx
7. **Monitor reports** for 1-2 weeks
8. **Upgrade DMARC policy** to `p=quarantine` then `p=reject`

---

## Policy Progression

### Week 1-2: Monitoring (Current Recommendation)
```
_dmarc → v=DMARC1; p=none; rua=mailto:dmarc-reports@blacklobby.co; pct=100
```

### Week 3: Quarantine
```
_dmarc → v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@blacklobby.co; sp=quarantine; pct=100
```

### Week 4+: Reject (Most Secure)
```
_dmarc → v=DMARC1; p=reject; rua=mailto:dmarc-reports@blacklobby.co; sp=reject; pct=100
```

---

## Testing Commands

After adding records, verify with:

```bash
# Check SPF
nslookup -type=TXT blacklobby.co | grep spf

# Check DMARC
nslookup -type=TXT _dmarc.blacklobby.co | grep DMARC

# Check DKIM (replace selector)
nslookup -type=TXT selector._domainkey.blacklobby.co | grep DKIM
```

Or use online tools:
- https://mxtoolbox.com/dmarc.aspx
- https://toolbox.googleapps.com/apps/checkmx/check

---

## Your Current Email Configuration

Based on your code, you're sending from:
- **From address:** `no-reply@blacklobby.co`
- **Contact:** `contact@blacklobby.co`

Make sure both of these are covered by your SPF and DMARC policies.

