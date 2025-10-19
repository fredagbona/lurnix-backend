// Feature Services - Re-exports from new domain structure
// This file maintains backward compatibility during migration
export { featureRequestService, FeatureRequestRateLimitError } from '../../domains/features/services/featureRequestService';
export { 
  type FeatureCardDto,
  type FeatureDetailDto,
  type FeatureCategoryDto
} from '../../domains/features/services/featureRequestService';
export { featureGateService } from '../../domains/features/services/featureGateService';
