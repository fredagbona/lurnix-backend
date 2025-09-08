Awesome — here’s a clean, implementation-ready spec for the **Profile Report API payload** your backend can return to the frontend right after the quiz. I’m giving you:

* A **JSON Schema** (Draft-07) for validation
* A **sample payload**
* **TypeScript types** for your app
* A quick note on **scoring → mapping → recommendations**

---

# 1) JSON Schema (Draft-07)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "LurnixProfileReport",
  "type": "object",
  "required": ["userId", "quizResultId", "version", "learningStyle", "objectives", "passions", "problemSolving", "recommendations", "roadmapSummary", "nextActions", "ctaLinks", "generatedAt"],
  "properties": {
    "userId": { "type": "string", "format": "uuid" },
    "quizResultId": { "type": "string", "format": "uuid" },
    "version": { "type": "integer", "minimum": 1 },
    "generatedAt": { "type": "string", "format": "date-time" },

    "learningStyle": {
      "type": "object",
      "required": ["primary", "secondary", "scores"],
      "properties": {
        "primary": { "type": "string", "enum": ["visual", "auditory", "kinesthetic", "reflective", "active", "sequential", "global"] },
        "secondary": { "type": "string", "enum": ["visual", "auditory", "kinesthetic", "reflective", "active", "sequential", "global"] },
        "scores": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "visual": { "type": "number", "minimum": 0, "maximum": 1 },
            "auditory": { "type": "number", "minimum": 0, "maximum": 1 },
            "kinesthetic": { "type": "number", "minimum": 0, "maximum": 1 },
            "reflective": { "type": "number", "minimum": 0, "maximum": 1 },
            "active": { "type": "number", "minimum": 0, "maximum": 1 },
            "sequential": { "type": "number", "minimum": 0, "maximum": 1 },
            "global": { "type": "number", "minimum": 0, "maximum": 1 }
          }
        },
        "explanation": { "type": "string" }
      }
    },

    "objectives": {
      "type": "object",
      "required": ["topGoal", "priorityRank"],
      "properties": {
        "topGoal": { "type": "string", "enum": ["job_ready", "career_switch", "build_startup", "hobby", "automation"] },
        "priorityRank": {
          "type": "array",
          "items": { "type": "string", "enum": ["job_readiness", "projects", "certifications", "enjoyment"] },
          "minItems": 4,
          "maxItems": 4,
          "uniqueItems": true
        },
        "timeHorizon": { "type": "string", "enum": ["weeks", "months", "explore"] }
      }
    },

    "passions": {
      "type": "object",
      "required": ["ranked"],
      "properties": {
        "ranked": {
          "type": "array",
          "items": { "type": "string", "enum": ["web", "mobile", "data", "ai_ml", "cybersec", "games", "devops_cloud"] },
          "minItems": 1,
          "uniqueItems": true
        },
        "notes": { "type": "string" }
      }
    },

    "problemSolving": {
      "type": "object",
      "required": ["debugStyle", "collaboration", "radar"],
      "properties": {
        "debugStyle": { "type": "string", "enum": ["experiment", "research", "ask_help", "break_then_return"] },
        "collaboration": { "type": "string", "enum": ["rarely", "sometimes", "often", "always"] },
        "radar": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "persistence": { "type": "number", "minimum": 0, "maximum": 1 },
            "independence": { "type": "number", "minimum": 0, "maximum": 1 },
            "collaboration": { "type": "number", "minimum": 0, "maximum": 1 },
            "exploration": { "type": "number", "minimum": 0, "maximum": 1 }
          }
        },
        "explanation": { "type": "string" }
      }
    },

    "recommendations": {
      "type": "object",
      "required": ["preferredStack", "projectThemes", "studyHabits", "communityTips"],
      "properties": {
        "preferredStack": {
          "type": "array",
          "items": { "type": "string", "enum": ["javascript_react", "nodejs", "python_core", "python_ai", "not_sure"] },
          "minItems": 1
        },
        "projectThemes": { "type": "array", "items": { "type": "string" } },
        "studyHabits": { "type": "array", "items": { "type": "string" } },
        "communityTips": { "type": "array", "items": { "type": "string" } }
      }
    },

    "roadmapSummary": {
      "type": "object",
      "required": ["sevenDay", "thirtyDay"],
      "properties": {
        "sevenDay": {
          "type": "object",
          "required": ["title", "focus", "estDailyMins"],
          "properties": {
            "title": { "type": "string" },
            "focus": { "type": "array", "items": { "type": "string" } },
            "estDailyMins": { "type": "integer", "minimum": 10, "maximum": 300 }
          }
        },
        "thirtyDay": {
          "type": "object",
          "required": ["title", "projects", "milestones"],
          "properties": {
            "title": { "type": "string" },
            "projects": { "type": "array", "items": { "type": "string" } },
            "milestones": { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    },

    "nextActions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["label", "action"],
        "properties": {
          "label": { "type": "string" },
          "action": { "type": "string", "enum": ["start_7day", "view_30day", "join_discord", "book_coach", "read_guide"] }
        }
      }
    },

    "ctaLinks": {
      "type": "object",
      "required": ["start7DayUrl", "view30DayUrl", "discordUrl"],
      "properties": {
        "start7DayUrl": { "type": "string", "format": "uri" },
        "view30DayUrl": { "type": "string", "format": "uri" },
        "discordUrl": { "type": "string", "format": "uri" },
        "bookCoachUrl": { "type": "string", "format": "uri" }
      }
    }
  }
}
```

---

# 2) Example Payload

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
    "explanation": "You learn best by building and seeing concepts. Your roadmap emphasizes hands-on tasks with diagrams and examples."
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
    "explanation": "You prefer to try things quickly, with occasional checkpoints from others."
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
    "discordUrl": "https://discord.gg/lurnix",
    "bookCoachUrl": "https://app.lurnix.tech/coaching/booking"
  }
}
```

