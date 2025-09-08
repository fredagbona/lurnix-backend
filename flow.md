# User Flow: From Profile Test to Personalized Roadmaps

I'll explain the complete flow from when a user completes the profile test until they receive personalized 7-day and 30-day roadmaps.

## 1. Profile Test Completion

### Input
User completes the profile test, which collects information about:
- Learning style preferences
- Career objectives
- Technical passions
- Problem-solving approach
- Time commitment

### Output
The system generates a profile report:

```json
{
  "userId": "4e5f2a6b-9c4a-4a55-8f4c-9a7f1f0c1a11",
  "quizResultId": "0b24c8d1-3dc7-4e2b-8a9b-6c7d2e9fa201",
  "version": 1,
  "generatedAt": "2025-09-06T12:30:00Z",
  "learningStyle": {
    "primary": "kinesthetic",
    "secondary": "visual",
    "scores": {
      "visual": 0.7,
      "auditory": 0.3,
      "kinesthetic": 0.85,
      "reflective": 0.4,
      "active": 0.7,
      "sequential": 0.55,
      "global": 0.6
    },
    "explanation": "You learn best by building and seeing concepts."
  },
  "objectives": {
    "topGoal": "job_ready",
    "priorityRank": ["projects", "job_readiness", "enjoyment", "certifications"],
    "timeHorizon": "weeks"
  },
  "passions": {
    "ranked": ["web", "ai_ml", "data"],
    "notes": "Interest in React dashboards and small AI features."
  },
  "problemSolving": {
    "debugStyle": "experiment",
    "collaboration": "sometimes",
    "radar": {
      "persistence": 0.8,
      "independence": 0.7,
      "collaboration": 0.5,
      "exploration": 0.65
    },
    "explanation": "You prefer to try things quickly, with occasional checkpoints."
  },
  "recommendations": {
    "preferredStack": ["javascript_react", "python_ai"],
    "projectThemes": ["React dashboard with charts", "Small AI feature using Python"],
    "studyHabits": [
      "Daily 45–60 min sessions with short breaks",
      "Build-first: start with a tiny project then expand",
      "Review with a checklist at end of each day"
    ],
    "communityTips": [
      "Share blockers in #help-desk",
      "Join weekly check-in to stay accountable"
    ]
  },
  "roadmapSummary": {
    "sevenDay": {
      "title": "7-Day JavaScript Kickstart",
      "focus": ["variables & functions", "DOM basics", "mini-projects daily"],
      "estDailyMins": 60
    },
    "thirtyDay": {
      "title": "30-Day Web + AI Builder Path",
      "projects": [
        "React To-Do + filters",
        "Dashboard with external API",
        "Python microservice for AI feature"
      ],
      "milestones": [
        "Week 1: JS fundamentals + DOM",
        "Week 2: React basics + state",
        "Week 3: API integration + auth",
        "Week 4: AI microfeature + final demo"
      ]
    }
  },
  "nextActions": [
    { "label": "Start your 7-Day Kickstart", "action": "start_7day" },
    { "label": "Preview your 30-Day Roadmap", "action": "view_30day" },
    { "label": "Join the Discord community", "action": "join_discord" }
  ],
  "ctaLinks": {
    "start7DayUrl": "https://app.lurnix.tech/roadmap/7day/start",
    "view30DayUrl": "https://app.lurnix.tech/roadmap/30day/preview",
    "discordUrl": "https://discord.gg/lurnix"
  }
}
```

## 2. User Requests 7-Day Roadmap

### Endpoint
```
POST /api/ai/roadmap/seven-day
```

### Input
```json
{
  "learningStyle": {
    "primary": "kinesthetic",
    "secondary": "visual"
  },
  "objectives": {
    "topGoal": "job_ready",
    "priorityRank": ["projects", "job_readiness", "enjoyment", "certifications"],
    "timeHorizon": "weeks"
  },
  "passions": {
    "ranked": ["web", "ai_ml", "data"],
    "notes": "Interest in React dashboards and small AI features."
  },
  "problemSolving": {
    "debugStyle": "experiment",
    "collaboration": "sometimes"
  },
  "timeCommitmentMinsPerDay": 60,
  "priorExperience": "Basic HTML and CSS knowledge"
}
```

### Processing Flow
1. Request is authenticated via JWT token
2. Request body is validated using Zod schema
3. AI roadmap service prepares the user profile for the prompt
4. AI SDK generates a roadmap using OpenAI with the 7-day roadmap prompt
5. Time budget is enforced to ensure tasks fit within daily time commitment
6. Roadmap is stored in the database with default objectives
7. Progress tracking is initialized

