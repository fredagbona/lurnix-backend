

# 1) Decide your output schema

Keep it small, explicit, and versioned so you can evolve later.

```ts
// v1 roadmap schema (shared types)
type TaskType = "read" | "watch" | "code" | "quiz" | "reflect";
type Difficulty = "intro" | "core" | "stretch";

interface RoadmapTask {
  id: string;                 // "d3-t2"
  type: TaskType;
  title: string;
  estMins: number;            // 10..120
  difficulty: Difficulty;
  acceptance: string[];       // concrete criteria ("button increments by 1", "tests pass")
  resources: { label: string; url: string }[];
}

interface RoadmapDay {
  day: number;                // 1..7 or 1..30
  focus: string;              // one clear theme
  tasks: RoadmapTask[];       // 2..5 tasks
  checkpoints?: string[];     // “demo a GIF in Discord”, etc.
}

interface RoadmapJsonV1 {
  version: 1;
  title: string;
  stack: string[];            // ["javascript","react"]
  roadmapType: "seven_day" | "thirty_day";
  estDailyMins: number;       // 25..90
  principles: string[];       // rules applied for this learner (“build-first”, “visual aids”)
  days: RoadmapDay[];
}
```

# 2) Create a strong system prompt

Refer to system prompt file

# 3) Call the model with structured output (Vercel AI SDK)

Use Zod to validate and auto-repair minor issues. (This works with multiple providers; swap the model name for yours.)

```ts
import { generateObject } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

const RoadmapTask = z.object({
  id: z.string(),
  type: z.enum(["read","watch","code","quiz","reflect"]),
  title: z.string(),
  estMins: z.number().min(10).max(120),
  difficulty: z.enum(["intro","core","stretch"]),
  acceptance: z.array(z.string()).min(1),
  resources: z.array(z.object({ label: z.string(), url: z.string().url() }))
});

const RoadmapDay = z.object({
  day: z.number().int().min(1),
  focus: z.string(),
  tasks: z.array(RoadmapTask).min(2).max(5),
  checkpoints: z.array(z.string()).optional()
});

const RoadmapSchema = z.object({
  version: z.literal(1),
  title: z.string(),
  stack: z.array(z.string()).nonempty(),
  roadmapType: z.enum(["seven_day","thirty_day"]),
  estDailyMins: z.number().min(25).max(90),
  principles: z.array(z.string()).nonempty(),
  days: z.array(RoadmapDay).min(7)
});

export async function generateRoadmap(profile: any, roadmapType: "seven_day"|"thirty_day") {
  const sys = /* system prompt string from above */;
  const usr = /* user prompt string with embedded profile & schema */;

  const { object, warnings } = await generateObject({
    model: openai("gpt-4o-mini"),             // or another JSON-capable model
    system: sys,
    prompt: usr,
    schema: RoadmapSchema,
    temperature: 0.5,
  });

  // Optional: enforce daily time budget
  object.days = object.days.map(d => {
    const total = d.tasks.reduce((s,t)=>s+t.estMins,0);
    return (total > object.estDailyMins*1.15)
      ? { ...d, tasks: trimToBudget(d.tasks, object.estDailyMins) }
      : d;
  });

  return { roadmap: object, warnings };
}

function trimToBudget(tasks: z.infer<typeof RoadmapTask>[], budget: number) {
  const sorted = [...tasks].sort((a,b)=> b.estMins - a.estMins);
  let sum = tasks.reduce((s,t)=>s+t.estMins,0);
  while (sum > budget && sorted.length > 2) { // keep at least 2 tasks
    const removed = sorted.shift()!;
    sum -= removed.estMins;
  }
  return sorted.sort((a,b)=> a.id.localeCompare(b.id));
}
```

# 4) Example (abridged) JSON the model should return

```json
{
  "version": 1,
  "title": "7-Day React Kickstart for Web + AI",
  "stack": ["javascript","react"],
  "roadmapType": "seven_day",
  "estDailyMins": 60,
  "principles": ["build-first","visual aids","small wins daily"],
  "days": [
    {
      "day": 1,
      "focus": "JS fundamentals by doing",
      "tasks": [
        {
          "id": "d1-t1",
          "type": "code",
          "title": "Variables, functions, arrays via tiny katas",
          "estMins": 35,
          "difficulty": "intro",
          "acceptance": ["complete 5 katas", "no linter errors"],
          "resources": [
            { "label": "MDN JS Basics", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types" }
          ]
        },
        {
          "id": "d1-t2",
          "type": "watch",
          "title": "10-min DOM overview (low bandwidth)",
          "estMins": 15,
          "difficulty": "intro",
          "acceptance": ["write down 3 DOM APIs"],
          "resources": [
            { "label": "DOM Intro", "url": "https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction" }
          ]
        }
      ],
      "checkpoints": ["Post a GIF of your katas output in #daily-demos"]
    }
    // ...days 2..7
  ]
}
```

# 5) Personalization levers you can pass

* **Style** → add “principles”: `build-first`, `visual aids`, `checklists`, `pair prompts`.
* **Goal** → pick themes (job-ready ⇒ portfolio artifacts; startup ⇒ MVP features).
* **Passions** → select examples: finance, health, productivity, AI twist, etc.
* **Time** → set `estDailyMins`, cap daily totals, 2–4 tasks max.
* **Constraints** → “low bandwidth”, “mobile-only”, “no paid tools” → influence resource choice.

# 6) Guardrails & retries

* **Validate** with Zod (above). If it fails, *automatically re-prompt* the model with the validation error summary and ask it to “repair to schema v1 only”.
* **Normalize URLs** to allowed domains (MDN, React docs, Python docs).
* **Determinism**: set `temperature: 0.3–0.5` for consistent structure; bump if variety is desired.

# 7) Fallback generator (no-AI)

Always keep a tiny rules-based generator as a fallback:

* Map `{level, stack, passions}` → pick a **template** (7-day or 30-day).
* Swap **project themes** based on passions.
* Scale **estMins** to `timePerDay`.
* You can still attach acceptance criteria + reputable links.

