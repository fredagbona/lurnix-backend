import { db } from '../../src/prisma/prismaWrapper';
import {
  QUIZ_VERSION,
  quizSectionsContent,
  standaloneQuizQuestions,
  QuizQuestionContent
} from '../../src/config/quizContent';

async function createQuestion(question: QuizQuestionContent, sectionId: string | null) {
  await db.quizQuestion.create({
    data: {
      version: question.version,
      key: question.key,
      title: question.titleKey,
      description: question.descriptionKey,
      type: question.type,
      weightCategory: question.weightCategory,
      sortOrder: question.sortOrder,
      isActive: question.isActive ?? true,
      sectionId,
      options: {
        create: question.options.map(option => ({
          label: option.labelKey,
          value: option.value,
          weights: option.weights || {}
        }))
      }
    }
  });
}

export async function seedQuizData() {
  console.log('🧠 Seeding improved quiz data...');

  await db.quizOption.deleteMany({});
  await db.quizQuestion.deleteMany({});
  await db.quizSection.deleteMany({});

  for (const section of quizSectionsContent) {
    const createdSection = await db.quizSection.create({
      data: {
        version: section.version,
        title: section.titleKey,
        description: section.descriptionKey,
        sortOrder: section.sortOrder,
        isActive: section.isActive ?? true
      }
    });

    for (const question of section.questions) {
      await createQuestion(question, createdSection.id);
    }
  }

  for (const question of standaloneQuizQuestions) {
    await createQuestion(question, null);
  }

  console.log(`✅ Quiz version ${QUIZ_VERSION} seeded successfully.`);
  console.log(`✅ Quiz version ${QUIZ_VERSION} seeded successfully.`);
}

if (require.main === module) {
  seedQuizData()
    .then(() => {
      console.log('🌱 Quiz seeding completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Quiz seeding failed:', error);
      process.exit(1);
    });
}
