# Paddle Integration Guide - Complete Flow & Configuration

## 🔄 Complete Subscription Flow

### Step-by-Step Flow Until User Pays

```
┌─────────────────────────────────────────────────────────────────────┐
│                    1. USER INITIATES SUBSCRIPTION                    │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
    Frontend → POST /api/subscriptions
    Body: { planId: "uuid", couponCode?: "DISCOUNT10" }
    Headers: { Authorization: "Bearer <jwt_token>" }

┌─────────────────────────────────────────────────────────────────────┐
│                    2. BACKEND VALIDATES REQUEST                      │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
    ✓ Authenticates user (JWT)
    ✓ Checks no active subscription exists
    ✓ Validates plan exists and is active
    ✓ Validates coupon (if provided)
    ✓ Calculates final price with discount

┌─────────────────────────────────────────────────────────────────────┐
│                  3. CREATE/RETRIEVE PADDLE CUSTOMER                  │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
    API Call: POST https://api.paddle.com/v1/customers
    Body: {
      data: {
        attributes: {
          email: "user@example.com",
          name: "John Doe"
        }
      }
    }
    Response: { data: { id: "ctm_01h..." } }
    
    → Stores paddleCustomerId in User table

┌─────────────────────────────────────────────────────────────────────┐
│                  4. CREATE PADDLE CHECKOUT SESSION                   │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
    API Call: POST https://api.paddle.com/v1/checkout-sessions
    Body: {
      data: {
        attributes: {
          customer_id: "ctm_01h...",
          prices: [{ price_id: "pri_01k5rwjf..." }],
          price_overrides: [{ // Only if coupon applied
            price_id: "pri_01k5rwjf...",
            amount: { currency_code: "USD", amount: 18.00 }
          }],
          success_url: "https://yourapp.com/checkout/success",
          cancel_url: "https://yourapp.com/checkout/cancel",
          metadata: {
            userId: "user-uuid",
            planId: "plan-uuid"
          }
        }
      }
    }
    Response: {
      data: {
        id: "chk_01h...",
        attributes: {
          checkout_url: "https://checkout.paddle.com/...",
          expires_at: "2025-10-03T08:00:00Z"
        }
      }
    }

┌─────────────────────────────────────────────────────────────────────┐
│                  5. CREATE PENDING SUBSCRIPTION                      │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
    Database: INSERT INTO UserSubscription
    {
      id: "uuid",
      userId: "user-uuid",
      planId: "plan-uuid",
      status: "pending",  ← Not active yet!
      paddleCheckoutId: "chk_01h...",
      paddleSubscriptionId: null,  ← Set later by webhook
      currentPeriodStart: "2025-10-03",
      currentPeriodEnd: "2025-11-03",
      autoRenewal: true
    }

┌─────────────────────────────────────────────────────────────────────┐
│                  6. RETURN CHECKOUT URL TO FRONTEND                  │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
    Response: {
      success: true,
      message: "Checkout session created successfully",
      data: { subscription: {...}, checkout: { url: "..." } },
      coupon: { code: "DISCOUNT10", discountAmount: 2.00 }
    }

┌─────────────────────────────────────────────────────────────────────┐
│                  7. USER REDIRECTED TO PADDLE CHECKOUT              │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
    Frontend redirects: window.location.href = checkout.url
    
    User sees Paddle-hosted checkout page:
    - Plan details
    - Price (with discount if applicable)
    - Payment form (card, PayPal, etc.)
    - Terms & conditions

┌─────────────────────────────────────────────────────────────────────┐
│                  8. USER COMPLETES PAYMENT ON PADDLE                 │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
    User enters payment details → Paddle processes payment
    
    If successful:
      → Paddle creates subscription (sub_01h...)
      → Paddle redirects to: success_url
    
    If failed/cancelled:
      → Paddle redirects to: cancel_url

┌─────────────────────────────────────────────────────────────────────┐
│              9. PADDLE SENDS WEBHOOK: subscription.activated         │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
    Webhook: POST https://yourapi.com/api/webhooks/paddle
    Headers: { Paddle-Signature: "..." }
    Body: {
      event_type: "subscription.activated",
      data: {
        id: "sub_01h...",  ← Paddle subscription ID
        attributes: {
          status: "active",
          checkout: { id: "chk_01h..." },
          current_billing_period: {
            starts_at: "2025-10-03T07:00:00Z",
            ends_at: "2025-11-03T07:00:00Z"
          }
        }
      }
    }

┌─────────────────────────────────────────────────────────────────────┐
│              10. BACKEND PROCESSES WEBHOOK & ACTIVATES               │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
    1. Validates webhook signature (PADDLE_WEBHOOK_SECRET)
    2. Finds subscription by paddleCheckoutId
    3. Updates database:
       UPDATE UserSubscription SET
         status = 'active',  ← NOW ACTIVE!
         paddleSubscriptionId = 'sub_01h...',
         currentPeriodStart = '2025-10-03',
         currentPeriodEnd = '2025-11-03'
    4. Returns 200 OK to Paddle

┌─────────────────────────────────────────────────────────────────────┐
│                  11. USER NOW HAS ACTIVE SUBSCRIPTION                │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
    ✅ User can access premium features
    ✅ Feature gates allow unlimited access
    ✅ Subscription auto-renews unless cancelled
```

