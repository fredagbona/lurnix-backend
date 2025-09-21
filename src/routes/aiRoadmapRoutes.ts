import express from 'express';
import { aiRoadmapController } from '../controllers/aiRoadmapController.js';
import { authenticate as authMiddleware } from '../middlewares/authMiddleware.js';
import { roadmapService } from '../services/roadmapService.js';
import { quizService } from '../services/quizService.js';

const router = express.Router();

/**
 * @swagger
 * /api/ai/roadmap/seven-day:
 *   post:
 *     summary: Generate a 7-day roadmap for learning basics
 *     description: Generates a personalized 7-day roadmap based on user profile and preferences
 *     tags: [AI, Roadmap]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - learningStyle
 *               - objectives
 *               - passions
 *               - problemSolving
 *             properties:
 *               learningStyle:
 *                 type: object
 *                 properties:
 *                   primary:
 *                     type: string
 *                   secondary:
 *                     type: string
 *               objectives:
 *                 type: object
 *                 properties:
 *                   topGoal:
 *                     type: string
 *                   priorityRank:
 *                     type: array
 *                     items:
 *                       type: string
 *               passions:
 *                 type: object
 *                 properties:
 *                   ranked:
 *                     type: array
 *                     items:
 *                       type: string
 *               problemSolving:
 *                 type: object
 *                 properties:
 *                   debugStyle:
 *                     type: string
 *                   collaboration:
 *                     type: string
 *               timeCommitmentMinsPerDay:
 *                 type: number
 *               priorExperience:
 *                 type: string
 *     responses:
 *       200:
 *         description: Roadmap generated successfully
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized - User not authenticated
 *       500:
 *         description: Server error
 */
router.post('/seven-day', authMiddleware, aiRoadmapController.generateSevenDayRoadmap.bind(aiRoadmapController));

/**
 * @swagger
 * /api/ai/roadmap/thirty-day:
 *   post:
 *     summary: Generate a 30-day roadmap for specific projects
 *     description: Generates a personalized 30-day roadmap with projects based on user profile and preferences
 *     tags: [AI, Roadmap]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - learningStyle
 *               - objectives
 *               - passions
 *               - problemSolving
 *             properties:
 *               learningStyle:
 *                 type: object
 *                 properties:
 *                   primary:
 *                     type: string
 *                   secondary:
 *                     type: string
 *               objectives:
 *                 type: object
 *                 properties:
 *                   topGoal:
 *                     type: string
 *                   priorityRank:
 *                     type: array
 *                     items:
 *                       type: string
 *               passions:
 *                 type: object
 *                 properties:
 *                   ranked:
 *                     type: array
 *                     items:
 *                       type: string
 *               problemSolving:
 *                 type: object
 *                 properties:
 *                   debugStyle:
 *                     type: string
 *                   collaboration:
 *                     type: string
 *               timeCommitmentMinsPerDay:
 *                 type: number
 *               priorExperience:
 *                 type: string
 *               projectThemes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Roadmap generated successfully
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized - User not authenticated
 *       500:
 *         description: Server error
 */
router.post('/thirty-day', authMiddleware, aiRoadmapController.generateThirtyDayRoadmap.bind(aiRoadmapController));

/**
 * @swagger
 * /api/ai/roadmap/progress:
 *   put:
 *     summary: Update progress for a roadmap
 *     description: Mark tasks as completed and update roadmap progress
 *     tags: [AI, Roadmap]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roadmapId
 *               - completedTaskIds
 *             properties:
 *               roadmapId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the roadmap to update progress for
 *               completedTaskIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of task IDs that have been completed (e.g., ["d1-t1", "d1-t2", "d2-t1"])
 *     responses:
 *       200:
 *         description: Progress updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     roadmapId:
 *                       type: string
 *                     completedTasks:
 *                       type: array
 *                       items:
 *                         type: string
 *                     completedObjectives:
 *                       type: number
 *                     streak:
 *                       type: number
 *                     lastActivityAt:
 *                       type: string
 *                       format: date-time
 *                     roadmap:
 *                       type: object
 *                       properties:
 *                         objectives:
 *                           type: array
 *                           items:
 *                             type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized - User not authenticated
 *       403:
 *         description: Forbidden - User does not have access to this roadmap
 *       404:
 *         description: Roadmap not found
 *       500:
 *         description: Server error
 */
