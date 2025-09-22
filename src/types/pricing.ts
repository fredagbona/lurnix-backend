import {
  PlanType as PrismaPlanType,
  BillingCycle as PrismaBillingCycle,
  UserSubscriptionStatus as PrismaUserSubscriptionStatus,
  CouponDiscountType as PrismaCouponDiscountType,
  CouponAppliesTo as PrismaCouponAppliesTo,
  InvoiceStatus as PrismaInvoiceStatus,
} from '@prisma/client';

export type PlanType = PrismaPlanType;
export const PlanType = PrismaPlanType;

export type BillingCycle = PrismaBillingCycle;
export const BillingCycle = PrismaBillingCycle;

export type UserSubscriptionStatus = PrismaUserSubscriptionStatus;
export const UserSubscriptionStatus = PrismaUserSubscriptionStatus;

export type CouponDiscountType = PrismaCouponDiscountType;
export const CouponDiscountType = PrismaCouponDiscountType;

export type CouponAppliesTo = PrismaCouponAppliesTo;
export const CouponAppliesTo = PrismaCouponAppliesTo;

export type InvoiceStatus = PrismaInvoiceStatus;
export const InvoiceStatus = PrismaInvoiceStatus;

export const PLAN_TYPE_VALUES = Object.values(PrismaPlanType);
export const BILLING_CYCLE_VALUES = Object.values(PrismaBillingCycle);
export const USER_SUBSCRIPTION_STATUS_VALUES = Object.values(PrismaUserSubscriptionStatus);
export const COUPON_DISCOUNT_TYPE_VALUES = Object.values(PrismaCouponDiscountType);
export const COUPON_APPLIES_TO_VALUES = Object.values(PrismaCouponAppliesTo);
export const INVOICE_STATUS_VALUES = Object.values(PrismaInvoiceStatus);