---

## 🔐 Required Environment Variables

### Paddle Configuration

Add these to your `.env` file:

```bash
# ============================================
# PADDLE CONFIGURATION
# ============================================

# Paddle API URL (use sandbox for testing)
PADDLE_API_URL="https://sandbox-api.paddle.com"  # Sandbox
# PADDLE_API_URL="https://api.paddle.com"        # Production

# Paddle API Key (from Paddle Dashboard → Developer Tools → Authentication)
PADDLE_API_KEY="your_paddle_api_key_here"

# Environment: sandbox or production
PADDLE_ENV="sandbox"  # Use "production" for live

# Webhook Secret (from Paddle Dashboard → Developer Tools → Notifications)
PADDLE_WEBHOOK_SECRET="your_webhook_secret_here"

# ============================================
# CHECKOUT REDIRECT URLs
# ============================================

# Frontend URL (base URL of your app)
FRONTEND_URL="https://yourapp.com"

# Success page (where user lands after successful payment)
PADDLE_CHECKOUT_SUCCESS_PATH="/checkout/success"

# Cancel page (where user lands if they cancel)
PADDLE_CHECKOUT_CANCEL_PATH="/checkout/cancel"
```

### Complete .env Example

```bash
# Server
NODE_ENV=production
PORT=5050

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/lurnix_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Frontend
FRONTEND_URL="https://yourapp.com"
ALLOWED_ORIGINS="https://yourapp.com,https://www.yourapp.com"

# Paddle (REQUIRED for subscriptions)
PADDLE_API_URL="https://sandbox-api.paddle.com"
PADDLE_API_KEY="pdl_sk_sandbox_abc123..."
PADDLE_ENV="sandbox"
PADDLE_WEBHOOK_SECRET="pdl_ntfset_abc123..."
PADDLE_CHECKOUT_SUCCESS_PATH="/checkout/success"
PADDLE_CHECKOUT_CANCEL_PATH="/checkout/cancel"

# Email (for notifications)
EMAIL_ENABLED=true
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
EMAIL_FROM_ADDRESS=noreply@yourapp.com
```

---

## 🎯 Paddle Dashboard Setup

### 1. Create Paddle Account
- Go to https://paddle.com
- Sign up for Sandbox account (free for testing)
- Verify email and complete onboarding

### 2. Get API Key
1. Navigate to: **Developer Tools → Authentication**
2. Click **"Create API Key"**
3. Name it: "Lurnix Backend API"
4. Copy the key → Set as `PADDLE_API_KEY`

### 3. Create Products & Prices

#### Create Product (One-time setup)
1. Go to **Catalog → Products**
2. Click **"Create Product"**
3. Name: "Lurnix Master Plan"
4. Type: **Subscription**
5. Save

#### Create Prices (For each billing cycle)
1. Click on the product
2. Click **"Add Price"**
3. Configure:
   - **Name**: "Master Monthly"
   - **Billing Cycle**: Monthly
   - **Amount**: $50.00
   - **Currency**: USD
4. Copy the **Price ID** (e.g., `pri_01k5rwjf...`)
5. Update in `/prisma/seeds/subscriptionSeed.ts`:
   ```typescript
   paddlePriceId: 'pri_01k5rwjf...'  // ← Your actual Paddle Price ID
   ```
6. Repeat for 6-month ($249) and 12-month ($499) prices

