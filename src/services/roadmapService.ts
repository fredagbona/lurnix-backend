import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError';
import { quizService } from './quizService';
import { db } from '../prisma/prismaWrapper';
import { RoadmapType, ObjectiveStatus, Roadmap, Objective, Progress, QuizResult } from '../types/prisma';

// Re-export enums for use in other files
export { RoadmapType, ObjectiveStatus };

export interface RoadmapGenerationRequest {
  userId: string;
  quizResultId: string;
  roadmapType: RoadmapType;
}

export interface ProgressUpdateRequest {
  userId: string;
  roadmapId: string;
  completedTaskIds: string[];
}

export class RoadmapService {
  // Generate a new roadmap based on quiz results
  async generateRoadmap(request: RoadmapGenerationRequest): Promise<any> {
    // Get the quiz result
    const quizResult = await quizService.getQuizResult(request.quizResultId);
    
    // Check if the quiz result belongs to the requesting user
    if (quizResult.userId !== request.userId) {
      throw new AppError('You do not have permission to use this quiz result', 403);
    }
    
    // Generate roadmap based on the computed profile
    const jsonRoadmap = await this.buildRoadmap(quizResult.computedProfile, request.roadmapType);
    
    // Save the roadmap
    const roadmap = await db.roadmap.create({
      data: {
        userId: request.userId,
        roadmap_type: request.roadmapType,
        profileSnapshot: quizResult.computedProfile,
        jsonRoadmap,
        // Create default objectives based on roadmap type
        objectives: {
          create: this.generateDefaultObjectives(request.roadmapType)
        }
      },
      include: {
        objectives: true
      }
    });
    
    // Initialize progress tracking
    await db.progress.create({
      data: {
        userId: request.userId,
        roadmapId: roadmap.id,
        completedTasks: [],
        completedObjectives: 0,
        streak: 0
      }
    });
    
    return roadmap;
  }
  
  // Generate default objectives based on roadmap type
  private generateDefaultObjectives(roadmapType: RoadmapType): any[] {
    const objectives = [];
    const numDays = roadmapType === RoadmapType.seven_day ? 7 : 30;
    
    // Create milestone objectives based on roadmap type
    if (roadmapType === RoadmapType.seven_day) {
      objectives.push(
        {
          title: 'Complete Day 1-2 tasks',
          description: 'Finish all tasks for the first two days of your learning journey',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          status: ObjectiveStatus.todo
        },
        {
          title: 'Complete Day 3-5 tasks',
          description: 'Finish all tasks for days 3-5 of your learning journey',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          status: ObjectiveStatus.todo
        },
        {
          title: 'Complete all 7-day roadmap tasks',
          description: 'Finish your entire 7-day learning journey',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          status: ObjectiveStatus.todo
        }
      );
    } else {
      objectives.push(
        {
          title: 'Complete Week 1 tasks',
          description: 'Finish all tasks for the first week of your learning journey',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          status: ObjectiveStatus.todo
        },
        {
          title: 'Complete Week 2 tasks',
          description: 'Finish all tasks for the second week of your learning journey',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          status: ObjectiveStatus.todo
        },
        {
          title: 'Complete Week 3 tasks',
          description: 'Finish all tasks for the third week of your learning journey',
          dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
          status: ObjectiveStatus.todo
        },
        {
          title: 'Complete all 30-day roadmap tasks',
          description: 'Finish your entire 30-day learning journey',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          status: ObjectiveStatus.todo
        }
      );
    }
    
    return objectives;
  }
  
  // Build roadmap content based on user profile
  private async buildRoadmap(profile: any, roadmapType: RoadmapType): Promise<any> {
    // This would typically involve AI or rule-based generation
    // For now, we'll use a simple template approach
    
    const days = [];
    const numDays = roadmapType === RoadmapType.seven_day ? 7 : 30;
    const preferredStack = profile.preferredStack || ['javascript'];
    const learningStyle = profile.style || 'balanced';
    
    // Generate days and tasks
    for (let day = 1; day <= numDays; day++) {
      const tasks = [];
      
      // Generate 2-3 tasks per day
      const tasksPerDay = Math.floor(Math.random() * 2) + 2;
      
      for (let taskNum = 1; taskNum <= tasksPerDay; taskNum++) {
        // Generate task based on learning style and preferred stack
        const task = this.generateTask(day, taskNum, learningStyle, preferredStack);
        tasks.push(task);
      }
      
      days.push({
        day,
        tasks
      });
    }
    
    // Add resources based on preferred stack
    const resources = this.generateResources(preferredStack);
    
    return {
      title: `${numDays}-Day ${preferredStack[0].charAt(0).toUpperCase() + preferredStack[0].slice(1)} Learning Path`,
      days,
      resources
    };
  }
  
