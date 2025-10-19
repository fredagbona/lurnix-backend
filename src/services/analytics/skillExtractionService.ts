import Groq from 'groq-sdk';
import { z } from 'zod';
import { PrismaClient, SkillDifficulty } from '@prisma/client';
import { config } from '../../config/environment.js';

const prisma = new PrismaClient();
const groq = new Groq({ apiKey: config.GROQ_API_KEY });

// ============================================
// INTERFACES
// ============================================

export interface ExtractedSkill {
  skillName: string;
  category: string;
  difficulty: SkillDifficulty;
  targetLevel: number; // 0-100
  practiceType: 'introduction' | 'practice' | 'review' | 'mastery';
}

export interface SkillExtractionResult {
  extractedSkills: ExtractedSkill[];
  mappedSkills: Array<{ skillId: string; targetLevel: number; practiceType: string }>;
  newSkillsCreated: number;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const ExtractedSkillSchema = z.object({
  skillName: z.string().min(2).max(100),
  category: z.string().min(2).max(50),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  targetLevel: z.number().min(0).max(100),
  practiceType: z.enum(['introduction', 'practice', 'review', 'mastery']),
});

const SkillExtractionResponseSchema = z.object({
  skills: z.array(ExtractedSkillSchema).min(1).max(10),
  reasoning: z.string().min(10),
});

// ============================================
// AI PROMPTS
// ============================================

const SKILL_EXTRACTION_SYSTEM_PROMPT = `You are a skill extraction expert for technical learning content.
Your job is to analyze sprint content and extract the specific skills being taught or practiced.

RULES:
1. Extract 1-10 concrete, measurable skills (not vague concepts)
2. Be specific: "Java OOP Inheritance" not just "OOP"
3. Categorize skills properly (e.g., "java_fundamentals", "oop", "spring_boot", "algorithms")
4. Assign appropriate difficulty level
5. Determine practice type based on content:
   - "introduction": First exposure to the skill
   - "practice": Reinforcing a previously introduced skill
   - "review": Revisiting a skill for retention
   - "mastery": Advanced application of the skill
6. Set realistic target level (0-100) the learner should reach after this sprint

OUTPUT: Valid JSON matching the schema exactly.`;

// ============================================
// SKILL EXTRACTION SERVICE
// ============================================

class SkillExtractionService {
  /**
   * Extract skills from sprint content using AI
   */
  async extractSkillsFromSprint(params: {
    sprintTitle: string;
    sprintDescription?: string;
    sprintTasks: Array<{ title: string; description?: string; type?: string }>;
    objectiveContext: string;
    dayNumber?: number;
    previousSkills?: string[]; // Skills from previous sprints
    language?: string;
  }): Promise<ExtractedSkill[]> {
    const { sprintTitle, sprintDescription, sprintTasks, objectiveContext, dayNumber, previousSkills, language = 'en' } = params;

    // Build context for AI
    const tasksContext = sprintTasks
      .map((task, idx) => {
        const desc = task.description ? `\nDescription: ${task.description}` : '';
        const type = task.type ? `\nType: ${task.type}` : '';
        return `Task ${idx + 1}: ${task.title}${desc}${type}`;
      })
      .join('\n\n');

    const previousSkillsContext = previousSkills?.length
      ? `\n\nPreviously covered skills: ${previousSkills.join(', ')}`
      : '';

    // Language instruction
    const languageInstruction = language === 'fr'
      ? '\n\nIMPORTANT: Provide skill names and descriptions in FRENCH. Use proper French technical terminology.'
      : '\n\nIMPORTANT: Provide skill names and descriptions in ENGLISH.';

    const userPrompt = `${languageInstruction}

OBJECTIVE CONTEXT:
${objectiveContext}

SPRINT INFORMATION:
Title: ${sprintTitle}
${sprintDescription ? `Description: ${sprintDescription}` : ''}
Day Number: ${dayNumber || 'Unknown'}

TASKS:
${tasksContext}${previousSkillsContext}

Extract the specific skills being taught or practiced in this sprint.
Consider what the learner will actually learn and be able to do after completing these tasks.`;

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SKILL_EXTRACTION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from AI');
      }

      const parsed = JSON.parse(responseContent);
      const validated = SkillExtractionResponseSchema.parse(parsed);

