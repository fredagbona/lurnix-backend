# Paddle Quick Reference Card

## 🚀 Quick Start (5 Minutes)

### 1. Get Paddle Credentials
```bash
1. Sign up at https://sandbox-vendors.paddle.com
2. Go to Developer Tools → Authentication → Create API Key
3. Go to Developer Tools → Notifications → Create Notification Destination
```

### 2. Set Environment Variables
```bash
PADDLE_API_URL="https://sandbox-api.paddle.com"
PADDLE_API_KEY="pdl_sk_sandbox_..."
PADDLE_ENV="sandbox"
PADDLE_WEBHOOK_SECRET="pdl_ntfset_..."
PADDLE_CHECKOUT_SUCCESS_PATH="/checkout/success"
PADDLE_CHECKOUT_CANCEL_PATH="/checkout/cancel"
FRONTEND_URL="https://yourapp.com"
```

### 3. Create Products in Paddle Dashboard
```
Catalog → Products → Create Product
- Name: "Lurnix Master Plan"
- Type: Subscription
- Add Prices: $50/month, $249/6mo, $499/12mo
- Copy Price IDs
```

### 4. Update Seed File
```typescript
// prisma/seeds/subscriptionSeed.ts
paddlePriceId: 'pri_01k5rwjf...'  // Your actual Price ID from Paddle
```

### 5. Seed Database
```bash
npm run db:seed
```

---

## 📋 Essential Endpoints

### Create Subscription
```bash
POST /api/subscriptions
Headers: { Authorization: "Bearer <token>" }
Body: { "planId": "uuid", "couponCode": "OPTIONAL" }
```

### Get Current Subscription
```bash
GET /api/subscriptions/current
Headers: { Authorization: "Bearer <token>" }
```

### Cancel Subscription
```bash
PUT /api/subscriptions/:id/cancel
Body: { "cancelImmediately": false, "reason": "optional" }
```

---

## 🔄 Payment Flow (Simple Version)

```
1. User clicks "Subscribe" → POST /api/subscriptions
2. Backend creates Paddle checkout → Returns checkout URL
3. Frontend redirects to Paddle checkout page
4. User pays on Paddle
5. Paddle sends webhook → Backend activates subscription
6. User gets access to premium features
```

---

## 🧪 Test Cards

```
✅ Success: 4242 4242 4242 4242
❌ Decline: 4000 0000 0000 0002
Expiry: Any future date
CVC: Any 3 digits
```

---

## 🔍 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Paddle API key is not configured" | Set `PADDLE_API_KEY` in `.env` |
| Webhook not received | Use ngrok for local testing: `ngrok http 5050` |
| Subscription stays "pending" | Check webhook logs, verify `paddleCheckoutId` |
| Price mismatch | Update Price IDs in seed file, re-run `npm run db:seed` |

---

## 📊 Subscription Statuses

- **pending** - Checkout created, awaiting payment
- **active** - Paid and active
- **paused** - Temporarily paused
- **cancelled** - Cancelled by user
- **expired** - Subscription expired

---

## 🔗 Quick Links

- **Paddle Sandbox**: https://sandbox-vendors.paddle.com
- **API Docs**: https://developer.paddle.com/api-reference
- **Test Cards**: https://developer.paddle.com/concepts/payment-methods/credit-debit-card
- **Full Guide**: See `docs/PADDLE-INTEGRATION-GUIDE.md`

---

## 💡 Pro Tips

1. Always test in **sandbox** first
2. Use **ngrok** for local webhook testing
3. Log all webhook events for debugging
4. Keep Paddle Price IDs in sync with seed file
5. Test the complete flow end-to-end before production

---

## 🚨 Before Production

- [ ] Switch to production Paddle account
- [ ] Update `PADDLE_ENV="production"`
- [ ] Update `PADDLE_API_URL="https://api.paddle.com"`
- [ ] Get production API key & webhook secret
- [ ] Create production products & prices
- [ ] Update price IDs in seed file
- [ ] Configure HTTPS webhook URL
- [ ] Test with real payment
- [ ] Set up Paddle payout account
