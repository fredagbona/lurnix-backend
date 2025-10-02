import { PrismaClient, SkillDifficulty } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// JAVA SKILLS
// ============================================

const javaSkills = [
  // Java Fundamentals
  { name: 'Java Syntax Basics', category: 'java_fundamentals', difficulty: 'beginner' as SkillDifficulty, description: 'Understanding Java syntax, structure, and basic conventions' },
  { name: 'Java Variables and Data Types', category: 'java_fundamentals', difficulty: 'beginner' as SkillDifficulty, description: 'Working with primitive and reference data types' },
  { name: 'Java Control Flow', category: 'java_fundamentals', difficulty: 'beginner' as SkillDifficulty, description: 'If statements, loops, and switch cases' },
  { name: 'Java Methods', category: 'java_fundamentals', difficulty: 'beginner' as SkillDifficulty, description: 'Creating and calling methods, parameters, return types' },
  { name: 'Java Arrays', category: 'java_fundamentals', difficulty: 'beginner' as SkillDifficulty, description: 'Working with arrays and array operations' },
  { name: 'Java Strings', category: 'java_fundamentals', difficulty: 'beginner' as SkillDifficulty, description: 'String manipulation and common string operations' },

  // Object-Oriented Programming
  { name: 'Java Classes and Objects', category: 'oop', difficulty: 'beginner' as SkillDifficulty, description: 'Creating classes, instantiating objects' },
  { name: 'Java Encapsulation', category: 'oop', difficulty: 'intermediate' as SkillDifficulty, description: 'Access modifiers, getters, setters' },
  { name: 'Java Inheritance', category: 'oop', difficulty: 'intermediate' as SkillDifficulty, description: 'Extending classes, method overriding' },
  { name: 'Java Polymorphism', category: 'oop', difficulty: 'intermediate' as SkillDifficulty, description: 'Method overloading, dynamic binding' },
  { name: 'Java Interfaces', category: 'oop', difficulty: 'intermediate' as SkillDifficulty, description: 'Defining and implementing interfaces' },
  { name: 'Java Abstract Classes', category: 'oop', difficulty: 'intermediate' as SkillDifficulty, description: 'Abstract classes and methods' },

  // Advanced Java
  { name: 'Java Collections Framework', category: 'advanced_java', difficulty: 'intermediate' as SkillDifficulty, description: 'List, Set, Map, Queue interfaces' },
  { name: 'Java Generics', category: 'advanced_java', difficulty: 'advanced' as SkillDifficulty, description: 'Generic classes and methods' },
  { name: 'Java Exception Handling', category: 'advanced_java', difficulty: 'intermediate' as SkillDifficulty, description: 'Try-catch, custom exceptions' },
  { name: 'Java File I/O', category: 'advanced_java', difficulty: 'intermediate' as SkillDifficulty, description: 'Reading and writing files' },
  { name: 'Java Multithreading', category: 'advanced_java', difficulty: 'advanced' as SkillDifficulty, description: 'Threads, synchronization, concurrency' },
  { name: 'Java Lambda Expressions', category: 'advanced_java', difficulty: 'advanced' as SkillDifficulty, description: 'Functional programming with lambdas' },
  { name: 'Java Streams API', category: 'advanced_java', difficulty: 'advanced' as SkillDifficulty, description: 'Stream operations, filtering, mapping' },
  { name: 'Java Annotations', category: 'advanced_java', difficulty: 'advanced' as SkillDifficulty, description: 'Using and creating annotations' },

  // Spring Boot
  { name: 'Spring Boot Basics', category: 'spring_boot', difficulty: 'intermediate' as SkillDifficulty, description: 'Spring Boot project structure and setup' },
  { name: 'Spring Dependency Injection', category: 'spring_boot', difficulty: 'intermediate' as SkillDifficulty, description: 'IoC container, beans, autowiring' },
  { name: 'Spring REST APIs', category: 'spring_boot', difficulty: 'intermediate' as SkillDifficulty, description: 'Creating RESTful web services' },
  { name: 'Spring Data JPA', category: 'spring_boot', difficulty: 'advanced' as SkillDifficulty, description: 'Database access with JPA' },
  { name: 'Spring Security', category: 'spring_boot', difficulty: 'advanced' as SkillDifficulty, description: 'Authentication and authorization' },
  { name: 'Spring Boot Testing', category: 'spring_boot', difficulty: 'advanced' as SkillDifficulty, description: 'Unit and integration testing' },
];

// ============================================
// PYTHON SKILLS
// ============================================

const pythonSkills = [
  { name: 'Python Syntax Basics', category: 'python_fundamentals', difficulty: 'beginner' as SkillDifficulty, description: 'Python syntax and conventions' },
  { name: 'Python Data Types', category: 'python_fundamentals', difficulty: 'beginner' as SkillDifficulty, description: 'Numbers, strings, lists, tuples, dictionaries' },
  { name: 'Python Control Flow', category: 'python_fundamentals', difficulty: 'beginner' as SkillDifficulty, description: 'If statements, loops, comprehensions' },
  { name: 'Python Functions', category: 'python_fundamentals', difficulty: 'beginner' as SkillDifficulty, description: 'Defining functions, arguments, decorators' },
  { name: 'Python OOP', category: 'python_fundamentals', difficulty: 'intermediate' as SkillDifficulty, description: 'Classes, inheritance, magic methods' },
  { name: 'Python File Handling', category: 'python_fundamentals', difficulty: 'beginner' as SkillDifficulty, description: 'Reading and writing files' },
  { name: 'Python Exception Handling', category: 'python_fundamentals', difficulty: 'intermediate' as SkillDifficulty, description: 'Try-except blocks, custom exceptions' },
];

