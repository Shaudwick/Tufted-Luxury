#!/bin/bash

# Quick script to send test emails via the server endpoint

EMAIL="shaud150@gmail.com"
PORT="${PORT:-4242}"
BASE_URL="http://localhost:${PORT}"

echo "=========================================="
echo "Sending Test Ticket Emails"
echo "=========================================="
echo ""
echo "Email: ${EMAIL}"
echo "Server: ${BASE_URL}"
echo ""

# Check if server is running
if curl -s "${BASE_URL}" > /dev/null 2>&1; then
    echo "✅ Server is running"
    echo ""
    echo "Sending test emails..."
    
    # Send test emails
    response=$(curl -s "${BASE_URL}/test-email?email=${EMAIL}")
    
    if echo "$response" | grep -q "success.*true"; then
        echo "✅ Test emails sent successfully!"
        echo ""
        echo "Response:"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo "❌ Error sending emails"
        echo "Response: $response"
    fi
else
    echo "❌ Server is not running on port ${PORT}"
    echo ""
    echo "Please start your server first:"
    echo "  node server.js"
    echo ""
    echo "Or if using nodemon:"
    echo "  npm start"
    echo ""
    echo "Then run this script again, or visit:"
    echo "  ${BASE_URL}/test-email?email=${EMAIL}"
fi

