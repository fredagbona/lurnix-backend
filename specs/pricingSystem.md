# Lurnix Pricing System - Backend Implementation Specification

## Overview
This document outlines the complete pricing system implementation for Lurnix, including subscription plans, commitment discounts, coupon system, and billing logic.

## 1. Subscription Plans Structure

### Plan Tiers
```typescript
enum PlanType {
  FREE = 'free',
  BUILDER = 'builder', 
  MASTER = 'master'
}

enum BillingCycle {
  MONTHLY = 'monthly',
  SIX_MONTHS = '6_months',
  YEARLY = '12_months'
}
```

### Plan Definitions
```json
{
  "free": {
    "name": "Free",
    "description": "Forever free plan to get started",
    "price": 0,
    "billing_cycle": "monthly",
    "features": [
      "Profile test → 7-day roadmap",
      "Limited access to resources", 
      "Basic Discord community access",
      "Checkpoints & streaks tracking"
    ],
    "limits": {
      "roadmaps": 1,
      "ai_interactions_per_month": 50,
      "resource_access": "limited"
    }
  },
  "builder": {
    "name": "Builder", 
    "description": "Complete learning toolkit with AI mentor",
    "pricing_tiers": {
      "monthly": {
        "price": 20.00,
        "billing_amount": 20.00,
        "commitment_months": 1
      },
      "6_months": {
        "price": 18.00,
        "billing_amount": 108.00,
        "commitment_months": 6,
        "discount_percentage": 10
      },
      "12_months": {
        "price": 16.00,
        "billing_amount": 192.00, 
        "commitment_months": 12,
        "discount_percentage": 20
      }
    },
    "features": [
      "Multiple roadmaps (7/14/30 day options)",
      "Unlimited resource access",
      "AI Mentor (guidance + examples + feedback)",
      "Progress tracking (streaks, checkpoints, deliverables)", 
      "All Free plan features"
    ],
    "limits": {
      "roadmaps": "unlimited",
      "ai_interactions_per_month": "unlimited",
      "resource_access": "unlimited"
    }
  },
  "master": {
    "name": "Master",
    "description": "Premium coaching with human mentorship",
    "pricing_tiers": {
      "monthly": {
        "price": 100.00,
        "billing_amount": 100.00,
        "commitment_months": 1
      },
      "6_months": {
        "price": 90.00,
        "billing_amount": 540.00,
        "commitment_months": 6,
        "discount_percentage": 10
      },
      "12_months": {
        "price": 80.00,
        "billing_amount": 960.00,
        "commitment_months": 12,
        "discount_percentage": 20
      }
    },
    "features": [
      "Weekly 1:1 coaching sessions (25-30 min)",
      "Personalized human feedback (code, projects, pitch)",
      "Career guidance (LinkedIn/GitHub profile, project storytelling)",
      "Networking opportunities & connections (when available)",
      "Priority support (faster response times)",
      "All Builder plan features"
    ],
    "limits": {
      "coaching_sessions_per_month": 4,
      "priority_support": true
    }
  }
}
```

## 2. Database Schema

### Core Tables

#### `subscription_plans`
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type VARCHAR(50) NOT NULL, -- 'free', 'builder', 'master'
  billing_cycle VARCHAR(20) NOT NULL, -- 'monthly', '6_months', '12_months'
  price_per_period DECIMAL(10,2) NOT NULL,
  billing_amount DECIMAL(10,2) NOT NULL, -- Total amount charged
  commitment_months INTEGER NOT NULL DEFAULT 1,
  discount_percentage INTEGER DEFAULT 0,
  features JSONB NOT NULL,
  limits JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `user_subscriptions`
```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'paused'
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  commitment_end_date TIMESTAMP, -- NULL for monthly, set for 6/12 month commitments
  auto_renewal BOOLEAN DEFAULT true,
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  cancelled_at TIMESTAMP
);
```

