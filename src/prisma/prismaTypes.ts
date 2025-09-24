import type {
  BillingCycle as PrismaBillingCycle,
  CouponAppliesTo as PrismaCouponAppliesTo,
  CouponDiscountType as PrismaCouponDiscountType,
  InvoiceStatus as PrismaInvoiceStatus,
  PlanType as PrismaPlanType,
  FeatureStatus as PrismaFeatureStatus,
  FeatureCategory as PrismaFeatureCategory,
  UserSubscriptionStatus as PrismaUserSubscriptionStatus,
} from '@prisma/client';
import { PrismaClient as GeneratedPrismaClient } from '@prisma/client';

// Define Language type based on our Prisma schema
export type Language = 'en' | 'fr';

// This type represents the actual User model language field type from Prisma
export type PrismaLanguage = Language;

export type PlanType = PrismaPlanType;
export type BillingCycle = PrismaBillingCycle;
export type UserSubscriptionStatus = PrismaUserSubscriptionStatus;
export type CouponDiscountType = PrismaCouponDiscountType;
export type CouponAppliesTo = PrismaCouponAppliesTo;
export type InvoiceStatus = PrismaInvoiceStatus;
export type FeatureStatus = PrismaFeatureStatus;
export type FeatureCategory = PrismaFeatureCategory;

// Define a type that includes all model delegates
type PrismaModels = {
  roadmap: GeneratedPrismaClient['roadmap'];
  progress: GeneratedPrismaClient['progress'];
  objective: GeneratedPrismaClient['objective'];
  quizResult: GeneratedPrismaClient['quizResult'];
  quizQuestion: GeneratedPrismaClient['quizQuestion'];
  quizOption: GeneratedPrismaClient['quizOption'];
  user: GeneratedPrismaClient['user'];
  admin: GeneratedPrismaClient['admin'];
  subscriptionPlan: GeneratedPrismaClient['subscriptionPlan'];
  userSubscription: GeneratedPrismaClient['userSubscription'];
  coupon: GeneratedPrismaClient['coupon'];
  couponRedemption: GeneratedPrismaClient['couponRedemption'];
  billingInvoice: GeneratedPrismaClient['billingInvoice'];
  featureUsage: GeneratedPrismaClient['featureUsage'];
  featureRequest: GeneratedPrismaClient['featureRequest'];
  featureVote: GeneratedPrismaClient['featureVote'];
  featureStatusChange: GeneratedPrismaClient['featureStatusChange'];
  featureModNote: GeneratedPrismaClient['featureModNote'];
};

// Extended PrismaClient type with model delegates
export type ExtendedPrismaClient = GeneratedPrismaClient & PrismaModels;
