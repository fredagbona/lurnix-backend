// Billing Services - Re-exports from new domain structure
// This file maintains backward compatibility during migration
export { subscriptionService } from '../../domains/billing/services/subscriptionService';
export { planService } from '../../domains/billing/services/planService';
export { planLimitationService, type PlanLimitsSummary } from '../../domains/billing/services/planLimitationService';
export { couponService } from '../../domains/billing/services/couponService';
export { paddleService } from '../../domains/billing/services/paddleService';
export { paddleWebhookService } from '../../domains/billing/services/paddleWebhookService';