### 4. Configure Webhooks
1. Navigate to: **Developer Tools → Notifications**
2. Click **"Create Notification Destination"**
3. Configure:
   - **URL**: `https://yourapi.com/api/webhooks/paddle`
   - **Description**: "Lurnix Backend Webhooks"
   - **Events to subscribe**:
     - ✅ `subscription.activated`
     - ✅ `subscription.updated`
     - ✅ `subscription.canceled`
     - ✅ `transaction.completed`
4. Copy the **Webhook Secret** → Set as `PADDLE_WEBHOOK_SECRET`
5. Click **"Save"**

### 5. Test Webhook (Important!)
1. In Paddle Dashboard, go to your webhook destination
2. Click **"Send Test Event"**
3. Select `subscription.activated`
4. Check your backend logs to confirm receipt

---

## 🧪 Testing the Flow

### 1. Use Paddle Test Cards

Paddle provides test cards for sandbox:

```
✅ Successful Payment:
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits

❌ Declined Payment:
Card: 4000 0000 0000 0002
```

### 2. Test Subscription Creation

```bash
# 1. Create subscription
curl -X POST https://yourapi.com/api/subscriptions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "plan-uuid-from-database"
  }'

# Response includes checkout URL:
{
  "success": true,
  "checkout": {
    "url": "https://checkout.paddle.com/...",
    "id": "chk_01h..."
  }
}

# 2. Visit checkout URL in browser
# 3. Complete payment with test card
# 4. Check webhook logs
# 5. Verify subscription is active:

curl -X GET https://yourapi.com/api/subscriptions/current \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Monitor Webhooks

Add logging to see webhook events:

```typescript
// In paddleWebhookService.ts
console.log('Received Paddle webhook:', payload.event_type);
```

---

## 🔍 Troubleshooting

### Issue: "Paddle API key is not configured"
**Solution**: Set `PADDLE_API_KEY` in `.env`

### Issue: Webhook not received
**Solutions**:
1. Ensure webhook URL is publicly accessible (use ngrok for local testing)
2. Check webhook signature matches `PADDLE_WEBHOOK_SECRET`
3. Verify events are subscribed in Paddle Dashboard
4. Check Paddle Dashboard → Developer Tools → Event Logs

### Issue: Subscription stays "pending"
**Solutions**:
1. Check if webhook was received (check logs)
2. Verify `paddleCheckoutId` matches in database
3. Manually trigger webhook from Paddle Dashboard

### Issue: Price mismatch
**Solutions**:
1. Update Paddle Price IDs in `subscriptionSeed.ts`
2. Re-run: `npm run db:seed`
3. Verify prices in Paddle Dashboard match seed file

---

## 🚀 Going to Production

### Checklist:

- [ ] Switch to production Paddle account
- [ ] Update `PADDLE_ENV="production"`
- [ ] Update `PADDLE_API_URL="https://api.paddle.com"`
- [ ] Get production API key
- [ ] Create production products & prices
- [ ] Update price IDs in seed file
- [ ] Configure production webhook URL (must be HTTPS)
- [ ] Test with real payment method
- [ ] Set up Paddle payout account
- [ ] Configure tax settings in Paddle
- [ ] Review Paddle's compliance requirements

---

## �� Key Database Tables

### UserSubscription
```sql
status: 'pending' | 'active' | 'paused' | 'cancelled' | 'expired'
paddleSubscriptionId: 'sub_01h...'  -- From Paddle webhook
paddleCheckoutId: 'chk_01h...'      -- From checkout creation
currentPeriodStart: timestamp
currentPeriodEnd: timestamp
```

### BillingInvoice
Created automatically when `transaction.completed` webhook received.

---

## 🔗 Useful Links

- **Paddle API Docs**: https://developer.paddle.com/api-reference
- **Paddle Sandbox**: https://sandbox-vendors.paddle.com
- **Webhook Events**: https://developer.paddle.com/webhooks/overview
- **Test Cards**: https://developer.paddle.com/concepts/payment-methods/credit-debit-card

---

## 💡 Pro Tips

1. **Always test in sandbox first** - Paddle sandbox is free and safe
2. **Use ngrok for local webhook testing**: `ngrok http 5050`
3. **Log all webhook events** - Helps debug subscription issues
4. **Set up email notifications** - Alert users when subscription activates
5. **Handle failed payments** - Paddle sends `subscription.past_due` webhook
6. **Implement grace periods** - Don't immediately revoke access on payment failure