  // Generate a single task
  private generateTask(day: number, taskNum: number, learningStyle: string, stack: string[]): any {
    const taskId = `d${day}-t${taskNum}`;
    const primaryStack = stack[0];
    
    // Task types based on learning style
    let taskTypes;
    switch (learningStyle) {
      case 'hands_on':
        taskTypes = ['code', 'project', 'quiz'];
        break;
      case 'visual':
        taskTypes = ['video', 'demo', 'code'];
        break;
      case 'reading':
        taskTypes = ['read', 'research', 'quiz'];
        break;
      default:
        taskTypes = ['code', 'read', 'video', 'quiz'];
    }
    
    // Select a task type
    const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
    
    // Generate task content based on day, stack, and type
    let title, est;
    
    switch (primaryStack) {
      case 'javascript':
        if (day <= 3) {
          // Beginner JS topics
          const topics = ['variables and types', 'functions and scope', 'arrays and objects', 'DOM manipulation'];
          title = `${taskType === 'code' ? 'Practice' : taskType === 'read' ? 'Learn about' : 'Watch tutorial on'} ${topics[Math.floor(Math.random() * topics.length)]}`;
        } else {
          // More advanced JS topics
          const topics = ['async/await', 'promises', 'ES6 features', 'error handling', 'design patterns'];
          title = `${taskType === 'code' ? 'Implement' : taskType === 'read' ? 'Study' : 'Watch advanced tutorial on'} ${topics[Math.floor(Math.random() * topics.length)]}`;
        }
        break;
        
      case 'react':
        if (day <= 3) {
          // Beginner React topics
          const topics = ['components', 'props', 'state', 'hooks basics'];
          title = `${taskType === 'code' ? 'Create' : taskType === 'read' ? 'Learn about' : 'Watch tutorial on'} React ${topics[Math.floor(Math.random() * topics.length)]}`;
        } else {
          // More advanced React topics
          const topics = ['context API', 'custom hooks', 'performance optimization', 'state management'];
          title = `${taskType === 'code' ? 'Implement' : taskType === 'read' ? 'Study' : 'Watch advanced tutorial on'} React ${topics[Math.floor(Math.random() * topics.length)]}`;
        }
        break;
        
      default:
        title = `${taskType === 'code' ? 'Practice' : taskType === 'read' ? 'Learn about' : 'Watch tutorial on'} programming fundamentals`;
    }
    
    // Estimated time (minutes)
    est = taskType === 'code' ? 30 : taskType === 'video' ? 15 : 20;
    
    return {
      id: taskId,
      type: taskType,
      title,
      est,
      acceptance: taskType === 'code' ? ['Completes the task', 'Uses proper syntax'] : undefined
    };
  }
  