#### `coupons`
```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount'
  discount_value DECIMAL(10,2) NOT NULL,
  applies_to VARCHAR(20) DEFAULT 'all', -- 'all', 'plan_type', 'specific_plan'
  applies_to_value VARCHAR(50), -- plan type or specific plan ID
  max_redemptions INTEGER, -- NULL for unlimited
  current_redemptions INTEGER DEFAULT 0,
  valid_from TIMESTAMP NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `coupon_redemptions`
```sql
CREATE TABLE coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id),
  user_id UUID NOT NULL REFERENCES users(id),
  subscription_id UUID REFERENCES user_subscriptions(id),
  discount_amount DECIMAL(10,2) NOT NULL,
  redeemed_at TIMESTAMP DEFAULT NOW()
);
```

#### `billing_invoices`
```sql
CREATE TABLE billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
  stripe_invoice_id VARCHAR(255),
  coupon_id UUID REFERENCES coupons(id),
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,
  due_date TIMESTAMP NOT NULL,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 3. Business Logic Requirements

### Subscription Management Service

#### Core Functions
```typescript
interface SubscriptionService {
  // Plan management
  getAvailablePlans(): Promise<SubscriptionPlan[]>
  getPlanDetails(planType: PlanType, billingCycle: BillingCycle): Promise<SubscriptionPlan>
  
  // Subscription lifecycle  
  createSubscription(userId: string, planId: string, couponCode?: string): Promise<UserSubscription>
  upgradeSubscription(subscriptionId: string, newPlanId: string): Promise<UserSubscription>
  downgradeSubscription(subscriptionId: string, newPlanId: string): Promise<UserSubscription>
  cancelSubscription(subscriptionId: string, cancelImmediately?: boolean): Promise<UserSubscription>
  
  // Billing
  calculatePricing(planId: string, couponCode?: string): Promise<PricingCalculation>
  processPayment(subscriptionId: string): Promise<BillingResult>
  handleWebhook(stripeEvent: any): Promise<void>
}
```

### Coupon System

#### Coupon Types
```typescript
interface CouponRule {
  // Discount types
  percentage_off: number // 0-100
  fixed_amount_off: number // Dollar amount
  
  // Application rules
  applies_to: 'all' | 'plan_type' | 'specific_plan'
  minimum_commitment?: 'none' | '6_months' | '12_months'
  first_time_users_only?: boolean
  
  // Usage limits
  max_redemptions?: number
  max_per_user?: number
  
  // Time constraints
  valid_from: Date
  valid_until?: Date
}
```

#### Coupon Validation Logic
```typescript
interface CouponValidation {
  validateCoupon(code: string, userId: string, planId: string): Promise<CouponValidationResult>
  applyCoupon(subscriptionId: string, couponCode: string): Promise<AppliedDiscount>
  removeCoupon(subscriptionId: string): Promise<void>
}

interface CouponValidationResult {
  valid: boolean
  error_message?: string
  discount_amount?: number
  final_price?: number
}
```

### Commitment Handling

#### Early Cancellation Logic
```typescript
interface CommitmentRules {
  // Users can cancel anytime but:
  // - Monthly: Cancel at end of current period
  // - 6/12 month: Offer to continue at monthly rate OR pay early termination fee
  
  calculateEarlyTerminationFee(subscriptionId: string): Promise<number>
  offerDowngradeOption(subscriptionId: string): Promise<DowngradeOption[]>
}
```

## 4. API Endpoints Specification

### Plan Endpoints
```
GET /api/plans
- Returns: Available subscription plans with pricing

GET /api/plans/:planType/pricing
- Params: planType (free|builder|master)
- Query: billing_cycle (monthly|6_months|12_months)  
- Returns: Detailed pricing for specific plan

POST /api/pricing/calculate
- Body: { plan_id, coupon_code?, billing_cycle }
- Returns: Calculated pricing with discounts
```