---

# 3) TypeScript Types

```ts
export type LearningStyleKey =
  | "visual" | "auditory" | "kinesthetic"
  | "reflective" | "active" | "sequential" | "global";

export interface LearningStyle {
  primary: LearningStyleKey;
  secondary: LearningStyleKey;
  scores: Record<LearningStyleKey, number>; // 0..1
  explanation?: string;
}

export type TopGoal =
  | "job_ready" | "career_switch" | "build_startup" | "hobby" | "automation";

export interface Objectives {
  topGoal: TopGoal;
  priorityRank: Array<"job_readiness" | "projects" | "certifications" | "enjoyment">;
  timeHorizon?: "weeks" | "months" | "explore";
}

export type Passion =
  | "web" | "mobile" | "data" | "ai_ml" | "cybersec" | "games" | "devops_cloud";

export interface Passions {
  ranked: Passion[];
  notes?: string;
}

export interface ProblemSolving {
  debugStyle: "experiment" | "research" | "ask_help" | "break_then_return";
  collaboration: "rarely" | "sometimes" | "often" | "always";
  radar: {
    persistence: number;     // 0..1
    independence: number;    // 0..1
    collaboration: number;   // 0..1
    exploration: number;     // 0..1
  };
  explanation?: string;
}

export interface Recommendations {
  preferredStack: Array<"javascript_react" | "nodejs" | "python_core" | "python_ai" | "not_sure">;
  projectThemes: string[];
  studyHabits: string[];
  communityTips: string[];
}

export interface RoadmapSummary {
  sevenDay: {
    title: string;
    focus: string[];
    estDailyMins: number;
  };
  thirtyDay: {
    title: string;
    projects: string[];
    milestones: string[];
  };
}

export type NextAction =
  | "start_7day" | "view_30day" | "join_discord" | "book_coach" | "read_guide";

export interface LurnixProfileReport {
  userId: string;        // UUID
  quizResultId: string;  // UUID
  version: number;
  generatedAt: string;   // ISO date
  learningStyle: LearningStyle;
  objectives: Objectives;
  passions: Passions;
  problemSolving: ProblemSolving;
  recommendations: Recommendations;
  roadmapSummary: RoadmapSummary;
  nextActions: { label: string; action: NextAction }[];
  ctaLinks: {
    start7DayUrl: string;
    view30DayUrl: string;
    discordUrl: string;
    bookCoachUrl?: string;
  };
}
```

---

# 4) Scoring → Mapping → Recommendations (quick guide)

* **Normalize answers to weights** (e.g., visual +0.2, kinesthetic +0.3 per choice). Sum and **min–max scale** to 0..1.
* **Primary/secondary style** = top two scores.
* **TopGoal** = direct selection; **priorityRank** stored as given.
* **Passions.ranked** = from ranking component (drag & drop).
* **ProblemSolving.radar** = average scaled scores from scenario choices (e.g., persistence ↑ if “experiment” + “return after a break”).
* **preferredStack** mapping:

  * web high → `javascript_react` (add `nodejs` if backend interest).
  * ai\_ml or data high → `python_ai` or `python_core`.
  * “not sure” → start with `javascript_react` + `python_core` sampler.
* **Project themes** chosen from passions (e.g., web+ai → “React dashboard + Python AI microfeature”).
* **Study habits** from style (sequential → checklists; global → overview first; kinesthetic → build-first).
* **SevenDay estDailyMins** from time horizon (weeks → 45–60 min; months → 25–40 min).
* **Next actions**: always include start\_7day, view\_30day, join\_discord; add book\_coach if Premium.

