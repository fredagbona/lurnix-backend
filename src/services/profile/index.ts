// Profile Services - Re-exports from new domain structure
// This file maintains backward compatibility during migration
export { learnerProfileService, type RecordLearnerProfileInput } from '../../domains/profile/services/learnerProfileService';
export * from '../../domains/profile/services/brainAdaptiveIntegration';