      return validated.skills;
    } catch (error) {
      console.error('Skill extraction failed:', error);
      // Fallback: Create basic skill from sprint title
      return this.createFallbackSkills(sprintTitle, objectiveContext);
    }
  }

  /**
   * Map extracted skills to existing skill database or create new ones
   */
  async mapToExistingSkills(
    extractedSkills: ExtractedSkill[]
  ): Promise<Array<{ skillId: string; targetLevel: number; practiceType: string }>> {
    const mappedSkills: Array<{ skillId: string; targetLevel: number; practiceType: string }> = [];

    for (const extracted of extractedSkills) {
      // Try to find existing skill by name (case-insensitive)
      let skill = await prisma.skill.findFirst({
        where: {
          name: {
            equals: extracted.skillName,
            mode: 'insensitive',
          },
        },
      });

      // If not found, create new skill
      if (!skill) {
        skill = await this.createSkill(extracted);
      }

      mappedSkills.push({
        skillId: skill.id,
        targetLevel: extracted.targetLevel,
        practiceType: extracted.practiceType,
      });
    }

    return mappedSkills;
  }

  /**
   * Extract and map skills in one operation
   */
  async extractAndMapSkills(params: {
    sprintTitle: string;
    sprintDescription?: string;
    sprintTasks: Array<{ title: string; description?: string; type?: string }>;
    objectiveContext: string;
    dayNumber?: number;
    previousSkills?: string[];
    language?: string;
  }): Promise<SkillExtractionResult> {
    // Extract skills
    const extractedSkills = await this.extractSkillsFromSprint(params);

    // Map to database
    const mappedSkills = await this.mapToExistingSkills(extractedSkills);

    // Count new skills created
    const existingSkillIds = new Set(
      (await prisma.skill.findMany({ select: { id: true } })).map((s) => s.id)
    );
    const newSkillsCreated = mappedSkills.filter((ms) => !existingSkillIds.has(ms.skillId)).length;

    return {
      extractedSkills,
      mappedSkills,
      newSkillsCreated,
    };
  }

  /**
   * Create a new skill in the database
   */
  private async createSkill(extracted: ExtractedSkill) {
    return await prisma.skill.create({
      data: {
        name: extracted.skillName,
        category: extracted.category,
        difficulty: extracted.difficulty,
        description: `Auto-generated skill for ${extracted.skillName}`,
      },
    });
  }

  /**
   * Create fallback skills when AI extraction fails
   */
  private createFallbackSkills(sprintTitle: string, objectiveContext: string): ExtractedSkill[] {
    // Extract category from objective context
    const category = this.inferCategory(objectiveContext);

    return [
      {
        skillName: sprintTitle,
        category,
        difficulty: 'beginner',
        targetLevel: 50,
        practiceType: 'practice',
      },
    ];
  }

  /**
   * Infer skill category from objective context
   */
  private inferCategory(objectiveContext: string): string {
    const lowerContext = objectiveContext.toLowerCase();

    if (lowerContext.includes('java')) return 'java_fundamentals';
    if (lowerContext.includes('python')) return 'python_fundamentals';
    if (lowerContext.includes('javascript') || lowerContext.includes('js')) return 'javascript_fundamentals';
    if (lowerContext.includes('react')) return 'react';
    if (lowerContext.includes('spring')) return 'spring_boot';
    if (lowerContext.includes('database') || lowerContext.includes('sql')) return 'database';
    if (lowerContext.includes('algorithm')) return 'algorithms';
    if (lowerContext.includes('data structure')) return 'data_structures';

    return 'general';
  }

  /**
   * Bulk create skills from a predefined list (for seeding)
   */
  async bulkCreateSkills(skills: Array<{
    name: string;
    category: string;
    difficulty: SkillDifficulty;
    description?: string;
    parentSkillName?: string;
    prerequisites?: string[];
  }>) {
    const created = [];

    for (const skillData of skills) {
      // Check if skill already exists
      const existing = await prisma.skill.findUnique({
        where: { name: skillData.name },
      });

      if (existing) {
        console.log(`Skill "${skillData.name}" already exists, skipping...`);
        continue;
      }

      // Find parent skill if specified
      let parentSkillId: string | undefined;
      if (skillData.parentSkillName) {
        const parentSkill = await prisma.skill.findUnique({
          where: { name: skillData.parentSkillName },
        });
        parentSkillId = parentSkill?.id;
      }

      // Create skill
      const skill = await prisma.skill.create({
        data: {
          name: skillData.name,
          category: skillData.category,
          difficulty: skillData.difficulty,
          description: skillData.description,
          parentSkillId,
          prerequisites: skillData.prerequisites || [],
        },
      });

      created.push(skill);
    }

    return created;
  }
}

export default new SkillExtractionService();
