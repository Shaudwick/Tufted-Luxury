#!/bin/bash

# Test Email Script for Ticket Confirmations
# This script sends test ticket confirmation emails

echo "📧 Sending test ticket confirmation emails..."
echo ""

# Check if server is running
if ! curl -s http://localhost:4242/health > /dev/null 2>&1; then
    echo "❌ Server is not running!"
    echo "Please start the server first:"
    echo "   node server.js"
    echo ""
    exit 1
fi

# Send test email
echo "Sending test emails to: shaud150@gmail.com"
echo ""

curl -s "http://localhost:4242/test-email?email=shaud150@gmail.com" | python3 -m json.tool

echo ""
echo "✅ Test email request sent!"
echo "Check your inbox at shaud150@gmail.com"
echo ""
echo "The test will send both General ($12) and VIP ($18) ticket confirmation emails."
