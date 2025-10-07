#!/bin/bash

# Quick test script wrapper for Paddle flow testing
# Usage: ./scripts/testPaddle.sh

echo ""
echo "🧪 Paddle Payment Flow Test Helper"
echo "===================================="
echo ""

# Check if user ID is provided
if [ -z "$1" ]; then
    echo "Getting user ID from database..."
    npx tsx scripts/getTestUserId.ts
    exit 0
fi

USER_ID=$1
PLAN_TYPE=${2:-master}
BILLING_CYCLE=${3:-monthly}
COUPON_CODE=$4

echo "Testing with:"
echo "  User ID: $USER_ID"
echo "  Plan: $PLAN_TYPE"
echo "  Billing: $BILLING_CYCLE"
if [ -n "$COUPON_CODE" ]; then
    echo "  Coupon: $COUPON_CODE"
fi
echo ""

# Run the test
if [ -n "$COUPON_CODE" ]; then
    npx tsx scripts/testPaddleFlow.ts "$USER_ID" "$PLAN_TYPE" "$BILLING_CYCLE" "$COUPON_CODE"
else
    npx tsx scripts/testPaddleFlow.ts "$USER_ID" "$PLAN_TYPE" "$BILLING_CYCLE"
fi
