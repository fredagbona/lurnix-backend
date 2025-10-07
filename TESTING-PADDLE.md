# 🧪 Testing Paddle Integration (Sandbox)

Quick guide to test the Paddle subscription flow without real payment.

## Quick Start (3 Steps)

### 1. Get a User ID
```bash
npx tsx scripts/getTestUserId.ts
```

### 2. Run the Test
```bash
# Copy the user ID from step 1 and run:
npx tsx scripts/testPaddleFlow.ts <USER_ID> master monthly

# Example:
npx tsx scripts/testPaddleFlow.ts f04df246-d945-4aba-8852-cb62949b718c master monthly
```

### 3. Check Results
```bash
# Open Prisma Studio to see the subscription
npm run db:studio
```

---

## What the Test Does

✅ Creates a subscription (status: pending)  
✅ Simulates Paddle webhook (subscription.activated)  
✅ Activates subscription (status: active)  
✅ Verifies feature access is granted  
✅ Shows detailed output at each step  

---

## Test Different Scenarios

```bash
# Test Master plan monthly
npx tsx scripts/testPaddleFlow.ts <USER_ID> master monthly

# Test Builder plan 6 months
npx tsx scripts/testPaddleFlow.ts <USER_ID> builder six_months

# Test with coupon code
npx tsx scripts/testPaddleFlow.ts <USER_ID> master monthly SAVE20

# Test Free plan
npx tsx scripts/testPaddleFlow.ts <USER_ID> free monthly
```

---

## Available Plans

| Plan Type | Billing Cycles | Prices |
|-----------|---------------|--------|
| `free` | `monthly` | $0 |
| `builder` | `monthly`, `six_months`, `twelve_months` | $20, $108, $192 |
| `master` | `monthly`, `six_months`, `twelve_months` | $50, $249, $499 |

---

## Helper Scripts

### Get User ID
```bash
npx tsx scripts/getTestUserId.ts
```
Lists all users and shows which ones already have subscriptions.

### Quick Test (Bash wrapper)
```bash
./scripts/testPaddle.sh <USER_ID> [plan] [cycle] [coupon]

# Examples:
./scripts/testPaddle.sh f04df246-d945-4aba-8852-cb62949b718c
./scripts/testPaddle.sh f04df246-d945-4aba-8852-cb62949b718c builder six_months
```

---

## Expected Output

```
═══════════════════════════════════════════════════════════
  🧪 PADDLE PAYMENT FLOW TEST (SANDBOX SIMULATION)
═══════════════════════════════════════════════════════════

[Step 1] Verifying user exists...
✓ User found: fredagbona@gmail.com

[Step 2] Finding subscription plan...
✓ Plan found: Master

[Step 3] Checking for existing subscriptions...
✓ No active subscription found

[Step 4] Creating subscription...
✓ Subscription created successfully!

[Step 5] Simulating payment completion...
✓ Webhook processed successfully!

[Step 6] Verifying subscription activation...
✓ Subscription verified!
✓ ✨ Subscription is ACTIVE! User now has premium access.

[Step 7] Testing feature access...
  Can access AI Mentor: ✓ YES
  Can access Roadmaps: ✓ YES

═══════════════════════════════════════════════════════════
  ✓ TEST COMPLETED SUCCESSFULLY
═══════════════════════════════════════════════════════════
```

---

## Testing With Real Paddle API

To test with actual Paddle checkout (optional):

1. Set environment variables in `.env`:
```bash
PADDLE_API_URL="https://sandbox-api.paddle.com"
PADDLE_API_KEY="your_paddle_api_key"
PADDLE_ENV="sandbox"
PADDLE_WEBHOOK_SECRET="your_webhook_secret"
```

2. Run the test:
```bash
npx tsx scripts/testPaddleFlow.ts <USER_ID> master monthly
```

3. You'll get a real Paddle checkout URL:
```
Checkout URL: https://sandbox-checkout.paddle.com/...
```

4. Visit the URL and use test card:
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
```

---

## Troubleshooting

### "User already has an active subscription"
**Options:**
1. Use a different user
2. Cancel existing subscription first
3. Use `--force` flag (will show error handling)

### "Plan not found"
**Solution:** Run `npm run db:seed`

### "Paddle API key is not configured"
**Note:** This is expected. Script will simulate the flow without real Paddle API.

---

## Cleanup After Testing

### Delete Test Subscriptions
```bash
# Option 1: Via Prisma Studio
npm run db:studio
# Navigate to UserSubscription → Delete test records

# Option 2: Via script (TODO: create cleanup script)
```

### Delete Test Scripts (When Done)
```bash
rm scripts/testPaddleFlow.ts
rm scripts/getTestUserId.ts
rm scripts/testPaddle.sh
rm scripts/README-TEST-SCRIPTS.md
rm TESTING-PADDLE.md
```

---

## Next Steps

After successful testing:

1. ✅ Verify subscription in database
2. ✅ Test API endpoint: `GET /api/subscriptions/current`
3. ✅ Test feature gates work correctly
4. ✅ Set up real Paddle account for production
5. ✅ Update Paddle Price IDs in seed file
6. ✅ Configure production webhooks

---

## Documentation

- **Full Integration Guide**: `docs/PADDLE-INTEGRATION-GUIDE.md`
- **Quick Reference**: `docs/PADDLE-QUICK-REFERENCE.md`
- **Test Scripts README**: `scripts/README-TEST-SCRIPTS.md`

---

**⚠️ Remember: These are test scripts for development only. Delete them after testing!**