  // Generate resources based on stack
  private generateResources(stack: string[]): any[] {
    const resources = [];
    
    for (const tech of stack) {
      switch (tech) {
        case 'javascript':
          resources.push(
            { label: 'MDN JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide' },
            { label: 'JavaScript.info', url: 'https://javascript.info/' }
          );
          break;
          
        case 'react':
          resources.push(
            { label: 'React Documentation', url: 'https://reactjs.org/docs/getting-started.html' },
            { label: 'React Hooks Guide', url: 'https://reactjs.org/docs/hooks-intro.html' }
          );
          break;
          
        case 'node':
          resources.push(
            { label: 'Node.js Documentation', url: 'https://nodejs.org/en/docs/' },
            { label: 'Express.js Guide', url: 'https://expressjs.com/en/guide/routing.html' }
          );
          break;
          
        case 'python':
          resources.push(
            { label: 'Python Documentation', url: 'https://docs.python.org/3/' },
            { label: 'Real Python Tutorials', url: 'https://realpython.com/' }
          );
          break;
          
        default:
          resources.push(
            { label: 'freeCodeCamp', url: 'https://www.freecodecamp.org/' },
            { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/' }
          );
      }
    }
    
    return resources;
  }
  
  // Get a specific roadmap
  async getRoadmap(roadmapId: string, userId: string): Promise<any> {
    const roadmap = await db.roadmap.findUnique({
      where: { id: roadmapId },
      include: {
        objectives: true,
        progresses: {
          where: { userId }
        }
      }
    });
    
    if (!roadmap) {
      throw new AppError('Roadmap not found', 404);
    }
    
    // Check if the roadmap belongs to the requesting user
    if (roadmap.userId !== userId) {
      throw new AppError('You do not have permission to access this roadmap', 403);
    }
    
    return roadmap;
  }
  
  // Get all roadmaps for a user
  async getUserRoadmaps(userId: string): Promise<any> {
    const roadmaps = await db.roadmap.findMany({
      where: { userId },
      include: {
        objectives: true,
        progresses: {
          where: { userId }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return roadmaps;
  }
  
  // Update progress for a roadmap
  async updateProgress(request: ProgressUpdateRequest): Promise<any> {
    // Verify the roadmap exists and belongs to the user
    const roadmap = await this.getRoadmap(request.roadmapId, request.userId);
    
    // Get the current progress
    const progress = await db.progress.findUnique({
      where: {
        userId_roadmapId: {
          userId: request.userId,
          roadmapId: request.roadmapId
        }
      }
    });
    
    if (!progress) {
      throw new AppError('Progress record not found', 404);
    }
    
    // Update the progress
    const updatedProgress = await db.progress.update({
      where: {
        id: progress.id
      },
      data: {
        completedTasks: request.completedTaskIds,
        lastActivityAt: new Date()
      }
    });
    
    // Update streak and objectives
    await this.updateStreak(updatedProgress.id);
    await this.updateObjectives(request.roadmapId, request.completedTaskIds);
    
    // Get the fully updated progress with streak
    const finalProgress = await db.progress.findUnique({
      where: { id: updatedProgress.id },
      include: {
        roadmap: {
          include: {
            objectives: true
          }
        }
      }
    });
    
    return finalProgress;
  }
  
  // Update streak based on activity
  private async updateStreak(progressId: string): Promise<any> {
    const progress = await db.progress.findUnique({
      where: { id: progressId }
    });
    
    if (!progress) {
      throw new AppError('Progress not found', 404);
    }
    
    // Check if there was activity in the last 24 hours
    const now = new Date();
    const lastActivity = new Date(progress.lastActivityAt);
    const hoursSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
    
    let streak = progress.streak;
    
    // If it's been more than 48 hours since last activity, reset streak
    if (hoursSinceLastActivity > 48) {
      streak = 1; // Reset to 1 for today's activity
    } 
    // If it's been between 24-48 hours, increment streak
    else if (hoursSinceLastActivity > 24) {
      streak += 1;
    }
    // If less than 24 hours, keep the streak (already counted for today)
    
    // Update the streak
    return await db.progress.update({
      where: { id: progressId },
      data: { streak }
    });
  }
  
  // Update objectives based on completed tasks
  private async updateObjectives(roadmapId: string, completedTaskIds: string[]): Promise<void> {
    // Get the roadmap with its objectives
    const roadmap = await db.roadmap.findUnique({
      where: { id: roadmapId },
      include: { objectives: true }
    });
    
    if (!roadmap) {
      throw new AppError('Roadmap not found', 404);
    }
    
    // Get the roadmap content
    const jsonRoadmap = roadmap.jsonRoadmap as any;
    const days = jsonRoadmap.days || [];
    
    // Calculate total tasks and completed tasks
    let totalTasks = 0;
    days.forEach((day: any) => {
      totalTasks += day.tasks.length;
    });
    
    const completionPercentage = totalTasks > 0 ? (completedTaskIds.length / totalTasks) * 100 : 0;
    
    // Update objectives based on completion percentage
    for (const objective of roadmap.objectives) {
      let newStatus = objective.status;
      
      // Simple logic: update objective status based on title and completion percentage
      if (objective.title.includes('Day 1-2') && completionPercentage >= 20) {
        newStatus = ObjectiveStatus.done;
      } else if (objective.title.includes('Day 3-5') && completionPercentage >= 50) {
        newStatus = ObjectiveStatus.done;
      } else if (objective.title.includes('Week 1') && completionPercentage >= 25) {
        newStatus = ObjectiveStatus.done;
      } else if (objective.title.includes('Week 2') && completionPercentage >= 50) {
        newStatus = ObjectiveStatus.done;
      } else if (objective.title.includes('Week 3') && completionPercentage >= 75) {
        newStatus = ObjectiveStatus.done;
      } else if ((objective.title.includes('all 7-day') || objective.title.includes('all 30-day')) && completionPercentage >= 90) {
        newStatus = ObjectiveStatus.done;
      } else if (completionPercentage > 0 && objective.status === ObjectiveStatus.todo) {
        newStatus = ObjectiveStatus.doing;
      }
      
      // Update the objective if status changed
      if (newStatus !== objective.status) {
        await db.objective.update({
          where: { id: objective.id },
          data: { status: newStatus }
        });
      }
    }
    
    // Count completed objectives
    const completedObjectives = roadmap.objectives.filter(
      (obj: any) => obj.status === ObjectiveStatus.done
    ).length;
    
    // Update the progress record with completed objectives count
    await db.progress.updateMany({
      where: { roadmapId },
      data: { completedObjectives }
    });
  }
}

export const roadmapService = new RoadmapService();
