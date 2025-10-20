// Analytics Services - Re-exports from new domain structure
// This file maintains backward compatibility during migration
export { learningAnalyticsService } from '../../domains/analytics/services/learningAnalyticsService';
export { default as skillExtractionService } from '../../domains/analytics/services/skillExtractionService';
export { default as skillTrackingService } from '../../domains/analytics/services/skillTrackingService';
export { default as spacedRepetitionService } from '../../domains/analytics/services/spacedRepetitionService';