// ============================================
// JAVASCRIPT SKILLS
// ============================================

const javascriptSkills = [
  { name: 'JavaScript Basics', category: 'javascript_fundamentals', difficulty: 'beginner' as SkillDifficulty, description: 'Variables, data types, operators' },
  { name: 'JavaScript Functions', category: 'javascript_fundamentals', difficulty: 'beginner' as SkillDifficulty, description: 'Function declarations, expressions, arrow functions' },
  { name: 'JavaScript DOM Manipulation', category: 'javascript_fundamentals', difficulty: 'intermediate' as SkillDifficulty, description: 'Selecting and modifying DOM elements' },
  { name: 'JavaScript Async Programming', category: 'javascript_fundamentals', difficulty: 'advanced' as SkillDifficulty, description: 'Promises, async/await' },
  { name: 'JavaScript ES6+ Features', category: 'javascript_fundamentals', difficulty: 'intermediate' as SkillDifficulty, description: 'Destructuring, spread, modules' },
];

// ============================================
// REACT SKILLS
// ============================================

const reactSkills = [
  { name: 'React Components', category: 'react', difficulty: 'beginner' as SkillDifficulty, description: 'Creating functional and class components' },
  { name: 'React JSX', category: 'react', difficulty: 'beginner' as SkillDifficulty, description: 'JSX syntax and expressions' },
  { name: 'React Props', category: 'react', difficulty: 'beginner' as SkillDifficulty, description: 'Passing data between components' },
  { name: 'React State', category: 'react', difficulty: 'intermediate' as SkillDifficulty, description: 'Managing component state with useState' },
  { name: 'React Hooks', category: 'react', difficulty: 'intermediate' as SkillDifficulty, description: 'useEffect, useContext, custom hooks' },
  { name: 'React Router', category: 'react', difficulty: 'intermediate' as SkillDifficulty, description: 'Client-side routing' },
];

// ============================================
// DATABASE SKILLS
// ============================================

const databaseSkills = [
  { name: 'SQL Basics', category: 'database', difficulty: 'beginner' as SkillDifficulty, description: 'SELECT, INSERT, UPDATE, DELETE' },
  { name: 'SQL Joins', category: 'database', difficulty: 'intermediate' as SkillDifficulty, description: 'INNER, LEFT, RIGHT, FULL joins' },
  { name: 'SQL Aggregations', category: 'database', difficulty: 'intermediate' as SkillDifficulty, description: 'GROUP BY, HAVING, aggregate functions' },
  { name: 'Database Design', category: 'database', difficulty: 'advanced' as SkillDifficulty, description: 'Normalization, relationships, indexing' },
  { name: 'NoSQL Databases', category: 'database', difficulty: 'advanced' as SkillDifficulty, description: 'MongoDB, document databases' },
];

// ============================================
// ALGORITHMS & DATA STRUCTURES
// ============================================

const algorithmSkills = [
  { name: 'Big O Notation', category: 'algorithms', difficulty: 'intermediate' as SkillDifficulty, description: 'Time and space complexity analysis' },
  { name: 'Arrays and Strings', category: 'data_structures', difficulty: 'beginner' as SkillDifficulty, description: 'Array manipulation, string algorithms' },
  { name: 'Linked Lists', category: 'data_structures', difficulty: 'intermediate' as SkillDifficulty, description: 'Singly and doubly linked lists' },
  { name: 'Stacks and Queues', category: 'data_structures', difficulty: 'intermediate' as SkillDifficulty, description: 'LIFO and FIFO data structures' },
  { name: 'Trees and Graphs', category: 'data_structures', difficulty: 'advanced' as SkillDifficulty, description: 'Binary trees, BST, graph traversal' },
  { name: 'Sorting Algorithms', category: 'algorithms', difficulty: 'intermediate' as SkillDifficulty, description: 'Bubble, merge, quick sort' },
  { name: 'Searching Algorithms', category: 'algorithms', difficulty: 'intermediate' as SkillDifficulty, description: 'Binary search, DFS, BFS' },
];

// ============================================
// SEED FUNCTION
// ============================================

export async function seedSkills() {
  console.log('🌱 Seeding skills...');

  const allSkills = [
    ...javaSkills,
    ...pythonSkills,
    ...javascriptSkills,
    ...reactSkills,
    ...databaseSkills,
    ...algorithmSkills,
  ];

  let created = 0;
  let skipped = 0;

  for (const skillData of allSkills) {
    const existing = await prisma.skill.findUnique({
      where: { name: skillData.name },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.skill.create({
      data: skillData,
    });

    created++;
  }

  console.log(`✅ Skills seeded: ${created} created, ${skipped} skipped`);
  console.log(`📊 Total skills in database: ${await prisma.skill.count()}`);
}

// Run if called directly
if (require.main === module) {
  seedSkills()
    .catch((e) => {
      console.error('❌ Skill seeding failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
