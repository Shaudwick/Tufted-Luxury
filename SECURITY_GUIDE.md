# Security Guide for Black Lobby Website

This guide covers security best practices to protect your website, customer data, and personal information.

## 🔐 Critical Security Measures

### 1. Environment Variables & Secrets Management

**NEVER commit secrets to Git:**
- ✅ Keep `.env` in `.gitignore` (already done)
- ✅ Use environment variables for all sensitive data
- ✅ Never share API keys, tokens, or passwords
- ✅ Rotate keys regularly

**Current secrets to protect:**
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SMTP_HOST
SMTP_USER
SMTP_PASS
TWILIO_SID
TWILIO_AUTH
TWILIO_PHONE
```

**Best Practices:**
- Use different keys for development and production
- Rotate secrets every 90 days (especially if exposed)
- Use secret management services for production (AWS Secrets Manager, Azure Key Vault, etc.)

---

### 2. HTTPS/SSL Certificate

**Always use HTTPS in production:**
- ✅ Encrypts data in transit
- ✅ Prevents man-in-the-middle attacks
- ✅ Required for payment processing (Stripe requires HTTPS)
- ✅ Improves customer trust

**How to implement:**
- Use services like:
  - **Cloudflare** (free SSL, recommended)
  - **Let's Encrypt** (free certificates)
  - **Your hosting provider** (many include free SSL)

**For Node.js server:**
```javascript
// In production, use HTTPS
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(443);
```

---

### 3. Email Security (DMARC, SPF, DKIM)

**Already covered in DMARC_SETUP_GUIDE.md, but critical points:**
- ✅ Set up SPF records to prevent email spoofing
- ✅ Configure DKIM for email authentication
- ✅ Implement DMARC policy (start with `p=none`, progress to `p=reject`)

**Why it matters:**
- Prevents attackers from sending emails as `blacklobby.co`
- Protects customers from phishing attacks
- Builds email reputation

---

### 4. Payment Security (Stripe Best Practices)

**Already implemented correctly:**
- ✅ Server-side payment processing (no card data touches your server)
- ✅ Webhook signature verification
- ✅ Using Stripe's secure checkout

**Additional recommendations:**
- Never store credit card numbers
- Always verify webhook signatures
- Use Stripe's test mode for development
- Monitor failed payment attempts
- Set up Stripe Radar for fraud detection

---

### 5. Input Validation & Sanitization

**Always validate and sanitize user input:**

```javascript
// Example: Validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Example: Sanitize input
const sanitize = require('express-validator').sanitize;
```

**What to validate:**
- Email addresses
- Phone numbers
- Form submissions
- URL parameters
- Request bodies

**Install validation library:**
```bash
npm install express-validator
```

---

### 6. Security Headers

**Add security headers to prevent common attacks:**

```javascript
// Add to server.js
const helmet = require('helmet');
app.use(helmet());

// Or manually set headers:
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

**Install helmet:**
```bash
npm install helmet
```

---

### 7. Rate Limiting

**Prevent abuse and DDoS attacks:**

```javascript
const rateLimit = require('express-rate-limit');

// General rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);

// Stricter limiter for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5 // 5 payment attempts per 15 minutes
});

app.use('/create-checkout-session', paymentLimiter);
```

**Install:**
```bash
npm install express-rate-limit
```

---

### 8. CORS Configuration

**Restrict cross-origin requests:**

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://blacklobby.co'],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

### 9. Data Protection

**Customer Information:**
- ✅ Only collect necessary information
- ✅ Encrypt sensitive data at rest
- ✅ Use secure database connections
- ✅ Implement data retention policies
- ✅ Allow customers to delete their data (GDPR compliance)

**Payment Data:**
- ✅ Never store credit card numbers
- ✅ Use Stripe's secure storage (already done)
- ✅ Log minimal payment information

**Email Addresses:**
- ✅ Store securely
- ✅ Use for transactional emails only
- ✅ Implement unsubscribe mechanisms
- ✅ Never sell/share email lists

---

### 10. Session Security

**If implementing user sessions:**

```javascript
const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_SECRET, // Use strong random string
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true, // Prevents XSS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

---

### 11. Error Handling

**Don't expose sensitive information in errors:**

```javascript
// BAD - exposes system info
app.use((err, req, res, next) => {
  res.status(500).send(err.stack); // ❌ Never do this
});

