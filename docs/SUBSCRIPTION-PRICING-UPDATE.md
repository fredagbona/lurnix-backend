# Subscription Pricing Update - October 3, 2025

## Changes Applied

### Master Plan Pricing Changes

**Previous Pricing:**
- Monthly: $100/month
- 6 Months: $90/month ($540 total, 10% discount)
- 12 Months: $80/month ($960 total, 20% discount)

**New Pricing:**
- Monthly: **$50/month** (50% reduction)
- 6 Months: **$41.50/month** ($249 total, 17% discount)
- 12 Months: **$41.58/month** ($499 total, 17% discount)

### Feature Changes

#### Builder Plan
**Removed:**
- ❌ AI Mentor (guidance + examples + feedback)

**Updated Description:**
- From: "Complete learning toolkit with AI mentor"
- To: "Complete learning toolkit"

**Current Features:**
- Multiple roadmaps (7/14/30 day options)
- Unlimited resource access
- Progress tracking (streaks, checkpoints, deliverables)
- All Free plan features

#### Master Plan
**Removed:**
- ❌ AI Mentor (guidance + examples + feedback)
- ❌ Networking opportunities & connections (when available)

**Updated:**
- ✏️ Changed "Weekly 1:1 coaching sessions" → "Bi-Weekly 1:1 coaching sessions (25-30 min)"
- ✏️ Updated coaching sessions limit: 4 per month → 2 per month

**Current Features:**
- Bi-Weekly 1:1 coaching sessions (25-30 min)
- Personalized human feedback (code, projects, pitch)
- Career guidance (LinkedIn/GitHub profile, project storytelling)
- Priority support (faster response times)
- All Builder plan features

## Database Status

✅ **Seeding Completed Successfully**
- 7 subscription plan tiers updated in database
- Changes are now live

## Files Modified

1. `/prisma/seeds/subscriptionSeed.ts` - Updated plan definitions
   - Master plan pricing adjusted
   - Builder plan features updated
   - Master plan features and limits updated

## Next Steps

### Required Actions:
1. **Update Paddle Dashboard** - Ensure Paddle price IDs match the new amounts:
   - `price_master_monthly` → $50
   - `price_master_6m` → $249
   - `price_master_12m` → $499

2. **Update Frontend** - Sync pricing display on website/app

3. **Communication** - Notify existing Master plan subscribers about:
   - Reduced pricing (if applicable)
   - Feature changes (bi-weekly vs weekly sessions)

### Optional Actions:
- Review and update marketing materials
- Update FAQ/documentation
- Consider grandfather clause for existing subscribers

## Impact Analysis

### Positive:
- More competitive Master plan pricing (50% reduction)
- Clearer value proposition without AI Mentor confusion
- Bi-weekly sessions may improve coaching quality/preparation

### Considerations:
- Existing Master subscribers on old pricing
- Revenue impact from price reduction
- Coaching capacity with bi-weekly model
