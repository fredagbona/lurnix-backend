# Test Scripts - Paddle Payment Flow

## 🧪 testPaddleFlow.ts

A comprehensive test script to simulate the complete Paddle subscription flow without needing real Paddle API credentials.

### What It Does

1. ✓ Verifies user exists in database
2. ✓ Finds the subscription plan
3. ✓ Creates a subscription (attempts Paddle checkout)
4. ✓ Simulates Paddle webhook (subscription.activated)
5. ✓ Activates the subscription in database
6. ✓ Verifies feature access is granted
7. ✓ Provides detailed output and next steps

### Usage

```bash
# Basic usage
npx tsx scripts/testPaddleFlow.ts <userId> <planType> <billingCycle>

# With coupon
npx tsx scripts/testPaddleFlow.ts <userId> <planType> <billingCycle> <couponCode>

# Force (ignore existing subscription)
npx tsx scripts/testPaddleFlow.ts <userId> <planType> <billingCycle> --force
```

### Examples

```bash
# Test Master plan monthly subscription
npx tsx scripts/testPaddleFlow.ts abc-123-def-456 master monthly

# Test Builder plan 6-month subscription
npx tsx scripts/testPaddleFlow.ts abc-123-def-456 builder six_months

# Test with coupon code
npx tsx scripts/testPaddleFlow.ts abc-123-def-456 master twelve_months SAVE20
```

### Parameters

- **userId**: User UUID from database (get from Prisma Studio)
- **planType**: `free`, `builder`, or `master`
- **billingCycle**: `monthly`, `six_months`, or `twelve_months`
- **couponCode**: (Optional) Coupon code to test discounts

### Getting a User ID

```bash
# Option 1: Open Prisma Studio
npm run db:studio
# Navigate to Users table → Copy a user ID

# Option 2: Create a test user via API
curl -X POST http://localhost:5050/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "fullname": "Test User",
    "username": "testuser"
  }'
```

### Expected Output

```
═══════════════════════════════════════════════════════════
  🧪 PADDLE PAYMENT FLOW TEST (SANDBOX SIMULATION)
═══════════════════════════════════════════════════════════

[Step 1] Verifying user exists...
✓ User found: test@example.com
  Name: Test User
  User ID: abc-123-def-456

[Step 2] Finding subscription plan...
✓ Plan found: Master
  Plan ID: plan-uuid-here
  Price: $50/monthly
  Paddle Price ID: pri_01k5rwjf...

[Step 3] Checking for existing subscriptions...
✓ No active subscription found

[Step 4] Creating subscription...
ℹ In production, this would call Paddle API to create checkout session
ℹ For testing, we simulate the response...
✓ Subscription created successfully!
  Subscription ID: sub-uuid-here
  Status: pending
  Paddle Checkout ID: chk_01h...

[Step 5] Simulating payment completion...
ℹ In production, user would pay on Paddle checkout page
ℹ Paddle would then send webhook to your backend
ℹ Simulating webhook: subscription.activated...
✓ Webhook processed successfully!

[Step 6] Verifying subscription activation...
✓ Subscription verified!
  Status: active
  Paddle Subscription ID: sub_test_1234567890
  Current Period Start: 2025-10-03T07:00:00.000Z
  Current Period End: 2025-11-03T07:00:00.000Z
  Auto Renewal: true
✓ ✨ Subscription is ACTIVE! User now has premium access.

[Step 7] Testing feature access...
  Can access AI Mentor: ✓ YES
  Can access Roadmaps: ✓ YES

═══════════════════════════════════════════════════════════
  ✓ TEST COMPLETED SUCCESSFULLY
═══════════════════════════════════════════════════════════

ℹ Next steps:
  1. Check subscription in database: npm run db:studio
  2. Test API: GET /api/subscriptions/current
  3. Test with real Paddle: Set PADDLE_API_KEY in .env
  4. Clean up: Delete subscription ID sub-uuid-here
```

### Testing Scenarios

#### Scenario 1: Test Without Paddle API Key
```bash
# Don't set PADDLE_API_KEY in .env
npx tsx scripts/testPaddleFlow.ts <userId> master monthly

# Result: Creates subscription, simulates webhook, activates subscription
# Good for: Testing database logic and webhook handling
```

#### Scenario 2: Test With Paddle API Key
```bash
# Set PADDLE_API_KEY in .env
npx tsx scripts/testPaddleFlow.ts <userId> master monthly

# Result: Creates real Paddle checkout, gets real checkout URL
# Good for: Testing full integration with Paddle
```

#### Scenario 3: Test Coupon Application
```bash
# First create a coupon in database (or use existing)
npx tsx scripts/testPaddleFlow.ts <userId> master monthly SAVE20

# Result: Tests coupon validation and discount calculation
```

#### Scenario 4: Test Different Plans
```bash
# Test all plan combinations
npx tsx scripts/testPaddleFlow.ts <userId> free monthly
npx tsx scripts/testPaddleFlow.ts <userId> builder monthly
npx tsx scripts/testPaddleFlow.ts <userId> builder six_months
npx tsx scripts/testPaddleFlow.ts <userId> master twelve_months
```

### Troubleshooting

#### Error: "User with ID ... not found"
**Solution**: Create a user first or use an existing user ID from database

#### Error: "Plan not found"
**Solution**: Run `npm run db:seed` to create subscription plans

#### Error: "User already has an active subscription"
**Solution**: 
- Cancel existing subscription first, OR
- Use `--force` flag (will fail but shows error handling), OR
- Use a different user

#### Error: "Paddle API key is not configured"
**Note**: This is expected if testing without Paddle. Script will continue with simulation.

### Cleanup

After testing, clean up test subscriptions:

```bash
# Option 1: Via Prisma Studio
npm run db:studio
# Navigate to UserSubscription → Delete test records

# Option 2: Via SQL
# Connect to database and run:
DELETE FROM "UserSubscription" WHERE "userId" = 'test-user-id';
```

### Important Notes

⚠️ **This is a development/testing script only**
- Do NOT use in production
- DELETE this file after testing
- Creates real database records (clean up after testing)
- Simulates Paddle webhooks (not real Paddle events)

✅ **Safe to use for:**
- Local development testing
- CI/CD testing
- Integration testing
- Understanding the flow

❌ **Do NOT use for:**
- Production environments
- Real customer subscriptions
- Load testing (use proper test suite)

---

## 🗑️ Deletion Instructions

When you're done testing:

```bash
# Delete the test script
rm scripts/testPaddleFlow.ts
rm scripts/README-TEST-SCRIPTS.md

# Clean up test subscriptions from database
npm run db:studio
# Or use SQL to delete test records
```