### Output
```json
{
  "success": true,
  "data": {
    "version": 1,
    "title": "7-Day JavaScript Kickstart for Web Development",
    "stack": ["javascript", "html", "css"],
    "roadmapType": "seven_day",
    "estDailyMins": 60,
    "principles": ["build-first", "visual-aids", "small-wins"],
    "days": [
      {
        "day": 1,
        "focus": "JavaScript Fundamentals",
        "tasks": [
          {
            "id": "d1-t1",
            "type": "code",
            "title": "Variables, Functions, and Basic Data Types",
            "estMins": 30,
            "difficulty": "intro",
            "acceptance": ["Create 5 variables of different types", "Write a function that uses these variables"],
            "resources": [
              {
                "label": "MDN JavaScript Basics",
                "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types"
              }
            ]
          },
          {
            "id": "d1-t2",
            "type": "watch",
            "title": "JavaScript DOM Manipulation Overview",
            "estMins": 20,
            "difficulty": "intro",
            "acceptance": ["List 3 ways to select DOM elements", "Explain event listeners"],
            "resources": [
              {
                "label": "DOM Manipulation Basics",
                "url": "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Client-side_web_APIs/Manipulating_documents"
              }
            ]
          }
        ],
        "checkpoints": ["Share your code snippet in Discord"]
      },
      // Days 2-7 follow similar structure
    ],
    "userId": "4e5f2a6b-9c4a-4a55-8f4c-9a7f1f0c1a11",
    "createdAt": "2025-09-07T14:08:07.000Z",
    "updatedAt": "2025-09-07T14:08:07.000Z"
  },
  "timestamp": "2025-09-07T14:08:07.000Z"
}
```

## 3. User Requests 30-Day Roadmap

### Endpoint
```
POST /api/ai/roadmap/thirty-day
```

### Input
```json
{
  "learningStyle": {
    "primary": "kinesthetic",
    "secondary": "visual"
  },
  "objectives": {
    "topGoal": "job_ready",
    "priorityRank": ["projects", "job_readiness", "enjoyment", "certifications"],
    "timeHorizon": "weeks"
  },
  "passions": {
    "ranked": ["web", "ai_ml", "data"],
    "notes": "Interest in React dashboards and small AI features."
  },
  "problemSolving": {
    "debugStyle": "experiment",
    "collaboration": "sometimes"
  },
  "timeCommitmentMinsPerDay": 60,
  "priorExperience": "Basic HTML, CSS, and JavaScript knowledge",
  "projectThemes": ["React dashboard with charts", "Small AI feature using Python"]
}
```

### Processing Flow
1. Request is authenticated via JWT token
2. Request body is validated using Zod schema
3. AI roadmap service prepares the user profile for the prompt
4. AI SDK generates a roadmap using OpenAI with the 30-day roadmap prompt
5. Time budget is enforced to ensure tasks fit within daily time commitment
6. Roadmap is stored in the database with default objectives
7. Progress tracking is initialized

### Output
```json
{
  "success": true,
  "data": {
    "version": 1,
    "title": "30-Day Web + AI Builder Path",
    "stack": ["javascript", "react", "python"],
    "roadmapType": "thirty_day",
    "estDailyMins": 60,
    "principles": ["build-first", "visual-aids", "project-based"],
    "days": [
      {
        "day": 1,
        "focus": "JavaScript Fundamentals Review",
        "tasks": [
          {
            "id": "d1-t1",
            "type": "code",
            "title": "JavaScript ES6 Features Review",
            "estMins": 30,
            "difficulty": "intro",
            "acceptance": ["Write examples of arrow functions", "Use destructuring and spread operators"],
            "resources": [
              {
                "label": "MDN ES6 Features",
                "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules"
              }
            ]
          },
          {
            "id": "d1-t2",
            "type": "code",
            "title": "Setup React Development Environment",
            "estMins": 25,
            "difficulty": "intro",
            "acceptance": ["Install Node.js and npm", "Create a new React app with Vite"],
            "resources": [
              {
                "label": "Vite Getting Started",
                "url": "https://vitejs.dev/guide/"
              }
            ]
          }
        ],
        "checkpoints": ["Share your React app repository link"]
      },
      // Days 2-30 follow similar structure, organized into weekly projects
    ],
    "userId": "4e5f2a6b-9c4a-4a55-8f4c-9a7f1f0c1a11",
    "createdAt": "2025-09-07T14:08:07.000Z",
    "updatedAt": "2025-09-07T14:08:07.000Z"
  },
  "timestamp": "2025-09-07T14:08:07.000Z"
}
```

## 4. Database Storage and Progress Tracking

For each roadmap, the system:

1. Stores the complete roadmap JSON in the database
2. Creates default objectives based on roadmap type:
   - For 7-day: Days 1-2, Days 3-5, and Complete All
   - For 30-day: Week 1, Week 2, Week 3, and Complete All
3. Initializes progress tracking with:
   - Empty completed tasks array
   - Zero completed objectives
   - Zero streak days

## 5. User Interaction with Roadmaps

As users complete tasks, they can:
1. Mark tasks as completed
2. Track progress through objectives
3. Build a streak of consecutive days with activity

The system automatically updates objectives based on completion percentage and maintains the user's streak.

## Complete Flow Diagram

1. **User completes profile test** → Profile report generated
2. **User requests 7-day roadmap** → AI generates personalized 7-day roadmap
3. **User requests 30-day roadmap** → AI generates personalized 30-day roadmap
4. **User follows roadmap** → System tracks progress and updates objectives
5. **User completes roadmap** → All objectives marked as completed

This flow ensures that users receive personalized learning paths based on their profile, with both a quick-start 7-day roadmap for basics and a comprehensive 30-day roadmap for building specific projects aligned with their passions and career objectives.