router.put('/progress', authMiddleware, async (req: any, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User authentication required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const { roadmapId, completedTaskIds } = req.body;
    
    if (!roadmapId || !completedTaskIds || !Array.isArray(completedTaskIds)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid request: roadmapId and completedTaskIds array are required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = await roadmapService.updateProgress({
      userId,
      roadmapId,
      completedTaskIds
    });

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ai/roadmap/profile:
 *   get:
 *     summary: Get user's learner profile
 *     description: Retrieves the user's learner profile if it has already been generated through quiz completion
 *     tags: [AI, Roadmap]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Learner profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     version:
 *                       type: number
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     computedProfile:
 *                       type: object
 *                       properties:
 *                         style:
 *                           type: string
 *                         visual:
 *                           type: number
 *                         reading:
 *                           type: number
 *                         handsOn:
 *                           type: number
 *                         level:
 *                           type: string
 *                         timePerDay:
 *                           type: number
 *                         goal:
 *                           type: string
 *                         preferredStack:
 *                           type: array
 *                           items:
 *                             type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: No learner profile found for this user
 *       401:
 *         description: Unauthorized - User not authenticated
 *       500:
 *         description: Server error
 */
router.get('/profile', authMiddleware, async (req: any, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User authentication required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get the most recent quiz result for this user
    const quizResults = await quizService.getUserQuizResults(userId);
    
    if (!quizResults || quizResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No learner profile found. Please complete the profile quiz first.'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Return the most recent quiz result (they're ordered by createdAt desc)
    const latestResult = quizResults[0];
    
    // Transform the quiz result into the format expected by roadmap generation
    const answers = latestResult.answers || {};
    const computedProfile = latestResult.computedProfile || {};
    
    // Map quiz answers to roadmap input format
    const learningStyleSecondary =
      answers.new_framework_scenario ||
      answers.learning_retention ||
      answers.learning_instinct ||
      'visual';

    const priorityRank = Array.isArray(answers.priorities)
      ? answers.priorities
      : (computedProfile.motivations?.map((item: any) => item.trait) || ['impact_driven', 'creatively_expressive']);

    const techRanked = computedProfile.techAffinity?.map((item: any) => item.trait) ||
      (Array.isArray(answers.tech_areas) ? answers.tech_areas : ['frontend']);

    const timeHorizon = answers.timeline || answers.time_availability || 'balanced_time';

    const debugStyle =
      answers.bug_hunting_preference ||
      answers.debugging_approach ||
      answers.stuck_reaction ||
      'experimental_debug';

    const collaborationStyle =
      answers.need_community ||
      answers.community_engagement ||
      answers.help_seeker ||
      'balanced';

    const roadmapProfile = {
      id: latestResult.id,
      userId: latestResult.userId,
      version: latestResult.version,
      createdAt: latestResult.createdAt,
      computedProfile: latestResult.computedProfile,
      // Format for roadmap generation
      roadmapInput: {
        learningStyle: {
          primary: computedProfile.style || 'balanced',
          secondary: learningStyleSecondary
        },
        objectives: {
          topGoal: computedProfile.goal || 'general',
          priorityRank,
          timeHorizon
        },
        passions: {
          ranked: techRanked,
          notes: answers.coding_dream || answers.learning_goal || ''
        },
        problemSolving: {
          debugStyle,
          collaboration: collaborationStyle
        },
        timeCommitmentMinsPerDay: computedProfile.timePerDay || 60,
        priorExperience: answers.specific_stack ? `Experience with ${answers.specific_stack}` : 'Beginner'
      }
    };
    
    res.status(200).json({
      success: true,
      data: roadmapProfile,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ai/roadmap/seven-day/auto:
 *   post:
 *     summary: Generate a 7-day roadmap using the user's existing profile
 *     description: Automatically fetches the user's profile and generates a personalized 7-day roadmap
 *     tags: [AI, Roadmap]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roadmap generated successfully
 *       404:
 *         description: No profile found for this user
 *       401:
 *         description: Unauthorized - User not authenticated
 *       500:
 *         description: Server error
 */
router.post('/seven-day/auto', authMiddleware, async (req: any, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User authentication required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get the most recent quiz result for this user
    const quizResults = await quizService.getUserQuizResults(userId);
    
    if (!quizResults || quizResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No learner profile found. Please complete the profile quiz first.'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get the latest result and transform it
    const latestResult = quizResults[0];
    const answers = latestResult.answers || {};
    const computedProfile = latestResult.computedProfile || {};
    
    // Create roadmap input from profile
    const roadmapInput = {
      userId,
      learningStyle: {
        primary: computedProfile.style || 'balanced',
        secondary: answers.learning_instinct || answers.remember_concepts || 'visual'
      },
      objectives: {
        topGoal: computedProfile.goal || 'general',
        priorityRank: Array.isArray(answers.priorities) ? answers.priorities : ['job_readiness', 'projects', 'enjoyment', 'certifications'],
        timeHorizon: answers.timeline || 'weeks'
      },
      passions: {
        ranked: Array.isArray(answers.tech_areas) ? answers.tech_areas : ['web'],
        notes: answers.learning_goal || ''
      },
      problemSolving: {
        debugStyle: answers.debugging_approach || answers.bug_first_action || 'experiment',
        collaboration: answers.community_engagement || 'sometimes'
      },
      timeCommitmentMinsPerDay: computedProfile.timePerDay || 60,
      priorExperience: answers.specific_stack ? `Experience with ${answers.specific_stack}` : 'Beginner'
    };

    // Generate the roadmap
    const result = await aiRoadmapController.generateSevenDayRoadmap.call(
      aiRoadmapController, 
      { ...req, body: roadmapInput }, 
      res, 
      next
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ai/roadmap/thirty-day/auto:
 *   post:
 *     summary: Generate a 30-day roadmap using the user's existing profile
 *     description: Automatically fetches the user's profile and generates a personalized 30-day roadmap
 *     tags: [AI, Roadmap]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roadmap generated successfully
 *       404:
 *         description: No profile found for this user
 *       401:
 *         description: Unauthorized - User not authenticated
 *       500:
 *         description: Server error
 */
router.post('/thirty-day/auto', authMiddleware, async (req: any, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User authentication required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get the most recent quiz result for this user
    const quizResults = await quizService.getUserQuizResults(userId);
    
    if (!quizResults || quizResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No learner profile found. Please complete the profile quiz first.'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get the latest result and transform it
    const latestResult = quizResults[0];
    const answers = latestResult.answers || {};
    const computedProfile = latestResult.computedProfile || {};
    
    // Create roadmap input from profile
    const roadmapInput = {
      userId,
      learningStyle: {
        primary: computedProfile.style || 'balanced',
        secondary: answers.learning_instinct || answers.remember_concepts || 'visual'
      },
      objectives: {
        topGoal: computedProfile.goal || 'general',
        priorityRank: Array.isArray(answers.priorities) ? answers.priorities : ['job_readiness', 'projects', 'enjoyment', 'certifications'],
        timeHorizon: answers.timeline || 'weeks'
      },
      passions: {
        ranked: Array.isArray(answers.tech_areas) ? answers.tech_areas : ['web'],
        notes: answers.learning_goal || ''
      },
      problemSolving: {
        debugStyle: answers.debugging_approach || answers.bug_first_action || 'experiment',
        collaboration: answers.community_engagement || 'sometimes'
      },
      timeCommitmentMinsPerDay: computedProfile.timePerDay || 60,
      priorExperience: answers.specific_stack ? `Experience with ${answers.specific_stack}` : 'Beginner',
      projectThemes: [
        answers.learning_goal ? `Project related to ${answers.learning_goal}` : 'Web application',
        computedProfile.preferredStack && computedProfile.preferredStack.length > 0 ? 
          `Project using ${computedProfile.preferredStack.join(', ')}` : 'JavaScript project'
      ]
    };

    // Generate the roadmap
    const result = await aiRoadmapController.generateThirtyDayRoadmap.call(
      aiRoadmapController, 
      { ...req, body: roadmapInput }, 
      res, 
      next
    );
  } catch (error) {
    next(error);
  }
});

export default router;