### Subscription Endpoints
```
POST /api/subscriptions
- Body: { plan_id, billing_cycle, coupon_code?, payment_method_id }
- Returns: Created subscription with payment status

GET /api/subscriptions/current
- Headers: Authorization
- Returns: Current user's subscription details

PUT /api/subscriptions/:id/upgrade
- Body: { new_plan_id, billing_cycle }
- Returns: Updated subscription

PUT /api/subscriptions/:id/cancel
- Body: { cancel_immediately?: boolean, reason?: string }
- Returns: Cancellation confirmation

POST /api/subscriptions/:id/reactivate
- Returns: Reactivated subscription
```

### Coupon Endpoints
```
POST /api/coupons/validate
- Body: { code, plan_id, user_id }
- Returns: Coupon validation result

POST /api/coupons/apply
- Body: { subscription_id, coupon_code }
- Returns: Applied discount details

DELETE /api/coupons/remove/:subscription_id
- Returns: Confirmation of coupon removal
```

### Billing Endpoints
```
GET /api/billing/invoices
- Headers: Authorization
- Query: page, limit, status
- Returns: User's billing history

GET /api/billing/upcoming
- Headers: Authorization  
- Returns: Next billing date and amount

POST /api/billing/payment-method
- Body: { stripe_payment_method_id }
- Returns: Updated payment method

POST /api/webhooks/stripe
- Body: Stripe webhook payload
- Returns: Webhook processing confirmation
```

## 5. Feature Access Control

### Permission System
```typescript
interface FeatureGate {
  canAccessFeature(userId: string, feature: string): Promise<boolean>
  getRemainingUsage(userId: string, feature: string): Promise<number>
  consumeUsage(userId: string, feature: string, amount?: number): Promise<void>
}

// Feature definitions
enum Features {
  AI_MENTOR_CHAT = 'ai_mentor_chat',
  ROADMAP_CREATION = 'roadmap_creation', 
  UNLIMITED_RESOURCES = 'unlimited_resources',
  COACHING_SESSIONS = 'coaching_sessions',
  PRIORITY_SUPPORT = 'priority_support',
  CAREER_GUIDANCE = 'career_guidance'
}
```

## 6. Integration Requirements

### Stripe Integration
```typescript
interface StripeService {
  createCustomer(userId: string, email: string): Promise<string>
  createSubscription(customerId: string, priceId: string, couponId?: string): Promise<Stripe.Subscription>
  updateSubscription(subscriptionId: string, newPriceId: string): Promise<Stripe.Subscription>
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean): Promise<Stripe.Subscription>
  handleWebhook(event: Stripe.Event): Promise<void>
}
```

### Webhook Event Handlers
- `customer.subscription.created`
- `customer.subscription.updated` 
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## 7. Business Rules Implementation

### Plan Transitions
- **Free → Builder/Master**: Immediate upgrade, prorated billing
- **Builder → Master**: Immediate upgrade, prorated billing  
- **Master → Builder**: Downgrade at next billing cycle
- **Any → Free**: Cancel at end of current period

### Commitment Rules  
- Monthly subscriptions: No commitment, cancel anytime
- 6-month commitments: 10% discount, early termination available
- 12-month commitments: 20% discount, early termination available

### Coupon Stacking
- Only one coupon per subscription
- Coupons cannot be combined
- Plan commitment discounts stack with coupon discounts

## 8. Testing Requirements

### Unit Tests
- Pricing calculation with various coupon combinations
- Plan upgrade/downgrade logic
- Commitment period calculations
- Feature access control

### Integration Tests  
- Stripe webhook processing
- End-to-end subscription flows
- Coupon redemption workflows
- Billing cycle transitions

## 9. Monitoring & Analytics

### Key Metrics to Track
- Monthly Recurring Revenue (MRR)
- Customer Lifetime Value (CLV) 
- Churn rate by plan type
- Coupon redemption rates
- Plan upgrade/downgrade patterns
- Payment failure rates

### Required Logging
- All subscription state changes
- Payment processing events
- Coupon usage and validation
- Feature usage by plan type
- Failed payment attempts

This specification provides the complete foundation for implementing Lurnix's pricing system with commitment-based discounts and a flexible coupon system.