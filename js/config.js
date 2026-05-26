// Payment Configuration
// IMPORTANT: Replace these values with your actual payment details
// For production, use environment variables instead of hardcoding

const CONFIG = {
  // Stripe Keys - Get these from https://dashboard.stripe.com/apikeys
  STRIPE_PUBLISHABLE_KEY: 'pk_live_51SN0lqJpWM3jphuaWTrTbRdcUZcY7O5JEwIbN5UkRWtkqUiH6xPwWI8g77TH9i7hNVnVAG1d5K5SMA7XNvfRdgsP00USsKwgFz',
  // Note: Secret key should ONLY be in server.js via environment variable
  
  // Payment Settings
  DEPOSIT_PERCENTAGE: 0.3, // 30% deposit
  
  // Payment Method Details (replace with your actual accounts)
  PAYPAL_ME: 'https://paypal.me/YourName', // Replace with your PayPal.me link
  VENMO_USER: 'YourVenmo', // Replace with your Venmo username (no @)
  CASHAPP_TAG: 'YourCashTag', // Replace with your Cash App tag (no $)
  ZELLE_EMAIL: 'your-email@example.com', // Replace with your Zelle email
  
  // API Endpoint
  API_ENDPOINT: '/create-checkout-session', // Backend endpoint for Stripe
  
  // Environment
  IS_PRODUCTION: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
};


