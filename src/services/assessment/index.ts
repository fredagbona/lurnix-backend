// Assessment Services - Re-exports from new domain structure
// This file maintains backward compatibility during migration
export { quizService, type QuizSubmission } from '../../domains/assessment/services/quizService';
export { default as quizGenerationService } from '../../domains/assessment/services/quizGenerationService';
export { quizAdminService } from '../../domains/assessment/services/quizAdminService';
export { default as adaptiveLearningService } from '../../domains/assessment/services/adaptiveLearningService';
export { default as technicalAssessmentService } from '../../domains/assessment/services/technicalAssessmentService';
export { default as knowledgeValidationService } from '../../domains/assessment/services/knowledgeValidationService';