// GOOD - generic error messages
app.use((err, req, res, next) => {
  console.error('Error:', err); // Log details server-side
  res.status(500).json({
    error: 'An error occurred. Please try again later.'
  });
});
```

---

### 12. Logging & Monitoring

**Log security events:**
- Failed login attempts
- Payment failures
- Webhook verification failures
- Unusual traffic patterns

**Use logging service:**
- Winston (Node.js logger)
- Loggly
- Papertrail
- CloudWatch (AWS)

**Don't log sensitive data:**
- ❌ Credit card numbers
- ❌ Passwords
- ❌ Full request bodies with payment info

---

### 13. Dependency Security

**Regularly update dependencies:**

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update packages
npm update

# Use automated tools
npm install -g npm-check-updates
ncu -u
npm install
```

---

### 14. Server Security

**Production server recommendations:**
- ✅ Keep OS updated
- ✅ Use firewall (only open necessary ports)
- ✅ Disable unnecessary services
- ✅ Use SSH keys instead of passwords
- ✅ Disable root login
- ✅ Use fail2ban for intrusion prevention

**Recommended hosting:**
- Heroku (managed, good security defaults)
- AWS (requires more setup but very secure)
- DigitalOcean (with proper security configuration)
- Vercel/Netlify (for static sites)

---

### 15. Database Security (if applicable)

**If you add a database:**
- ✅ Use parameterized queries (prevent SQL injection)
- ✅ Encrypt database connections
- ✅ Regular backups
- ✅ Limit database user permissions
- ✅ Never expose database credentials

**Example (with parameterized queries):**
```javascript
// BAD - SQL injection risk
const query = `SELECT * FROM users WHERE email = '${email}'`; // ❌

// GOOD - parameterized
const query = 'SELECT * FROM users WHERE email = ?';
db.query(query, [email]); // ✅
```

---

### 16. Content Security Policy (CSP)

**Prevent XSS attacks:**

```javascript
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://js.stripe.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.stripe.com;"
  );
  next();
});
```

---

### 17. Regular Security Audits

**Schedule regular security reviews:**
- Monthly dependency updates
- Quarterly security audits
- Annual penetration testing
- Review access logs regularly

---

### 18. Backup Strategy

**Regular backups:**
- ✅ Database backups (if applicable)
- ✅ Configuration backups
- ✅ Code backups (Git repository)
- ✅ Test restore procedures
- ✅ Store backups securely (encrypted)

---

### 19. Compliance

**Consider compliance requirements:**
- **GDPR** (if serving EU customers)
  - Cookie consent
  - Data deletion requests
  - Privacy policy
  - Data processing agreements

- **CCPA** (if serving California customers)
  - Privacy policy
  - Opt-out mechanisms

- **PCI DSS** (handled by Stripe, but be aware)

---

### 20. Incident Response Plan

**Prepare for security incidents:**
1. Identify the breach
2. Contain the threat
3. Assess damage
4. Notify affected parties (if required)
5. Document everything
6. Update security measures
7. Review and improve

---

## 🚨 Security Checklist

### Immediate Actions:
- [ ] Ensure `.env` is in `.gitignore`
- [ ] Set up HTTPS/SSL certificate
- [ ] Configure DMARC, SPF, DKIM for email
- [ ] Add security headers (use Helmet)
- [ ] Implement rate limiting
- [ ] Review all environment variables
- [ ] Remove any hardcoded secrets
- [ ] Set up proper CORS configuration
- [ ] Enable webhook signature verification (already done ✅)
- [ ] Review error handling (don't expose stack traces)

### Ongoing Maintenance:
- [ ] Run `npm audit` monthly
- [ ] Update dependencies regularly
- [ ] Monitor server logs
- [ ] Review access logs
- [ ] Rotate API keys/secrets quarterly
- [ ] Test backups regularly
- [ ] Review security practices quarterly

---

## 🛡️ Additional Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Stripe Security Guide**: https://stripe.com/docs/security
- **Node.js Security Best Practices**: https://nodejs.org/en/docs/guides/security/
- **Express Security**: https://expressjs.com/en/advanced/best-practice-security.html

---

## ⚠️ If You Suspect a Security Breach

1. **Immediately change all passwords and API keys**
2. **Review server logs for suspicious activity**
3. **Check for unauthorized access**
4. **Notify affected users (if required by law)**
5. **Contact your hosting provider**
6. **Consider professional security audit**

---

## Quick Security Wins (Implement First)

1. ✅ Add Helmet for security headers
2. ✅ Add rate limiting
3. ✅ Ensure HTTPS is enabled
4. ✅ Set up email authentication (DMARC)
5. ✅ Review and secure environment variables
6. ✅ Add input validation
7. ✅ Implement proper error handling
8. ✅ Enable CORS restrictions

Remember: Security is an ongoing process, not a one-time setup!

