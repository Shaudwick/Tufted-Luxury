#!/bin/bash

# Test ticket confirmation emails (development only).
# Usage: ./send-test-email.sh your@email.com

set -e
EMAIL="${1:-}"
if [ -z "$EMAIL" ]; then
  echo "Usage: ./send-test-email.sh you@example.com"
  echo "Server must be running: node server.js"
  exit 1
fi

echo "📧 Sending test ticket confirmation emails to: $EMAIL"
echo ""

if ! curl -s http://localhost:4242/health > /dev/null 2>&1; then
  echo "❌ Server is not running! Start with: node server.js"
  exit 1
fi

curl -s "http://localhost:4242/test-email?email=${EMAIL}" | python3 -m json.tool

echo ""
echo "✅ Request sent (development endpoint)."
echo "Check inbox for: $EMAIL"
